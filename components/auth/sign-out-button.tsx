import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="quiet" className="h-8 px-2">
        Sign out
      </Button>
    </form>
  );
}
