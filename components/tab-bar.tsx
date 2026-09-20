"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isActive, navLinks } from "./nav-links";

// Phone navigation (below md). Desktop uses the top nav instead.
export function TabBar() {
  const pathname = usePathname();
  // Signed-out screens have nowhere to navigate to.
  if (pathname === "/login") return null;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-canvas/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-[20px] backdrop-saturate-150 md:hidden"
    >
      <ul className="mx-auto flex max-w-[430px]">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-label-docket uppercase",
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
