import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "quiet";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition " +
  "active:scale-[0.98] active:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-espresso disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "h-[50px] bg-espresso px-6 text-body-md text-canvas",
  secondary:
    "h-[50px] border border-hairline-strong bg-canvas/85 px-6 text-body-md text-espresso " +
    "backdrop-blur-md hover:bg-rose/30",
  quiet: "h-10 px-3 text-body-sm text-walnut hover:text-espresso",
};

type Props = { variant?: Variant } & (
  | ({ href: string } & Omit<ComponentProps<typeof Link>, "href">)
  | ({ href?: undefined } & ComponentProps<"button">)
);

export function Button({ variant = "primary", className, ...props }: Props) {
  const classes = cn(base, variants[variant], className);
  if (props.href !== undefined) {
    return <Link {...props} className={classes} />;
  }
  return <button type="button" {...props} className={classes} />;
}
