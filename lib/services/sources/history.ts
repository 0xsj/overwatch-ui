import type { CaptureSummary } from "./sources.types";

export function duplicateCaptureVersion(captures: CaptureSummary[], selected?: CaptureSummary): number | undefined {
  if (!selected) return undefined;
  return captures.find((capture) => capture.capture_id !== selected.capture_id && capture.sha256 === selected.sha256)?.version;
}
