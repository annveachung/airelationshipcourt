type Props = { label?: string; title: string };

export function SectionHeading({ label, title }: Props) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-label-docket uppercase text-walnut">{label}</span>
      )}
      <h2 className="text-headline-lg text-espresso">{title}</h2>
    </div>
  );
}
