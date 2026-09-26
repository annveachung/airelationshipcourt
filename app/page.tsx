import { Gavel } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/auth/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CaseStage } from "@/lib/cases/stages";
import { getMyCouple, type Partner } from "@/lib/couples";
import { createClient } from "@/lib/supabase/server";

async function PartnerRow({ partner, isMe }: { partner: Partner; isMe: boolean }) {
  const t = await getTranslations("roles");
  return (
    <div className="flex items-center gap-3">
      <Avatar name={partner.name} url={partner.avatarUrl} />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-body-md font-medium text-espresso">
          {partner.name}
          {isMe && ` ${t("you")}`}
        </span>
        <span className="text-label-docket uppercase text-walnut">
          {partner.role === "partner_a" ? t("partnerA") : t("partnerB")}
        </span>
      </div>
    </div>
  );
}

// A slim "who's paired up" line — the couple's names, de-emphasised so the CTA below it stays
// the clear focus of the page.
function PartnerStrip({ me, partner }: { me: Partner; partner: Partner }) {
  return (
    <div className="flex items-center gap-2 text-body-sm text-walnut">
      <Avatar name={me.name} url={me.avatarUrl} className="size-6 text-body-sm" />
      <span className="truncate">{me.name}</span>
      <span aria-hidden>&amp;</span>
      <Avatar name={partner.name} url={partner.avatarUrl} className="size-6 text-body-sm" />
      <span className="truncate">{partner.name}</span>
    </div>
  );
}

export default async function Home() {
  const t = await getTranslations("docket");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const couple = await getMyCouple(user.id);

  // Only what's needed to decide the CTA — the full case list now lives on the Archive page.
  const { data: cases } =
    couple.kind === "active"
      ? await supabase.from("cases").select("id, stage").order("created_at", { ascending: false })
      : { data: null };
  const openCase = cases?.find((c) => c.stage !== "CLOSED");

  const statusBadge =
    couple.kind === "none"
      ? t("badgeNone")
      : couple.kind === "pending"
        ? t("badgePending")
        : openCase
          ? t(`status.${openCase.stage}` as `status.${Exclude<CaseStage, "CLOSED">}`)
          : t("badgeIdle");

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center md:gap-8">
      <div className="flex flex-col items-center gap-3">
        <Badge>{statusBadge}</Badge>
        <h1 className="text-display-verdict text-espresso md:text-[44px] md:leading-[52px]">{t("title")}</h1>
      </div>

      {couple.kind === "none" && (
        <Card variant="verdict" className="flex w-full flex-col gap-4 text-left">
          <p className="text-body-md text-ink">{t("noneBody")}</p>
          <Button href="/couple/new">{t("createCouple")}</Button>
        </Card>
      )}

      {couple.kind === "pending" && (
        <Card variant="verdict" className="flex w-full flex-col gap-4 text-left">
          <PartnerRow partner={couple.me} isMe />
          <p className="text-body-md text-ink">{t("waitingPartner")}</p>
          <Button href="/couple/invite" variant="secondary">
            {t("showInvite")}
          </Button>
        </Card>
      )}

      {couple.kind === "active" && (
        <div className="flex w-full flex-col items-center gap-4">
          <PartnerStrip me={couple.me} partner={couple.partner} />
          <Card variant="verdict" className="flex w-full flex-col items-center gap-4 py-10">
            <Gavel size={40} className="text-espresso" aria-hidden />
            <Button href={openCase ? `/cases/${openCase.id}` : "/cases/new"} className="w-full md:w-auto md:px-12">
              {openCase ? t("openCase") : t("fileCase")}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
