import { Scale } from "lucide-react";
import { GoogleButton } from "@/components/auth/google-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { safeNext } from "@/lib/auth";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const failed = params.error === "signin_failed";

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex flex-col items-start gap-3">
        <Scale size={36} className="text-espresso" aria-hidden />
        <Badge>Court clerk</Badge>
        <h1 className="text-display-verdict text-espresso">Please state your name.</h1>
        <p className="text-body-lg text-walnut">
          Sign in so the court knows who is testifying.
        </p>
      </div>
      <Card variant="verdict" className="flex flex-col gap-4">
        {failed && (
          <p role="alert" className="text-body-sm text-error">
            Sign-in didn&apos;t go through. Please try again.
          </p>
        )}
        <GoogleButton next={next} />
      </Card>
    </div>
  );
}
