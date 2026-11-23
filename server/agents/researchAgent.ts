import { Type } from '@google/genai';
import crypto from 'node:crypto';
import net from 'node:net';
import { GEMINI_MODEL, getGeminiClient } from '../gemini.ts';
import {
  executeGeminiWithResilience,
  extractJsonFromModelText,
  GeminiPipelineError,
  validateResearchBundleForAgent2,
} from '../geminiResilience.ts';
import type {
  A2AResearchBundle,
  ResearchedSchemeBundleItem,
  StudentProfile,
} from '../types.ts';
import {
  buildResearchCacheKey,
  getCachedVerifiedResearch,
  saveVerifiedResearchCache,
} from './researchCache.ts';

const OFFICIAL_PORTAL_PRIORITY = [
  'scholarships.gov.in',
  'ssp.postmatric.karnataka.gov.in',
  'ssp.karnataka.gov.in',
  'karepass.cgg.gov.in',
  'myscheme.gov.in',
  'aicte-india.org',
  'ugc.gov.in',
  'socialjustice.gov.in',
  'minorityaffairs.gov.in',
  'tribal.nic.in',
  'education.gov.in',
  'karnataka.gov.in',
];

function isPrivateOrBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower === '::1' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  ) {
    return true;
  }
  if (net.isIPv4(lower)) {
    const parts = lower.split('.').map(Number);
    if (parts[0] === 127 || parts[0] === 10 || parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
  }
  if (net.isIPv6(lower)) {
    if (lower === '::1' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
      return true;
    }
  }
  return false;
}

async function checkPublicUrlReachable(rawUrl: string): Promise<boolean | null> {
  if (!rawUrl || rawUrl === 'Not verified') return null;
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  if (isPrivateOrBlockedHost(parsed.hostname)) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const resp = await fetch(parsed.toString(), {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'ScholarAI-SourceVerifier/1.0' },
    });
    return resp.status >= 200 && resp.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function classifyDomainAuthority(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('scholarships.gov.in')) return 'Official Central Portal (NSP)';
    if (host.includes('ssp.') && host.includes('karnataka.gov.in')) return 'Official State Portal (Karnataka SSP)';
    if (host.includes('myscheme.gov.in')) return 'Official Government Aggregator (myScheme)';
    if (host.endsWith('.gov.in') || host.endsWith('.nic.in')) return 'Official Government Domain (.gov.in / .nic.in)';
    if (host.endsWith('.ac.in') || host.endsWith('.edu.in') || host.includes('aicte') || host.includes('ugc')) {
      return 'Official Academic / Statutory Body';
    }
    return 'Secondary Reference Source';
  } catch {
    return 'Unverified URL';
  }
}

export interface Agent1Input {
  taskId: string;
  queryText: string;
  stateFilter: string;
  categoryFilter: string;
  educationFilter: string;
  profile: StudentProfile;
  mode: 'live_research' | 'developer_test';
  forceRefresh?: boolean;
  developerTestPayload?: {
    scenarioName?: string;
    customPrompt?: string;
  };
}

export interface Agent1Output {
  bundle: A2AResearchBundle;
  retriesUsed: number;
  cacheHit: boolean;
}

export async function runResearchAgent(
  input: Agent1Input,
  onProgress: (stage: string, agent1Status: 'SEARCHING' | 'VERIFYING' | 'DONE') => void
): Promise<Agent1Output> {
  const effectiveState = input.stateFilter || input.profile.state || 'India';
  const effectiveCategory = input.categoryFilter || input.profile.category || 'All';
  const effectiveEdu = input.educationFilter || input.profile.education_level || 'Higher Education';

  const { cacheKey, signature } = buildResearchCacheKey({
    queryText: input.queryText,
    stateFilter: effectiveState,
    categoryFilter: effectiveCategory,
    educationFilter: effectiveEdu,
    mode: input.mode,
    customPrompt: input.developerTestPayload?.customPrompt,
  });

  // Check persistent verified research cache first to minimize unnecessary Gemini quota usage
  if (!input.forceRefresh) {
    const cachedBundle = getCachedVerifiedResearch(cacheKey, input.taskId);
    if (cachedBundle) {
      onProgress(
        'Agent 1 reusing previously verified official research from cache (0 Gemini calls used)',
        'VERIFYING'
      );
      onProgress('Agent 1 packaged cached A2A research bundle for Agent 2', 'DONE');
      return {
        bundle: cachedBundle,
        retriesUsed: 0,
        cacheHit: true,
      };
    }
  }

  const ai = getGeminiClient();
  if (!ai) {
    throw new GeminiPipelineError({
      category: 'AUTH_INVALID',
      httpStatus: 503,
      retryable: false,
      retryAfterMs: null,
      userMessage:
        'GEMINI_API_KEY is missing or set to a placeholder. Configure a valid billing-enabled GEMINI_API_KEY in Settings > Secrets (or .env) so Agent 1 can perform live Google Search Grounding.',
      rawSummary: 'Missing GEMINI_API_KEY',
    });
  }

  const queriesExecuted = [
    `Official Indian government scholarships for ${effectiveEdu} ${effectiveCategory} students in ${effectiveState} site:scholarships.gov.in OR site:myscheme.gov.in`,
    effectiveState.toLowerCase().includes('karnataka')
      ? `Karnataka State Scholarship Portal SSP post matric scholarship eligibility income limit deadline site:ssp.postmatric.karnataka.gov.in OR site:karnataka.gov.in`
      : `${effectiveState} state government scholarship portal post matric eligibility deadline`,
    input.queryText.trim(),
  ].filter(Boolean);

  onProgress(
    `Agent 1 executing live Google Search grounding (${GEMINI_MODEL}) on official government portals`,
    'SEARCHING'
  );

  // Single combined prompt with Google Search Grounding requesting strict JSON directly
  // so 1 API call suffices in most runs (falling back to structured parsing only if needed).
  const baseGoal =
    input.mode === 'developer_test' && input.developerTestPayload?.customPrompt
      ? `DEVELOPER SANDBOX TEST QUERY (label any uncertain data honestly, never fabricate URLs or deadlines):
${input.developerTestPayload.customPrompt}
Student Context: State=${effectiveState}, Category=${effectiveCategory}, Education=${effectiveEdu}, Course=${input.profile.course || 'Not specified'}, Income=${input.profile.annual_family_income ?? 'Not specified'}`
      : `User Search Focus: "${input.queryText || 'Government scholarships for Indian students'}"
- State / Domicile: ${effectiveState}
- Social Category: ${effectiveCategory}
- Education Level: ${effectiveEdu}
- Course: ${input.profile.course || 'Any'}`;

  const searchPrompt = `You are AGENT 1 (Research Agent) for ScholarAI, an Indian government scholarship discovery system.
Today's date is ${new Date().toISOString().slice(0, 10)}.

Use Google Search to research REAL, authentic Indian Central and State Government scholarships matching:
${baseGoal}

Prioritize official Indian government sources:
${OFFICIAL_PORTAL_PRIORITY.map((d) => `- ${d}`).join('\n')}

STRICT ANTI-FABRICATION RULES:
1. NEVER invent a scholarship name, amount, deadline, income limit, or portal URL.
2. Only report schemes found in live search results.
3. If opening_date, application_deadline, benefit_amount_inr, official_portal_url, or academic_year is NOT explicitly confirmed in the retrieved results, set it to "Not verified" (and set numeric max_family_income_inr / min_percentage to null).
4. Set rules_verified = true ONLY if core eligibility rules were explicitly found in official search results; otherwise false.
5. Set outdated_flag = true if the cited deadline/academic year clearly belongs to an expired cycle before ${new Date().getFullYear()}.
6. Retrieve up to 5 most relevant authentic schemes.

OUTPUT FORMAT:
Return a single JSON object wrapped in \`\`\`json ... \`\`\` with keys:
{
  "warnings": ["string"],
  "schemes": [
    {
      "official_name": "string",
      "provider_ministry": "string",
      "portal_name": "string",
      "scheme_type": "Central" | "State" | "AICTE/UGC" | "Other",
      "description": "string",
      "benefits_summary": "string",
      "benefit_amount_inr": "string or Not verified",
      "opening_date": "string or Not verified",
      "application_deadline": "string or Not verified",
      "academic_year": "string or Not verified",
      "official_portal_url": "https://... or Not verified",
      "source_url": "https://... or Not verified",
      "verification_status": "Verified" | "Partial" | "Unverified",
      "outdated_flag": false,
      "outdated_reason": "",
      "min_education_level": "string",
      "allowed_states": ["string"],
      "allowed_categories": ["string"],
      "max_family_income_inr": number | null,
      "income_limit_note": "string",
      "min_percentage": number | null,
      "allowed_courses": ["string"],
      "gender_requirement": "All" | "Female" | "Male",
      "disability_requirement": "Any",
      "minority_requirement": "Any",
      "institution_requirement": "Recognized Institution",
      "other_conditions": ["string"],
      "required_documents": ["string"],
      "rules_verified": boolean,
      "evidence_excerpt": "short quote/summary from source"
    }
  ]
}`;

  const { result: groundedResponse, retriesUsed: searchRetries } =
    await executeGeminiWithResilience(
      () =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: searchPrompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        }),
      { maxRetries: 2 }
    );

  const rawGroundedText = groundedResponse.text ?? '';
  const chunks = groundedResponse.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const discoveredUrls: Array<{ title: string; url: string }> = [];
  const seenUrls = new Set<string>();

  for (const ch of chunks) {
    const uri = ch.web?.uri;
    const title = ch.web?.title || 'Official Source';
    if (uri && !seenUrls.has(uri)) {
      seenUrls.add(uri);
      discoveredUrls.push({ title, url: uri });
    }
  }

  if (!rawGroundedText.trim()) {
    throw new Error('Agent 1 received an empty response from Gemini search grounding.');
  }

  onProgress('Agent 1 validating structured research & verifying official source URLs', 'VERIFYING');

  let parsed: {
    warnings?: string[];
    schemes?: Array<Record<string, unknown>>;
  } | null = null;
  let parseRetries = 0;

  // Try parsing JSON directly from the single grounded call first (saves 1 full Gemini API call!)
  const directJson = extractJsonFromModelText(rawGroundedText);
  if (
    directJson &&
    typeof directJson === 'object' &&
    Array.isArray((directJson as Record<string, unknown>).schemes)
  ) {
    parsed = directJson as {
      warnings?: string[];
      schemes?: Array<Record<string, unknown>>;
    };
  } else {
    // Only if direct JSON parsing failed, perform 1 fallback structured JSON extraction call
    const extractionPrompt = `Convert the following grounded research report into strict JSON.
CRITICAL INTEGRITY RULES:
- Extract ONLY information explicitly present in the research report and discovered grounding URLs below.
- If a field (opening_date, application_deadline, benefit_amount_inr, official_portal_url, academic_year) is missing or uncertain in the report, set it to "Not verified" (or null for numeric fields max_family_income_inr / min_percentage).
- NEVER invent URLs. Prefer URLs from the Discovered Grounding URLs list or explicitly cited .gov.in / .nic.in portal domains from the research text.
- Set rules_verified = true ONLY if core eligibility rules were actually found in the research text; otherwise set rules_verified = false.
- Set outdated_flag = true if the cited deadline/academic year clearly belongs to an expired cycle before ${new Date().getFullYear()}.

Discovered Grounding URLs:
${JSON.stringify(discoveredUrls, null, 2)}

Grounded Research Text:
${rawGroundedText}`;

    const extraction = await executeGeminiWithResilience(
      () =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: extractionPrompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                warnings: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                schemes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      official_name: { type: Type.STRING },
                      provider_ministry: { type: Type.STRING },
                      portal_name: { type: Type.STRING },
                      scheme_type: { type: Type.STRING },
                      description: { type: Type.STRING },
                      benefits_summary: { type: Type.STRING },
                      benefit_amount_inr: { type: Type.STRING },
                      opening_date: { type: Type.STRING },
                      application_deadline: { type: Type.STRING },
                      academic_year: { type: Type.STRING },
                      official_portal_url: { type: Type.STRING },
                      source_url: { type: Type.STRING },
                      verification_status: { type: Type.STRING },
                      outdated_flag: { type: Type.BOOLEAN },
                      outdated_reason: { type: Type.STRING },
                      min_education_level: { type: Type.STRING },
                      allowed_states: { type: Type.ARRAY, items: { type: Type.STRING } },
                      allowed_categories: { type: Type.ARRAY, items: { type: Type.STRING } },
                      max_family_income_inr: { type: Type.NUMBER, nullable: true },
                      income_limit_note: { type: Type.STRING },
                      min_percentage: { type: Type.NUMBER, nullable: true },
                      allowed_courses: { type: Type.ARRAY, items: { type: Type.STRING } },
                      gender_requirement: { type: Type.STRING },
                      disability_requirement: { type: Type.STRING },
                      minority_requirement: { type: Type.STRING },
                      institution_requirement: { type: Type.STRING },
                      other_conditions: { type: Type.ARRAY, items: { type: Type.STRING } },
                      required_documents: { type: Type.ARRAY, items: { type: Type.STRING } },
                      rules_verified: { type: Type.BOOLEAN },
                      evidence_excerpt: { type: Type.STRING },
                    },
                    required: [
                      'official_name',
                      'provider_ministry',
                      'portal_name',
                      'scheme_type',
                      'description',
                      'benefits_summary',
                      'benefit_amount_inr',
                      'opening_date',
                      'application_deadline',
                      'academic_year',
                      'official_portal_url',
                      'source_url',
                      'verification_status',
                      'outdated_flag',
                      'min_education_level',
                      'allowed_states',
                      'allowed_categories',
                      'allowed_courses',
                      'required_documents',
                      'rules_verified',
                    ],
                  },
                },
              },
              required: ['schemes', 'warnings'],
            },
          },
        }),
      { maxRetries: 1 }
    );

    parseRetries = extraction.retriesUsed;
    try {
      parsed = JSON.parse((extraction.result.text ?? '{}').trim());
    } catch {
      throw new Error('Agent 1 failed to serialize structured research JSON.');
    }
  }

  const rawSchemes = Array.isArray(parsed?.schemes) ? parsed.schemes : [];
  const nowIso = new Date().toISOString();

  // Verify HTTP reachability of portal/source URLs safely in parallel
  const candidateSchemes: ResearchedSchemeBundleItem[] = await Promise.all(
    rawSchemes.slice(0, 6).map(async (item) => {
      const portalUrl = String(item.official_portal_url || 'Not verified');
      const sourceUrl = String(item.source_url || discoveredUrls[0]?.url || 'Not verified');
      const reachablePortal = await checkPublicUrlReachable(portalUrl);
      const reachableSource =
        sourceUrl === portalUrl ? reachablePortal : await checkPublicUrlReachable(sourceUrl);

      const verificationRaw = String(item.verification_status || 'Partial');
      const verificationStatus: 'Verified' | 'Partial' | 'Unverified' =
        verificationRaw === 'Verified' || verificationRaw === 'Unverified'
          ? verificationRaw
          : 'Partial';

      const schemeTypeRaw = String(item.scheme_type || 'Central');
      const schemeType: 'Central' | 'State' | 'AICTE/UGC' | 'Other' =
        schemeTypeRaw === 'Central' ||
        schemeTypeRaw === 'State' ||
        schemeTypeRaw === 'AICTE/UGC'
          ? schemeTypeRaw
          : 'Other';

      const sources: ResearchedSchemeBundleItem['sources'] = [];
      if (sourceUrl && sourceUrl !== 'Not verified') {
        sources.push({
          source_title: String(item.portal_name || item.official_name || 'Primary Source'),
          source_url: sourceUrl,
          domain_authority: classifyDomainAuthority(sourceUrl),
          excerpt: String(item.evidence_excerpt || item.description || '').slice(0, 320),
          http_reachable: reachableSource,
        });
      }
      for (const chunkUrl of discoveredUrls.slice(0, 2)) {
        if (chunkUrl.url !== sourceUrl) {
          sources.push({
            source_title: chunkUrl.title,
            source_url: chunkUrl.url,
            domain_authority: classifyDomainAuthority(chunkUrl.url),
            excerpt: 'Retrieved via live Google Search Grounding',
            http_reachable: null,
          });
        }
      }

      return {
        scholarship: {
          official_name: String(item.official_name || 'Not verified'),
          provider_ministry: String(item.provider_ministry || 'Not verified'),
          portal_name: String(item.portal_name || 'Not verified'),
          scheme_type: schemeType,
          description: String(item.description || 'Not verified'),
          benefits_summary: String(item.benefits_summary || 'Not verified'),
          benefit_amount_inr: String(item.benefit_amount_inr || 'Not verified'),
          opening_date: String(item.opening_date || 'Not verified'),
          application_deadline: String(item.application_deadline || 'Not verified'),
          academic_year: String(item.academic_year || 'Not verified'),
          official_portal_url: portalUrl,
          source_url: sourceUrl,
          verification_status: verificationStatus,
          outdated_flag: Boolean(item.outdated_flag),
          outdated_reason: String(item.outdated_reason || ''),
          last_verified_at: nowIso,
          is_test_data: input.mode === 'developer_test',
        },
        criteria: {
          min_education_level: String(item.min_education_level || 'Not verified'),
          allowed_states: Array.isArray(item.allowed_states)
            ? item.allowed_states.map(String)
            : ['Not verified'],
          allowed_categories: Array.isArray(item.allowed_categories)
            ? item.allowed_categories.map(String)
            : ['Not verified'],
          max_family_income_inr:
            typeof item.max_family_income_inr === 'number' && !Number.isNaN(item.max_family_income_inr)
              ? item.max_family_income_inr
              : null,
          income_limit_note: String(item.income_limit_note || ''),
          min_percentage:
            typeof item.min_percentage === 'number' && !Number.isNaN(item.min_percentage)
              ? item.min_percentage
              : null,
          allowed_courses: Array.isArray(item.allowed_courses)
            ? item.allowed_courses.map(String)
            : ['All'],
          gender_requirement: String(item.gender_requirement || 'All'),
          disability_requirement: String(item.disability_requirement || 'Any'),
          minority_requirement: String(item.minority_requirement || 'Any'),
          institution_requirement: String(item.institution_requirement || 'Recognized Institution'),
          other_conditions: Array.isArray(item.other_conditions)
            ? item.other_conditions.map(String)
            : [],
          required_documents: Array.isArray(item.required_documents)
            ? item.required_documents.map(String)
            : [],
          rules_verified: Boolean(item.rules_verified),
        },
        sources,
      };
    })
  );

  const bundle: A2AResearchBundle = {
    message_id: crypto.randomUUID(),
    task_id: input.taskId,
    protocol_version: 'a2a.scholarai.v1',
    timestamp: nowIso,
    sender: 'AGENT_1_RESEARCH',
    receiver: 'AGENT_2_ELIGIBILITY',
    mode: input.mode,
    search_queries_executed: queriesExecuted,
    grounding_urls_discovered: discoveredUrls,
    schemes: candidateSchemes,
    warnings: Array.isArray(parsed?.warnings) ? parsed.warnings.map(String) : [],
    cache_hit: false,
  };

  // Validate before returning or caching so unverified/empty entries never reach Agent 2
  const validation = validateResearchBundleForAgent2(bundle);
  bundle.schemes = validation.validSchemes;
  if (validation.rejectedCount > 0) {
    bundle.warnings.push(
      `Filtered out ${validation.rejectedCount} ungrounded or incomplete scheme record(s) before Agent 2 handoff.`
    );
  }

  if (validation.valid) {
    saveVerifiedResearchCache(cacheKey, signature, bundle);
  }

  onProgress('Agent 1 packaged validated A2A research bundle for Agent 2', 'DONE');

  return {
    bundle,
    retriesUsed: searchRetries + parseRetries,
    cacheHit: false,
  };
}
