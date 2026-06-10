/** Parser CSV simple (soporta campos entre comillas y comas dentro de comillas). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(cell.trim());
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      cell = "";
      if (ch === "\r") i++;
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((c) => c.length > 0)) rows.push(row);
  }

  return rows;
}

export function rowsToObjects<T extends Record<string, string>>(
  rows: string[][],
  requiredHeaders: (keyof T & string)[],
): { headers: string[]; data: T[]; errors: string[] } {
  const errors: string[] = [];
  if (rows.length < 2) return { headers: [], data: [], errors: ["El archivo debe tener encabezado y al menos una fila de datos."] };

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  for (const req of requiredHeaders) {
    if (!headers.includes(req)) errors.push(`Falta la columna obligatoria: ${req}`);
  }
  if (errors.length) return { headers, data: [], errors };

  const data: T[] = [];
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    if (!values.some((v) => v.length > 0)) continue;
    const obj = {} as T;
    for (let j = 0; j < headers.length; j++) {
      (obj as Record<string, string>)[headers[j]] = values[j] ?? "";
    }
    data.push(obj);
  }
  return { headers, data, errors };
}
