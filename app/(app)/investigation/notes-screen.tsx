"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Button, Field, Input, Textarea } from "@/components/forms";
import { Panel } from "@/components/display";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { NoteContext, NoteContextKind, WorkingNote } from "@/lib/services/notes";
import { noteContextHref, noteContextLabel, noteHref, type NoteDraft } from "@/lib/services/notes/navigation";
import { mayWriteResearch } from "../_route-context";
import { PageHead } from "../_components/page-head";
import { Query, useContext } from "../_hooks";
import { workingNoteQuery, workingNotesPageQuery } from "../_queries";
import { saveNoteAction } from "./_actions";
import { authorLabel, dateLabel, Failure, investigationPath, MoreButton, useResearchWrite } from "./_shared";
import s from "./investigation.module.css";

export function NotesScreen({ workspace }: { workspace: string }) {
  const { shell } = useContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedReturn = searchParams.get("return") ?? "";
  const returnTo = requestedReturn.startsWith(`/investigation/${encodeURIComponent(workspace)}/`) ? requestedReturn : "";
  const mayWrite = mayWriteResearch(shell?.context?.workspace);
  const query = searchParams.get("q")?.trim().slice(0, 200) ?? "";
  const contextKind = readNoteContextKind(searchParams.get("context_kind"));
  const draft = !searchParams.get("note") && searchParams.get("new") === "1" ? readNoteDraft(searchParams) : undefined;
  const notes = useInfiniteQuery({
    queryKey: keys.notes.page(workspace, query, contextKind),
    queryFn: ({ pageParam }) => workingNotesPageQuery(workspace, pageParam, query, contextKind || undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    retry: false,
  });
  const activeId = searchParams.get("note");
  const all = notes.data?.pages.flatMap((page) => page.items) ?? [];
  const selectedFromList = all.find((note) => note.note_id === activeId);
  const targetedNote = useQuery({
    queryKey: keys.notes.one(workspace, activeId ?? ""),
    queryFn: () => workingNoteQuery(workspace, activeId!),
    enabled: Boolean(activeId) && !selectedFromList,
    retry: false,
  });
  const selected = selectedFromList ?? targetedNote.data;
  const selectedOnPage = Boolean(selected && all.some((note) => note.note_id === selected.note_id));
  const targetedLoading = Boolean(activeId && !selected && targetedNote.isPending);

  function openNote(note?: string) {
    router.replace(noteHref(workspace, note, returnTo || undefined));
  }

  function setQuery(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const next = value.slice(0, 200);
    if (next.trim()) params.set("q", next);
    else params.delete("q");
    const base = investigationPath(workspace, "notes");
    router.replace(`${base}${params.size ? `?${params.toString()}` : ""}`);
  }

  function setContextKind(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("context_kind", value);
    else params.delete("context_kind");
    params.delete("before");
    const base = investigationPath(workspace, "notes");
    router.replace(`${base}${params.size ? `?${params.toString()}` : ""}`);
  }

  return <>
    {returnTo ? <Link href={returnTo} className={s.back}>Back to handoff</Link> : null}
    <PageHead title="Working notes" actions={mayWrite ? <Button type="button" intent="primary" onClick={() => openNote()}>New note</Button> : undefined}>
      State the question, develop an interpretation, and record what remains uncertain. These notes are editable and remain distinct from source-backed observations.
    </PageHead>
    <div className={mayWrite ? s.columns : undefined}>
      <Panel title="Investigation notebook" note={all.length ? `${all.length} loaded${query ? ` matching “${query}”` : ""}` : undefined}>
        <Query of={notes} label="working notes">{() => <div className={s.stack}>
          <div className={s.row}><Input aria-label="Search working notes" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search all working notes" /><select aria-label="Filter working notes by context" className={s.select} value={contextKind} onChange={(event) => setContextKind(event.target.value)}><option value="">All contexts</option><option value="question">Questions</option><option value="record">Records</option><option value="event">Events</option><option value="connection">Connections</option><option value="brief">Working briefs</option></select></div>
          {!all.length ? <div className={s.empty}><Text size="sm">{query || contextKind ? "No working notes match these filters." : "No working notes recorded yet."}</Text><Text size="sm" tone="tertiary">{query || contextKind ? "Search and context filtering are server-side and cover notes beyond the currently loaded window." : "Start with the question you want to answer, or a lead you want to return to."}</Text>{mayWrite && !query && !contextKind ? <Button type="button" intent="primary" onClick={() => openNote()}>Write a note</Button> : null}</div> : <>
            <Text size="xs" tone="tertiary">Showing {all.length} loaded note{all.length === 1 ? "" : "s"}{query ? ` matching “${query}”` : ""}{contextKind ? ` in ${contextKind === "brief" ? "working briefs" : `${contextKind}s`}` : ""}. Search, filtering, and pagination are applied by the server.</Text>
            <div className={s.stack}>{all.map((note) => <Note key={note.note_id} workspace={workspace} note={note} active={note.note_id === activeId} mayWrite={mayWrite} select={() => openNote(note.note_id)} />)}</div>
            <MoreButton available={notes.hasNextPage} pending={notes.isFetchingNextPage} load={() => void notes.fetchNextPage()} />
            {selected && !selectedOnPage ? <div className={s.details}><Text size="xs" tone="tertiary">Selected note is outside the current page or filter.</Text><Note workspace={workspace} note={selected} active mayWrite={mayWrite} select={() => openNote(selected.note_id)} /></div> : null}
          </>}
        </div>}</Query>
      </Panel>
      {mayWrite ? <Panel title={selected ? "Selected note" : "Write a note"}>
        {targetedLoading ? <Text size="sm" tone="tertiary">Opening the selected note…</Text> : targetedNote.error && !selected ? <Failure error={targetedNote.error} /> : selected ? <NoteDetail workspace={workspace} note={selected} mayWrite={mayWrite} /> : <NoteForm workspace={workspace} initialBody={draft?.body} initialContext={draft?.context} saved={(saved) => openNote(saved.note_id)} />}
      </Panel> : null}
    </div>
    {!mayWrite && targetedLoading ? <Text size="sm" tone="tertiary">Opening the selected note…</Text> : null}
    {!mayWrite && targetedNote.error && !selected ? <Failure error={targetedNote.error} /> : null}
    {!mayWrite && selected ? <Panel title="Selected note"><NoteDetail workspace={workspace} note={selected} mayWrite={false} /></Panel> : null}
  </>;
}

function readNoteDraft(searchParams: URLSearchParams): NoteDraft | undefined {
  const body = searchParams.get("draft_note")?.trim().slice(0, 12000) ?? "";
  const kind = searchParams.get("context_kind");
  const id = searchParams.get("context_id")?.trim() ?? "";
  const context = kind && id && ["question", "record", "event", "connection", "brief"].includes(kind) ? { kind: kind as NoteContextKind, id } : undefined;
  return body ? { body, context } : undefined;
}

function readNoteContextKind(raw: string | null): NoteContextKind | "" {
  return raw && ["question", "record", "event", "connection", "brief"].includes(raw) ? raw as NoteContextKind : "";
}

function Note({ workspace, note, active, mayWrite, select }: { workspace: string; note: WorkingNote; active: boolean; mayWrite: boolean; select: () => void }) {
  const [editing, setEditing] = useState(false);
  const { shell } = useContext();
  return <article className={active ? `${s.note} ${s.noteActive}` : s.note}>{editing ? <NoteForm workspace={workspace} note={note} done={() => setEditing(false)} /> : <div className={s.stack}>
    <p className={s.body}>{note.body}</p>
    <NoteContextLink workspace={workspace} note={note} />
    <div className={s.row}><span className={s.muted}>{authorLabel(note.author, shell)} · {note.edited ? "Edited " : ""}{dateLabel(note.updated_at)}</span><Button size="sm" intent={active ? "primary" : "ghost"} onClick={select}>{active ? "Selected note" : "Open note"}</Button>{note.mine && mayWrite ? <Button size="sm" intent="ghost" onClick={() => setEditing(true)}>Edit note</Button> : null}</div>
  </div>}</article>;
}

function NoteDetail({ workspace, note, mayWrite }: { workspace: string; note: WorkingNote; mayWrite: boolean }) {
  const { shell } = useContext();
  return <div className={s.stack}><Text size="xs" tone="tertiary">{authorLabel(note.author, shell)} · {note.edited ? "Edited " : ""}{dateLabel(note.updated_at)} · Note {note.note_id}</Text><p className={s.body}>{note.body}</p><NoteContextLink workspace={workspace} note={note} />{note.mine && mayWrite ? <NoteForm workspace={workspace} note={note} /> : <Text size="xs" tone="tertiary">Only the author can edit this note.</Text>}</div>;
}

function NoteContextLink({ workspace, note }: { workspace: string; note: WorkingNote }) {
  if (!note.context_kind || !note.context_id) return null;
  const context: NoteContext = { kind: note.context_kind, id: note.context_id };
  return <Link className={s.inlineLink} href={noteContextHref(workspace, context)}>Open linked {noteContextLabel(context.kind).toLowerCase()}</Link>;
}

function NoteForm({ workspace, note, initialBody, initialContext, done, saved }: { workspace: string; note?: WorkingNote; initialBody?: string; initialContext?: NoteContext; done?: () => void; saved?: (note: WorkingNote) => void }) {
  const [body, setBody] = useState(note?.body ?? initialBody ?? "");
  const save = useResearchWrite(() => saveNoteAction(workspace, body, note?.note_id, note ? undefined : initialContext), [keys.notes.all(workspace)], (value) => { if (!note) setBody(""); saved?.(value); done?.(); });
  return <form className={s.stack} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
    <Field label={note ? "Edit working note" : "Working note"} required>{(aria) => <Textarea {...aria} rows={8} value={body} onChange={(event) => setBody(event.target.value)} placeholder="What are we trying to understand? What would help distinguish the possible explanations?" />}</Field>
    <Failure error={save.error} />
    {save.isSuccess && !note ? <Text size="sm" tone="accent" role="status">Note saved.</Text> : null}
    <div className={s.row}><Button type="submit" intent="primary" loading={save.isPending}>Save note</Button>{note ? <Button type="button" intent="ghost" onClick={done}>Cancel</Button> : null}</div>
  </form>;
}
