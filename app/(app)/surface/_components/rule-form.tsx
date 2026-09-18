"use client";

import { useActionState, useState } from "react";
import {
  Button, Checkbox, Field, Input, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { KINDS, SPAWNABLE, type Kind } from "@/lib/kernel";
import { addRuleAction } from "../_actions";
import { keys } from "@/lib/query";
import { useInvalidateOnOk } from "../../_hooks";
import { initialFormState } from "../../../(auth)/_form-state";
import { errorFor, FormError } from "../../../(auth)/_components/form-error";
import s from "../surface.module.css";

const GATE_MEANING = {
  spawn: "what a tool may touch. Failing it is a refusal, and the invocation records which rule",
  claim: "what the engagement covers. Failing it is no scope proof on a finding",
} as const;

/** One line of a target's scope, and the shape of this form is the model.
 *
 *  A KIND decides its own gate — nothing is ever spawned against a repository —
 *  so the kind list narrows when the gate does, rather than letting somebody
 *  build a rule the server will reject. `tools` disappears entirely on a claim
 *  rule, because there are no processes on that gate and an empty array would
 *  be a claim about intensity nobody made. */
export function RuleForm({
  workspaceId,
  targetId,
}: {
  workspaceId: string;
  targetId: string;
}) {
  const [state, action, pending] = useActionState(
    addRuleAction.bind(null, workspaceId, targetId),
    initialFormState,
  );

  /* The write landed on the server; the query cache does not know. */
  useInvalidateOnOk(state, [keys.targets.all(workspaceId)]);
  const [gate, setGate] = useState<"spawn" | "claim">("spawn");
  const [polarity, setPolarity] = useState<"include" | "exclude">("include");
  const [kinds, setKinds] = useState<Kind[]>(["host"]);

  const offered: readonly Kind[] =
    gate === "spawn" ? SPAWNABLE : KINDS.filter((k) => !(SPAWNABLE as readonly string[]).includes(k));

  const toggle = (k: Kind) =>
    setKinds((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));

  return (
    <form action={action} noValidate className={s.form}>
      <FormError state={state} />

      {state.status === "ok" ? (
        <Alert tone="accent">
          <Text size="sm">
            Written. Rules are append-only — this one keeps its id forever,
            because an invocation&rsquo;s refusal and a finding&rsquo;s scope
            proof both cite it.
          </Text>
        </Alert>
      ) : null}

      <Field
        label="Pattern"
        error={errorFor(state, "pattern")}
        hint="What it matches — a hostname, a wildcard, a range. The spawn gate is asked with the target's own name, so a rule that never matches it will refuse everything."
        required
      >
        {(aria) => <Input {...aria} name="pattern" placeholder="*.acme.example" />}
      </Field>

      <div className={s.pair}>
        <Field label="Gate" required>
          {(aria) => (
            <Select
              name="gate"
              value={gate}
              onValueChange={(v) => {
                setGate(v as "spawn" | "claim");
                setKinds([]);
              }}
            >
              <SelectTrigger {...aria}><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["spawn", "claim"] as const).map((g) => (
                  <SelectItem key={g} value={g} title={GATE_MEANING[g]}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field label="Polarity" required>
          {(aria) => (
            <Select
              name="polarity"
              value={polarity}
              onValueChange={(v) => setPolarity(v as "include" | "exclude")}
            >
              <SelectTrigger {...aria}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="include">include</SelectItem>
                <SelectItem value="exclude">exclude</SelectItem>
              </SelectContent>
            </Select>
          )}
        </Field>
      </div>

      <Text size="xs" tone="quiet">{GATE_MEANING[gate]}</Text>
      {polarity === "exclude" ? (
        <Text size="xs" tone="quiet">
          <strong>Exclude beats include</strong>, whatever order they were
          written in — so this wins over any rule that admits the same thing.
        </Text>
      ) : null}

      <Field
        label="Kinds"
        hint={
          gate === "spawn"
            ? "Only the kinds a process can be aimed at. Nothing is ever spawned against a repository, so those belong on the claim gate."
            : "What the engagement covers. These are the kinds nothing is spawned against."
        }
        required
      >
        {() => (
          <div className={s.kinds}>
            {offered.map((k) => {
              const on = kinds.includes(k);
              return (
                <label key={k} className={s.kind} data-on={on}>
                  <Checkbox checked={on} onCheckedChange={() => toggle(k)} aria-label={k} />
                  {k}
                  {on ? <input type="hidden" name="kinds" value={k} /> : null}
                </label>
              );
            })}
          </div>
        )}
      </Field>

      {/* SPAWN only. A range in scope for passive collection is not thereby in
          scope for a loud scan — and on the claim gate there are no processes
          at all, so the field is absent rather than empty. */}
      {gate === "spawn" ? (
        <Field
          label="Intensities"
          hint="Which loudness this rule permits. Leaving loud out is how a range is open to collection and closed to probing."
        >
          {() => (
            <div className={s.kinds}>
              {(["passive", "light", "loud"] as const).map((t) => (
                <label key={t} className={s.kind}>
                  <Checkbox name="tools" value={t} defaultChecked={t !== "loud"} />
                  {t}
                </label>
              ))}
            </div>
          )}
        </Field>
      ) : null}

      <Button type="submit" intent="primary" loading={pending}>
        {pending ? "Writing" : "Write the rule"}
      </Button>
    </form>
  );
}
