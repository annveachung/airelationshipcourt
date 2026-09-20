"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  const t = useTranslations("report");
  return (
    <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
      <Printer size={16} aria-hidden />
      {t("print")}
    </Button>
  );
}
