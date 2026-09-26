import { FilePlus, Gavel, ScrollText } from "lucide-react";

export const navLinks = [
  { href: "/", labelKey: "home" as const, icon: Gavel },
  { href: "/cases/new", labelKey: "fileCase" as const, icon: FilePlus },
  { href: "/history", labelKey: "archive" as const, icon: ScrollText },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
