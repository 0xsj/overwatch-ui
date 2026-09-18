"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/display";
import { Switch } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { Section } from "@/lib/services/reports";
import { useAfterWrite } from "../../_hooks";
import { toggleSectionAction } from "../_actions";
import s from "../../surface/surface.module.css";

/** One section, and the three facts a toggle has to carry.
 *
 *  `mandatory` gets NO toggle at all rather than a toggle that is refused —
 *  offering a control the server rejects is offering something that does not
 *  exist. `warning` is rendered VERBATIM: it is server-side copy because it is
 *  an argument about the record, and a copy of that sentence here would drift
 *  from theirs. `withheld` marks the two that are the client capability, which
 *  is why they are two toggles and not one. */
export function SectionToggle({
  workspaceId,
  reportId,
  section,
}: {
  workspaceId: string;
  reportId: string;
  section: Section;
}) {
  const [refusal, setRefusal] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const afterWrite = useAfterWrite();

  return (
    <div className={s.step}>
      <span className={s.drawerRow}>
        {section.number ? <Badge mono>{section.number}</Badge> : null}
        <span className={s.value}>{section.title}</span>
        {section.mandatory ? (
          <Badge tone="accent" mono>always</Badge>
        ) : (
          <Switch
            checked={section.enabled}
            disabled={pending}
            onCheckedChange={(next) =>
              start(async () => {
                setRefusal(null);
                const result = (await afterWrite(
                  () => toggleSectionAction(workspaceId, reportId, section.key, next),
                  [keys.reports.all(workspaceId)],
                )) as { status: string; message?: string };
                if (result.status === "error")
                  setRefusal(result.message ?? "That was refused.");
              })
            }
          />
        )}
        {section.withheld ? <Badge tone="warn" mono>a client capability</Badge> : null}
      </span>

      {/* Verbatim. This sentence belongs to the other repository. */}
      {section.warning ? (
        <Text size="xs" tone="tertiary">{section.warning}</Text>
      ) : null}
      {section.mandatory ? (
        <Text size="xs" tone="quiet">
          This one cannot be turned off, so there is no switch to offer.
        </Text>
      ) : null}
      {refusal ? <Text size="xs" tone="tertiary">{refusal}</Text> : null}
    </div>
  );
}
