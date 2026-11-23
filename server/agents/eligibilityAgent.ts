import { Type } from '@google/genai';
import { GEMINI_MODEL, getGeminiClient } from '../gemini.ts';
import {
  executeGeminiWithResilience,
  GeminiPipelineError,
  validateResearchBundleForAgent2,
} from '../geminiResilience.ts';
import type {
  A2AResearchBundle,
  ApplicationStep,
  DocumentChecklistItem,
  EligibilityOutcome,
  RuleCheckResult,
  StudentProfile,
} from '../types.ts';
import { evaluateEligibilityDeterministic } from './ruleEngine.ts';

export interface AnalyzedSchemePlan {
  schemeIndex: number;
  outcome: EligibilityOutcome;
  rule_checks: RuleCheckResult[];
  missing_fields: string[];
  explanation_summary: string;
  evidence_urls: string[];
  steps: ApplicationStep[];
  document_checklist: DocumentChecklistItem[];
}

export interface Agent2Output {
  analyzedSchemes: AnalyzedSchemePlan[];
  agent2Summary: string;
  retriesUsed: number;
}

export async function runEligibilityAndPlanningAgent(
  bundle: A2AResearchBundle,
  profile: StudentProfile,
  onProgress: (stage: string, agent2Status: 'EVALUATING' | 'PLANNING' | 'DONE') => void,
  language: 'en' | 'kn' | 'hi' = 'en'
): Promise<Agent2Output> {
  // Strict precondition: Agent 2 must never run eligibility analysis without validated research data
  const validation = validateResearchBundleForAgent2(bundle);
  if (!validation.valid) {
    throw new Error(
      validation.reason ||
        'Agent 2 refused to run because validated research data from Agent 1 is unavailable.'
    );
  }

  const ai = getGeminiClient();
  if (!ai) {
    throw new GeminiPipelineError({
      category: 'AUTH_INVALID',
      httpStatus: 503,
      retryable: false,
      retryAfterMs: null,
      userMessage:
        'GEMINI_API_KEY is missing or invalid. Configure a billing-enabled GEMINI_API_KEY in Settings > Secrets so Agent 2 can synthesize personalized application plans.',
      rawSummary: 'Missing GEMINI_API_KEY',
    });
  }

  onProgress('Agent 2 running deterministic rule-based eligibility checks against student profile', 'EVALUATING');

  const deterministicResults = validation.validSchemes.map((item, idx) => {
    const evalResult = evaluateEligibilityDeterministic(profile, item.scholarship, item.criteria);
    const evidenceUrls = Array.from(
      new Set(
        [
          item.scholarship.official_portal_url,
          item.scholarship.source_url,
          ...item.sources.map((s) => s.source_url),
        ].filter((u) => u && u !== 'Not verified')
      )
    );
    const defaultChecklist: DocumentChecklistItem[] = (
      item.criteria.required_documents.length > 0
        ? item.criteria.required_documents
        : [
            'Aadhaar Card (seeded with bank account for DBT)',
            'Previous Academic Marksheet / Passing Certificate',
            'Valid Family Income Certificate (issued by Tehsildar/Competent Authority)',
            'Bonafide Student Certificate from Institution',
            'Bank Passbook Front Page (Student Account)',
          ]
    ).map((docName) => ({
      name: docName,
      purpose: `Required for ${item.scholarship.official_name}`,
      mandatory: true,
      ready: false,
    }));

    const defaultSteps: ApplicationStep[] = [
      ...(evalResult.missing_fields.length > 0
        ? [
            {
              step_number: 1,
              title: 'Complete Missing Profile Information',
              description: `Provide missing details (${evalResult.missing_fields.join(', ')}) in ScholarAI Profile before applying.`,
              completed: false,
              requires_portal_action: false,
            },
          ]
        : []),
      {
        step_number: evalResult.missing_fields.length > 0 ? 2 : 1,
        title: 'Gather & Verify Official Documents',
        description: `Prepare valid originals and clear PDF scans for all checklist documents for ${item.scholarship.academic_year}.`,
        completed: false,
        requires_portal_action: false,
      },
      {
        step_number: evalResult.missing_fields.length > 0 ? 3 : 2,
        title: 'Review Official Portal Guidelines & Submit Manually',
        description: `After reviewing this plan and giving explicit human approval, open ${item.scholarship.official_portal_url !== 'Not verified' ? item.scholarship.official_portal_url : item.scholarship.source_url} to complete registration and submit directly on the government portal.`,
        completed: false,
        requires_portal_action: true,
      },
    ];

    return {
      idx,
      item,
      evalResult,
      evidenceUrls,
      deterministicFallbackSummary: evalResult.rule_checks
        .map((c) => `${c.condition}: ${c.status} — ${c.reason}`)
        .join(' '),
      defaultChecklist,
      defaultSteps,
    };
  });

  onProgress(
    `Agent 2 synthesizing batched application plans & checklists via ${GEMINI_MODEL} (1 combined request)`,
    'PLANNING'
  );

  // Batch all schemes into ONE single Gemini API call instead of N sequential calls!
  const schemesPayload = deterministicResults.map((entry) => ({
    scheme_index: entry.idx,
    official_name: entry.item.scholarship.official_name,
    portal_name: entry.item.scholarship.portal_name,
    opening_date: entry.item.scholarship.opening_date,
    application_deadline: entry.item.scholarship.application_deadline,
    official_portal_url: entry.item.scholarship.official_portal_url,
    required_documents_from_source: entry.item.criteria.required_documents,
    deterministic_outcome: entry.evalResult.outcome,
    missing_fields: entry.evalResult.missing_fields,
    rule_checks: entry.evalResult.rule_checks,
  }));

  const targetLanguageName =
    language === 'kn' ? 'Kannada (ಕನ್ನಡ)' : language === 'hi' ? 'Hindi (हिन्दी)' : 'English';

  const batchedPrompt = `You are AGENT 2 (Eligibility & Application Planning Agent) for ScholarAI.
You received a validated structured research bundle from Agent 1 and already ran the deterministic rule engine.

STUDENT PROFILE:
- Name: ${profile.full_name || 'Not provided'}
- State: ${profile.state || 'Not provided'}
- Category: ${profile.category || 'Not provided'}
- Education Level: ${profile.education_level || 'Not provided'}
- Course: ${profile.course || 'Not provided'}
- Institution: ${profile.institution_name || 'Not provided'} (${profile.institution_type || 'Not specified'})
- Annual Family Income (INR): ${profile.annual_family_income ?? 'Not provided'}
- Previous Percentage: ${profile.previous_percentage ?? 'Not provided'}

EVALUATED SCHEMES (${schemesPayload.length} total):
${JSON.stringify(schemesPayload, null, 2)}

TASK:
Return ONE JSON object containing a "plans" entry for EVERY scheme_index (0 through ${schemesPayload.length - 1}) in the list above:
1. Never alter or contradict "deterministic_outcome". Cite exact passing, failing, or missing rules in "explanation_summary" (2-4 clear sentences).
2. Generate 4-5 practical step-by-step application actions tailored to each scheme's portal (e.g., OTR / e-KYC / SSP e-Attestation / Nodal Officer verification / final manual human submission). Never claim ScholarAI auto-submits applications.
3. Generate "document_checklist" based on each scheme's official required_documents_from_source and Indian portal requirements.
4. OUTPUT LANGUAGE: Write explanation_summary, step titles/descriptions, and document purpose fields naturally in ${targetLanguageName}, keeping official portal names and URLs accurate.`;

  const { result: resp, retriesUsed } = await executeGeminiWithResilience(
    () =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: batchedPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              plans: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    scheme_index: { type: Type.INTEGER },
                    explanation_summary: { type: Type.STRING },
                    steps: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          step_number: { type: Type.INTEGER },
                          title: { type: Type.STRING },
                          description: { type: Type.STRING },
                          requires_portal_action: { type: Type.BOOLEAN },
                        },
                        required: ['step_number', 'title', 'description', 'requires_portal_action'],
                      },
                    },
                    document_checklist: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          purpose: { type: Type.STRING },
                          mandatory: { type: Type.BOOLEAN },
                        },
                        required: ['name', 'purpose', 'mandatory'],
                      },
                    },
                  },
                  required: ['scheme_index', 'explanation_summary', 'steps', 'document_checklist'],
                },
              },
            },
            required: ['plans'],
          },
        },
      }),
    { maxRetries: 2 }
  );

  let parsedPlans: Array<{
    scheme_index: number;
    explanation_summary?: string;
    steps?: Array<{
      step_number: number;
      title: string;
      description: string;
      requires_portal_action: boolean;
    }>;
    document_checklist?: Array<{
      name: string;
      purpose: string;
      mandatory: boolean;
    }>;
  }> = [];

  try {
    const parsed = JSON.parse((resp.text ?? '{}').trim()) as { plans?: typeof parsedPlans };
    if (Array.isArray(parsed.plans)) {
      parsedPlans = parsed.plans;
    }
  } catch {
    throw new Error('Agent 2 failed to serialize batched eligibility and planning JSON.');
  }

  const planByIndex = new Map(parsedPlans.map((p) => [p.scheme_index, p]));

  const analyzedSchemes: AnalyzedSchemePlan[] = deterministicResults.map((entry) => {
    const plan = planByIndex.get(entry.idx);
    return {
      schemeIndex: entry.idx,
      outcome: entry.evalResult.outcome,
      rule_checks: entry.evalResult.rule_checks,
      missing_fields: entry.evalResult.missing_fields,
      explanation_summary:
        (plan?.explanation_summary || '').trim() || entry.deterministicFallbackSummary,
      evidence_urls: entry.evidenceUrls,
      steps:
        plan && Array.isArray(plan.steps) && plan.steps.length > 0
          ? plan.steps.map((s, i) => ({
              step_number: s.step_number || i + 1,
              title: s.title,
              description: s.description,
              completed: false,
              requires_portal_action: Boolean(s.requires_portal_action),
            }))
          : entry.defaultSteps,
      document_checklist:
        plan && Array.isArray(plan.document_checklist) && plan.document_checklist.length > 0
          ? plan.document_checklist.map((d) => ({
              name: d.name,
              purpose: d.purpose,
              mandatory: Boolean(d.mandatory),
              ready: false,
            }))
          : entry.defaultChecklist,
    };
  });

  onProgress('Agent 2 completed eligibility verification and application planning', 'DONE');

  const eligibleCount = analyzedSchemes.filter((s) => s.outcome === 'Likely Eligible').length;
  const needsInfoCount = analyzedSchemes.filter((s) => s.outcome === 'Needs More Information').length;
  const notEligibleCount = analyzedSchemes.filter((s) => s.outcome === 'Not Eligible').length;

  return {
    analyzedSchemes,
    agent2Summary: `Evaluated ${analyzedSchemes.length} schemes: ${eligibleCount} Likely Eligible, ${needsInfoCount} Needs More Information, ${notEligibleCount} Not Eligible.`,
    retriesUsed,
  };
}
