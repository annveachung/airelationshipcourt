"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { useSound } from "@/components/sound-provider";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "quiet";

const base =
  "relative inline-flex items-center justify-center gap-2 font-medium " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-espresso " +
  "disabled:pointer-events-none disabled:opacity-50";

// Pixel-arcade buttons (ported from the Stitch "Y2K Pixel Button Design System" showcase) —
// square corners, a hard border, and a stepped bevel shadow that flattens on press instead of
// today's soft blur/scale. `.btn-pixel*` classes live in globals.css (the multi-layer bevel
// shadows aren't expressible as a single reusable Tailwind shadow token).
const variants: Record<Variant, string> = {
  primary: "btn-pixel btn-pixel-primary h-[50px] px-6 text-[11px]",
  secondary: "btn-pixel btn-pixel-secondary h-[50px] px-6 text-[11px]",
  // `quiet` stays flat/minimal — de-emphasised actions shouldn't compete with the arcade buttons.
  quiet: "h-10 px-3 text-body-sm text-walnut hover:text-espresso",
};

type Props = { variant?: Variant } & (
  | ({ href: string } & Omit<ComponentProps<typeof Link>, "href">)
  | ({ href?: undefined } & ComponentProps<"button">)
);

export function Button({ variant = "primary", className, onClick, children, ...props }: Props) {
  const sound = useSound();
  const classes = cn(base, variants[variant], className);

  // Plays the click sound (a no-op when sound is off/unsupported) without swallowing whatever
  // click handler the caller passed in.
  function handleClick(event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) {
    sound?.play("click");
    (onClick as ((e: typeof event) => void) | undefined)?.(event);
  }

  if (props.href !== undefined) {
    return (
      <Link {...props} onClick={handleClick} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" {...props} onClick={handleClick} className={classes}>
      {children}
    </button>
  );
}
