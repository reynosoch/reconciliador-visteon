import { useMemo, useRef, useState } from "react";
import { HelpButton } from "../../help/HelpDrawer";
import { REFERENCE_SOURCE_TYPES } from "../../../domain/sourceCatalog.js";

const BOM_FILE_PREVIEW_LIMIT = 3;

function sourceStatus(source) {
  if (source?.loading) return { label: "CARGANDO", tone: "is-loading" };
  if (source?.error) return { label: "ERROR", tone: "is-error" };
  if (source?.loaded) return { label: "LISTO", tone: "is-ready" };
  return { label: "SIN ARCHIVO", tone: "" };
}

export default function SourceRow({
  config,
  source,
  loadFile,
  clearFile,
  onHelp,
  onPreview,
  onRequestDeleteBom,
  deletingBom,
  botRunning,
}) {
  const input = useRef(null);
  const [bomFilesExpanded, setBomFilesExpanded] = useState(false);
  const manualLocked =
    config.type === REFERENCE_SOURCE_TYPES.SCANS && botRunning;
  const status = sourceStatus(source);
  const isBom = config.type === REFERENCE_SOURCE_TYPES.BOM;
  const bomFiles = useMemo(
    () => (isBom && Array.isArray(source?.files) ? source.files : []),
    [isBom, source?.files],
  );
  const bomRows = useMemo(
    () => (isBom && Array.isArray(source?.rows) ? source.rows : []),
    [isBom, source?.rows],
  );
  const sortedBomFiles = useMemo(
    () =>
      [...bomFiles].sort(
        (a, b) => new Date(b.loadedAt || 0) - new Date(a.loadedAt || 0),
      ),
    [bomFiles],
  );
  const bomRowCounts = useMemo(() => {
    const counts = new Map();
    for (const row of bomRows) {
      const fileName = String(row?.__sourceFile || "");
      if (!fileName) continue;
      counts.set(fileName, (counts.get(fileName) || 0) + 1);
    }
    return counts;
  }, [bomRows]);
  const visibleBomFiles = bomFilesExpanded
    ? sortedBomFiles
    : sortedBomFiles.slice(0, BOM_FILE_PREVIEW_LIMIT);
  const hiddenBomFiles = Math.max(
    0,
    sortedBomFiles.length - BOM_FILE_PREVIEW_LIMIT,
  );
  const bomRowsForFile = (fileName) =>
    bomRowCounts.get(String(fileName || "")) || 0;
  const latestBom = sortedBomFiles[0] || null;
  const latestBomRows = latestBom ? bomRowsForFile(latestBom.fileName) : 0;
  const rowCount = Number(source?.rows?.length || 0);

  return (
    <article
      className={`vi-source-row ${source?.loaded ? "is-loaded" : ""} ${isBom ? "is-bom" : ""}`}
    >
      <input
        ref={input}
        type="file"
        accept=".csv,.txt,.xlsx,.json"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (file && !manualLocked) {
            try {
              await loadFile(config.type, file);
            } catch {
              // El error queda visible en la fila.
            }
          }
          event.target.value = "";
        }}
      />

      <div className="vi-source-row-main">
        <div className="vi-source-row-identity" title={config.description}>
          <span
            className={`vi-source-status-dot ${status.tone}`}
            aria-hidden="true"
          />
          <span>
            <strong>{config.label}</strong>
            <small>{status.label}</small>
          </span>
        </div>

        <div className="vi-source-row-file">
          {source?.loaded ? (
            isBom ? (
              <button
                type="button"
                onClick={() =>
                  latestBom &&
                  onPreview?.({
                    config,
                    source,
                    fileName: latestBom.fileName,
                  })
                }
                disabled={!latestBom}
              >
                <strong>{latestBom?.fileName || "Biblioteca BOM"}</strong>
                <small>
                  {bomRows.length.toLocaleString("es-MX")} filas ·{" "}
                  {bomFiles.length.toLocaleString("es-MX")} archivo
                  {bomFiles.length === 1 ? "" : "s"}
                </small>
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  onPreview?.({
                    config,
                    source,
                    fileName: source.fileName,
                  })
                }
              >
                <strong>{source.fileName}</strong>
                <small>{rowCount.toLocaleString("es-MX")} filas · Ver</small>
              </button>
            )
          ) : (
            <span className="vi-source-row-empty">
              <strong>Sin archivo</strong>
              <small>{config.suggested}</small>
            </span>
          )}
        </div>

        <div className="vi-source-row-actions">
          <HelpButton topic={config.topic} onHelp={onHelp} />

          <button
            type="button"
            disabled={source?.loading || manualLocked}
            onClick={() => {
              if (!manualLocked) input.current?.click();
            }}
            className="source-mini-button vi-source-row-load"
            title={
              manualLocked
                ? "Detén el bot 4Wall para cargar escaneos manuales."
                : ""
            }
          >
            {source?.loading
              ? "CARGANDO…"
              : isBom
                ? "AGREGAR"
                : source?.loaded
                  ? "REEMPLAZAR"
                  : "CARGAR"}
          </button>

          {source?.loaded && !isBom && (
            <button
              type="button"
              onClick={() => clearFile(config.type)}
              className="source-clear-button vi-source-remove"
              aria-label={"Quitar " + config.label}
              title={"Quitar " + config.label}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {(source?.error || manualLocked || source?.warnings?.length > 0) && (
        <div className="vi-source-row-message">
          {source?.error && (
            <p role="alert">{source.error.message}</p>
          )}
          {manualLocked && (
            <p>
              El bot 4Wall está corriendo. Detén el bot para sustituir el físico
              con un archivo manual.
            </p>
          )}
          {source?.warnings?.length > 0 && (
            <p>{source.warnings.map((warning) => warning.message).join(" ")}</p>
          )}
        </div>
      )}

      {isBom && source?.loaded && (
        <div className="vi-bom-row-expand">
          <div className="vi-bom-row-summary">
            <span>
              <small>ÚLTIMO</small>
              <strong>{latestBomRows.toLocaleString("es-MX")} filas</strong>
            </span>
            <span>
              <small>BIBLIOTECA</small>
              <strong>{bomRows.length.toLocaleString("es-MX")} filas</strong>
            </span>
            <span>
              <small>ARCHIVOS</small>
              <strong>{bomFiles.length.toLocaleString("es-MX")}</strong>
            </span>
          </div>

          <details className="vi-source-file-list">
            <summary>
              <span>Archivos BOM</span>
              <strong>Ver lista ▾</strong>
            </summary>
            <div>
              <button
                type="button"
                onClick={() =>
                  onPreview?.({ config, source, fileName: "__all" })
                }
              >
                <span>VER TODOS</span>
                <small>{bomRows.length.toLocaleString("es-MX")} filas</small>
              </button>

              {visibleBomFiles.map((file) => {
                const actualRows = bomRowsForFile(file.fileName);
                return (
                  <div
                    className="vi-bom-file-entry"
                    key={file.fingerprint || file.fileName}
                  >
                    <button
                      type="button"
                      className="vi-bom-file-preview"
                      onClick={() =>
                        onPreview?.({
                          config,
                          source,
                          fileName: file.fileName,
                        })
                      }
                    >
                      <span>{file.fileName}</span>
                      <small>{actualRows.toLocaleString("es-MX")} filas</small>
                    </button>
                    <button
                      type="button"
                      className="vi-bom-delete"
                      onClick={() => onRequestDeleteBom?.(file)}
                      disabled={deletingBom === file.fingerprint}
                      aria-label={`Borrar ${file.fileName} de BOM local y Supabase`}
                      title="Quitar este BOM del respaldo compartido"
                    >
                      ×
                    </button>
                  </div>
                );
              })}

              {hiddenBomFiles > 0 && (
                <button
                  type="button"
                  className="vi-source-file-list-toggle"
                  onClick={() =>
                    setBomFilesExpanded((expanded) => !expanded)
                  }
                  aria-expanded={bomFilesExpanded}
                >
                  {bomFilesExpanded
                    ? "Ver menos"
                    : `Ver más (${hiddenBomFiles})`}
                </button>
              )}
            </div>
          </details>
        </div>
      )}
    </article>
  );
}

