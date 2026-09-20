import type { ReactNode } from "react";
import { Scale } from "lucide-react";
import { Avatar } from "@/components/auth/avatar";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { TabBar } from "./tab-bar";
import { TopNav } from "./top-nav";

// Phones: single narrow column with a bottom tab bar.
// md and up (>=768px): wider centred content with navigation in the top bar.
const container = "mx-auto w-full max-w-[430px] px-5 md:max-w-5xl md:px-8";

export async function AppShell({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name: string =
    user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? "";
  const avatarUrl: string | null = user?.user_metadata?.avatar_url ?? null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/85 backdrop-blur-[20px] backdrop-saturate-150">
        <div className={`${container} flex items-center gap-2 py-3 md:gap-6`}>
          <div className="flex items-center gap-2">
            <Scale size={20} className="text-espresso" aria-hidden />
            <span className="text-label-docket uppercase text-espresso">
              AI Relationship Court
            </span>
          </div>
          <TopNav />
          <span className="flex-1 md:hidden" />
          {user && (
            <div className="flex items-center gap-2">
              <Avatar name={name} url={avatarUrl} className="size-7 text-label-sm" />
              <SignOutButton />
            </div>
          )}
        </div>
      </header>
      <main className={`${container} flex-1 pb-28 pt-6 md:pb-12 md:pt-10`}>{children}</main>
      <TabBar />
    </div>
  );
}
