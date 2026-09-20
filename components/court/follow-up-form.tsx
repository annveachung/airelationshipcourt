"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { submitFollowUp } from "@/app/cases/actions";
import { Button } from "@/components/ui/button";
import { fieldClasses } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export type FollowUpQuestionRow = {
  id: string;
  question_text: string;
  format: "multiple_choice" | "true_false_unsure" | "rating_1_10" | "short_answer";
  options: string[] | null;
};

const chip = cn(
  "inline-flex min-h-11 items-center rounded-full border border-hairline-strong bg-surface px-4 text-body-sm text-espresso",
  "peer-checked:border-espresso peer-checked:bg-espresso peer-checked:text-canvas",
  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-espresso",
);

function Submit({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-col gap-2">
      <Button type="submit" disabled={pending || !ready} className="w-full md:w-auto md:min-w-56">
        {pending ? "Submitting…" : "Submit answers"}
      </Button>
      {!ready && <p className="text-body-sm text-walnut">Answer every question to continue.</p>}
    </div>
  );
}

export function FollowUpForm({
  caseId,
  questions,
}: {
  caseId: string;
  questions: FollowUpQuestionRow[];
}) {
  // Which questions have been answered (a slider only counts once it's been moved).
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const ready = questions.every((q) => answered[q.id]);
  const mark = (id: string, done: boolean) => setAnswered((a) => ({ ...a, [id]: done }));

  return (
    <form action={submitFollowUp} className="flex flex-col gap-8">
      <input type="hidden" name="caseId" value={caseId} />

      {questions.map((q, i) => {
        const field = `q_${q.id}`;
        return (
          <fieldset key={q.id} className="flex flex-col gap-3">
            <legend className="mb-1 text-body-lg font-medium text-espresso">
              <span className="mr-2 text-label-docket uppercase text-walnut">Q{i + 1}</span>
              {q.question_text}
            </legend>

            {(q.format === "multiple_choice" || q.format === "true_false_unsure") && (
              <div className="flex flex-wrap gap-2">
                {(q.options ?? []).map((option) => (
                  <label key={option} className="cursor-pointer">
                    <input
                      type="radio"
                      name={field}
                      value={option}
                      required
                      onChange={() => mark(q.id, true)}
                      className="peer sr-only"
                    />
                    <span className={chip}>{option}</span>
                  </label>
                ))}
              </div>
            )}

            {q.format === "rating_1_10" && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    name={field}
                    min={1}
                    max={10}
                    value={ratings[q.id] ?? 5}
                    aria-label={q.question_text}
                    onChange={(e) => {
                      setRatings((r) => ({ ...r, [q.id]: Number(e.target.value) }));
                      mark(q.id, true);
                    }}
                    className="h-11 w-full accent-espresso md:max-w-md"
                  />
                  <span className="w-8 text-right text-headline-md text-espresso">
                    {answered[q.id] ? (ratings[q.id] ?? 5) : "–"}
                  </span>
                </div>
                <div className="flex justify-between text-body-sm text-walnut md:max-w-md">
                  <span>1 = not at all</span>
                  <span>10 = very much</span>
                </div>
              </div>
            )}

            {q.format === "short_answer" && (
              <ShortAnswer
                name={field}
                onAnswered={(has) => mark(q.id, has)}
                label={q.question_text}
              />
            )}
          </fieldset>
        );
      })}

      <p className="text-body-sm text-walnut">
        You only get one round of follow-up questions. Your answers stay private until the verdict.
      </p>
      <Submit ready={ready} />
    </form>
  );
}

function ShortAnswer({
  name,
  label,
  onAnswered,
}: {
  name: string;
  label: string;
  onAnswered: (has: boolean) => void;
}) {
  const [length, setLength] = useState(0);
  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        name={name}
        rows={3}
        maxLength={500}
        required
        aria-label={label}
        onChange={(e) => {
          setLength(e.target.value.length);
          onAnswered(e.target.value.trim().length > 0);
        }}
        className={cn(fieldClasses, "min-h-24 resize-y")}
      />
      <span className="self-end text-body-sm text-walnut">{length}/500</span>
    </div>
  );
}
