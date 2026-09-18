export const noteHref = (workspace: string, note?: string, returnTo?: string) => {
  const path = `/investigation/${encodeURIComponent(workspace)}/notes`;
  const params = new URLSearchParams();
  if (note) params.set("note", note);
  if (returnTo) params.set("return", returnTo);
  return `${path}${params.size ? `?${params}` : ""}`;
};
