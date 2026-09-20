import { Card } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { SectionHeading } from "@/components/ui/section-heading";

export default function HistoryPage() {
  return (
    <Page className="gap-4">
      <SectionHeading label="Registry" title="Verdicts" />
      <Card>
        <p className="text-body-md text-walnut">Past cases and insights arrive in Phase 8.</p>
      </Card>
    </Page>
  );
}
