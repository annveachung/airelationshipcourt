import { redirect } from "next/navigation";
import { acceptInvite } from "@/app/couple/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { friendlyError, getMyCouple, INVITE_CODE_PATTERN } from "@/lib/couples";
import { createClient } from "@/lib/supabase/server";

export default async function JoinPage({ params, searchParams }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const error = friendlyError((await searchParams).error);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/join/${code}`)}`);

  // Validate the shape before touching the database.
  const valid = INVITE_CODE_PATTERN.test(code);
  let inviter: string | null = null;
  if (valid) {
    const { data } = await supabase.rpc("invite_preview", { invite_code: code });
    inviter = (data as { inviter_name: string }[] | null)?.[0]?.inviter_name ?? null;
  }

  const alreadyInCouple = (await getMyCouple(user.id)).kind !== "none";

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading label="Summons" title="You've been invited" />
      <Card variant="verdict" className="flex flex-col gap-4">
        {!inviter ? (
          <p role="alert" className="text-body-md text-error">
            {error ?? "That invite link is invalid, already used, or expired. Ask your partner for a new one."}
          </p>
        ) : alreadyInCouple ? (
          <p className="text-body-md text-ink">You&apos;re already part of a couple.</p>
        ) : (
          <>
            <p className="text-body-md text-ink">
              <strong>{inviter}</strong> has invited you to join their court as
              Partner B.
            </p>
            {error && (
              <p role="alert" className="text-body-sm text-error">
                {error}
              </p>
            )}
            <form action={acceptInvite}>
              <input type="hidden" name="code" value={code} />
              <Button type="submit" className="w-full">
                Join the court
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
