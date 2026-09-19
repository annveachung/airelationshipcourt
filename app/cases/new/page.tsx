import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";

export default function NewCasePage() {
  return (
    <div className="flex flex-col gap-4">
      <SectionHeading label="Docket" title="File a case" />
      <Card>
        <p className="text-body-md text-walnut">
          Filing a case arrives in Phase 3.
        </p>
      </Card>
    </div>
  );
}
