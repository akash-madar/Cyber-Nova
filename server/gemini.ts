import { GoogleGenAI } from '@google/genai';

const DEPRECATED_MODELS = new Set([
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-2.0-flash',
  'gemini-2.0-pro',
  'gemini-2.0-flash-thinking',
]);

export const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';

export function resolveGeminiModel(): string {
  const configured = process.env.GEMINI_MODEL?.trim();
  if (!configured || DEPRECATED_MODELS.has(configured.toLowerCase())) {
    return DEFAULT_GEMINI_MODEL;
  }
  return configured;
}

export const GEMINI_MODEL = resolveGeminiModel();

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY' && key.length > 10);
}

export function getGeminiKeyHint(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'MY_GEMINI_API_KEY' || key.length <= 10) {
    return null;
  }
  return `••••${key.slice(-4)}`;
}

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}
