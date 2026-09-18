export function filterLoadedRows<T>(rows: T[], query: string, fields: (row: T) => string[]) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return rows;
  return rows.filter((row) => fields(row).some((field) => field.toLowerCase().includes(normalized)));
}

export function unresolvedIDs<T>(selectedIDs: string[], rows: T[], idOf: (row: T) => string) {
  const available = new Set(rows.map(idOf));
  return selectedIDs.filter((id) => !available.has(id));
}
