const MAX_SEARCH_LENGTH = 200;

/** Build a workspace-scoped source URL with optional capture, citation, and reader state. */
export const sourceHref = (
  workspace: string,
  source: string,
  capture?: string,
  citation?: string,
  returnTo?: string,
  searchQuery?: string,
  searchIndex?: number,
  extraction?: string,
  observationQuote?: string,
  observationStart?: number,
) => {
  const path = `/investigation/${encodeURIComponent(workspace)}/sources/${encodeURIComponent(source)}`;
  const params = new URLSearchParams();
  if (capture) params.set("capture", capture);
  if (citation) params.set("citation", citation);
  if (returnTo) params.set("return", returnTo);
  const normalizedSearch = searchQuery?.trim().slice(0, MAX_SEARCH_LENGTH) ?? "";
  if (normalizedSearch) {
    params.set("find", normalizedSearch);
    if (Number.isInteger(searchIndex) && (searchIndex ?? 0) >= 0) params.set("match", String(searchIndex));
  }
  if (extraction) params.set("extraction", extraction);
  const draftQuote = observationQuote?.slice(0, MAX_SEARCH_LENGTH) ?? "";
  if (draftQuote && Number.isInteger(observationStart) && (observationStart ?? 0) >= 0) {
    params.set("observe_quote", draftQuote);
    params.set("observe_start", String(observationStart));
  }
  return `${path}${params.size ? `?${params}` : ""}`;
};
