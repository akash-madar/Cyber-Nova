import crypto from 'node:crypto';
import { db } from '../db.ts';
import { validateResearchBundleForAgent2 } from '../geminiResilience.ts';
import type { A2AResearchBundle } from '../types.ts';

const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export function buildResearchCacheKey(params: {
  queryText: string;
  stateFilter: string;
  categoryFilter: string;
  educationFilter: string;
  mode: 'live_research' | 'developer_test';
  customPrompt?: string;
}): { cacheKey: string; signature: string } {
  const norm = (val: string | undefined) =>
    (val || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const signatureObj = {
    mode: params.mode,
    q: norm(params.queryText),
    s: norm(params.stateFilter),
    c: norm(params.categoryFilter),
    e: norm(params.educationFilter),
    cp: params.mode === 'developer_test' ? norm(params.customPrompt) : '',
  };
  const signature = JSON.stringify(signatureObj);
  const cacheKey = crypto.createHash('sha256').update(signature).digest('hex');
  return { cacheKey, signature };
}

export function getCachedVerifiedResearch(
  cacheKey: string,
  newTaskId: string
): A2AResearchBundle | null {
  const row = db
    .prepare('SELECT bundle_json, created_at, expires_at FROM research_cache WHERE cache_key = ?')
    .get(cacheKey) as
    | { bundle_json: string; created_at: string; expires_at: string }
    | undefined;

  if (!row) return null;

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM research_cache WHERE cache_key = ?').run(cacheKey);
    return null;
  }

  try {
    const parsed = JSON.parse(row.bundle_json) as A2AResearchBundle;
    const validation = validateResearchBundleForAgent2(parsed);
    if (!validation.valid) {
      db.prepare('DELETE FROM research_cache WHERE cache_key = ?').run(cacheKey);
      return null;
    }

    return {
      ...parsed,
      message_id: crypto.randomUUID(),
      task_id: newTaskId,
      timestamp: new Date().toISOString(),
      schemes: validation.validSchemes,
      cache_hit: true,
      cached_at: row.created_at,
    };
  } catch {
    db.prepare('DELETE FROM research_cache WHERE cache_key = ?').run(cacheKey);
    return null;
  }
}

export function saveVerifiedResearchCache(
  cacheKey: string,
  signature: string,
  bundle: A2AResearchBundle,
  ttlMs = DEFAULT_CACHE_TTL_MS
): boolean {
  const validation = validateResearchBundleForAgent2(bundle);
  if (!validation.valid) {
    return false;
  }

  const now = new Date();
  const expires = new Date(now.getTime() + ttlMs);
  const sanitizedBundle: A2AResearchBundle = {
    ...bundle,
    schemes: validation.validSchemes,
    cache_hit: false,
  };
  const verifiedSourcesCount = validation.validSchemes.reduce(
    (sum, s) => sum + (s.sources?.length || 0),
    0
  );

  db.prepare(
    `INSERT INTO research_cache (
       cache_key, query_signature, bundle_json, scheme_count, verified_sources_count, created_at, expires_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET
       query_signature = excluded.query_signature,
       bundle_json = excluded.bundle_json,
       scheme_count = excluded.scheme_count,
       verified_sources_count = excluded.verified_sources_count,
       created_at = excluded.created_at,
       expires_at = excluded.expires_at`
  ).run(
    cacheKey,
    signature,
    JSON.stringify(sanitizedBundle),
    validation.validSchemes.length,
    verifiedSourcesCount,
    now.toISOString(),
    expires.toISOString()
  );

  return true;
}
