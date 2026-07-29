/**
 * Minimal strict CSV parser shared by the ingest scripts. Handles quoted
 * fields, embedded commas, escaped quotes and CRLF. Returns rows of cells;
 * callers map the header row themselves.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  // Drop trailing blank lines.
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
}

/** Column accessor factory: header row -> (row, name) lookups that throw on unknown columns. */
export function columns(header: string[]): (row: string[], name: string) => string {
  const idx = new Map(header.map((h, i) => [h.trim(), i]));
  return (row, name) => {
    const i = idx.get(name);
    if (i === undefined) throw new Error(`Unknown CSV column '${name}' (have: ${header.join(", ")})`);
    return row[i] ?? "";
  };
}
