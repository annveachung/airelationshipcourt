import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// A single reading-width column, centred on desktop (forms, sign-in, settings).
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto flex w-full max-w-xl flex-col gap-6", className)}>{children}</div>;
}

// Main content plus a side column that stacks below on phones.
export function PageWithSidebar({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-8">
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
      <aside className="flex flex-col gap-4 md:sticky md:top-24">{sidebar}</aside>
    </div>
  );
}
