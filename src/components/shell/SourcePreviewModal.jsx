import { useEffect, useMemo, useState } from "react";
import OverlayPortal from "./OverlayPortal.jsx";
import { buildSourcePreview } from "../../domain/sourceEvidence.js";
import SourceEvidenceSheet from "./SourceEvidenceSheet.jsx";

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
    setOnlyEvidence(Boolean(selection?.evidence?.length));
    setQuery(selection?.initialQuery || "");
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
        style={{ zIndex: 1400 }}
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
                {selection.config?.label ? selection.config.label + " · " : ""}
                {rows.length.toLocaleString("es-MX")}{" "}
                {selection.derived
                  ? "PN del resultado actual"
                  : "filas de la fuente cargada"}
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
            {selection.evidence?.length > 0 && (
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
            {selection.derived
              ? "Lista creada con resultados ya calculados; los archivos de origen están indicados en las columnas. "
              : ""}
            {selection.evidence?.length === 0 &&
            selection.tracePn &&
            !selection.derived
              ? `No hay filas aceptadas de ${selection.tracePn} para este paso. Si aparecen coincidencias, no están marcadas como utilizadas: revisa planta y reglas. `
              : ""}
            {filtered.length.toLocaleString("es-MX")} filas en esta vista;
            máximo 60 por página. La descarga conserva toda la selección
            {selection.derived ? "de resultados" : "original"}. Las coordenadas
            originales aparecen cuando el archivo las conserva; «Registro»
            indica una posición en la colección, no una fila del Excel original.
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
                {selection.derived
                  ? "Esta tabla muestra de dónde se incorporó cada PN. Abre el caso y usa Ver en fuente para consultar sus filas originales."
                  : "Selecciona una celda naranja para ver su valor original, valor normalizado y por qué participa."}
              </span>
            )}
          </div>
          {error && (
            <p role="alert" className="vi-source-preview-note">
              {error}
            </p>
          )}
          <SourceEvidenceSheet
            entries={visible}
            columns={columns}
            usedColumns={model.usedColumns || new Set()}
            onCell={setActiveCell}
          />
          {!filtered.length && (
            <div className="vi-source-preview-empty">
              {model.entries.length
                ? "No hay filas para este filtro. Desactiva «Solo filas del cálculo» para consultar la fuente disponible."
                : "Archivo o filas originales no disponibles en este corte. Vuelve a cargar la fuente para consultar su evidencia."}
            </div>
          )}
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
