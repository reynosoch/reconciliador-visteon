import { useMemo, useRef, useState } from "react";
import { RubberDrawer } from "../visual/ScrollEffects.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";
import OverlayPortal from "./OverlayPortal.jsx";
import SourcePreviewModal from "./SourcePreviewModal.jsx";
import {
  REFERENCE_SOURCE_LABELS,
  REFERENCE_SOURCE_TYPES,
} from "../../domain/sourceCatalog.js";
import { detectInventorySource } from "../../services/sourceDetection.js";
import SourceRow from "./sources/SourceRow.jsx";
import { CONFIG_BY_TYPE, SESSION_SOURCE_CONFIG } from "./sources/sourceConfig.js";

const IMPORT_PREVIEW_LIMIT = 3;

export default function SourcesDrawer({
  open = false,
  sources,
  status,
  loadFile,
  deleteBomFile,
  clearFile,
  botRunning = false,
  onHelp,
  onClose,
}) {
  const bulkInput = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [importResults, setImportResults] = useState([]);
  const [importResultsExpanded, setImportResultsExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pendingClear, setPendingClear] = useState(null);
  const [pendingBomDelete, setPendingBomDelete] = useState(null);
  const [deletingBom, setDeletingBom] = useState("");
  const [bomDeleteError, setBomDeleteError] = useState("");
  const [preview, setPreview] = useState(null);
  const [bomPart, setBomPart] = useState("");

  const bomRows = useMemo(
    () => (Array.isArray(sources?.bom?.rows) ? sources.bom.rows : []),
    [sources?.bom?.rows],
  );
  const normalizedBomPart = bomPart.trim().toUpperCase();
  const bomFocusRows = useMemo(() => {
    if (!normalizedBomPart) return [];
    return bomRows.filter(
      (row) =>
        String(row?.["Parent Item"] || "")
          .trim()
          .toUpperCase() === normalizedBomPart,
    );
  }, [bomRows, normalizedBomPart]);
  const bomFocusFiles = useMemo(
    () =>
      [
        ...new Set(
          bomFocusRows
            .map((row) => String(row?.__sourceFile || "").trim())
            .filter(Boolean),
        ),
      ],
    [bomFocusRows],
  );

  if (!open) return null;

  const loaded = status?.loadedCount || 0;
  const total = status?.totalSources || 5;
  const sessionLoadedCount = SESSION_SOURCE_CONFIG.filter(
    (config) => sources?.[config.type]?.loaded,
  ).length;
  const visibleImportResults = importResultsExpanded
    ? importResults
    : importResults.slice(0, IMPORT_PREVIEW_LIMIT);
  const hiddenImportResults = Math.max(
    0,
    importResults.length - IMPORT_PREVIEW_LIMIT,
  );
  const loadedImportCount = importResults.filter(
    (result) => result.status === "loaded",
  ).length;
  const reviewImportCount = importResults.length - loadedImportCount;

  const handleFiles = async (filesLike) => {
    const files = Array.from(filesLike || []);
    if (!files.length || processing) return;

    setProcessing(true);
    setImportResultsExpanded(false);
    const results = [];

    try {
      for (const file of files) {
        const detected = await detectInventorySource(file);
        if (!detected?.type) {
          results.push({
            name: file.name,
            status: "unknown",
            message: "No reconocimos esta estructura.",
          });
          continue;
        }

        const config = CONFIG_BY_TYPE[detected.type];
        if (
          detected.type === REFERENCE_SOURCE_TYPES.SCANS &&
          botRunning
        ) {
          results.push({
            name: file.name,
            type: detected.type,
            status: "blocked",
            message: "4Wall manual bloqueado mientras corre el bot.",
          });
          continue;
        }

        try {
          await loadFile(detected.type, file);
          results.push({
            name: file.name,
            type: detected.type,
            status: "loaded",
            message: `${config?.label || detected.type} · ${detected.confidence === "schema" ? "detectado por columnas" : "detectado por nombre"}`,
          });
        } catch (error) {
          results.push({
            name: file.name,
            type: detected.type,
            status: "error",
            message:
              error?.message ||
              "No se pudo cargar. La fuente anterior se conservó.",
          });
        }
      }
    } finally {
      setImportResults(results);
      setProcessing(false);
    }
  };

  const openBomFocus = () => {
    if (!normalizedBomPart || !bomFocusRows.length) return;
    setPreview({
      config: CONFIG_BY_TYPE[REFERENCE_SOURCE_TYPES.BOM],
      source: sources?.bom || {},
      fileName: "__all",
      partNumber: normalizedBomPart,
    });
  };

  return (
    <OverlayPortal onClose={onClose}>
      <div
        className="vi-drawer-backdrop fixed inset-0 z-[100] bg-black/55 backdrop-blur-[2px]"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose?.();
        }}
      >
        <RubberDrawer className="vi-drawer-panel vi-sources-drawer absolute right-0 top-0 bottom-0 w-full overflow-y-auto">
          <input
            ref={bulkInput}
            type="file"
            accept=".csv,.txt,.xlsx,.json"
            multiple
            className="hidden"
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.target.value = "";
            }}
          />

          <header className="vi-sources-head sticky top-0 z-10">
            <div className="vi-sources-head-row">
              <div>
                <p className="vi-eyebrow">FUENTES</p>
                <h2>Datos del inventario</h2>
                <p>
                  Carga, revisa o quita archivos sin tocar las fórmulas del
                  reconciliador.
                </p>
              </div>

              <div className="vi-sources-head-actions">
                <span className={`vi-sources-readiness ${status?.allLoaded ? "is-ready" : ""}`}>
                  <i aria-hidden="true" />
                  {loaded}/{total} referencias
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="vi-icon-close"
                  aria-label="Cerrar fuentes"
                >
                  ×
                </button>
              </div>
            </div>
          </header>

          <div className="vi-sources-body">
            <section className="vi-universal-upload-section">
              <div className="vi-sources-section-heading">
                <div>
                  <span>ENTRADA UNIVERSAL</span>
                  <strong>Sube los archivos; nosotros identificamos la fuente.</strong>
                </div>
                <small>TXT · CSV · XLSX · JSON BOM</small>
              </div>

              <button
                type="button"
                className={`vi-universal-dropzone ${dragging ? "is-dragging" : ""}`}
                disabled={processing}
                onClick={() => bulkInput.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  if (event.currentTarget === event.target) setDragging(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  void handleFiles(event.dataTransfer.files);
                }}
              >
                <span className="vi-universal-upload-icon" aria-hidden="true">↑</span>
                <span>
                  <strong>
                    {processing ? "IDENTIFICANDO…" : "ARRASTRA O ELIGE ARCHIVOS"}
                  </strong>
                  <small>
                    Puedes mezclar QAD, ISPBB, Cost, Áreas, BOM y 4Wall en una
                    sola selección.
                  </small>
                </span>
                <b>{processing ? "…" : "ELEGIR"}</b>
              </button>

              {importResults.length > 0 && (
                <div
                  className="vi-import-results"
                  aria-label="Resultado de la última carga"
                >
                  <div className="vi-import-results-summary">
                    <span>
                      <strong>{importResults.length} archivos</strong>
                      <small>
                        {loadedImportCount} listos
                        {reviewImportCount > 0
                          ? ` · ${reviewImportCount} por revisar`
                          : " · sin errores"}
                      </small>
                    </span>

                    {hiddenImportResults > 0 && (
                      <button
                        type="button"
                        className="vi-import-results-toggle"
                        onClick={() =>
                          setImportResultsExpanded((expanded) => !expanded)
                        }
                        aria-expanded={importResultsExpanded}
                      >
                        {importResultsExpanded
                          ? "Ver menos"
                          : `Ver más (${hiddenImportResults})`}
                      </button>
                    )}
                  </div>

                  <div className="vi-import-results-list">
                    {visibleImportResults.map((result, index) => (
                      <div
                        key={`${result.name}-${index}`}
                        className={`vi-import-result is-${result.status}`}
                      >
                        <i aria-hidden="true" />
                        <span>
                          <strong>{result.name}</strong>
                          <small>{result.message}</small>
                        </span>
                        {result.type && (
                          <b>
                            {CONFIG_BY_TYPE[result.type]?.short ||
                              REFERENCE_SOURCE_LABELS[result.type] ||
                              result.type}
                          </b>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="vi-source-files-section">
              <div className="vi-sources-section-heading">
                <div>
                  <span>FUENTES DE SESIÓN</span>
                  <strong>Archivo activo y estado de cada entrada.</strong>
                </div>
                <small>
                  {sessionLoadedCount}/{SESSION_SOURCE_CONFIG.length} activas
                </small>
              </div>

              <div className="vi-source-stack">
                {SESSION_SOURCE_CONFIG.map((config) => (
                  <SourceRow
                    key={config.type}
                    config={config}
                    source={sources?.[config.type] || {}}
                    loadFile={loadFile}
                    clearFile={(type) => setPendingClear({ type })}
                    onHelp={onHelp}
                    onPreview={setPreview}
                    onRequestDeleteBom={(file) => {
                      setBomDeleteError("");
                      setPendingBomDelete(file);
                    }}
                    deletingBom={deletingBom}
                    botRunning={botRunning}
                  />
                ))}
              </div>
            </section>

            <section className="vi-bom-focus-section">
              <div className="vi-sources-section-heading">
                <div>
                  <span>BOM FOCUS</span>
                  <strong>Compara un solo Parent Item sin ruido.</strong>
                </div>
                <small>{bomRows.length.toLocaleString("es-MX")} filas acumuladas</small>
              </div>

              <div className="vi-bom-focus-search">
                <input
                  value={bomPart}
                  onChange={(event) => setBomPart(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") openBomFocus();
                  }}
                  placeholder="Número de parte padre"
                  aria-label="Número de parte padre para filtrar BOM"
                />
                <button
                  type="button"
                  onClick={openBomFocus}
                  disabled={!bomFocusRows.length}
                >
                  VER BOM
                </button>
              </div>

              {normalizedBomPart && (
                <div className={`vi-bom-focus-result ${bomFocusRows.length ? "is-found" : ""}`}>
                  <span>
                    <strong>{normalizedBomPart}</strong>
                    <small>
                      {bomFocusRows.length
                        ? `${bomFocusRows.length.toLocaleString("es-MX")} filas · ${bomFocusFiles.length} archivo${bomFocusFiles.length === 1 ? "" : "s"}`
                        : "No está registrado como Parent Item."}
                    </small>
                  </span>
                  {bomFocusFiles.length > 0 && (
                    <em>{bomFocusFiles.slice(0, 2).join(" · ")}</em>
                  )}
                </div>
              )}

              <SourceRow
                config={CONFIG_BY_TYPE[REFERENCE_SOURCE_TYPES.BOM]}
                source={sources?.bom || {}}
                loadFile={loadFile}
                clearFile={() => {}}
                onHelp={onHelp}
                onPreview={setPreview}
                onRequestDeleteBom={(file) => {
                  setBomDeleteError("");
                  setPendingBomDelete(file);
                }}
                deletingBom={deletingBom}
                botRunning={botRunning}
              />
            </section>

            {bomDeleteError && (
              <div className="vi-source-warning vi-bom-delete-error" role="alert">
                {bomDeleteError}
              </div>
            )}
          </div>
        </RubberDrawer>

        <SourcePreviewModal
          selection={preview}
          onClose={() => setPreview(null)}
        />

        <ConfirmDialog
          open={Boolean(pendingBomDelete)}
          title="¿Quitar este BOM?"
          message={
            pendingBomDelete
              ? `${pendingBomDelete.fileName} se eliminará del respaldo compartido de Supabase y de la copia local de esta computadora. Se conservará el historial de revisión.`
              : ""
          }
          confirmLabel="Quitar BOM"
          cancelLabel="Cancelar"
          busy={Boolean(deletingBom)}
          onCancel={() => {
            if (!deletingBom) setPendingBomDelete(null);
          }}
          onConfirm={async () => {
            const file = pendingBomDelete;
            if (!file || deletingBom) return;
            setDeletingBom(file.fingerprint || file.fileName);
            setBomDeleteError("");
            try {
              await deleteBomFile?.(file);
              setPendingBomDelete(null);
            } catch (error) {
              setPendingBomDelete(null);
              setBomDeleteError(
                error?.message ||
                  "No se pudo quitar el BOM. No se modificó la copia local.",
              );
            } finally {
              setDeletingBom("");
            }
          }}
        />

        <ConfirmDialog
          open={Boolean(pendingClear)}
          title="¿Quitar esta fuente?"
          message="Se quitará solo de esta sesión. La fuente anterior no se modifica en ningún sistema externo. Si quitas 4Wall manual, el dashboard vuelve al flujo automático."
          confirmLabel="Quitar archivo"
          onCancel={() => setPendingClear(null)}
          onConfirm={() => {
            const action = pendingClear;
            setPendingClear(null);
            if (action?.type) clearFile(action.type);
          }}
        />
      </div>
    </OverlayPortal>
  );
}
