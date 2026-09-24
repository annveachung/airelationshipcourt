import { getTranslations } from "next-intl/server";

// One person's line on the treaty: their name in a script hand once signed, else an empty line.
export async function SignatureBlock({ name, signed }: { name: string; signed: boolean }) {
  const t = await getTranslations("treaty");
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-label-docket uppercase text-walnut">{name}</span>
      {signed ? (
        <p className="break-words border-b border-espresso/40 pb-1 font-[cursive] text-headline-lg text-espresso">
          {name}
        </p>
      ) : (
        <p className="border-b border-dashed border-hairline-strong pb-1 text-body-sm text-walnut">
          {t("awaiting", { name })}
        </p>
      )}
    </div>
  );
}
