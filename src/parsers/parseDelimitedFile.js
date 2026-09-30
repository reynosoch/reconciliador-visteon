import Papa from "papaparse";
function decode(buffer) {
  const bytes = new Uint8Array(buffer), utf8 = new TextDecoder("utf-8").decode(bytes);
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(bytes) : utf8;
}
function fromMatrix(matrix, fileName, delimiter, errors = [], start = 0) {
  const originalFields = (matrix[start] || []).map(v => String(v ?? "").trim());
  const seen = new Map(), warnings = [], reserved = new Set(originalFields);
  const fields = originalFields.map((name, i) => {
    const n = (seen.get(name) || 0) + 1;
    seen.set(name, n);
    if (n === 1 && name) return name;
    let renamed = name ? `${name}__${n}` : `Columna_${i + 1}`;
    while (reserved.has(renamed)) renamed += "_";
    reserved.add(renamed);
    if (name) warnings.push({ type: "DuplicateHeader", header: name, renamed, message: `Hay dos columnas llamadas ${name}; conservamos ambas.` });
    return renamed;
  });
  const data = matrix.slice(start + 1).filter(row => row.some(v => String(v ?? "").trim()));
  if (data.some(row => row.length > fields.length && row.slice(fields.length).some(v => String(v ?? "").trim())))
    errors = [...errors, { message: "Hay filas con más columnas que el encabezado." }];
  return { fileName, fields, originalFields, rows: data.map(row => Object.fromEntries(fields.map((key, i) => [key, row[i] ?? ""]))),
    duplicateHeaders: [...seen].filter(([, n]) => n > 1).map(([name]) => name), warnings, delimiter, errors };
}
export async function parseDelimitedFile(file, { requiredFields = [] } = {}) {
  if (!file) throw new Error("No se recibió ningún archivo.");
  const bytes = await file.arrayBuffer();
  if (/\.xlsx$/i.test(file.name)) {
    const XLSX = await import("xlsx");
    const book = XLSX.read(bytes, { type: "array", cellText: true });
    const candidates = [];
    for (const name of book.SheetNames) {
      const sheet = book.Sheets[name];
      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "", blankrows: false });
      const start = requiredFields.length ? matrix.slice(0, 50).findIndex(row => {
        const headers = row.map(v => String(v ?? "").trim());
        return requiredFields.every(group => group.some(key => headers.includes(key)));
      }) : matrix.findIndex(row => row.some(v => String(v ?? "").trim()));
      if (start < 0) continue;
      // Preserve formatted identifiers (e.g. 000123), never rounded display costs/quantities.
      const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
      const ids = new Set(["Item Number", "Parent Item", "Component", "Número Parte QAD", "Numero Parte QAD", "Numero de parte", "numero_parte", "Site", "Ticket/FIFO"]);
      const idCols = matrix[start].map((v, i) => ids.has(String(v).trim()) ? i : -1).filter(i => i >= 0);
      // Matrix uses nonblank rows; walk actual sheet rows so title/blank rows do not shift identifiers.
      let outputRow = 0;
      for (let r = range.s.r; r <= range.e.r; r++) {
        const populated = Array.from({ length: range.e.c - range.s.c + 1 }, (_, i) => sheet[XLSX.utils.encode_cell({ r, c: range.s.c + i })]).some(c => String(c?.v ?? "").trim());
        if (!populated) continue;
        if (outputRow > start) for (const i of idCols) {
          const cell = sheet[XLSX.utils.encode_cell({ r, c: range.s.c + i })];
          if (cell?.t === "n" && cell.w) matrix[outputRow][i] = cell.w;
        }
        outputRow++;
      }
      candidates.push({ ...fromMatrix(matrix, file.name, "xlsx", [], start), sheetName: name });
    }
    if (candidates.length !== 1) throw new Error(candidates.length ? "Hay varias hojas con estas columnas. Guarda la hoja que necesitas en otro XLSX o CSV." : "No encontramos una hoja con las columnas necesarias en este Excel.");
    return candidates[0];
  }
  const parsed = Papa.parse(decode(bytes), { header: false, delimiter: "", skipEmptyLines: true });
  return fromMatrix(parsed.data || [], file.name, parsed.meta.delimiter, parsed.errors || []);
}
export function downloadSourceCsv(source) {
  const csv = Papa.unparse({ fields: source.fields, data: source.rows.map(row => source.fields.map(key => row[key] ?? "")) }, { escapeFormulae: true });
  const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = source.fileName.replace(/\.[^.]+$/, "") + ".csv"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
