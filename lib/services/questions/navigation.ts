export const questionHref = (workspace: string, question?: string, returnTo?: string) => {
  const path = `/investigation/${encodeURIComponent(workspace)}/questions`;
  const params = new URLSearchParams();
  if (question) params.set("question", question);
  if (returnTo) params.set("return", returnTo);
  return `${path}${params.size ? `?${params}` : ""}`;
};
