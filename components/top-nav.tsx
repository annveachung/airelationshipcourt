"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isActive, navLinks } from "./nav-links";

// Desktop navigation (md and up). Phones use the bottom tab bar instead.
export function TopNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tShell = useTranslations("shell");
  if (pathname === "/login") return null;
  return (
    <nav aria-label={tShell("mainNav")} className="hidden flex-1 items-center gap-1 md:flex">
      {navLinks.map(({ href, labelKey }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-label-docket uppercase transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-espresso",
              active ? "bg-rose/40 text-espresso" : "text-walnut hover:text-espresso",
            )}
          >
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
