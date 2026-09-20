import { getTranslations } from "next-intl/server";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export async function SignOutButton() {
  const t = await getTranslations("shell");
  return (
    <form action={signOut}>
      <Button type="submit" variant="quiet" className="h-8 px-2">
        {t("signOut")}
      </Button>
    </form>
  );
}
