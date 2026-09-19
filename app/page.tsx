import { redirect } from "next/navigation";
import { Avatar } from "@/components/auth/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMyCouple, type Partner } from "@/lib/couples";
import { createClient } from "@/lib/supabase/server";

function PartnerRow({ partner, isMe }: { partner: Partner; isMe: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={partner.name} url={partner.avatarUrl} />
      <div className="flex flex-col">
        <span className="text-body-md font-medium text-espresso">
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Badge>Court is in session</Badge>
        <h1 className="text-display-verdict text-espresso">Your docket</h1>
      </div>

      {couple.kind === "none" && (
        <Card variant="verdict" className="flex flex-col gap-4">
          <p className="text-body-md text-ink">
            Every case needs two parties. Create your couple, then invite your partner.
          </p>
          <Button href="/couple/new">Create a couple</Button>
        </Card>
      )}

      {couple.kind === "pending" && (
        <Card variant="verdict" className="flex flex-col gap-4">
          <PartnerRow partner={couple.me} isMe />
          <p className="text-body-md text-ink">Waiting for your partner to join.</p>
          <Button href="/couple/invite" variant="secondary">
            Show invite link
          </Button>
        </Card>
      )}

      {couple.kind === "active" && (
        <Card variant="verdict" className="flex flex-col gap-4">
          <PartnerRow partner={couple.me} isMe />
          <PartnerRow partner={couple.partner} isMe={false} />
          <Button href="/cases/new">File a case</Button>
        </Card>
      )}
    </div>
  );
}
