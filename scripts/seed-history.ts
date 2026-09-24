// DEV ONLY. Inserts ~8 realistic, CLEARLY FAKE closed cases (titled "[SEED] …") for one
// couple, spread over the last ~60 days, so Phase 8's charts have something to show. Uses the
// secret key directly — this is a standalone script, never imported by the app.
//
// Usage:  npx tsx scripts/seed-history.ts <coupleId>
// Clear:  npx tsx scripts/seed-history.ts --clear <coupleId>
//
// Never run this against a shared or production project.
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { aggregate, type PanelScores } from "../lib/cases/aggregate";
import { intensityBand } from "../lib/cases/intensity";

config({ path: ".env.local" });

if (process.env.NODE_ENV === "production") {
  throw new Error("seed-history.ts must not run in production.");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local.");
}
const db = createClient(url, secretKey, { auth: { persistSession: false } });

const SEED_PREFIX = "[SEED] ";
const DAY = 24 * 60 * 60 * 1000;

type Template = {
  title: string;
  primaryIssue: string;
  secondaryIssue: string;
  conflictType: string;
  conflictPatterns: string[];
  emotionsA: string[];
  emotionsB: string[];
  severityA: number;
  severityB: number;
  scores: PanelScores; // each panel member's A/B split for this fake case
  daysAgo: number;
};

// Eight cases across the last ~60 days: a mix of issues, intensities and winners so every
// chart (issue counts, intensity over time, responsibility distribution, emotions) has
// something varied to show.
const TEMPLATES: Template[] = [
  {
    title: "The Cancelled Anniversary Dinner",
    primaryIssue: "Communication",
    secondaryIssue: "Time and priorities",
    conflictType: "Misunderstanding",
    conflictPatterns: ["late notice of changed plans", "assuming the other already knew"],
    emotionsA: ["Hurt", "Ignored"],
    emotionsB: ["Guilty", "Overwhelmed"],
    severityA: 7,
    severityB: 6,
    scores: { jury: { a: 35, b: 65 }, family_counsellor: { a: 40, b: 60 }, social_worker: { a: 40, b: 60 } },
    daysAgo: 3,
  },
  {
    title: "The Great Dishwasher Standoff",
    primaryIssue: "Chores or money",
    secondaryIssue: "Expectations",
    conflictType: "Recurring pattern",
    conflictPatterns: ["unequal division of chores", "keeping score"],
    emotionsA: ["Frustrated", "Unappreciated"],
    emotionsB: ["Defensive", "Tired"],
    severityA: 5,
    severityB: 4,
    scores: { jury: { a: 55, b: 45 }, family_counsellor: { a: 50, b: 50 }, social_worker: { a: 50, b: 50 } },
    daysAgo: 9,
  },
  {
    title: "The In-Laws Visit Ambush",
    primaryIssue: "Family or friends",
    secondaryIssue: "Communication",
    conflictType: "Broken promise",
    conflictPatterns: ["deciding without checking first", "in-law boundaries"],
    emotionsA: ["Angry", "Disrespected"],
    emotionsB: ["Anxious", "Guilty"],
    severityA: 8,
    severityB: 7,
    scores: { jury: { a: 30, b: 70 }, family_counsellor: { a: 25, b: 75 }, social_worker: { a: 35, b: 65 } },
    daysAgo: 14,
  },
  {
    title: "Who Forgot to Pay the Internet Bill",
    primaryIssue: "Chores or money",
    secondaryIssue: "Trust",
    conflictType: "Misunderstanding",
    conflictPatterns: ["assuming the other handled it"],
    emotionsA: ["Frustrated"],
    emotionsB: ["Embarrassed", "Guilty"],
    severityA: 3,
    severityB: 3,
    scores: { jury: { a: 45, b: 55 }, family_counsellor: { a: 50, b: 50 }, social_worker: { a: 45, b: 55 } },
    daysAgo: 18,
  },
  {
    title: "The Silent Treatment After Game Night",
    primaryIssue: "Communication",
    secondaryIssue: "Assumptions",
    conflictType: "Different styles",
    conflictPatterns: ["withdrawing instead of talking", "mind-reading"],
    emotionsA: ["Lonely", "Confused"],
    emotionsB: ["Overwhelmed", "Numb"],
    severityA: 6,
    severityB: 6,
    scores: { jury: { a: 50, b: 50 }, family_counsellor: { a: 45, b: 55 }, social_worker: { a: 55, b: 45 } },
    daysAgo: 26,
  },
  {
    title: "The Surprise Weekend Trip Nobody Agreed To",
    primaryIssue: "Expectations",
    secondaryIssue: "Time and priorities",
    conflictType: "Clash of priorities",
    conflictPatterns: ["deciding without checking first"],
    emotionsA: ["Disappointed"],
    emotionsB: ["Stressed"],
    severityA: 4,
    severityB: 5,
    scores: { jury: { a: 60, b: 40 }, family_counsellor: { a: 55, b: 45 }, social_worker: { a: 60, b: 40 } },
    daysAgo: 33,
  },
  {
    title: "The Phone-at-Dinner Incident",
    primaryIssue: "Communication",
    secondaryIssue: "Stress",
    conflictType: "Recurring pattern",
    conflictPatterns: ["distraction during shared time"],
    emotionsA: ["Ignored", "Sad"],
    emotionsB: ["Stressed", "Guilty"],
    severityA: 5,
    severityB: 4,
    scores: { jury: { a: 35, b: 65 }, family_counsellor: { a: 40, b: 60 }, social_worker: { a: 45, b: 55 } },
    daysAgo: 45,
  },
  {
    title: "The Thermostat War",
    primaryIssue: "Family or friends",
    secondaryIssue: "Stress",
    conflictType: "Different styles",
    conflictPatterns: ["different comfort preferences", "keeping score"],
    emotionsA: ["Frustrated"],
    emotionsB: ["Frustrated"],
    severityA: 2,
    severityB: 2,
    scores: { jury: { a: 50, b: 50 }, family_counsellor: { a: 50, b: 50 }, social_worker: { a: 50, b: 50 } },
    daysAgo: 55,
  },
];

async function main() {
  const clear = process.argv.includes("--clear");
  const coupleId = process.argv.find((a) => /^[0-9a-f-]{36}$/i.test(a));
  if (!coupleId) throw new Error("Usage: npx tsx scripts/seed-history.ts [--clear] <coupleId>");

  if (clear) {
    const { data: caseIds } = await db.from("cases").select("id").eq("couple_id", coupleId).ilike("title", `${SEED_PREFIX}%`);
    for (const { id } of caseIds ?? []) {
      await db.from("cases").delete().eq("id", id); // cascades to testimonies/case_analyses/verdicts
    }
    console.log(`Removed ${caseIds?.length ?? 0} seeded case(s).`);
    return;
  }

  const { data: members, error: memberError } = await db
    .from("couple_members")
    .select("user_id, role")
    .eq("couple_id", coupleId);
  if (memberError || !members || members.length < 2) {
    throw new Error("Couple needs two members before seeding (create + join first).");
  }
  const userA = members.find((m) => m.role === "partner_a")!.user_id;
  const userB = members.find((m) => m.role === "partner_b")!.user_id;

  for (const t of TEMPLATES) {
    const closedAt = new Date(Date.now() - t.daysAgo * DAY).toISOString();

    const { data: theCase, error: caseError } = await db
      .from("cases")
      .insert({
        couple_id: coupleId,
        created_by: userA,
        title: SEED_PREFIX + t.title,
        context: "Seeded example case for testing the History page.",
        stage: "CLOSED",
        closed_reason: "treaty",
        closed_at: closedAt,
        created_at: closedAt,
      })
      .select("id")
      .single();
    if (caseError || !theCase) {
      console.error("Skipping (case insert failed):", t.title, caseError?.message);
      continue;
    }
    const caseId = theCase.id as string;

    await db.from("testimonies").insert([
      {
        case_id: caseId,
        user_id: userA,
        what_happened: `[Seed data] ${t.title} — Partner A's side.`,
        frequency: "sometimes",
        causes: [t.primaryIssue],
        needs: ["To be listened to"],
        emotions: t.emotionsA,
        severity: t.severityA,
        partner_did_wrong: "[Seed data] placeholder.",
      },
      {
        case_id: caseId,
        user_id: userB,
        what_happened: `[Seed data] ${t.title} — Partner B's side.`,
        frequency: "sometimes",
        causes: [t.secondaryIssue],
        needs: ["An apology"],
        emotions: t.emotionsB,
        severity: t.severityB,
        partner_did_wrong: "[Seed data] placeholder.",
      },
    ]);

    await db.from("case_analyses").insert({
      case_id: caseId,
      topics: [t.primaryIssue],
      emotions: [...t.emotionsA, ...t.emotionsB],
      discrepancies: ["[Seed data]"],
      expectations: ["[Seed data]"],
      potential_causes: [t.primaryIssue],
      conflict_patterns: t.conflictPatterns,
      follow_up_topics: [],
      primary_issue: t.primaryIssue,
      secondary_issue: t.secondaryIssue,
      conflict_type: t.conflictType,
    });

    const agg = aggregate(t.scores);
    await db.from("verdicts").insert({
      case_id: caseId,
      final_responsibility_a: agg.finalA,
      final_responsibility_b: agg.finalB,
      more_responsible: agg.moreResponsible,
      decided_by: agg.decidedBy,
      charges: { a: [], b: [], both: [] },
    });

    const band = intensityBand((t.severityA + t.severityB) / 2);
    console.log(`Seeded "${t.title}" (${t.daysAgo}d ago, ${band} intensity, A ${agg.finalA}% / B ${agg.finalB}%)`);
  }

  console.log("Done. Run with --clear to remove seeded cases later.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
