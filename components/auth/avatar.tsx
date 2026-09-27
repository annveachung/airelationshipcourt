import { cn } from "@/lib/cn";

type Props = {
  name: string;
  url: string | null;
  className?: string;
  // "pixel" is the square, hard-bordered frame used on the Home player tiles. It carries no size,
  // so callers set one (e.g. `size-16`) rather than fighting a default.
  variant?: "round" | "pixel";
};

const frame = {
  round: "size-10 shrink-0 rounded-full border border-hairline-strong",
  pixel: "shrink-0 border-2 border-espresso",
};

const initialText = {
  round: "text-body-sm font-semibold",
  pixel: "text-headline-md",
};

export function Avatar({ name, url, className, variant = "round" }: Props) {
  const base = frame[variant];
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" referrerPolicy="no-referrer" className={cn(base, "object-cover", className)} />;
  }
  return (
    <span
      aria-hidden
      className={cn(base, "flex items-center justify-center bg-rose text-espresso", initialText[variant], className)}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
