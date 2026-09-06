import Link from "next/link";
import { ArrowUpRight, Trash2 } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/forms";
import { Panel, Row, Section } from "../_components/section";
import { readSources } from "../_lib/source";
import s from "../_components/sink.module.css";

export async function FormsSection() {
  const sources = await readSources([
    "forms/button/button.tsx",
    "forms/button/button.variants.ts",
  ]);
  return (
    <Section id="forms" title="Forms" blurb="Button, Input and Field. Field owns the label, the description and the error, and hands its child the aria wiring rather than trusting a caller to remember it.">
      <Panel title="Button" note="intent · size · state" sources={sources}>
        <Row label="intent">
          <Button intent="primary">Run now</Button>
          <Button intent="secondary">Edit scope</Button>
          <Button intent="ghost">Cancel</Button>
          <Button intent="danger">Reject</Button>
          <Button intent="link">Open lineage</Button>
        </Row>
        <Row label="size">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Delete"><Trash2 size={14} /></Button>
        </Row>
        <Row label="state">
          <Button>Idle</Button>
          <Button loading>Running</Button>
          <Button disabled>Disabled</Button>
        </Row>
        <Row label="asChild">
          <Button asChild intent="secondary">
            <Link href="#tokens">Go to tokens <ArrowUpRight size={13} /></Link>
          </Button>
        </Row>
      </Panel>

      <Panel title="Input and Field">
        <div className={s.stack}>
          <Field label="Work email" hint="We never send anything you did not ask for.">
            {(aria) => <Input {...aria} type="email" placeholder="you@firm.example" />}
          </Field>
          <Field label="Password" required error="Use at least twelve characters.">
            {(aria) => <Input {...aria} type="password" />}
          </Field>
          <Field label="Scope rules" hint="One pattern per line. Exclude beats include.">
            {(aria) => <Textarea {...aria} mono defaultValue={"*.halcyon.example\n198.51.100.0/24"} />}
          </Field>
        </div>
      </Panel>
    </Section>
  );
}
