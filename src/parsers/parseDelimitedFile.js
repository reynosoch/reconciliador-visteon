import Papa from "papaparse";
function decode(buffer) {
  const bytes = new Uint8Array(buffer), utf8 = new TextDecoder("utf-8").decode(bytes);
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(bytes) : utf8;
}
function fromMatrix(matrix, fileName, delimiter, errors = [], start = 0, origins = [], sheetName = "", firstColumn = 0) {
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
  const data = matrix.slice(start + 1).map((row, i) => ({ row, origin: origins[start + 1 + i] })).filter(({row}) => row.some(v => String(v ?? "").trim()));
  if (data.some(({row}) => row.length > fields.length && row.slice(fields.length).some(v => String(v ?? "").trim())))
    errors = [...errors, { message: "Hay filas con más columnas que el encabezado." }];
  return { fileName, fields, originalFields, rows: data.map(({row, origin}) => ({...Object.fromEntries(fields.map((key, i) => [key, row[i] ?? ""])), __provenance: {fileName, sheetName, rowNumber: origin ?? null, firstColumn}})),
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
      const origins = [];
      for (let r = range.s.r; r <= range.e.r; r++) {
        const populated = Array.from({ length: range.e.c - range.s.c + 1 }, (_, i) => sheet[XLSX.utils.encode_cell({ r, c: range.s.c + i })]).some(c => String(c?.v ?? "").trim());
        if (!populated) continue;
        origins.push(r + 1);
        if (outputRow > start) for (const i of idCols) {
          const cell = sheet[XLSX.utils.encode_cell({ r, c: range.s.c + i })];
          if (cell?.t === "n" && cell.w) matrix[outputRow][i] = cell.w;
        }
        outputRow++;
      }
      candidates.push({ ...fromMatrix(matrix, file.name, "xlsx", [], start, origins, name, range.s.c), sheetName: name });
    }
    if (candidates.length !== 1) throw new Error(candidates.length ? "Hay varias hojas con estas columnas. Guarda la hoja que necesitas en otro XLSX o CSV." : "No encontramos una hoja con las columnas necesarias en este Excel.");
    const source = candidates[0];
    // Convert once on import, then discard the workbook and CSV buffer.
    // All downstream parsers/storage work with lightweight CSV rows.
    const csv = Papa.unparse({ fields: source.fields, data: source.rows.map(row => Object.fromEntries(source.fields.map(key => [key,row[key]]))) }, { newline: "\n" });
    const normalized = Papa.parse(csv, { header: true, skipEmptyLines: true });
    if (normalized.errors.length) throw new Error("No pudimos convertir este Excel a CSV. Conservamos la fuente anterior.");
    return { ...source, rows: normalized.data.map((row,i) => ({...row,__provenance:source.rows[i].__provenance})), delimiter: ",", originalFormat: "xlsx", convertedTo: "csv" };
  }
  const text = decode(bytes), matrix = [], origins = [], errors = [];
  let cursor = 0, line = 1, delimiter = "";
  Papa.parse(text, { header: false, delimiter: "", skipEmptyLines: false, step(result) {
    matrix.push(result.data); origins.push(line); errors.push(...result.errors); delimiter = result.meta.delimiter;
    line += (text.slice(cursor,result.meta.cursor).match(/\r\n|\r|\n/g) || []).length;
    cursor = result.meta.cursor;
  }});
  const start = matrix.findIndex(row => row.some(v => String(v ?? "").trim()));
  return fromMatrix(matrix, file.name, delimiter, errors, Math.max(start,0), origins);
}
