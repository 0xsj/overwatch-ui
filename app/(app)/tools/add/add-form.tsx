"use client";

import { useActionState, useState } from "react";
import {
  Button, Field, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { FEED_KINDS } from "@/lib/kernel";
import type { Intensity } from "@/lib/services/tooling";
import { addToolAction } from "../_actions";
import { initialFormState } from "../../../(auth)/_form-state";
import { errorFor, FormError } from "../../../(auth)/_components/form-error";
import s from "../tools.module.css";

const INTENSITY: { value: Intensity; says: string }[] = [
  { value: "passive", says: "touches the providers, never the target" },
  { value: "light", says: "ordinary requests at recon volume — a crawler looks the same" },
  { value: "loud", says: "sends payloads. The run gate is raised to admin on the engagement" },
];

/** Three steps, and the third is the promise the product is built on.
 *
 *  `intensity` is three values rather than a `loud` flag because `light` is a
 *  real position — httpx at recon volume is what a crawler does, and calling it
 *  loud would put ordinary HTTP behind the same gate as template-driven
 *  probing. Changing this field is a SCOPE CHANGE: a rule that admits passive
 *  collection over a range does not thereby admit a loud scan of it. */
export function AddToolForm({ orgId }: { orgId: string }) {
  const [state, action, pending] = useActionState(
    addToolAction.bind(null, orgId),
    initialFormState,
  );
  const [argv, setArgv] = useState("");
  const [intensity, setIntensity] = useState<Intensity>("passive");

  return (
    <form action={action} noValidate className={s.form}>
      <FormError state={state} />

      {state.status === "ok" ? (
        <Alert tone="accent">
          <Text size="sm">
            Added. It is on the installed list and reachable from a check&rsquo;s
            chain — and nothing has run.
          </Text>
        </Alert>
      ) : null}

      <Field label="Name" error={errorFor(state, "name")} required>
        {(aria) => <Input {...aria} name="name" placeholder="httpx" />}
      </Field>

      <Field
        label="Command"
        error={errorFor(state, "argv")}
        hint="Braced names are filled from the thing being looked at. There is no shell — it is argv, so a pipe or a semicolon here is an argument rather than an operator."
        required
      >
        {(aria) => (
          <Input
            {...aria}
            name="argv"
            value={argv}
            onChange={(e) => setArgv(e.target.value)}
            placeholder="httpx -u {host} -silent -json"
          />
        )}
      </Field>

      <div className={s.pair}>
        <Field
          label="Consumes"
          hint="Leave empty for a source tool — one seeded from the target's scope. Empty means nothing upstream, not anything."
        >
          {(aria) => (
            <Input {...aria} name="consumes" list="feed-kinds" placeholder="(nothing upstream)" />
          )}
        </Field>
        <Field label="Produces" hint="What comes out of it, and what a downstream step can consume.">
          {(aria) => <Input {...aria} name="produces" list="feed-kinds" placeholder="url" />}
        </Field>
      </div>

      {/* One vocabulary — `decisions/0034`. `finding` is here and NOT in the
          coverage subject list: a check that consumes a finding is triage, a
          different question with a different denominator. */}
      <datalist id="feed-kinds">
        {FEED_KINDS.map((k) => <option key={k} value={k} />)}
      </datalist>

      <Field label="Intensity" required>
        {(aria) => (
          <Select
            name="intensity"
            value={intensity}
            onValueChange={(v) => setIntensity(v as Intensity)}
          >
            <SelectTrigger {...aria}><SelectValue /></SelectTrigger>
            <SelectContent>
              {INTENSITY.map((i) => (
                <SelectItem key={i.value} value={i.value} title={i.says}>
                  {i.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>
      <Text size="xs" tone="quiet">
        {INTENSITY.find((i) => i.value === intensity)?.says}
      </Text>

      <Field
        label="Answers on exit codes"
        hint="Empty means 0 alone. nuclei wants 0, 1 — it exits 1 when it finds nothing, and reading that as a failure turns “no vulnerabilities” into an error."
      >
        {(aria) => <Input {...aria} name="success_exit_codes" placeholder="0" inputMode="numeric" />}
      </Field>

      {/* Step three. Not a preview of the definition — a reading of the command
          that will actually be spawned, shown before the thing exists rather
          than after somebody has pressed run. */}
      <Alert tone={intensity === "loud" ? "warn" : "info"}>
        <Text size="sm">
          <strong>This is what will run.</strong>
        </Text>
        <code className={s.argv}>{argv || "nothing typed yet"}</code>
        <Text size="xs" tone="tertiary">
          {intensity === "loud"
            ? "A loud tool raises the gate on any check that contains it to admin, and a scope rule admitting passive collection will still refuse it."
            : "Braced names are substituted at spawn time; everything else is passed through verbatim."}
        </Text>
      </Alert>

      <Button type="submit" intent="primary" loading={pending}>
        {pending ? "Adding" : "Add it"}
      </Button>
    </form>
  );
}
