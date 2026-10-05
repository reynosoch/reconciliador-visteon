const parent = (row) =>
  String(row["Parent Item"] ?? "")
    .trim()
    .toUpperCase();
function fieldValue(key, value) {
  const text = String(value ?? "").trim();
  if (key === "Level" && [".2", "0.2", "0,2"].includes(text)) return ".2";
  if (["Comp Phantom", "Parent Phantom"].includes(key))
    return text.toLowerCase();
  return text;
}
const canonical = (rows) =>
  JSON.stringify(
    rows
      .map((row) =>
        Object.entries(row)
          .filter(([k]) => !k.startsWith("__") && !["Seq", "Seq  "].includes(k))
          .map(([k, v]) => [k.trim(), fieldValue(k.trim(), v)])
          .sort(([a], [b]) => a.localeCompare(b)),
      )
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  );
const group = (rows) => {
  const result = new Map();
  for (const row of rows) {
    const key = parent(row);
    if (!key)
      throw new Error(
        "Hay una fila BOM sin Parent Item. Conservamos los BOM anteriores.",
      );
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(row);
  }
  return result;
};
// La misma versión se ignora. Versiones distintas nunca se suman silenciosamente.
export function mergeBomLibrary(
  library = { rows: [], files: [] },
  incoming,
  fileName,
  fingerprint,
) {
  const existing = group(library.rows),
    next = group(incoming);
  const conflicts = [...next]
    .filter(
      ([key, rows]) =>
        existing.has(key) && canonical(existing.get(key)) !== canonical(rows),
    )
    .map(([key]) => key);
  if (conflicts.length)
    throw new Error(
      `Este archivo cambia BOM ya guardados: ${conflicts.slice(0, 8).join(", ")}. No se agregó el archivo ni se borraron los anteriores. Confirma qué versión usar con el departamento.`,
    );
  const additions = [...next]
    .filter(([key]) => !existing.has(key))
    .flatMap(([, rows]) =>
      rows.map((row) => ({ ...row, __sourceFile: row.__sourceFile || fileName })),
    );
  if (!additions.length) return { ...library, addedParents: 0 };
  return {
    rows: [...library.rows, ...additions.map(row => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "__provenance")))],
    files: [
      ...library.files,
      {
        fileName,
        fingerprint,
        loadedAt: new Date().toISOString(),
        rowCount: additions.length,
        rowOrigins: additions.map(row => row.__provenance || null),
      },
    ],
    addedParents: [...next.keys()].filter((key) => !existing.has(key)).length,
  };
}
