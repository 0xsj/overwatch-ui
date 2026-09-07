"use client";

import { useActionState, useId, useState, useTransition } from "react";
import { Badge } from "@/components/display";
import { Button, Checkbox, Field, Input, Label } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { successCodes, type Mapping, type Tool } from "@/lib/services/tooling";
import { addMappingAction, archiveToolAction, promoteMappingAction } from "../_actions";
import { initialFormState } from "../../../(auth)/_form-state";
import { errorFor, FormError } from "../../../(auth)/_components/form-error";
import s from "../tools.module.css";

const INTENSITY_MEANING = {
  passive: "touches the providers, never the target",
  light: "ordinary requests at recon volume — not distinguishable from a crawler",
  loud: "sends payloads, so the run gate is raised to admin on this engagement",
} as const;

const STATE_MEANING = {
  live: "the version this tool's output is read through",
  draft: "written, and nothing extracts with it yet",
  retired: "superseded, and still cited by every observation it made",
} as const;

/** One tool, its versions, and the two writes that are not edits.
 *
 *  Neither a tool's archive nor a mapping's promotion destroys anything: the
 *  tool row stays because every invocation names it, and a mapping is never
 *  edited because an observation cites the version that produced it. Both are
 *  the same argument `decisions/0030` makes about a scope rule. */
export function ToolRow({
  tool,
  mappings,
  orgId,
  mayWrite,
}: {
  tool: Tool;
  mappings: Mapping[];
  orgId: string;
  mayWrite: boolean;
}) {
  const promoteId = useId();
  const [open, setOpen] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [state, action, adding] = useActionState(
    addMappingAction.bind(null, orgId, tool.tool_id),
    initialFormState,
  );

  const act = (run: () => Promise<{ status: string; message?: string }>) =>
    start(async () => {
      setRefusal(null);
      const result = await run();
      if (result.status === "error") setRefusal(result.message ?? "That was refused.");
    });

  const codes = successCodes(tool);

  return (
    <div className={s.tool} data-archived={tool.archived}>
      <div className={s.name}>
        <span className={s.toolName}>{tool.name}</span>
        <Badge tone={tool.intensity === "loud" ? "warn" : "neutral"} mono>
          {tool.intensity}
        </Badge>
        {tool.archived ? <Badge tone="neutral" mono>archived</Badge> : null}
      </div>

      <div>
        {mayWrite ? (
          <Button
            size="sm"
            intent="ghost"
            disabled={pending}
            onClick={() => act(() => archiveToolAction(orgId, tool.tool_id))}
          >
            Archive
          </Button>
        ) : null}
        <Button size="sm" intent="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide mappings" : `Mappings (${mappings.length})`}
        </Button>
      </div>

      <code className={s.argv}>{tool.argv}</code>

      <div className={s.feed}>
        <Text size="xs" tone="tertiary">
          {/* Absent `consumes` is a SOURCE tool — seeded from the target's
              scope. It is not "any kind", and the client never sends "*". */}
          {tool.consumes ? `${tool.consumes} → ` : "scope → "}
          {tool.produces ?? "nothing"}
        </Text>
        <Text size="xs" tone="quiet">{INTENSITY_MEANING[tool.intensity]}</Text>
        <Text size="xs" tone="quiet">
          {/* The server does not currently send this field, so it reads `[0]` on
              every tool — including one stored with `[0, 1]`. Said plainly
              rather than rendered as though it were measured. */}
          answers on exit {codes.join(" or ")}
          {tool.success_exit_codes ? "" : " — assumed, the server omits the field"}
        </Text>
      </div>

      {refusal ? (
        <div className={s.mappings}>
          <Alert tone="warn">
            {/* The refusal NAMES the checks still running it. That message is
                the whole UI for this failure — the fix is editing those chains,
                and it belongs to the person reading it. */}
            <Text size="sm">{refusal}</Text>
          </Alert>
        </div>
      ) : null}

      {open ? (
        <div className={s.mappings}>
          {mappings.length === 0 ? (
            <Text size="xs" tone="tertiary">
              Nothing mapped. The tool still runs and its bytes are still kept —
              what is missing is anything reading a field out of them.
            </Text>
          ) : (
            mappings.map((m) => (
              <div key={m.mapping_id} className={s.mapping} data-state={m.state}>
                <span>{m.field}</span>
                <code className={s.expression}>{m.expression}</code>
                <span className={s.version}>v{m.version}</span>
                <span title={STATE_MEANING[m.state]}>
                  <Badge tone={m.state === "live" ? "accent" : "neutral"} mono>
                    {m.state}
                  </Badge>
                  {m.state === "draft" && mayWrite ? (
                    <Button
                      size="sm"
                      intent="ghost"
                      disabled={pending}
                      onClick={() =>
                        act(() => promoteMappingAction(orgId, tool.tool_id, m.mapping_id))
                      }
                    >
                      Promote
                    </Button>
                  ) : null}
                </span>
              </div>
            ))
          )}

          {mayWrite && !tool.archived ? (
            <form action={action} noValidate className={s.form}>
              <FormError state={state} />
              {state.status === "ok" ? (
                <Alert tone="accent">
                  <Text size="sm">
                    Written as a new version. The one it replaces is retired rather
                    than gone, because every observation it made still cites it.
                  </Text>
                </Alert>
              ) : null}

              <div className={s.pair}>
                <Field label="Field" error={errorFor(state, "field")} required>
                  {(aria) => <Input {...aria} name="field" placeholder="http.status" />}
                </Field>
                <Field
                  label="Expression"
                  error={errorFor(state, "expression")}
                  hint="A dotted path into what the tool printed. Deliberately not an expression language — a mapping a person can read is one they can correct."
                  required
                >
                  {(aria) => <Input {...aria} name="expression" placeholder="status_code" />}
                </Field>
              </div>

              {/* `htmlFor` rather than nesting: the checkbox is a button under
                  the hood, and a label wrapping one does not toggle it. */}
              <div className={s.inline}>
                <Checkbox id={promoteId} name="promote" />
                <Label htmlFor={promoteId}>Use it immediately</Label>
              </div>

              <Button type="submit" size="sm" loading={adding}>
                {adding ? "Writing" : "Add a version"}
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
