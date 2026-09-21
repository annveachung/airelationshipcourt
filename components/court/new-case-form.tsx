"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { createCase } from "@/app/cases/actions";
import { Button } from "@/components/ui/button";
import { SpeechButton } from "@/components/ui/speech-button";
import { fieldClasses } from "@/components/ui/input";
import { LIMITS } from "@/lib/cases/testimony";
import { cn } from "@/lib/cn";
import { appendSpoken } from "@/lib/voice";

function Submit() {
  const t = useTranslations("newCase");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto md:self-start md:px-10">
      {pending ? t("submitting") : t("submit")}
    </Button>
  );
}

export function NewCaseForm() {
  const t = useTranslations("newCase");
  const [value, setValue] = useState("");
  return (
    <form action={createCase} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <label htmlFor="context" className="text-label-docket uppercase text-walnut">
            {t("fieldLabel")}
          </label>
          <SpeechButton onText={(text) => setValue((v) => appendSpoken(v, text, LIMITS.context))} />
        </div>
        <p className="text-body-sm text-walnut">{t("fieldHint")}</p>
        <textarea
          id="context"
          name="context"
          rows={4}
          required
          minLength={10}
          maxLength={LIMITS.context}
          placeholder={t("placeholder")}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={cn(fieldClasses, "min-h-28 resize-y")}
        />
        <span className="self-end text-body-sm text-walnut">
          {value.length}/{LIMITS.context}
        </span>
      </div>
      <Submit />
    </form>
  );
}
