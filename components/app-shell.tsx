import type { ReactNode } from "react";
import { Scale } from "lucide-react";
import { Avatar } from "@/components/auth/avatar";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { TabBar } from "./tab-bar";

export async function AppShell({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name: string =
    user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? "";
  const avatarUrl: string | null = user?.user_metadata?.avatar_url ?? null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-hairline bg-canvas/85 px-5 py-3 backdrop-blur-[20px] backdrop-saturate-150">
        <Scale size={20} className="text-espresso" aria-hidden />
        <span className="flex-1 text-label-docket uppercase text-espresso">
          AI Relationship Court
        </span>
        {user && (
          <>
            <Avatar name={name} url={avatarUrl} className="size-7 text-label-sm" />
            <SignOutButton />
          </>
        )}
      </header>
      <main className="flex-1 px-5 pb-28 pt-6">{children}</main>
      <TabBar />
    </div>
  );
}
