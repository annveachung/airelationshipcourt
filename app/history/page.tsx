import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { SectionHeading } from "@/components/ui/section-heading";

export default async function HistoryPage() {
  const t = await getTranslations("history");
  return (
    <Page className="gap-4">
      <SectionHeading label={t("label")} title={t("title")} />
      <Card>
        <p className="text-body-md text-walnut">{t("body")}</p>
      </Card>
    </Page>
  );
}
