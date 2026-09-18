"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Field, Input, Textarea } from "@/components/forms";
import { Panel } from "@/components/display";
import { Text } from "@/components/typography";
import { filterLoadedRows } from "@/lib/query/filter";
import { keys } from "@/lib/query";
import type { WorkingNote } from "@/lib/services/notes";
import { noteHref } from "@/lib/services/notes/navigation";
import { mayWriteResearch } from "../_route-context";
import { PageHead } from "../_components/page-head";
import { Query, useContext } from "../_hooks";
import { workingNoteQuery, workingNotesQuery } from "../_queries";
import { saveNoteAction } from "./_actions";
import { authorLabel, dateLabel, Failure, useResearchWrite } from "./_shared";
import s from "./investigation.module.css";

const pageSize = 20;

export function NotesScreen({ workspace }: { workspace: string }) {
  const { shell } = useContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedReturn = searchParams.get("return") ?? "";
  const returnTo = requestedReturn.startsWith(`/investigation/${encodeURIComponent(workspace)}/`) ? requestedReturn : "";
  const mayWrite = mayWriteResearch(shell?.context?.workspace);
  const notes = useQuery({ queryKey: keys.notes.list(workspace), queryFn: () => workingNotesQuery(workspace) });
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const activeId = searchParams.get("note");
  const all = notes.data ?? [];
  const visibleRows = filterLoadedRows(all, filter, (note) => [note.note_id, note.body, note.author, note.created_at, note.updated_at]);
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const pageRows = visibleRows.slice((page - 1) * pageSize, page * pageSize);
  const selectedFromList = all.find((note) => note.note_id === activeId);
  const targetedNote = useQuery({
    queryKey: keys.notes.one(workspace, activeId ?? ""),
    queryFn: () => workingNoteQuery(workspace, activeId!),
    enabled: Boolean(activeId) && !selectedFromList,
    retry: false,
  });
  const selected = selectedFromList ?? targetedNote.data;
  const selectedOnPage = Boolean(selected && pageRows.some((note) => note.note_id === selected.note_id));
  const targetedLoading = Boolean(activeId && !selected && targetedNote.isPending);

  function openNote(note?: string) {
    router.replace(noteHref(workspace, note, returnTo || undefined));
  }

  return <>
    {returnTo ? <Link href={returnTo} className={s.back}>Back to handoff</Link> : null}
    <PageHead title="Working notes" actions={mayWrite ? <Button type="button" intent="primary" onClick={() => openNote()}>New note</Button> : undefined}>
      State the question, develop an interpretation, and record what remains uncertain. These notes are editable and remain distinct from source-backed observations.
    </PageHead>
    <div className={mayWrite ? s.columns : undefined}>
      <Panel title="Investigation notebook" note={all.length ? `${all.length} loaded` : undefined}>
        <Query of={notes} label="working notes">{() => <div className={s.stack}>
          {!all.length ? <div className={s.empty}><Text size="sm">No working notes recorded yet.</Text><Text size="sm" tone="tertiary">Start with the question you want to answer, or a lead you want to return to.</Text>{mayWrite ? <Button type="button" intent="primary" onClick={() => openNote()}>Write a note</Button> : null}</div> : <>
            <Input aria-label="Filter working notes" value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }} placeholder="Filter loaded notes" />
            <Text size="xs" tone="tertiary">Showing {pageRows.length} of {visibleRows.length} matching note{visibleRows.length === 1 ? "" : "s"} · {all.length} loaded.</Text>
            {pageRows.length ? <div className={s.stack}>{pageRows.map((note) => <Note key={note.note_id} workspace={workspace} note={note} active={note.note_id === activeId} mayWrite={mayWrite} select={() => openNote(note.note_id)} />)}</div> : <Text size="sm" tone="tertiary">No loaded notes match. Clear the filter or try another phrase.</Text>}
            <div className={s.row} aria-label="Working notes pagination">
              <Button type="button" size="sm" intent="ghost" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous page</Button>
              <Text size="xs" tone="tertiary">Page {page} of {pageCount}</Text>
              <Button type="button" size="sm" intent="ghost" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next page</Button>
            </div>
            {all.length >= 100 ? <Text size="xs" tone="tertiary">Showing the latest 100 working notes. Filtering and pagination apply to this loaded window; the notes API does not expose a cursor search yet.</Text> : null}
            {selected && !selectedOnPage ? <div className={s.details}><Text size="xs" tone="tertiary">Selected note is outside the current page or filter.</Text><Note workspace={workspace} note={selected} active mayWrite={mayWrite} select={() => openNote(selected.note_id)} /></div> : null}
          </>}
        </div>}</Query>
      </Panel>
      {mayWrite ? <Panel title={selected ? "Selected note" : "Write a note"}>
        {targetedLoading ? <Text size="sm" tone="tertiary">Opening the selected note…</Text> : targetedNote.error && !selected ? <Failure error={targetedNote.error} /> : selected ? <NoteDetail workspace={workspace} note={selected} mayWrite={mayWrite} /> : <NoteForm workspace={workspace} saved={(saved) => openNote(saved.note_id)} />}
      </Panel> : null}
    </div>
    {!mayWrite && targetedLoading ? <Text size="sm" tone="tertiary">Opening the selected note…</Text> : null}
    {!mayWrite && targetedNote.error && !selected ? <Failure error={targetedNote.error} /> : null}
    {!mayWrite && selected ? <Panel title="Selected note"><NoteDetail workspace={workspace} note={selected} mayWrite={false} /></Panel> : null}
  </>;
}

function Note({ workspace, note, active, mayWrite, select }: { workspace: string; note: WorkingNote; active: boolean; mayWrite: boolean; select: () => void }) {
  const [editing, setEditing] = useState(false);
  const { shell } = useContext();
  return <article className={active ? `${s.note} ${s.noteActive}` : s.note}>{editing ? <NoteForm workspace={workspace} note={note} done={() => setEditing(false)} /> : <div className={s.stack}>
    <p className={s.body}>{note.body}</p>
    <div className={s.row}><span className={s.muted}>{authorLabel(note.author, shell)} · {note.edited ? "Edited " : ""}{dateLabel(note.updated_at)}</span><Button size="sm" intent={active ? "primary" : "ghost"} onClick={select}>{active ? "Selected note" : "Open note"}</Button>{note.mine && mayWrite ? <Button size="sm" intent="ghost" onClick={() => setEditing(true)}>Edit note</Button> : null}</div>
  </div>}</article>;
}

function NoteDetail({ workspace, note, mayWrite }: { workspace: string; note: WorkingNote; mayWrite: boolean }) {
  const { shell } = useContext();
  return <div className={s.stack}><Text size="xs" tone="tertiary">{authorLabel(note.author, shell)} · {note.edited ? "Edited " : ""}{dateLabel(note.updated_at)} · Note {note.note_id}</Text><p className={s.body}>{note.body}</p>{note.mine && mayWrite ? <NoteForm workspace={workspace} note={note} /> : <Text size="xs" tone="tertiary">Only the author can edit this note.</Text>}</div>;
}

function NoteForm({ workspace, note, done, saved }: { workspace: string; note?: WorkingNote; done?: () => void; saved?: (note: WorkingNote) => void }) {
  const [body, setBody] = useState(note?.body ?? "");
  const save = useResearchWrite(() => saveNoteAction(workspace, body, note?.note_id), [keys.notes.all(workspace)], (value) => { if (!note) setBody(""); saved?.(value); done?.(); });
  return <form className={s.stack} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
    <Field label={note ? "Edit working note" : "Working note"} required>{(aria) => <Textarea {...aria} rows={8} value={body} onChange={(event) => setBody(event.target.value)} placeholder="What are we trying to understand? What would help distinguish the possible explanations?" />}</Field>
    <Failure error={save.error} />
    {save.isSuccess && !note ? <Text size="sm" tone="accent" role="status">Note saved.</Text> : null}
    <div className={s.row}><Button type="submit" intent="primary" loading={save.isPending}>Save note</Button>{note ? <Button type="button" intent="ghost" onClick={done}>Cancel</Button> : null}</div>
  </form>;
}
