import Link from "next/link";
import { ArrowUpRight, Trash2 } from "lucide-react";
import {
  Button,
  Checkbox,
  Field,
  Fieldset,
  Input,
  Label,
  Radio,
  RadioGroup,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  Toggle,
} from "@/components/forms";
import { Text } from "@/components/typography";
import { Case, Row, Section } from "../_components/section";
import { readSources } from "../_lib/source";
import s from "../_components/sink.module.css";

export async function FormsSection() {
  const sources = await readSources([
    "forms/button/button.tsx",
    "forms/button/button.variants.ts",
  ]);
  return (
    <Section id="forms" title="Forms" blurb="Button, Input and Field. Field owns the label, the description and the error, and hands its child the aria wiring rather than trusting a caller to remember it.">
      <Case title="Button" note="intent · size · state" sources={sources}>
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
      </Case>

      <Case title="Input and Field">
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
      </Case>

      <Case title="The three labelling shapes" note="Field covers one of them, and that is the point">
        <Row label="above">
          <div className={s.formCol}>
            <Field label="Workspace" hint="One engagement or many, it needs a name.">
              {(aria) => <Input {...aria} placeholder="31m" />}
            </Field>
            <Text size="xs" tone="quiet">
              input, textarea, select — the label sits above and <code>Field</code> wires
              <code> htmlFor</code>, <code>aria-describedby</code> and the error id.
            </Text>
          </div>
        </Row>
        <Row label="beside">
          <div className={s.formCol}>
            <div className={s.inline}>
              <Checkbox id="ks-cb" defaultChecked />
              <Label htmlFor="ks-cb">Include withdrawn invitations</Label>
            </div>
            <div className={s.inline}>
              <Switch id="ks-sw" defaultChecked />
              <Label htmlFor="ks-sw">Refuse loud tools outside the declared range</Label>
            </div>
            <Text size="xs" tone="quiet">
              checkbox and switch — the control and its label are one clickable unit, so the label
              goes beside it and <code>Field</code> is the wrong shape.
            </Text>
          </div>
        </Row>
        <Row label="a group">
          <div className={s.formCol}>
            <Fieldset legend="Claimant" hint="Who proposed this attribution.">
              <RadioGroup defaultValue="model">
                {["rule", "model", "human"].map((v) => (
                  <div key={v} className={s.inline}>
                    <Radio id={`ks-r-${v}`} value={v} />
                    <Label htmlFor={`ks-r-${v}`}>{v}</Label>
                  </div>
                ))}
              </RadioGroup>
            </Fieldset>
            <Text size="xs" tone="quiet">
              a radio group — the <code>&lt;legend&gt;</code> names the SET and is announced before
              every option inside it. Each option still needs its own label.
            </Text>
          </div>
        </Row>
      </Case>

      <Case title="Checkbox" note="three states, and the third is not a variant">
        <Row label="states">
          <div className={s.inline}><Checkbox id="ks-c1" /><Label htmlFor="ks-c1">unchecked</Label></div>
          <div className={s.inline}><Checkbox id="ks-c2" defaultChecked /><Label htmlFor="ks-c2">checked</Label></div>
          <div className={s.inline}><Checkbox id="ks-c3" checked="indeterminate" /><Label htmlFor="ks-c3">indeterminate</Label></div>
          <div className={s.inline}><Checkbox id="ks-c4" disabled /><Label htmlFor="ks-c4">disabled</Label></div>
        </Row>
        <Row label="why it matters here">
          <Text size="xs" tone="quiet">
            <code>indeterminate</code> is a real third state, not a styling of the other two —
            <code> aria-checked=&quot;mixed&quot;</code>. A parent checkbox over a partly-selected
            list is the usual case, and this product has another: found, looked-for-and-absent, and
            never-looked-for are three states everywhere else too.
          </Text>
        </Row>
      </Case>

      <Case title="Select" note="a value bound to a form — not a menu">
        <Row label="select">
          <div className={s.selectWrap}>
            <Select defaultValue="proposed">
              <SelectTrigger aria-label="Judgement"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unopened">unopened</SelectItem>
                <SelectItem value="proposed">proposed</SelectItem>
                <SelectItem value="watching">watching</SelectItem>
                <SelectItem value="dismissed">dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Text as="span" size="xs" tone="quiet">
            announced as a combobox, submits with a form, and the listbox is never narrower than the
            trigger — a value that appears to change width when the menu opens reads as two controls.
          </Text>
        </Row>
      </Case>

      <Case title="Toggle" note="a button that stays pressed — not a switch">
        <Row label="toggle">
          <Toggle size="sm">accepted</Toggle>
          <Toggle size="sm" defaultPressed>proposed</Toggle>
          <Toggle size="sm" shape="pill" defaultPressed>rejected</Toggle>
          <Toggle size="icon" aria-label="Bold" defaultPressed>B</Toggle>
        </Row>
        <Row label="not a switch">
          <Text size="xs" tone="quiet">
            A <strong>Switch</strong> is <code>role=&quot;switch&quot;</code> and turns a setting on
            or off — it takes effect immediately and describes a state of the system. A{" "}
            <strong>Toggle</strong> is a button with <code>aria-pressed</code> that stays down — a
            filter, a formatting mark, a view mode. The canvas&rsquo;s state filters and the theme
            control are both this.
          </Text>
        </Row>
      </Case>
    </Section>
  );
}
