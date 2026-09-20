import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/auth/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { STAGE_LABELS, type CaseStage } from "@/lib/cases/stages";
import { getMyCouple, type Partner } from "@/lib/couples";
import { createClient } from "@/lib/supabase/server";

function PartnerRow({ partner, isMe }: { partner: Partner; isMe: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={partner.name} url={partner.avatarUrl} />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-body-md font-medium text-espresso">
          {partner.name}
          {isMe && " (you)"}
        </span>
        <span className="text-label-docket uppercase text-walnut">
          {partner.role === "partner_a" ? "Partner A" : "Partner B"}
        </span>
      </div>
    </div>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const couple = await getMyCouple(user.id);

  const { data: cases } =
    couple.kind === "active"
      ? await supabase
          .from("cases")
          .select("id, title, stage, created_at")
          .order("created_at", { ascending: false })
      : { data: null };
  const openCase = cases?.find((c) => c.stage !== "CLOSED");

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-3">
        <Badge>Court is in session</Badge>
        <h1 className="text-display-verdict text-espresso md:text-[44px] md:leading-[52px]">
          Your docket
        </h1>
      </div>

      {couple.kind === "none" && (
        <Card variant="verdict" className="flex max-w-xl flex-col gap-4">
          <p className="text-body-md text-ink">
            Every case needs two parties. Create your couple, then invite your partner.
          </p>
          <Button href="/couple/new">Create a couple</Button>
        </Card>
      )}

      {couple.kind === "pending" && (
        <Card variant="verdict" className="flex max-w-xl flex-col gap-4">
          <PartnerRow partner={couple.me} isMe />
          <p className="text-body-md text-ink">Waiting for your partner to join.</p>
          <Button href="/couple/invite" variant="secondary">
            Show invite link
          </Button>
        </Card>
      )}

      {couple.kind === "active" && (
        <div className="grid gap-6 md:grid-cols-2 md:items-start md:gap-8">
          <Card variant="verdict" className="flex flex-col gap-4">
            <PartnerRow partner={couple.me} isMe />
            <PartnerRow partner={couple.partner} isMe={false} />
            {openCase ? (
              <Button href={`/cases/${openCase.id}`}>Go to your open case</Button>
            ) : (
              <Button href="/cases/new">File a case</Button>
            )}
          </Card>

          <section className="flex flex-col gap-3" aria-labelledby="cases-heading">
            <h2 id="cases-heading" className="text-label-docket uppercase text-walnut">
              Cases
            </h2>
            {cases && cases.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {cases.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/cases/${c.id}`}
                      className="flex min-h-14 items-center justify-between gap-3 rounded-card border border-hairline bg-surface px-4 py-3 shadow-card focus-visible:outline-2 focus-visible:outline-espresso"
                    >
                      <span className="min-w-0 truncate text-body-md font-medium text-espresso">
                        {c.title}
                      </span>
                      <Badge className="shrink-0">{STAGE_LABELS[c.stage as CaseStage]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Card>
                <p className="text-body-md text-walnut">No cases yet. File your first one.</p>
              </Card>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
