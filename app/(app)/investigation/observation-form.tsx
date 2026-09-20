"use client";

import { useMemo, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Textarea } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { TextCapture } from "@/lib/services/sources";
import type { ResearchRecordKind } from "@/lib/services/research-records";
import type { ResearchConnectionKind } from "@/lib/services/research-connections";
import { quoteAt, quoteOccurrences } from "@/lib/services/sources/citation";
import { addObservationAction } from "./_actions";
import { Failure, recordHref, ReviewBoundary, sourceHref, useResearchWrite } from "./_shared";
import s from "./investigation.module.css";

export type ObservationPrefill = {
  statement: string;
  quote: string;
  quoteStart?: number;
  extractionId?: string;
  origin?: "workspace-search";
  candidate?: { kind: ResearchRecordKind; name: string; description?: string };
  relationship?: { kind: ResearchConnectionKind; related: { kind: ResearchRecordKind; name: string; description?: string }; description?: string };
};

export function ObservationForm({ workspace, source, capture, extractionId, reader, prefill, returnTo }: { workspace: string; source: string; capture: TextCapture; extractionId?: string; reader: RefObject<HTMLPreElement | null>; prefill?: ObservationPrefill; returnTo?: string }) {
  const router = useRouter();
  const [quote, setQuote] = useState(prefill?.quote ?? "");
  const [statement, setStatement] = useState(prefill?.statement ?? "");
  const [locator, setLocator] = useState("");
  const [searchHandoffActive, setSearchHandoffActive] = useState(prefill?.origin === "workspace-search");
  const [occurrence, setOccurrence] = useState(() => {
    if (!prefill) return 1;
    const positions = quoteOccurrences(capture.content, prefill.quote);
    const selected = prefill.quoteStart === undefined ? 0 : positions.indexOf(prefill.quoteStart);
    return selected >= 0 ? selected + 1 : 1;
  });
  const [selectionError, setSelectionError] = useState<Error | null>(null);
  const matches = useMemo(() => quoteOccurrences(capture.content, quote), [capture.content, quote]);
  const handoffLocationMismatch = searchHandoffActive && prefill?.quote === quote && prefill.quoteStart !== undefined && !quoteAt(capture.content, prefill.quoteStart, quote);
  const start = handoffLocationMismatch ? undefined : matches[occurrence - 1];
  const citedExtraction = extractionId ?? prefill?.extractionId;
  const save = useResearchWrite(() => addObservationAction(workspace, source, {
    capture_id: capture.capture_id, ...(citedExtraction ? { extraction_id: citedExtraction } : {}), statement, quote, quote_start: start, ...(locator ? { locator } : {}),
  }), [keys.sources.observations(workspace, source)], (observation) => {
    setStatement(""); setQuote(""); setLocator(""); setOccurrence(1);
    if (prefill?.candidate) {
      router.push(recordHref(workspace, observation.observation_id, prefill.candidate, prefill.relationship, returnTo));
    } else {
      router.push(sourceHref(workspace, source, capture.capture_id, observation.observation_id, returnTo));
    }
  });
  const selected = () => {
    const selection = window.getSelection();
    if (!selection || !reader.current?.contains(selection.anchorNode) || !reader.current.contains(selection.focusNode) || !selection.toString()) {
      setSelectionError(new Error("Select a passage in the retained text, or paste it into the quote field.")); return;
    }
    const selectedQuote = selection.toString();
    // A DOM range measures the rendered prefix, including highlighted text.
    const prefix = document.createRange();
    prefix.selectNodeContents(reader.current);
    const range = selection.getRangeAt(0);
    prefix.setEnd(range.startContainer, range.startOffset);
    const point = Array.from(prefix.toString()).length;
    const positions = quoteOccurrences(capture.content, selectedQuote);
    setSearchHandoffActive(false); setQuote(selectedQuote); setOccurrence(Math.max(1, positions.indexOf(point) + 1)); setSelectionError(null);
  };
  return <form className={s.stack} onSubmit={(event) => { event.preventDefault(); if (start !== undefined) save.mutate(); }}>
   <ReviewBoundary kind="authored" text={prefill ? "This form is the analyst-authored step after reviewing assistance. Nothing is persisted until you record the cited observation." : undefined} />
   <Text size="sm" tone="tertiary">Record what this source says. Your interpretation and unanswered questions belong in working notes.</Text>
    {searchHandoffActive ? <Alert tone={handoffLocationMismatch ? "warn" : "info"}><Text size="sm">{handoffLocationMismatch ? "The search handoff no longer matches this exact passage location in the opened artifact. Choose the passage again or edit the quote before recording it." : `Search handoff loaded at code-point ${prefill?.quoteStart ?? 0}. Review the statement before recording it.`}</Text></Alert> : null}
    <Button type="button" intent="ghost" onMouseDown={(event) => event.preventDefault()} onClick={selected}>Use selected passage</Button>
    <Field label="Exact source quote" required hint={`Cites capture v${capture.version}. Copy a passage from the retained text.`}>{(aria) => <Textarea {...aria} rows={4} value={quote} onChange={(event) => { setSearchHandoffActive(false); setQuote(event.target.value); setOccurrence(1); setSelectionError(null); }} />}</Field>
    {quote && matches.length === 0 ? <Text size="sm" tone="accent" role="status">This quote does not match the retained text exactly.</Text> : null}
    {matches.length > 1 ? <Field label="Occurrence to cite" hint={`This passage appears ${matches.length} times. Choose its occurrence in the text.`}>{(aria) => <Input {...aria} type="number" min={1} max={matches.length} value={occurrence} onChange={(event) => setOccurrence(Number(event.target.value))} />}</Field> : null}
    {start !== undefined ? <Text size="xs" tone="tertiary" role="status">Exact match · passage {occurrence} of {matches.length}{matches.length > 1 ? ` · near “${Array.from(capture.content).slice(Math.max(0, start - 35), start + Math.min(quote.length, 60) + 35).join("") }”` : ""}</Text> : null}
    <Field label="What does the source say?" required hint="A short statement supported by the selected passage.">{(aria) => <Textarea {...aria} value={statement} onChange={(event) => setStatement(event.target.value)} rows={3} placeholder="The notice reports that service stopped at 18:20." />}</Field>
    <Field label="Location label (optional)" hint="For example, paragraph 2 or the post heading.">{(aria) => <Input {...aria} value={locator} onChange={(event) => setLocator(event.target.value)} />}</Field>
    <Failure error={selectionError ?? save.error} />
    <Button type="submit" intent="primary" disabled={start === undefined} loading={save.isPending}>Record cited observation</Button>
  </form>;
}
