"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePlus, Gavel, ScrollText } from "lucide-react";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/", label: "Docket", icon: Gavel },
  { href: "/cases/new", label: "File Case", icon: FilePlus },
  { href: "/history", label: "Verdicts", icon: ScrollText },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[430px] border-t border-hairline bg-canvas/85 backdrop-blur-[20px] backdrop-saturate-150 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-label-docket uppercase",
                  active ? "text-espresso" : "text-walnut",
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
