"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateCaseTitle } from "@/lib/ai/title";
import { transition } from "@/lib/cases/state-machine";
import { caseSchema, testimonySchema } from "@/lib/cases/testimony";
import { createClient } from "@/lib/supabase/server";

function optional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text === "" ? undefined : text;
}

export async function createCase(formData: FormData) {
  const parsed = caseSchema.safeParse({ context: formData.get("context") });
  if (!parsed.success) redirect("/cases/new?error=invalid");

  // The court names the case from the description (falls back to a plain title if the AI is down).
  const title = await generateCaseTitle(parsed.data.context);

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
