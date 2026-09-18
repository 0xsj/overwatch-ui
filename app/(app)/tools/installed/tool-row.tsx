"use client";

import {
  useActionState, useEffect, useId, useState, useSyncExternalStore, useTransition,
} from "react";
import { Badge } from "@/components/display";
import {
  Button, Checkbox, Field, Input, Label, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { successCodes, type MappingRole, type Tool } from "@/lib/services/tooling";
import { INTENSITY_MEANING } from "../_catalogue";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { keys } from "@/lib/query";
import { useAfterWrite } from "../../_hooks";
import { mappingsQuery } from "../../_queries";
import { addMappingAction, archiveToolAction, promoteMappingAction } from "../_actions";
import { entryFor, provenanceOf } from "../_catalogue";
import { markReviewed, reviewedSnapshot, serverReviewed, subscribeReviewed } from "../_reviewed";
import { initialFormState } from "../../../(auth)/_form-state";
import { errorFor, FormError } from "../../../(auth)/_components/form-error";
import s from "../tools.module.css";

/** Only one of the three draws an edge, and it is the one with a precondition. */
const ROLE_MEANING: Record<MappingRole, string> = {
  subject: "what every other reading in this record is about",
  attribute: "a value about that subject — the default",
  derived_from: "the value this record was read out of. Draws a derivation",
  signature: "what the tool calls this class of problem. Half a finding's identity",
  severity: "how bad the tool says it is",
};

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
  orgId,
  mayWrite,
}: {
  tool: Tool;
  orgId: string;
  mayWrite: boolean;
}) {
  const promoteId = useId();
  /* Loaded when the row is OPENED, not for every tool on mount.
   *
   *  This screen used to fire one mappings read per tool before anything was
   *  on screen — a request per row of a list it had just fetched, for a panel
   *  almost nobody opens. Deferring it costs a moment when you do open one and
   *  saves every request when you do not.
   *
   *  The count on the button goes with it, and that is the honest half: an
   *  unloaded list renders `Mappings` with NO NUMBER rather than `Mappings
   *  (0)`. §Scope's rule about counts applies exactly — a zero nothing
   *  computed is not a zero, and this screen would have been claiming a tool
   *  has no mappings when the truth is nobody asked. */
  /* `derived_from` is REFUSED on a tool that consumes nothing — a source has no
     input to have read anything out of. Greyed here rather than left selectable,
     because a 400 after typing an expression is a worse way to learn it. */
  const [role, setRole] = useState<MappingRole>("attribute");
  const mayDerive = Boolean(tool.consumes);
  const [open, setOpen] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [state, action, adding] = useActionState(
    addMappingAction.bind(null, orgId, tool.tool_id),
    initialFormState,
  );

  /* A form action does not go through `act`, so its invalidation hangs off the
     RESULT instead. `useActionState` gives no success callback — the state
     changing to `ok` is the only signal there is. */
  const client = useQueryClient();
  useEffect(() => {
    if (state.status === "ok") void client.invalidateQueries({ queryKey: keys.tooling.all(orgId) });
  }, [state, client, orgId]);

  const afterWrite = useAfterWrite();
  const mappingsQ = useQuery({
    queryKey: keys.tooling.mappings(orgId, tool.tool_id),
    queryFn: () => mappingsQuery(orgId, tool.tool_id),
    enabled: open,
  });
  const mappings = mappingsQ.data ?? [];

  const act = (run: () => Promise<{ status: string; message?: string }>) =>
    start(async () => {
      setRefusal(null);
      const result = (await afterWrite(run, [keys.tooling.all(orgId)])) as {
        status: string;
        message?: string;
      };
      if (result.status === "error") setRefusal(result.message ?? "That was refused.");
    });

  const codes = successCodes(tool);

  /* Derived, not stored. A tool whose name AND argv still match the catalogue
     is the shipped definition; edit the argv and it is yours. That is not an
     approximation — a changed command is a different command. */
  const provenance = provenanceOf(tool);
  const entry = entryFor(tool);

  /* Empty on the server and filled after hydration, through the store rather
     than an effect — `localStorage` cannot be read while the HTML is made. */
  const reviewed = useSyncExternalStore(
    (onChange: () => void) => subscribeReviewed(onChange),
    reviewedSnapshot,
    serverReviewed,
  ).includes(tool.tool_id);

  return (
    <div className={s.tool} data-archived={tool.archived}>
      <div className={s.name}>
        <span className={s.toolName}>{tool.name}</span>
        <Badge tone={tool.intensity === "loud" ? "warn" : "neutral"} mono>
          {tool.intensity}
        </Badge>
        {tool.archived ? <Badge tone="neutral" mono>archived</Badge> : null}
        <Badge tone="neutral" mono>{provenance}</Badge>
        {/* The definition is shipped; the BINARY is not, and nothing here has
            looked for it. §Scope's `health` noun — *a tool off PATH looks like
            silence* — is the read that would answer, and it does not exist
            yet, so this says nothing rather than implying it is installed. */}
        {provenance === "bundled" && entry && !entry.verified ? (
          <Badge tone="neutral" mono>flags unverified</Badge>
        ) : null}
        {/* A STATIC fact, so it costs no request. The catalogue ships a mapping
            only where somebody ran the program and read its output; where it
            does not, installing gives a tool that runs, exits zero and records
            nothing — which is exactly the state this badge exists to make
            visible before somebody spends a week in it. */}
        {provenance === "bundled" && entry && !entry.mappings ? (
          <Badge tone="warn" mono>no mapping shipped</Badge>
        ) : null}
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
          {open
            ? "Hide mappings"
            : mappingsQ.isSuccess
              ? `Mappings (${mappings.length})`
              : "Mappings"}
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
          {/* Present on anything written since the projection was fixed. A row
              from before it genuinely answers `null`, so the default is still
              doing work and says so rather than looking measured. */}
          answers on exit {codes.join(" or ")}
          {tool.success_exit_codes ? "" : " — assumed, this row predates the field"}
        </Text>
      </div>

      {/* `reviewed` vs `in scope` — CLAUDE.md's pair. This is the FIRST gate,
          and it has no backend: there is no `reviewed_at` on a tool. So the
          card states what it is rather than pretending to hold a door. */}
      {!reviewed && !tool.archived ? (
        <div className={s.mappings}>
          <Alert tone={tool.intensity === "loud" ? "warn" : "info"}>
            <Text size="sm">
              <strong>Nobody has read this command.</strong>{" "}
              {provenance === "bundled"
                ? "It was installed from the catalogue rather than typed here, which is exactly when “nothing runs until a person has read the command” is worth the most — we supplied it."
                : "It was written here, and reading it back before it runs is the cheapest check there is."}
            </Text>
            <Button size="sm" onClick={() => markReviewed(tool.tool_id)}>
              I have read it
            </Button>
            <Text size="xs" tone="tertiary">
              Kept in this browser, and <strong>not enforced</strong>: the server
              has no field for it yet, so an unread tool still runs. That request
              is filed rather than faked.
            </Text>
          </Alert>
        </div>
      ) : null}

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

      {/* A finding tool with no LIVE signature mapping extracts nothing and
          looks like a clean scan — the worst way for a configuration to fail,
          because there is no error anywhere and the answer is "no problems". */}
      {tool.produces === "finding" &&
      mappingsQ.isSuccess &&
      !mappings.some((m) => m.role === "signature" && m.state === "live") ? (
        <div className={s.mappings}>
          <Alert tone="warn">
            <Text size="sm">
              <strong>No signature mapping.</strong> A tool that produces
              findings needs a live <code>signature</code> — it is half a
              finding&rsquo;s identity, and it is what makes a rescan a sighting
              rather than a new row. Without one this tool extracts nothing and
              the result reads as a clean scan.
            </Text>
          </Alert>
        </div>
      ) : null}

      {/* THE SAME FAILURE ONE STEP EARLIER, and it applies to every tool rather
          than only the one that produces findings. Without a live `subject`
          nothing extracted has anything to be ABOUT, so the run goes green, the
          artifact is stored, and no observation, fragment, asset or coverage
          cell is ever written. That is what `subfinder` did for as long as it
          was installed, and there was no error anywhere to read.

          Gated on `isSuccess` like the signature warning: a read that has not
          happened must not render as an absence. */}
      {tool.produces !== "finding" &&
      mappingsQ.isSuccess &&
      !mappings.some((m) => m.role === "subject" && m.state === "live") ? (
        <div className={s.mappings}>
          <Alert tone="warn">
            <Text size="sm">
              <strong>No subject mapping.</strong> Nothing this tool emits has
              anything to be <em>about</em>, so it runs, exits cleanly, keeps its
              bytes and writes no observation — and therefore no asset and no
              coverage. One live mapping with the role <code>subject</code> is
              what turns the artifact into a record.
              {tool.produces ? (
                <> It reads the value that is a <code>{tool.produces}</code>.</>
              ) : null}
            </Text>
          </Alert>
        </div>
      ) : null}

      {open ? (
        <div className={s.mappings}>
          {mappingsQ.isPending ? (
            <Text size="xs" tone="quiet">Reading the mappings…</Text>
          ) : mappings.length === 0 ? (
            <Text size="xs" tone="tertiary">
              Nothing mapped. The tool still runs and its bytes are still kept —
              what is missing is anything reading a field out of them.
            </Text>
          ) : (
            mappings.map((m) => (
              <div key={m.mapping_id} className={s.mapping} data-state={m.state}>
                <span>{m.field}</span>
                <code className={s.expression}>{m.expression}</code>
                {/* Always rendered, including the default: a role shown only
                    when it is interesting teaches somebody that blank means
                    nothing rather than `attribute`. */}
                <Badge
                  tone={m.role === "derived_from" ? "accent" : "neutral"}
                  mono
                  title={ROLE_MEANING[m.role]}
                >
                  {m.role}
                </Badge>
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

              <Field
                label="Role"
                hint={
                  mayDerive
                    ? ROLE_MEANING[role]
                    : "derived_from needs a tool that consumes something — this one is a source, so it has no input to have read anything out of."
                }
              >
                {(aria) => (
                  <Select
                    name="role"
                    value={role}
                    onValueChange={(v) => setRole(v as MappingRole)}
                  >
                    <SelectTrigger {...aria}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_MEANING) as MappingRole[]).map((r) => (
                        <SelectItem
                          key={r}
                          value={r}
                          disabled={r === "derived_from" && !mayDerive}
                          title={ROLE_MEANING[r]}
                        >
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>

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
