import { useEffect, useMemo, useState } from "react";
import OverlayPortal from "./OverlayPortal.jsx";
import { buildSourcePreview } from "../../domain/sourceEvidence.js";
import { columnLetter } from "../../domain/partLearningTrace.js";

const cleanFileName = (value) =>
  String(value || "fuente").replace(/\.[^.]+$/, "");
const textValue = (value) =>
  value === null || value === undefined ? "" : String(value);
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
  const [page, setPage] = useState(0);
  const [onlyEvidence, setOnlyEvidence] = useState(true);
  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState("");
  const [activeCell, setActiveCell] = useState(null);
  const [error, setError] = useState("");
  const model = useMemo(() => buildSourcePreview(selection), [selection]);
  const { columns } = model;
  const rows = useMemo(() => model.entries.map((e) => e.row), [model]);
  const filtered = useMemo(
    () =>
      model.entries.filter(
        (e) =>
          (!(selection?.evidence && onlyEvidence) || e.evidence) &&
          (!sheet || e.origin.sheetName === sheet) &&
          (!query ||
            columns.some((key) =>
              textValue(e.row[key]).toLowerCase().includes(query.toLowerCase()),
            )),
      ),
    [model, selection, onlyEvidence, sheet, query, columns],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 60));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * 60, currentPage * 60 + 60);
  useEffect(() => {
    setPage(0);
    setOnlyEvidence(true);
    setQuery("");
    setSheet("");
    setActiveCell(null);
    setError("");
  }, [selection]);
  if (!selection) return null;

  const displayName = selection.tracePn
    ? `${selection.config.label} · PN ${selection.tracePn}`
    : selection.partNumber
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
    setError("");
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
        ...rows.map((row) =>
          columns.map((column) => encode(row[column])).join(separator),
        ),
      ].join("\n");
      downloadBlob(
        body,
        base + "." + format,
        format === "csv"
          ? "text/csv;charset=utf-8"
          : "text/plain;charset=utf-8",
      );
    } catch (failure) {
      setError("No pudimos descargar la selección: " + failure.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <OverlayPortal onClose={onClose}>
      <div
        className="vi-global-overlay vi-source-preview-overlay"
        style={selection.tracePn ? { zIndex: 1400 } : undefined}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose?.();
        }}
      >
        <section
          className="vi-source-preview"
          role="dialog"
          aria-modal="true"
          aria-label="Visor de fuente"
        >
          <header>
            <div>
              <p className="vi-eyebrow">VISOR DE FUENTE</p>
              <h2>{displayName}</h2>
              <span>
                {rows.length.toLocaleString("es-MX")} filas reales cargadas
              </span>
            </div>
            <button
              type="button"
              className="vi-icon-close"
              onClick={onClose}
              aria-label="Cerrar visor"
            >
              ×
            </button>
          </header>
          <div className="vi-source-preview-actions">
            <strong>DESCARGAR COMO</strong>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => download("csv")}
            >
              CSV
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => download("xlsx")}
            >
              XLSX
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => download("txt")}
            >
              TXT
            </button>
          </div>
          <div className="vi-evidence-toolbar">
            <label>
              Buscar en la tabla
              <input
                aria-label="Buscar en la fuente"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="PN, localidad o valor…"
              />
            </label>
            {selection.evidence && (
              <label className="vi-evidence-toggle">
                <input
                  type="checkbox"
                  checked={onlyEvidence}
                  onChange={(e) => {
                    setOnlyEvidence(e.target.checked);
                    setPage(0);
                  }}
                />
                Solo filas del cálculo
              </label>
            )}
            {model.sheets.length > 0 && (
              <label>
                Hoja
                <select
                  aria-label="Hoja de la fuente"
                  value={sheet}
                  onChange={(e) => {
                    setSheet(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">Todas las hojas disponibles</option>
                  {model.sheets.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <p className="vi-source-preview-note">
            <strong>SOLO LECTURA.</strong>{" "}
            {selection.partNumber
              ? `Filtro exacto por Parent Item ${selection.partNumber}. `
              : ""}
            {filtered.length.toLocaleString("es-MX")} filas en esta vista;
            máximo 60 por página. La descarga conserva toda la selección
            original. Las coordenadas originales aparecen cuando el archivo las
            conserva; «Registro» indica una posición en la colección, no una
            fila del Excel original.
          </p>
          {selection.rule && (
            <div className="vi-evidence-rule">
              <strong>Regla aplicada:</strong> {selection.rule}
            </div>
          )}
          <div className="vi-evidence-cell-info" aria-live="polite">
            {activeCell ? (
              <>
                <strong>{activeCell.column}</strong>
                <span>
                  Original: {textValue(activeCell.original) || "Vacío"} →
                  Normalizado: {textValue(activeCell.normalized) || "Vacío"}
                </span>
                <span>{activeCell.reason}</span>
              </>
            ) : (
              <span>
                Selecciona una celda naranja para ver su valor original, valor
                normalizado y por qué participa.
              </span>
            )}
          </div>
          {error && (
            <p role="alert" className="vi-source-preview-note">
              {error}
            </p>
          )}
          <div className="vi-source-preview-table-wrap">
            <table className="vi-source-preview-table">
              <thead>
                <tr>
                  <th>Fila / registro</th>
                  {columns.map((column, index) => (
                    <th
                      className={model.usedColumns.has(column) ? "is-used" : ""}
                      key={column}
                    >
                      <small>
                        {columnLetter(
                          index + (visible[0]?.origin.firstColumn || 0),
                        )}
                      </small>
                      {column}
                      {model.usedColumns.has(column) && <b> USADO</b>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((entry) => (
                  <tr
                    className={entry.evidence ? "is-evidence" : ""}
                    key={entry.sourceIndex}
                  >
                    <th
                      title={
                        entry.origin.rowNumber
                          ? "Fila original del archivo"
                          : "Posición de la colección; fila original no disponible"
                      }
                    >
                      {entry.origin.rowNumber ??
                        `Registro ${entry.sourceIndex + 1}`}
                      <small>
                        {entry.origin.fileName}
                        <br />
                        {entry.origin.sheetName || "Sin hoja registrada"}
                      </small>
                    </th>
                    {columns.map((column) => {
                      const evidence = entry.evidence?.cells.find(
                        (cell) => cell.column === column,
                      );
                      return (
                        <td key={column} className={evidence ? "is-used" : ""}>
                          {evidence ? (
                            <button
                              type="button"
                              title={evidence.reason}
                              onClick={() =>
                                setActiveCell({
                                  ...evidence,
                                  reason: `${entry.evidence.note}. ${evidence.reason}`,
                                })
                              }
                            >
                              {textValue(entry.row[column]) || "—"}
                            </button>
                          ) : (
                            textValue(entry.row[column]) || "—"
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <div className="vi-source-preview-empty">
                {model.entries.length
                  ? "No hay filas para este filtro. Desactiva «Solo filas del cálculo» para consultar la fuente disponible."
                  : "Archivo o filas originales no disponibles en este corte. Vuelve a cargar la fuente para consultar su evidencia."}
              </div>
            )}
          </div>
          <nav
            className="vi-evidence-pagination"
            aria-label="Páginas de la fuente"
          >
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              ← Anterior
            </button>
            <span>
              Página {currentPage + 1} / {pages}
            </span>
            <button
              type="button"
              disabled={currentPage >= pages - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              Siguiente →
            </button>
          </nav>
        </section>
      </div>
    </OverlayPortal>
  );
}
