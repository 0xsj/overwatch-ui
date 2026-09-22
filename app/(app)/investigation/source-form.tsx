"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Textarea } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { MediaType, SourceOrigin } from "@/lib/services/sources";
import { addCaptureAction, addSourceAction } from "./_actions";
import { Failure, sourceHref, useResearchWrite } from "./_shared";
import s from "./investigation.module.css";

export function SourceForm({ workspace, source }: { workspace: string; source?: string }) {
  const router = useRouter();
  const [origin, setOrigin] = useState<SourceOrigin>("paste");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [filename, setFilename] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [content, setContent] = useState("");
  const [contentBase64, setContentBase64] = useState("");
  const [media, setMedia] = useState<MediaType>("text/plain");
  const [fileError, setFileError] = useState<Error | null>(null);
  const [reading, setReading] = useState(false);
  const save = useResearchWrite(async () => {
    if (source) {
      const result = await addCaptureAction(workspace, source, content, media, contentBase64 || undefined);
      return result.ok ? { ok: true as const, value: { source_id: source, capture_id: result.value.capture_id } } : result;
    }
    const result = await addSourceAction(workspace, {
      title, origin, ...(url ? { url } : {}),
      ...(publishedAt ? { published_at: new Date(publishedAt).toISOString() } : {}),
      ...(origin === "reference" ? {} : contentBase64 ? { content_base64: contentBase64, media_type: media } : { content, media_type: media }),
      ...(origin === "import" ? { filename } : {}),
    });
    return result.ok ? { ok: true as const, value: { source_id: result.value.source_id, capture_id: result.value.latest_capture?.capture_id } } : result;
  }, [keys.sources.all(workspace)], (result) => {
    setContent(""); setContentBase64(""); setTitle(""); setUrl(""); setFilename(""); setPublishedAt("");
    router.push(sourceHref(workspace, result.source_id, result.capture_id));
  });

  const readFile = async (file: File | undefined) => {
    setFileError(null);
    if (!file) return;
    const binary = /\.(pdf|png|jpe?g|webp)$/i.test(file.name);
    if (file.size > (binary ? 8388608 : 262144)) { setFileError(new Error(binary ? "Choose a PDF or image of 8 MiB or smaller." : "Choose a text or JSON file of 256 KiB or smaller.")); return; }
    if (!/\.(txt|json|pdf|png|jpe?g|webp)$/i.test(file.name)) { setFileError(new Error("Choose a .txt, .json, .pdf, .png, .jpg, or .webp file.")); return; }
    setReading(true);
    try {
      const raw = await file.arrayBuffer();
      const extension = file.name.toLowerCase();
      if (binary) {
        const bytes = new Uint8Array(raw);
        let encoded = "";
        for (let offset = 0; offset < bytes.length; offset += 0x8000) encoded += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
        setFilename(file.name); setContent(""); setContentBase64(btoa(encoded)); setMedia(extension.endsWith(".pdf") ? "application/pdf" : extension.endsWith(".png") ? "image/png" : extension.endsWith(".webp") ? "image/webp" : "image/jpeg");
      } else {
        const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(raw);
        if (/\.json$/i.test(file.name)) JSON.parse(text);
        setFilename(file.name); setContentBase64(""); setContent(text); setMedia(/\.json$/i.test(file.name) ? "application/json" : "text/plain");
      }
      if (!title) setTitle(file.name);
    } catch { setFileError(new Error("The file must contain valid UTF-8 text or valid JSON.")); }
    finally { setReading(false); }
  };

  return <form className={s.stack} aria-label={source ? "Add a capture to this source" : "Add a source"} onSubmit={(event) => { event.preventDefault(); if (!reading) save.mutate(); }}>
    {!source ? <>
      <Field label="Add material as">{({ invalid: _invalid, ...aria }) => <select {...aria} className={s.select} value={origin} onChange={(event) => { setOrigin(event.target.value as SourceOrigin); setFileError(null); setFilename(""); setContent(""); setContentBase64(""); }}>
        <option value="paste">Pasted text</option><option value="import">Text, JSON, PDF, or image file</option><option value="reference">URL reference</option>
      </select>}</Field>
      <Field label="Source title" required>{(aria) => <Input {...aria} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Transit authority service notice" maxLength={400} />}</Field>
      <Field label={origin === "reference" ? "Source URL" : "Source URL (optional)"} required={origin === "reference"} hint="The URL is saved as a reference. Fetching it is an explicit action from the source reader.">{(aria) => <Input {...aria} type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" />}</Field>
      <Field label="Publication time (optional)" hint="When the source says it was published. This is separate from when Overwatch captured it or when you recorded an observation.">{(aria) => <Input {...aria} type="datetime-local" value={publishedAt} onChange={(event) => setPublishedAt(event.target.value)} />}</Field>
    </> : <Text size="sm" tone="tertiary">Add a new capture of this source. Earlier versions and their citations stay available.</Text>}
    {origin === "import" && !source ? <Field label="Text, JSON, PDF, or image file" required hint="Text/JSON up to 256 KiB; PDF/images up to 8 MiB.">{({ invalid: _invalid, ...aria }) => <input {...aria} type="file" accept=".txt,.json,.pdf,.png,.jpg,.jpeg,.webp,text/plain,application/json,application/pdf,image/png,image/jpeg,image/webp" className={s.file} onChange={(event) => void readFile(event.target.files?.[0])} />}</Field> : null}
    {source ? <Field label="Add a file capture (optional)" hint="PDF and image captures are retained as binary material; text extraction is not automatic.">{({ invalid: _invalid, ...aria }) => <input {...aria} type="file" accept=".txt,.json,.pdf,.png,.jpg,.jpeg,.webp,text/plain,application/json,application/pdf,image/png,image/jpeg,image/webp" className={s.file} onChange={(event) => void readFile(event.target.files?.[0])} />}</Field> : null}
    {source || origin !== "reference" ? <>
      {contentBase64 ? <Text size="sm" tone="tertiary">Binary file selected: {filename}. It will be retained without text extraction.</Text> : <Field label="Captured text" required hint="Retained exactly as entered. Review the text before saving.">{(aria) => <Textarea {...aria} rows={10} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Paste the material you want to examine…" />}</Field>}
      <Field label="Captured format">{({ invalid: _invalid, ...aria }) => <select {...aria} value={media} onChange={(event) => setMedia(event.target.value as MediaType)} className={s.select}><option value="text/plain">Plain text</option><option value="text/html">HTML</option><option value="application/json">JSON</option><option value="application/pdf">PDF</option><option value="image/png">PNG image</option><option value="image/jpeg">JPEG image</option><option value="image/webp">WebP image</option></select>}</Field>
      <Text size="xs" tone="tertiary">{contentBase64 ? "Binary bytes are retained exactly." : `${new TextEncoder().encode(content).length.toLocaleString()} / 262,144 bytes`}</Text>
    </> : <Text size="sm" tone="tertiary">This saves the title and URL. Add captured text later to record cited observations.</Text>}
    <Failure error={fileError ?? save.error} />
    <Button type="submit" intent="primary" loading={save.isPending || reading} disabled={Boolean(fileError) || reading}>{source ? "Save new capture" : "Save source"}</Button>
  </form>;
}
