import { scanEvidenceObject } from "./scanView.js";

// One model for the existing source viewer, with or without tracer highlights.
export function buildSourcePreview(selection) {
  if (!selection) return { entries: [], columns: [], sheets: [] };
  const source = selection.source || {},
    evidence = new Map(
      (selection.evidence || []).map((row) => [row.sourceIndex, row]),
    );
  const isScan = selection.config?.type === "scans";
  const filePositions = new Map(),
    files = new Map();
  for (const file of source.files || [])
    files.set(file.fileName, files.has(file.fileName) ? null : file);
  const entries = [];
  for (const [sourceIndex, row] of (source.rows || []).entries()) {
    const fileName = row.__sourceFile || source.fileName || "";
    const fileIndex = filePositions.get(fileName) || 0;
    filePositions.set(fileName, fileIndex + 1);
    if (selection.config?.type === "bom") {
      if (
        selection.partNumber &&
        String(row["Parent Item"] || "")
          .trim()
          .toUpperCase() !== String(selection.partNumber).trim().toUpperCase()
      )
        continue;
      if (
        selection.fileName &&
        selection.fileName !== "__all" &&
        fileName !== selection.fileName
      )
        continue;
    }
    const ref = evidence.get(sourceIndex);
    const origin = ref?.origin ||
      row.__provenance ||
      files.get(fileName)?.rowOrigins?.[fileIndex] || {
        fileName: fileName || "Snapshot 4Wall publicado",
        sheetName: source.sheetName || "",
        rowNumber: null,
        firstColumn: 0,
      };
    entries.push({
      row: isScan ? scanEvidenceObject(row) : row,
      sourceIndex,
      origin,
      evidence: ref,
    });
  }
  const keys = new Set(
    (source.fields || []).filter((k) => !k.startsWith("__")),
  );
  entries.slice(0, 250).forEach(({ row }) =>
    Object.keys(row).forEach((k) => {
      if (!k.startsWith("__")) keys.add(k);
    }),
  );
  const usedColumns = new Set(
    [...evidence.values()].flatMap((ref) => ref.cells.map((c) => c.column)),
  );
  usedColumns.forEach((key) => keys.add(key));
  const columns = [...keys];
  return {
    entries,
    columns,
    usedColumns,
    sheets: [
      ...new Set(entries.map((e) => e.origin.sheetName).filter(Boolean)),
    ],
  };
}
