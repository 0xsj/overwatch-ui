"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/display";
import { Button } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { useAfterWrite, useContext } from "../../_hooks";
import { CATALOGUE, INTENSITY_MEANING } from "../_catalogue";
import { installToolAction } from "../_actions";
import s from "../tools.module.css";

/** What overwatch ships, minus what this org already has.
 *
 *  Matched by NAME rather than by argv: a firm that installed `httpx` and then
 *  changed its flags does not want it offered again as though it were missing.
 *  The card on the installed list is where the edit shows up, as `authored`. */
export function CatalogueSection({
  installed,
  mayWrite,
}: {
  installed: readonly string[];
  mayWrite: boolean;
}) {
  const [refusal, setRefusal] = useState<string | null>(null);
  const [justInstalled, setInstalled] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { org } = useContext();
  const afterWrite = useAfterWrite();

  const missing = CATALOGUE.filter((c) => !installed.includes(c.name));
  if (missing.length === 0) {
    return (
      <Text size="sm" tone="tertiary">
        Every definition overwatch ships is installed. Anything else is one you
        write — which is the same thing, typed by you.
      </Text>
    );
  }

  const install = (name: string) =>
    start(async () => {
      setRefusal(null);
      setBusy(name);
      const result = (await afterWrite(() => installToolAction(name), [
        keys.tooling.all(org ?? ""),
      ])) as { status: string; message?: string };
      setBusy(null);
      if (result.status === "error") setRefusal(result.message ?? "That was refused.");
      else setInstalled(name);
    });

  return (
    <>
      {refusal ? <Alert tone="warn"><Text size="sm">{refusal}</Text></Alert> : null}
      {justInstalled ? (
        <Alert tone="accent">
          <Text size="sm">
            <strong>{justInstalled}</strong> is installed and on the list above — and it
            arrived <strong>unread</strong>, the same as one somebody imported. Nothing
            has run.
          </Text>
        </Alert>
      ) : null}

      <div className={s.rows}>
        {missing.map((c) => (
          <div key={c.name} className={s.tool} data-archived="false">
            <div className={s.name}>
              <span className={s.toolName}>{c.name}</span>
              <Badge tone={c.intensity === "loud" ? "warn" : "neutral"} mono>
                {c.intensity}
              </Badge>
              {/* An argv written from memory is a plausible guess, and a
                  plausible guess that runs is worse than one that does not. */}
              {c.verified ? null : <Badge tone="neutral" mono>flags unverified</Badge>}
            </div>

            <div>
              {mayWrite ? (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => install(c.name)}
                >
                  {busy === c.name ? "Installing" : "Install"}
                </Button>
              ) : null}
            </div>

            <code className={s.argv}>{c.argv}</code>

            <div className={s.feed}>
              <Text size="xs" tone="tertiary">
                {c.consumes ? `${c.consumes} → ` : "scope → "}
                {c.produces ?? "nothing"}
              </Text>
              <Text size="xs" tone="quiet">{INTENSITY_MEANING[c.intensity]}</Text>
              {c.success_exit_codes ? (
                <Text size="xs" tone="quiet">
                  answers on exit {c.success_exit_codes.join(" or ")}
                </Text>
              ) : null}
            </div>

            <div className={s.mappings}>
              <Text size="xs" tone="tertiary">{c.note}</Text>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
