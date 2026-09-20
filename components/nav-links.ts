import { FilePlus, Gavel, ScrollText } from "lucide-react";

export const navLinks = [
  { href: "/", label: "Docket", icon: Gavel },
  { href: "/cases/new", label: "File Case", icon: FilePlus },
  { href: "/history", label: "Verdicts", icon: ScrollText },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
