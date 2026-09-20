"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createCase } from "@/app/cases/actions";
import { Button } from "@/components/ui/button";
import { fieldClasses } from "@/components/ui/input";
import { LIMITS } from "@/lib/cases/testimony";
import { cn } from "@/lib/cn";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto md:self-start md:px-10">
      {pending ? "The clerk is naming your case…" : "File the case"}
    </Button>
  );
}

export function NewCaseForm() {
  const [length, setLength] = useState(0);
  return (
    <form action={createCase} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="context" className="text-label-docket uppercase text-walnut">
          What is this case about?
        </label>
        <p className="text-body-sm text-walnut">
          A sentence or two of neutral background. The court will give the case a title — keep
          your side of the story for your testimony.
        </p>
        <textarea
          id="context"
          name="context"
          rows={4}
          required
          minLength={10}
          maxLength={LIMITS.context}
          placeholder="We argued because one of us cancelled dinner plans at the last minute."
          onChange={(e) => setLength(e.target.value.length)}
          className={cn(fieldClasses, "min-h-28 resize-y")}
        />
        <span className="self-end text-body-sm text-walnut">
          {length}/{LIMITS.context}
        </span>
      </div>
      <Submit />
    </form>
  );
}
