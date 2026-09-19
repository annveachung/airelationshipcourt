import { cn } from "@/lib/cn";

type Props = { name: string; url: string | null; className?: string };

export function Avatar({ name, url, className }: Props) {
  const base = "size-10 shrink-0 rounded-full border border-hairline-strong";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" referrerPolicy="no-referrer" className={cn(base, "object-cover", className)} />;
  }
  return (
    <span
      aria-hidden
      className={cn(base, "flex items-center justify-center bg-rose text-body-sm font-semibold text-espresso", className)}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
