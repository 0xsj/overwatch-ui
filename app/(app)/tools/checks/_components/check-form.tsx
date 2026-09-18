"use client";

import { useActionState, useId, useState } from "react";
import {
  Button, Checkbox, Field, Input, Label, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { TARGETABLE, type Targetable } from "@/lib/kernel";
import type { Check } from "@/lib/services/checks";
import { addCheckAction, updateCheckAction } from "../_actions";
import { keys } from "@/lib/query";
import { useInvalidateOnOk } from "../../../_hooks";
import { initialFormState } from "../../../../(auth)/_form-state";
import { errorFor, FormError } from "../../../../(auth)/_components/form-error";
import s from "../checks.module.css";

/** Words, not seconds. The wire is seconds because `P1M` is not a length of
 *  time; the control is a duration a person recognises, and this is the
 *  mapping between them. */
const EVERY = ["on request only", "6 hours", "12 hours", "day", "week"] as const;

const wordsFor = (seconds?: number): string =>
  seconds === 21600 ? "6 hours"
  : seconds === 43200 ? "12 hours"
  : seconds === 86400 ? "day"
  : seconds === 604800 ? "week"
  : "on request only";

/** Create or edit one check. The same form for both, because the fields are
 *  the same fields and two of them would drift.
 *
 *  The consequential control is the toggle, and it does not look it. Enabling a
 *  check that carries an interval **is the standing authorisation for every
 *  future scheduled run of it, including a loud one** — `decisions/0038`. So it
 *  says what it does rather than saying "enabled". */
export function CheckForm({ orgId, check }: { orgId: string; check?: Check }) {
  const enabledId = useId();
  const humanId = useId();
  const [state, action, pending] = useActionState(
    check
      ? updateCheckAction.bind(null, orgId, check.check_id)
      : addCheckAction.bind(null, orgId),
    initialFormState,
  );

  /* The write landed on the server; the query cache does not know. */
  useInvalidateOnOk(state, [keys.checks.all(orgId)]);
  const [every, setEvery] = useState<string>(wordsFor(check?.interval_seconds));
  const [human, setHuman] = useState(check?.human ?? false);
  const [applies, setApplies] = useState<Targetable[]>(
    check?.applies_to ?? ["host"],
  );

  const toggle = (kind: Targetable) =>
    setApplies((current) =>
      current.includes(kind) ? current.filter((k) => k !== kind) : [...current, kind],
    );

  return (
    <form action={action} noValidate className={s.form}>
      <FormError state={state} />

      {state.status === "ok" ? (
        <Alert tone="accent">
          <Text size="sm">
            Saved.{" "}
            {human
              ? "Nothing spawns — this one is answered by a person reading the thing."
              : "It cannot run until a chain is wired to it, and it is skipped silently until then."}
          </Text>
        </Alert>
      ) : null}

      <Field label="Name" error={errorFor(state, "name")} required>
        {(aria) => (
          <Input {...aria} name="name" defaultValue={check?.name} placeholder="web surface" />
        )}
      </Field>

      <Field
        label="Question"
        error={errorFor(state, "question")}
        hint="What a person would be asking. It is the sentence the coverage grid is a measurement of, so it is worth writing as a question rather than as a label."
        required
      >
        {(aria) => (
          <Input
            {...aria}
            name="question"
            defaultValue={check?.question}
            placeholder="What is reachable over HTTP?"
          />
        )}
      </Field>

      {/* THE COVERAGE DENOMINATOR. A check with `applies_to: ["host"]` produces
          no cell at all for a /24 — not a cell in state `never` — so this field
          decides what the grid can even ask about.

          Declared rather than derived from the chain's source step: `consumes`
          is a fact about a PROGRAM and applicability is a claim about the
          SUBJECT, and the second stays true when the tool is uninstalled. */}
      <Field
        label="Applies to"
        hint="The kinds this question can be asked about. A kind left out produces no square on the coverage grid rather than an unanswered one — an ASN has no TLS, and that is not a gap."
        required
      >
        {() => (
          <div className={s.kinds}>
            {TARGETABLE.map((kind) => {
              const on = applies.includes(kind);
              return (
                <label key={kind} className={s.kind} data-on={on}>
                  <Checkbox
                    checked={on}
                    onCheckedChange={() => toggle(kind)}
                    aria-label={kind}
                  />
                  {kind}
                  {on ? <input type="hidden" name="applies_to" value={kind} /> : null}
                </label>
              );
            })}
          </div>
        )}
      </Field>

      <Field label="How often" >
        {(aria) => (
          <Select name="every" value={every} onValueChange={setEvery} disabled={human}>
            <SelectTrigger {...aria}><SelectValue /></SelectTrigger>
            <SelectContent>
              {EVERY.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </Field>

      <div className={s.inline}>
        <Checkbox
          id={humanId}
          name="human"
          checked={human}
          onCheckedChange={(v) => setHuman(v === true)}
        />
        <Label htmlFor={humanId}>A person answers this one</Label>
      </div>
      <Text size="xs" tone="quiet">
        <code>READ BY YOU</code> — nothing spawns, there is no chain to wire, and
        it never reports stale because there is no clock. It is a flag rather than
        &ldquo;has no chain&rdquo;: an unfinished check is chainless too, and
        treating those the same made one report coverage it did not have.
      </Text>

      <div className={s.inline}>
        <Checkbox id={enabledId} name="enabled" defaultChecked={check?.enabled ?? true} />
        <Label htmlFor={enabledId}>
          {every === "on request only" || human
            ? "Available to run"
            : `Run this automatically every ${every}`}
        </Label>
      </div>
      {/* The sentence that makes this the most consequential control on the
          screen, and it does not look like one. */}
      {every !== "on request only" && !human ? (
        <Text size="xs" tone="quiet">
          Enabling this <strong>is the authorisation</strong> for every future
          scheduled run of it — including a loud one, which needs admin when a
          person starts it. Disabling withdraws it within one tick. There is no
          per-run kill switch on purpose: scope is what stops a scheduled run
          touching something it should not, and a second authority over the same
          act is what the two gates exist to prevent.
        </Text>
      ) : null}

      <Button type="submit" intent="primary" loading={pending}>
        {pending ? "Saving" : check ? "Save" : "Create it"}
      </Button>
    </form>
  );
}
