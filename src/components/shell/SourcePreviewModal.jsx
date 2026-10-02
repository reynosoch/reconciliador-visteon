import { useMemo, useState } from "react";
import OverlayPortal from "./OverlayPortal.jsx";

const cleanFileName = (value) => String(value || "fuente").replace(/\.[^.]+$/, "");
const textValue = (value) => value === null || value === undefined ? "" : String(value);
const quoteCsv = (value) => {
  const text = textValue(value);
  return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
};

function downloadBlob(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function SourcePreviewModal({ selection, onClose }) {
  const [busy, setBusy] = useState("");
  const rows = useMemo(() => {
    if (!selection) return [];
    let all = selection.source?.rows || [];

    if (selection.config?.type === "bom" && selection.partNumber) {
      const target = String(selection.partNumber).trim().toUpperCase();
      all = all.filter(
        (row) =>
          String(row?.["Parent Item"] || "")
            .trim()
            .toUpperCase() === target,
      );
    }

    if (
      selection.config?.type !== "bom" ||
      !selection.fileName ||
      selection.fileName === "__all"
    ) {
      return all;
    }

    return all.filter(
      (row) => String(row.__sourceFile || "") === selection.fileName,
    );
  }, [selection]);
  const columns = useMemo(() => {
    const keys = new Set();
    rows.slice(0, 250).forEach((row) => Object.keys(row || {}).forEach((key) => {
      if (key !== "__sourceFile") keys.add(key);
    }));
    return [...keys];
  }, [rows]);
  if (!selection) return null;

  const displayName = selection.partNumber
    ? `BOM · ${selection.partNumber}`
    : selection.fileName === "__all"
      ? "Todos los BOM cargados"
      : selection.fileName ||
        selection.source?.fileName ||
        selection.config?.label ||
        "Fuente";
  const base = cleanFileName(
    selection.partNumber
      ? `BOM-${selection.partNumber}`
      : displayName === "Todos los BOM cargados"
        ? "BOM-todos"
        : displayName,
  );

  const download = async (format) => {
    if (busy) return;
    setBusy(format);
    try {
      if (format === "xlsx") {
        const XLSX = await import("xlsx");
        const sheet = XLSX.utils.json_to_sheet(
          rows.map((row) =>
            Object.fromEntries(columns.map((column) => [column, row[column]])),
          ),
        );
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, "Datos");
        XLSX.writeFile(book, base + ".xlsx", { compression: true });
        return;
      }
      const separator = format === "txt" ? "\t" : ",";
      const encode = format === "txt" ? textValue : quoteCsv;
      const body = [
        columns.map(encode).join(separator),
        ...rows.map((row) => columns.map((column) => encode(row[column])).join(separator)),
      ].join("\n");
      downloadBlob(body, base + "." + format, format === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8");
    } finally {
      setBusy("");
    }
  };

  return (
    <OverlayPortal onClose={onClose}>
      <div className="vi-global-overlay vi-source-preview-overlay" onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}>
        <section className="vi-source-preview">
          <header>
            <div>
              <p className="vi-eyebrow">VISOR DE FUENTE</p>
              <h2>{displayName}</h2>
              <span>{rows.length.toLocaleString("es-MX")} filas reales cargadas</span>
            </div>
            <button type="button" className="vi-icon-close" onClick={onClose} aria-label="Cerrar visor">×</button>
          </header>
          <div className="vi-source-preview-actions">
            <strong>DESCARGAR COMO</strong>
            <button type="button" disabled={Boolean(busy)} onClick={() => download("csv")}>CSV</button>
            <button type="button" disabled={Boolean(busy)} onClick={() => download("xlsx")}>XLSX</button>
            <button type="button" disabled={Boolean(busy)} onClick={() => download("txt")}>TXT</button>
          </div>
          <p className="vi-source-preview-note">
            <strong>SOLO LECTURA.</strong>{" "}
            {selection.partNumber
              ? `Filtro exacto por Parent Item ${selection.partNumber}. `
              : ""}
            Vista previa de las primeras{" "}
            {Math.min(rows.length, 150).toLocaleString("es-MX")} filas.
            Para cambiar datos, edita el archivo original y vuelve a subirlo en
            Fuentes. La descarga contiene toda la selección.
          </p>
          <div className="vi-source-preview-table-wrap">
            <table className="vi-source-preview-table">
              <thead><tr><th>#</th>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
              <tbody>
                {rows.slice(0, 150).map((row, index) => (
                  <tr key={index}>
                    <th>{index + 1}</th>
                    {columns.map((column) => <td key={column}>{textValue(row[column]) || "—"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <div className="vi-source-preview-empty">No hay filas para esta selección.</div>}
          </div>
        </section>
      </div>
    </OverlayPortal>
  );
}
