export const eventHref = (workspace: string, event?: string) => {
  const path = `/investigation/${encodeURIComponent(workspace)}/timeline`;
  return event ? `${path}?event=${encodeURIComponent(event)}` : path;
};

export const eventRevisionHref = (workspace: string, event: string, revision: string) =>
  `/investigation/${encodeURIComponent(workspace)}/timeline/${encodeURIComponent(event)}/revisions/${encodeURIComponent(revision)}`;
