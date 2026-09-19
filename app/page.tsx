import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Badge>Court is in session</Badge>
        <h1 className="text-display-verdict text-espresso">
          Two sides. One verdict.
        </h1>
        <p className="text-body-lg text-walnut">
          Tell the court what happened. A panel of AI officials will weigh both
          stories and rule — fairly, and with a little humour.
        </p>
      </div>
      <Card variant="verdict" className="flex flex-col gap-4">
        <p className="text-body-md text-ink">
          Each partner testifies privately. Nobody sees the other&apos;s story
          until the verdict is read.
        </p>
        <Button href="/cases/new">File a case</Button>
      </Card>
    </div>
  );
}
