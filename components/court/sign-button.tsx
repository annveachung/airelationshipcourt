"use client";

import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SignButton() {
  const t = useTranslations("treaty");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto md:px-10">
      {pending ? t("signing") : t("sign")}
    </Button>
  );
}
