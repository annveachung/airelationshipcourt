"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateCaseTitle } from "@/lib/ai/title";
import { transition } from "@/lib/cases/state-machine";
import { normalizeClauses } from "@/lib/cases/treaty";
import { notifyBoth, notifyPartner } from "@/lib/notifications";
import { caseSchema, testimonySchema } from "@/lib/cases/testimony";
import type { Locale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

function optional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text === "" ? undefined : text;
}

export async function createCase(formData: FormData) {
  const parsed = caseSchema.safeParse({ context: formData.get("context") });
  if (!parsed.success) redirect("/cases/new?error=invalid");

  // The court names the case from the description (falls back to a plain title if the AI is down).
  const title = await generateCaseTitle(parsed.data.context, (await getLocale()) as Locale);

  const supabase = await createClient();
  const { data: caseId, error } = await supabase.rpc("create_case", {
    case_title: title,
    case_context: parsed.data.context,
  });

  if (error || typeof caseId !== "string") {
    console.error("create_case failed:", error?.message);
    const key = error?.message.includes("case_already_open")
      ? "case_already_open"
      : error?.message.includes("no_active_couple")
        ? "no_active_couple"
        : "unknown";
    redirect(`/cases/new?error=${key}`);
  }

  const {
    data: { user: filer },
  } = await supabase.auth.getUser();
  if (filer) await notifyPartner(filer.id, caseId, "case_filed");

  revalidatePath("/");
  redirect(`/cases/${caseId}`);
}

export async function submitTestimony(formData: FormData) {
  const parsed = testimonySchema.safeParse({
    caseId: formData.get("caseId"),
    whatHappened: formData.get("whatHappened"),
    emotions: formData.getAll("emotions"),
    severity: formData.get("severity"),
    causes: formData.getAll("causes"),
    causeNote: optional(formData.get("causeNote")),
    needs: formData.getAll("needs"),
    needsNote: optional(formData.get("needsNote")),
    frequency: formData.get("frequency"),
    partnerDidWrong: formData.get("partnerDidWrong"),
  });
  if (!parsed.success) {
    const id = String(formData.get("caseId") ?? "");
    redirect(/^[0-9a-f-]{36}$/i.test(id) ? `/cases/${id}?error=invalid` : "/");
  }
  const t = parsed.data;
  const caseUrl = `/cases/${t.caseId}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Row Level Security checks: it's my row, I'm in this couple, and the case is in TESTIMONY.
  const { error } = await supabase.from("testimonies").insert({
    case_id: t.caseId,
    user_id: user.id,
    what_happened: t.whatHappened,
    emotions: t.emotions,
    severity: t.severity,
    causes: t.causes,
    cause_note: t.causeNote ?? null,
    needs: t.needs,
    needs_note: t.needsNote ?? null,
    frequency: t.frequency,
    partner_did_wrong: t.partnerDidWrong,
  });

  if (error) {
    // Never log testimony text — only the code and ids.
    console.error("submit testimony failed:", error.code, "case", t.caseId, "user", user.id);
    redirect(`${caseUrl}?error=${error.code === "23505" ? "already_testified" : "not_allowed"}`);
  }

  await notifyPartner(user.id, t.caseId, "partner_testified");

  // If both partners have now testified, move the case on. The compare-and-swap
  // inside transition() makes this safe if both submit at the same moment.
  const { data: status } = await supabase.rpc("case_submission_status", { the_case: t.caseId });
  const row = (status as { a_submitted: boolean; b_submitted: boolean }[] | null)?.[0];
  if (row?.a_submitted && row?.b_submitted) {
    await transition(t.caseId, "TESTIMONY", "ANALYSIS");
  }

  revalidatePath(caseUrl);
  revalidatePath("/");
  redirect(caseUrl);
}

const ANSWER_MAX = 500;

export async function submitFollowUp(formData: FormData) {
  const caseId = String(formData.get("caseId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) redirect("/");
  const caseUrl = `/cases/${caseId}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Row Level Security only lets me read MY questions.
  const { data: questions } = await supabase
    .from("follow_up_questions")
    .select("id, format, options")
    .eq("case_id", caseId)
    .eq("user_id", user.id);
  if (!questions || questions.length === 0) redirect(`${caseUrl}?error=not_allowed`);

  // Validate every answer against its own question, server-side.
  const answers: Record<string, string | number>[] = [];
  for (const q of questions) {
    const raw = String(formData.get(`q_${q.id}`) ?? "").trim();
    if (q.format === "rating_1_10") {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > 10) redirect(`${caseUrl}?error=invalid`);
      answers.push({ question_id: q.id, answer_rating: n });
    } else if (q.format === "short_answer") {
      if (raw.length < 1 || raw.length > ANSWER_MAX) redirect(`${caseUrl}?error=invalid`);
      answers.push({ question_id: q.id, answer_text: raw });
    } else {
      const options = (q.options as string[] | null) ?? [];
      if (!options.includes(raw)) redirect(`${caseUrl}?error=invalid`);
      answers.push({ question_id: q.id, answer_choice: raw });
    }
  }

  // One transaction in the database: the submission marker plus every answer.
  const { error } = await supabase.rpc("submit_follow_up", { the_case: caseId, answers });
  if (error) {
    console.error("submit_follow_up failed:", error.message, "case", caseId, "user", user.id);
    const key = error.message.includes("already_answered")
      ? "already_answered"
      : error.message.includes("not_allowed")
        ? "not_allowed"
        : "invalid";
    redirect(`${caseUrl}?error=${key}`);
  }

  await notifyPartner(user.id, caseId, "partner_followed_up");

  // If both partners have now answered, hand the case to the panel (compare-and-swap is race-safe).
  const { data: status } = await supabase.rpc("case_submission_status", { the_case: caseId });
  const row = (status as { a_followed_up: boolean; b_followed_up: boolean }[] | null)?.[0];
  if (row?.a_followed_up && row?.b_followed_up) {
    await transition(caseId, "FOLLOW_UP", "PANEL_JUDGEMENT");
  }

  revalidatePath(caseUrl);
  revalidatePath("/");
  redirect(caseUrl);
}

// ---------------------------------------------------------------------------
// Phase 6: walking through the verdict, and closing the case
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function memberStatus(caseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.rpc("case_submission_status", { the_case: caseId });
  const row = (
    data as
      | { stage: string; a_signed: boolean; b_signed: boolean; report_ready: boolean }[]
      | null
  )?.[0];
  return { supabase, row, user };
}

/** VERDICT -> RECOMMENDATIONS, then RECOMMENDATIONS -> REPORT (once the report is written). */
export async function continueCase(formData: FormData) {
  const caseId = String(formData.get("caseId") ?? "");
  if (!UUID_RE.test(caseId)) redirect("/");
  const caseUrl = `/cases/${caseId}`;

  const { row } = await memberStatus(caseId);
  if (!row) redirect("/");

  if (row.stage === "VERDICT") {
    await transition(caseId, "VERDICT", "RECOMMENDATIONS");
  } else if (row.stage === "RECOMMENDATIONS") {
    if (!row.report_ready) redirect(`${caseUrl}?error=report_not_ready`);
    await transition(caseId, "RECOMMENDATIONS", "REPORT");
  }
  // Any other stage (or a partner already advanced it): nothing to do.

  revalidatePath(caseUrl);
  redirect(caseUrl);
}

/** Signs the Peace Treaty. The case closes when BOTH partners have signed. */
export async function signTreaty(formData: FormData) {
  const caseId = String(formData.get("caseId") ?? "");
  if (!UUID_RE.test(caseId)) redirect("/");
  const caseUrl = `/cases/${caseId}`;

  const { supabase, user } = await memberStatus(caseId);
  const clauses = normalizeClauses(formData.getAll("clauses"));

  const { error } = await supabase.rpc("sign_treaty", { the_case: caseId, agreed: clauses });
  if (error) {
    console.error("sign_treaty failed:", error.message, "case", caseId);
    const key = error.message.includes("already_signed")
      ? "already_signed"
      : error.message.includes("not_allowed")
        ? "not_allowed"
        : "invalid";
    redirect(`${caseUrl}?error=${key}`);
  }

  await notifyPartner(user.id, caseId, "partner_signed");

  // Both signed? Close the case (compare-and-swap: safe if both sign at the same moment).
  const { data } = await supabase.rpc("case_submission_status", { the_case: caseId });
  const row = (data as { a_signed: boolean; b_signed: boolean }[] | null)?.[0];
  if (row?.a_signed && row?.b_signed) {
    if (await transition(caseId, "REPORT", "CLOSED", { closedReason: "treaty" })) {
      await notifyBoth(caseId, "case_closed");
    }
  }

  revalidatePath(caseUrl);
  revalidatePath("/");
  redirect(caseUrl);
}

/** Closes the case without a treaty, so one stubborn partner can't block the couple forever. */
export async function adjournCase(formData: FormData) {
  const caseId = String(formData.get("caseId") ?? "");
  if (!UUID_RE.test(caseId)) redirect("/");
  const caseUrl = `/cases/${caseId}`;

  const { row, user } = await memberStatus(caseId);
  if (row?.stage === "REPORT") {
    if (await transition(caseId, "REPORT", "CLOSED", { closedReason: "adjourned" })) {
      await notifyPartner(user.id, caseId, "case_adjourned");
    }
  }

  revalidatePath(caseUrl);
  revalidatePath("/");
  redirect(caseUrl);
}
