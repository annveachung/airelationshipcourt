import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { renderNames } from "@/lib/ai/names";
import type { VerdictCharges } from "@/lib/cases/charges";

// The fixed-list charges (translated labels) plus each partner's custom, AI-written charge.
export async function ChargeList({
  charges,
  names,
  customA,
  customB,
}: {
  charges: VerdictCharges;
  names: { a: string; b: string };
  customA: string;
  customB: string;
}) {
  const t = await getTranslations("verdict");
  const tCharges = await getTranslations("charges");

  const block = (label: string, ids: VerdictCharges["a"], custom?: string) => (
    <div className="flex flex-col gap-2">
      <h4 className="text-body-sm font-medium text-espresso">{label}</h4>
      <div className="flex flex-wrap gap-2">
        {ids.map((id) => (
          <Badge key={id} className="normal-case">
            ⚠️ {tCharges(id)}
          </Badge>
        ))}
        {custom && (
          <Badge className="border-espresso/30 bg-surface normal-case">
            ⚠️ {renderNames(custom, names)}
          </Badge>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {block(names.a, charges.a, customA)}
      {block(names.b, charges.b, customB)}
      {block(t("both"), charges.both)}
    </div>
  );
}
