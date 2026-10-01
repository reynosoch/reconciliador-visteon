export async function buildBomWorkbook(library) {
  const XLSX = await import("xlsx");
  const rows = library.rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).filter(([key]) => key !== "__sourceFile"),
    ),
  );
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "BOM registrados");
  return book;
}
export async function downloadBomWorkbook(library) {
  const XLSX = await import("xlsx");
  XLSX.writeFile(await buildBomWorkbook(library), "BOM-registrados.xlsx", { compression: true });
}
