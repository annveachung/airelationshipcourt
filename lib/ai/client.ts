// SERVER ONLY. Alibaba DashScope (Qwen) through its OpenAI-compatible API.
// Phase 4 builds its analysis and panel tasks on this same client.
import "server-only";
import OpenAI from "openai";

// The model lives in one place so swapping it is a one-line env change.
export const AI_MODEL = process.env.DASHSCOPE_MODEL || "qwen-plus";

export function aiConfigured(): boolean {
  return Boolean(process.env.DASHSCOPE_API_KEY && process.env.DASHSCOPE_BASE_URL);
}

export function createAiClient() {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  const baseURL = process.env.DASHSCOPE_BASE_URL;
  if (!apiKey || !baseURL) {
    throw new Error(
      "Missing DASHSCOPE_API_KEY or DASHSCOPE_BASE_URL. Add them to .env.local, then restart `npm run dev`.",
    );
  }
  return new OpenAI({ apiKey, baseURL, timeout: 15_000, maxRetries: 1 });
}
