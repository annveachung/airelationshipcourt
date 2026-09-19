import type { ReactNode } from "react";
import { Scale } from "lucide-react";
import { TabBar } from "./tab-bar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-hairline bg-canvas/85 px-5 py-3 backdrop-blur-[20px] backdrop-saturate-150">
        <Scale size={20} className="text-espresso" aria-hidden />
        <span className="text-label-docket uppercase text-espresso">
          AI Relationship Court
        </span>
      </header>
      <main className="flex-1 px-5 pb-28 pt-6">{children}</main>
      <TabBar />
    </div>
  );
}
