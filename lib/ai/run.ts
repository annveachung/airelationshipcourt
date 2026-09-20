// SERVER ONLY. Runs one structured AI task with a claim (lock), an audit row,
// JSON extraction, schema validation and a repair-retry ladder.
import "server-only";
import type { ZodType } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { AI_MODEL, createAiClient, withoutThinking } from "./client";
import { extractJson } from "./json";

export type AiStageName = "analysis" | "follow_up_questions" | "panel" | "synthesis" | "translation" | "report";

export type RunResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "in_progress" }
  | { kind: "failed"; reason: "invalid_output" | "unavailable" };

const MAX_ATTEMPTS = 3;
const STALE_AFTER_MS = 5 * 60 * 1000;

type Message = { role: "system" | "user" | "assistant"; content: string };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Transport problems (timeouts, rate limits, 5xx) are retried briefly and do NOT
// use up a repair attempt.
function isTransport(error: unknown): boolean {
  const e = error as { status?: number; name?: string };
  return (
    e?.status === 429 ||
    (typeof e?.status === "number" && e.status >= 500) ||
    e?.name === "APIConnectionError" ||
    e?.name === "APIConnectionTimeoutError"
  );
}

async function callModel(messages: Message[], temperature: number, maxTokens: number) {
  const client = createAiClient();
  let lastError: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await client.chat.completions.create(
        withoutThinking({
          model: AI_MODEL,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: "json_object" as const },
          messages,
        }),
      );
      return res.choices[0]?.message?.content ?? "";
    } catch (error) {
      lastError = error;
      if (!isTransport(error) || i === 2) break;
      await sleep(1000 * (i + 1) * 1.5);
    }
  }
  throw lastError;
}

function summariseIssues(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return error.issues
    .slice(0, 8)
    .map((i) => `${i.path.map(String).join(".") || "(root)"}: ${i.message}`)
    .join("; ")
    .slice(0, 600);
}

export async function runStructured<T>(args: {
  caseId: string;
  stage: AiStageName;
  subKey?: string;
  schema: ZodType<T>;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<RunResult<T>> {
  const { caseId, stage, subKey = "", schema, system, user } = args;
  const db = createServiceClient();

  // A crashed or timed-out run must not block retries forever.
  await db
    .from("ai_runs")
    .update({ status: "failed", error: "timed out", finished_at: new Date().toISOString() })
    .eq("case_id", caseId)
    .eq("stage", stage)
    .eq("sub_key", subKey)
    .eq("status", "running")
    .lt("started_at", new Date(Date.now() - STALE_AFTER_MS).toISOString());

  // Claim: inserting the 'running' row IS the lock (see the ai_runs_claim index).
  const { data: run, error: claimError } = await db
    .from("ai_runs")
    .insert({ case_id: caseId, stage, sub_key: subKey, model: AI_MODEL, status: "running" })
    .select("id")
    .single();
  if (claimError || !run) {
    if (claimError?.code === "23505") return { kind: "in_progress" };
    console.error("ai claim failed:", stage, claimError?.code);
    return { kind: "failed", reason: "unavailable" };
  }

  const finish = (status: "succeeded" | "failed", error?: string) =>
    db
      .from("ai_runs")
      .update({ status, error: error ?? null, finished_at: new Date().toISOString() })
      .eq("id", run.id);

  const messages: Message[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  let lastIssues = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let raw: string;
    try {
      raw = await callModel(messages, attempt === 3 ? 0 : (args.temperature ?? 0.3), args.maxTokens ?? 1800);
    } catch (error) {
      const name = error instanceof Error ? error.name : "unknown";
      console.error("ai call failed:", stage, "attempt", attempt, name);
      await finish("failed", `call failed: ${name}`);
      return { kind: "failed", reason: "unavailable" };
    }

    // Keep the raw output BEFORE parsing: it's the only way to debug bad JSON.
    await db.from("ai_runs").update({ attempt, raw_output: raw }).eq("id", run.id);

    try {
      const parsed = schema.safeParse(extractJson(raw));
      if (parsed.success) {
        await finish("succeeded");
        return { kind: "ok", data: parsed.data };
      }
      lastIssues = summariseIssues(parsed.error);
    } catch {
      lastIssues = "the output was not a valid JSON object";
    }

    console.error("ai output invalid:", stage, "attempt", attempt);
    // Self-repair: show the model its own bad output and what was wrong with it.
    messages.push(
      { role: "assistant", content: raw },
      {
        role: "user",
        content: `Your previous response was invalid: ${lastIssues}. Return only a valid JSON object matching the required shape.`,
      },
    );
  }

  await finish("failed", `invalid output after ${MAX_ATTEMPTS} attempts: ${lastIssues}`);
  return { kind: "failed", reason: "invalid_output" };
}
