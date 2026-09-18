export const eventHref = (workspace: string, event?: string) => {
  const path = `/investigation/${encodeURIComponent(workspace)}/timeline`;
  return event ? `${path}?event=${encodeURIComponent(event)}` : path;
};
