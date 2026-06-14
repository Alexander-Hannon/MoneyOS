// Server-side Gemini REST client. Never import from client components.

import type { AIConfig } from "@/lib/ai/types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

type GeminiGenerateRequest = {
  systemInstruction?: { parts: { text: string }[] };
  contents: { role: "user"; parts: { text: string }[] }[];
  generationConfig: {
    responseMimeType: "application/json";
    responseSchema: Record<string, unknown>;
    temperature?: number;
  };
};

type GeminiGenerateResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
  }[];
  error?: { message?: string };
};

export function resolveGeminiModel(config: AIConfig): string {
  return config.model?.trim() || DEFAULT_GEMINI_MODEL;
}

export async function generateGeminiJson<T>(
  config: AIConfig,
  args: {
    systemPrompt: string;
    userPrompt: string;
    responseSchema: Record<string, unknown>;
  },
): Promise<T> {
  if (!config.apiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  const model = resolveGeminiModel(config);
  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

  const body: GeminiGenerateRequest = {
    systemInstruction: { parts: [{ text: args.systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: args.userPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: args.responseSchema,
      temperature: 0.3,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as GeminiGenerateResponse;

  if (!response.ok) {
    throw new Error(
      data.error?.message ?? `Gemini API request failed (${response.status}).`,
    );
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return JSON.parse(text) as T;
}
