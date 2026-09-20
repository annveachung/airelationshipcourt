import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionHeading } from "@/components/ui/section-heading";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";

const swatches = [
  ["espresso", "bg-espresso"],
  ["espresso-deep", "bg-espresso-deep"],
  ["rose", "bg-rose"],
  ["rose-deep", "bg-rose-deep"],
  ["canvas", "bg-canvas border border-hairline-strong"],
  ["walnut", "bg-walnut"],
  ["surface", "bg-surface border border-hairline-strong"],
  ["ink", "bg-ink"],
  ["recessed", "bg-recessed"],
  ["error", "bg-error"],
];

const typeScale = [
  ["display-verdict", "text-display-verdict"],
  ["headline-lg", "text-headline-lg"],
  ["headline-md", "text-headline-md"],
  ["headline-sm", "text-headline-sm"],
  ["body-lg", "text-body-lg"],
  ["body-md", "text-body-md"],
  ["body-sm", "text-body-sm"],
  ["label-docket", "text-label-docket uppercase"],
];

export default function DesignPage() {
  return (
    <Page className="gap-10">
      <SectionHeading label="Dev only" title="Design system" />

      <section className="flex flex-col gap-3">
        <h3 className="text-headline-sm text-espresso">Colours</h3>
        <div className="grid grid-cols-2 gap-3">
          {swatches.map(([name, cls]) => (
            <div key={name} className="flex items-center gap-3">
              <span className={`size-10 rounded-full ${cls}`} />
              <span className="text-body-sm text-ink">{name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-headline-sm text-espresso">Type</h3>
        {typeScale.map(([name, cls]) => (
          <p key={name} className={`${cls} text-espresso`}>
            {name}
          </p>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-headline-sm text-espresso">Buttons</h3>
        <Button>Issue ruling</Button>
        <Button variant="secondary">Cross-examine</Button>
        <Button variant="quiet">Drop charges</Button>
        <Button disabled>Disabled</Button>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-headline-sm text-espresso">Cards</h3>
        <Card>
          <p className="text-body-md text-ink">A standard docket card.</p>
        </Card>
        <Card variant="verdict">
          <p className="text-body-md text-ink">The verdict card, double-framed.</p>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-headline-sm text-espresso">Badges</h3>
        <div className="flex flex-wrap gap-2">
          <Badge>Case #024</Badge>
          <Badge>Pending plea</Badge>
          <Badge>Verdict ready</Badge>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-headline-sm text-espresso">Fields</h3>
        <Input label="Case title" name="title" placeholder="The Great Dinner Incident" />
        <Textarea label="What happened?" name="what" placeholder="Tell the court…" />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-headline-sm text-espresso">Segmented control</h3>
        <SegmentedControl options={["Plaintiff", "Joint", "Defense"]} />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-headline-sm text-espresso">Progress</h3>
        {[0, 35, 70, 100].map((v) => (
          <div key={v} className="flex items-center gap-3">
            <span className="w-10 text-body-sm text-walnut">{v}%</span>
            <ProgressBar value={v} label={`${v} percent`} />
          </div>
        ))}
      </section>
    </Page>
  );
}
