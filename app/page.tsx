import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/auth/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CaseStage } from "@/lib/cases/stages";
import { cn } from "@/lib/cn";
import { getMyCouple, type CoupleState, type Partner } from "@/lib/couples";
import { createClient } from "@/lib/supabase/server";

// Tiles show first names only: full Google names run long, and when a profile has no name the
// email fallback shows just the part before "@".
function firstName(name: string) {
  const trimmed = name.trim();
  return trimmed.split("@")[0].split(/\s+/)[0] || trimmed;
}

// Who sits in a seat: P1 is always Partner A and P2 Partner B, whichever of them is viewing.
function seatFor(couple: CoupleState, role: Partner["role"]): Partner | null {
  if (couple.kind === "none") return null;
  if (couple.me.role === role) return couple.me;
  return couple.kind === "active" && couple.partner.role === role ? couple.partner : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

// One side of the "player select" screen. An empty seat (partner not joined yet) is drawn as a
// dashed outline instead of a filled tile.
async function PlayerTile({ number, role, player, isMe }: {
  number: 1 | 2;
  role: Partner["role"];
  player: Partner | null;
  isMe: boolean;
}) {
  const t = await getTranslations("docket");
  const tRoles = await getTranslations("roles");
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center gap-2 border-2 px-2 pb-3 pt-3.5",
        player
          ? "border-espresso bg-surface shadow-[4px_4px_0_0_var(--color-espresso)]"
          : "border-dashed border-espresso/40",
      )}
    >
      <span className="bg-espresso px-1.5 py-1 font-pixel text-[9px] text-rose">P{number}</span>
      {player ? (
        <Avatar variant="pixel" name={player.name} url={player.avatarUrl} className="size-16" />
      ) : (
        <span
          aria-hidden
          className="flex size-16 items-center justify-center border-2 border-dashed border-espresso/40 text-headline-md text-walnut"
        >
          ?
        </span>
      )}
      <span className={cn("max-w-full truncate text-headline-sm", player ? "text-espresso" : "text-walnut")}>
        {player ? firstName(player.name) : t("waitingSlot")}
      </span>
      <span className="text-label-docket uppercase text-walnut">
        {role === "partner_a" ? tRoles("partnerA") : tRoles("partnerB")}
        {isMe && ` ${tRoles("you")}`}
      </span>
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

  // Only what's needed for the CTA and the score bar — the full case list lives on the Archive page.
  const { data: cases } =
    couple.kind === "active"
      ? await supabase.from("cases").select("id, stage").order("created_at", { ascending: false })
      : { data: null };
  const openCase = cases?.find((c) => c.stage !== "CLOSED");
  const casesHeard = cases?.filter((c) => c.stage === "CLOSED").length ?? 0;
  const casesOpen = cases?.filter((c) => c.stage !== "CLOSED").length ?? 0;

  const statusBadge =
    couple.kind === "none"
      ? t("badgeNone")
      : couple.kind === "pending"
        ? t("badgePending")
        : openCase
          ? t(`status.${openCase.stage}` as `status.${Exclude<CaseStage, "CLOSED">}`)
          : t("badgeIdle");

  const title =
    couple.kind === "none"
      ? t("titleNone")
      : couple.kind === "pending"
        ? t("titlePending")
        : openCase
          ? t("titleInProgress")
          : t("titleReady");

  const p1 = seatFor(couple, "partner_a");
  const p2 = seatFor(couple, "partner_b");
  const myId = couple.kind === "none" ? null : couple.me.userId;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 md:gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Badge>{statusBadge}</Badge>
        <h1 className="text-headline-lg text-espresso md:text-display-verdict">{title}</h1>
      </div>

      {couple.kind === "none" && (
        <Card className="flex w-full flex-col gap-4">
          <p className="text-body-md text-ink">{t("noneBody")}</p>
          <Button href="/couple/new">{t("createCouple")}</Button>
        </Card>
      )}

      {couple.kind !== "none" && (
        <>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 md:gap-4">
            <PlayerTile number={1} role="partner_a" player={p1} isMe={p1?.userId === myId} />
            <span aria-hidden className="font-pixel text-base text-rose-deep">
              ♥
            </span>
            <PlayerTile number={2} role="partner_b" player={p2} isMe={p2?.userId === myId} />
          </div>

          {couple.kind === "active" && (
            <div className="flex items-center justify-between bg-espresso px-3 py-2.5 text-label-docket uppercase text-canvas">
              <span>
                {t("casesHeard")} <b className="tabular-nums text-rose">{pad(casesHeard)}</b>
              </span>
              <span>
                {t("openNow")} <b className="tabular-nums text-rose">{pad(casesOpen)}</b>
              </span>
            </div>
          )}

          <div className="flex flex-col items-center gap-3">
            {couple.kind === "active" ? (
              <Button href={openCase ? `/cases/${openCase.id}` : "/cases/new"} className="w-full">
                {openCase ? t("openCase") : t("fileCase")}
                <span aria-hidden>▶</span>
              </Button>
            ) : (
              <Button href="/couple/invite" variant="secondary" className="w-full">
                {t("showInvite")}
              </Button>
            )}
            <p className="animate-pixel-blink text-center text-label-docket uppercase text-walnut">
              {couple.kind === "pending" ? t("waitingPartner") : openCase ? t("resume") : t("pressStart")}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
