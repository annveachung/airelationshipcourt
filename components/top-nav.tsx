"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isActive, navLinks } from "./nav-links";

// Desktop navigation (md and up). Phones use the bottom tab bar instead.
export function TopNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return (
    <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
      {navLinks.map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-body-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-espresso",
              active ? "bg-rose/40 text-espresso" : "text-walnut hover:text-espresso",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
