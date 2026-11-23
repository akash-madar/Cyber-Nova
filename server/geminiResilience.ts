import { GEMINI_MODEL } from './gemini.ts';
import type { A2AResearchBundle, ResearchedSchemeBundleItem } from './types.ts';

export type GeminiErrorCategory =
  | 'QUOTA_EXHAUSTED_DAILY'
  | 'QUOTA_RATE_LIMIT'
  | 'AUTH_INVALID'
  | 'MODEL_NOT_FOUND'
  | 'TRANSIENT'
  | 'UNKNOWN';

export interface ClassifiedGeminiError {
  category: GeminiErrorCategory;
  httpStatus: number | null;
  retryable: boolean;
  retryAfterMs: number | null;
  userMessage: string;
  rawSummary: string;
}

export class GeminiPipelineError extends Error {
  readonly classified: ClassifiedGeminiError;

  constructor(classified: ClassifiedGeminiError) {
    super(classified.userMessage);
    this.name = 'GeminiPipelineError';
    this.classified = classified;
  }
}

interface QuotaRuntimeState {
  status: 'OK' | 'COOLDOWN' | 'EXHAUSTED';
  cooldownUntilMs: number;
  lastErrorMessage: string | null;
  lastErrorCategory: GeminiErrorCategory | null;
  consecutiveQuotaErrors: number;
}

const quotaState: QuotaRuntimeState = {
  status: 'OK',
  cooldownUntilMs: 0,
  lastErrorMessage: null,
  lastErrorCategory: null,
  consecutiveQuotaErrors: 0,
};

// Single-flight throttle queue to avoid concurrent Gemini bursts triggering 429 RPM limits
const MIN_REQUEST_INTERVAL_MS = 1500;
let throttleChain: Promise<void> = Promise.resolve();
let lastCallCompletedAt = 0;

function extractRawErrorText(err: unknown): { text: string; status: number | null } {
  if (!err || typeof err !== 'object') {
    return { text: String(err ?? 'Unknown error'), status: null };
  }
  const anyErr = err as Record<string, unknown>;
  const status =
    typeof anyErr.status === 'number'
      ? anyErr.status
      : typeof anyErr.code === 'number'
      ? anyErr.code
      : null;
  const msg = typeof anyErr.message === 'string' ? anyErr.message : JSON.stringify(anyErr);
  return { text: msg, status };
}

function parseRetryDelayMs(rawText: string): number | null {
  const secMatch = rawText.match(/retryDelay["']?\s*[:=]\s*["']?(\d+(?:\.\d+)?)s/i);
  if (secMatch) {
    const secs = Number(secMatch[1]);
    if (!Number.isNaN(secs) && secs > 0) {
      return Math.ceil(secs * 1000);
    }
  }
  const proseMatch = rawText.match(/retry\s+in\s+(\d+(?:\.\d+)?)s/i);
  if (proseMatch) {
    const secs = Number(proseMatch[1]);
    if (!Number.isNaN(secs) && secs > 0) {
      return Math.ceil(secs * 1000);
    }
  }
  return null;
}

export function classifyGeminiError(err: unknown): ClassifiedGeminiError {
  if (err instanceof GeminiPipelineError) {
    return err.classified;
  }

  const { text, status } = extractRawErrorText(err);
  const lower = text.toLowerCase();

  // Check authentication / key errors first (non-retryable)
  if (
    status === 401 ||
    status === 403 ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('permission_denied') ||
    lower.includes('unauthenticated')
  ) {
    return {
      category: 'AUTH_INVALID',
      httpStatus: status ?? 403,
      retryable: false,
      retryAfterMs: null,
      userMessage:
        `Gemini API key authentication failed for model "${GEMINI_MODEL}". Verify that GEMINI_API_KEY is valid and enabled in Settings > Secrets (or .env).`,
      rawSummary: text.slice(0, 500),
    };
  }

  // Check unsupported/missing model 404 (non-retryable)
  if (
    status === 404 ||
    (lower.includes('not_found') && lower.includes('model')) ||
    lower.includes('is not found for api version')
  ) {
    return {
      category: 'MODEL_NOT_FOUND',
      httpStatus: status ?? 404,
      retryable: false,
      retryAfterMs: null,
      userMessage:
        `Configured Gemini model "${GEMINI_MODEL}" was not found or is unsupported for this API endpoint. Verify GEMINI_MODEL configuration.`,
      rawSummary: text.slice(0, 500),
    };
  }

  // Check 429 RESOURCE_EXHAUSTED quota errors
  if (
    status === 429 ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit')
  ) {
    const parsedDelay = parseRetryDelayMs(text);
    const isDailyOrZeroQuota =
      lower.includes('perday') ||
      lower.includes('per_day') ||
      lower.includes('daily') ||
      lower.includes('limit: 0') ||
      lower.includes('check your plan and billing') ||
      (lower.includes('freetier') && !lower.includes('perminute'));

    if (isDailyOrZeroQuota) {
      return {
        category: 'QUOTA_EXHAUSTED_DAILY',
        httpStatus: 429,
        retryable: false,
        retryAfterMs: parsedDelay ?? 60_000,
        userMessage:
          `Gemini API quota exhausted (429 RESOURCE_EXHAUSTED) on model "${GEMINI_MODEL}". Your active API key has hit its plan/free-tier quota limit. Configure a billing-enabled GEMINI_API_KEY in Settings > Secrets or retry after your quota resets.`,
        rawSummary: text.slice(0, 500),
      };
    }

    const delayMs = parsedDelay ?? 4000;
    return {
      category: 'QUOTA_RATE_LIMIT',
      httpStatus: 429,
      retryable: delayMs <= 15_000,
      retryAfterMs: delayMs,
      userMessage:
        `Gemini API rate limit reached (429 RESOURCE_EXHAUSTED) on model "${GEMINI_MODEL}". Please wait ~${Math.max(10, Math.ceil(delayMs / 1000))}s and click Retry Task, or use a billing-enabled API key in Settings > Secrets for higher throughput.`,
      rawSummary: text.slice(0, 500),
    };
  }

  // Transient upstream / network failures
  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    lower.includes('etimedout') ||
    lower.includes('econnreset') ||
    lower.includes('unavailable') ||
    lower.includes('deadline_exceeded') ||
    lower.includes('fetch failed')
  ) {
    return {
      category: 'TRANSIENT',
      httpStatus: status ?? 503,
      retryable: true,
      retryAfterMs: 2000,
      userMessage:
        'Gemini API encountered a temporary upstream service interruption. You can safely retry the task shortly.',
      rawSummary: text.slice(0, 500),
    };
  }

  return {
    category: 'UNKNOWN',
    httpStatus: status,
    retryable: false,
    retryAfterMs: null,
    userMessage: text.slice(0, 400) || 'Unexpected Gemini API error.',
    rawSummary: text.slice(0, 500),
  };
}

export function getQuotaStatusSnapshot(): {
  quota_status: 'OK' | 'COOLDOWN' | 'EXHAUSTED';
  quota_cooldown_until: string | null;
  last_quota_error: string | null;
} {
  const now = Date.now();
  if (quotaState.cooldownUntilMs > now) {
    return {
      quota_status: quotaState.status,
      quota_cooldown_until: new Date(quotaState.cooldownUntilMs).toISOString(),
      last_quota_error: quotaState.lastErrorMessage,
    };
  }
  if (quotaState.cooldownUntilMs !== 0 && quotaState.cooldownUntilMs <= now) {
    quotaState.status = 'OK';
    quotaState.cooldownUntilMs = 0;
  }
  return {
    quota_status: 'OK',
    quota_cooldown_until: null,
    last_quota_error: null,
  };
}

export function clearQuotaCooldown(): void {
  quotaState.status = 'OK';
  quotaState.cooldownUntilMs = 0;
  quotaState.lastErrorMessage = null;
  quotaState.lastErrorCategory = null;
  quotaState.consecutiveQuotaErrors = 0;
}

function recordQuotaHit(classified: ClassifiedGeminiError): void {
  if (
    classified.category !== 'QUOTA_EXHAUSTED_DAILY' &&
    classified.category !== 'QUOTA_RATE_LIMIT'
  ) {
    return;
  }
  quotaState.consecutiveQuotaErrors += 1;
  const fallbackCooldown =
    classified.category === 'QUOTA_EXHAUSTED_DAILY' ? 60_000 : 25_000;
  const boundedCooldown = Math.min(
    Math.max(classified.retryAfterMs ?? fallbackCooldown, 15_000),
    120_000
  );
  quotaState.status =
    classified.category === 'QUOTA_EXHAUSTED_DAILY' ? 'EXHAUSTED' : 'COOLDOWN';
  quotaState.cooldownUntilMs = Date.now() + boundedCooldown;
  quotaState.lastErrorMessage = classified.userMessage;
  quotaState.lastErrorCategory = classified.category;
}

async function runSerializedThrottled<T>(fn: () => Promise<T>): Promise<T> {
  let release!: () => void;
  const prev = throttleChain;
  throttleChain = new Promise<void>((resolve) => {
    release = resolve;
  });

  await prev;
  try {
    const now = Date.now();
    if (quotaState.cooldownUntilMs > now) {
      const waitSec = Math.max(1, Math.ceil((quotaState.cooldownUntilMs - now) / 1000));
      throw new GeminiPipelineError({
        category: quotaState.lastErrorCategory ?? 'QUOTA_RATE_LIMIT',
        httpStatus: 429,
        retryable: false,
        retryAfterMs: quotaState.cooldownUntilMs - now,
        userMessage:
          `Gemini API quota cooldown active after a recent 429 RESOURCE_EXHAUSTED error on "${GEMINI_MODEL}". Wait ${waitSec}s before retrying, or update GEMINI_API_KEY in Settings > Secrets with a billing-enabled key.`,
        rawSummary: quotaState.lastErrorMessage ?? 'Cooldown active',
      });
    }

    const elapsed = now - lastCallCompletedAt;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL_MS - elapsed));
    }

    const result = await fn();
    clearQuotaCooldown();
    return result;
  } finally {
    lastCallCompletedAt = Date.now();
    release();
  }
}

export async function executeGeminiWithResilience<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number } = {}
): Promise<{ result: T; retriesUsed: number }> {
  const maxRetries = options.maxRetries ?? 2;
  let retriesUsed = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await runSerializedThrottled(fn);
      return { result, retriesUsed };
    } catch (err) {
      const classified = classifyGeminiError(err);

      // Do not burn extra requests on non-retryable errors (daily/zero quota, invalid key, 404)
      if (!classified.retryable || attempt >= maxRetries) {
        recordQuotaHit(classified);
        throw new GeminiPipelineError(classified);
      }

      retriesUsed += 1;
      const expBackoff = 2000 * Math.pow(2, attempt);
      const jitter = Math.floor(Math.random() * 500);
      const delayMs = Math.min(
        Math.max(classified.retryAfterMs ?? expBackoff, expBackoff) + jitter,
        15_000
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  throw new GeminiPipelineError({
    category: 'UNKNOWN',
    httpStatus: null,
    retryable: false,
    retryAfterMs: null,
    userMessage: 'Gemini request failed after retries.',
    rawSummary: 'Max retries exceeded',
  });
}

export function extractJsonFromModelText(rawText: string): unknown | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  // 1. Direct JSON
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  // 2. Markdown ```json ... ``` fenced block
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // continue
    }
  }

  // 3. First balanced outer JSON object
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }

  return null;
}

export function isValidHttpUrl(value: string): boolean {
  if (!value || value === 'Not verified') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateResearchBundleForAgent2(bundle: A2AResearchBundle | null | undefined): {
  valid: boolean;
  validSchemes: ResearchedSchemeBundleItem[];
  rejectedCount: number;
  reason?: string;
} {
  if (!bundle || bundle.sender !== 'AGENT_1_RESEARCH' || bundle.receiver !== 'AGENT_2_ELIGIBILITY') {
    return {
      valid: false,
      validSchemes: [],
      rejectedCount: 0,
      reason: 'Invalid A2A bundle envelope from Agent 1.',
    };
  }

  if (!Array.isArray(bundle.schemes) || bundle.schemes.length === 0) {
    return {
      valid: false,
      validSchemes: [],
      rejectedCount: 0,
      reason: 'Agent 1 returned 0 verified scholarship records.',
    };
  }

  const validSchemes: ResearchedSchemeBundleItem[] = [];
  let rejectedCount = 0;

  for (const item of bundle.schemes) {
    const name = (item?.scholarship?.official_name || '').trim();
    const desc = (item?.scholarship?.description || '').trim();
    const hasValidName =
      name.length >= 4 &&
      name.toLowerCase() !== 'not verified' &&
      name.toLowerCase() !== 'unknown';
    const hasValidDesc = desc.length >= 10 && desc.toLowerCase() !== 'not verified';
    const hasOfficialOrGroundedSource =
      isValidHttpUrl(item?.scholarship?.official_portal_url) ||
      isValidHttpUrl(item?.scholarship?.source_url) ||
      (Array.isArray(item?.sources) && item.sources.some((s) => isValidHttpUrl(s.source_url))) ||
      bundle.grounding_urls_discovered.some((g) => isValidHttpUrl(g.url));

    if (hasValidName && hasValidDesc && hasOfficialOrGroundedSource) {
      validSchemes.push(item);
    } else {
      rejectedCount += 1;
    }
  }

  if (validSchemes.length === 0) {
    return {
      valid: false,
      validSchemes: [],
      rejectedCount,
      reason:
        'None of the returned records met official verification requirements (missing verified name, description, or source URL).',
    };
  }

  return {
    valid: true,
    validSchemes,
    rejectedCount,
  };
}
