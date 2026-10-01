// src/components/shell/SourcesDrawer.jsx
import React, { useRef, useState } from "react";
import { HelpButton } from "../help/HelpDrawer";
import ConfirmDialog from "./ConfirmDialog.jsx";
import OverlayPortal from "./OverlayPortal.jsx";
import SourcePreviewModal from "./SourcePreviewModal.jsx";
import { REFERENCE_SOURCE_TYPES } from "../../hooks/useReferenceFiles";

const SOURCE_CONFIG = [
  {
    type: "scans",
    label: "Escaneos 4Wall (archivo manual)",
    description: "Reporte físico manual de 4Wall. Sustituye temporalmente el flujo automático.",
    topic: "source:scans",
    short: "4WALL",
    suggested: "4wSc*.csv",
  },
  {
    type: REFERENCE_SOURCE_TYPES.BOM,
    label: "BOM Export",
    description: "Relaciones Parent → Component y Usage usadas para Phantoms.",
    topic: "source:bom",
    short: "BOM",
    suggested: "BOM*.txt / .csv / .xlsx",
  },
  {
    type: REFERENCE_SOURCE_TYPES.AREAS,
    label: "Áreas 4Wall",
    description: "Diccionario que traduce cada área escaneada a Localidad QAD.",
    topic: "source:areas",
    short: "AREAS",
    suggested: "4Wall-Area.csv",
  },
  {
    type: REFERENCE_SOURCE_TYPES.QAD,
    label: "Inventario QAD",
    description: "Inventario congelado esperado por Part Number y localidad.",
    topic: "source:qad",
    short: "QAD",
    suggested: "Congelado QAD 3.2*.csv",
  },
  {
    type: REFERENCE_SOURCE_TYPES.ISPBB,
    label: "ISPBB",
    description: "Fuente autoritativa para identificar Part Numbers Phantom.",
    topic: "source:ispbb",
    short: "ISPBB",
    suggested: "ISPBB*.csv",
  },
  {
    type: REFERENCE_SOURCE_TYPES.COST,
    label: "Cost Part",
    description: "Cost Total y Status para valorar diferencias y obsoletos.",
    topic: "source:cost",
    short: "COST",
    suggested: "Cost Part*.csv",
  },
];

async function detectSource(file) {
  const name = String(file.name || "").toLowerCase();
  if (/^4wsc|escaneos/.test(name)) return "scans";
  if (/4wall.*area|area.*4wall/.test(name)) return "areas";
  if (/ispbb|50[._ -]?1[._ -]?4[._ -]?22/.test(name)) return "ispbb";
  if (/cost.*part|part.*cost/.test(name)) return "cost";
  if (/bom|50[._ -]?13[._ -]?8[._ -]?16/.test(name)) return "bom";
  if (/qad.*3[._ -]?(?:12|2)|congelado.*qad|inventory.*detail/.test(name)) return "qad";

  try {
    const sample = (await file.slice(0, 6000).text()).toUpperCase();
    if (sample.includes("LOCALIDAD QAD") && sample.includes("NOMBRE")) return "areas";
    if (sample.includes("QTY ON HAND - INV MSTR") && sample.includes("QUANTITY ON HAND")) return "qad";
    if (sample.includes("BUYER/PLANNER") && sample.includes("PHANTOM")) return "ispbb";
    if (sample.includes("PARENT ITEM") && sample.includes("COMPONENT") && sample.includes("USAGE")) return "bom";
    if (sample.includes("COST TOTAL") && sample.includes("MATERIAL LL")) return "cost";
  } catch {
    // El nombre del archivo sigue siendo el fallback.
  }
  return null;
}

function SourceLine({
  config,
  source,
  loadFile,
  clearFile,
  onHelp,
  onPreview,
  botRunning,
}) {
  const input = useRef(null);
  const manualLocked = config.type === "scans" && botRunning;
  const bomFiles = Array.isArray(source?.files) ? source.files : [];
  const bomRows = Array.isArray(source?.rows) ? source.rows : [];
  const bomRowsForFile = (fileName) =>
    bomRows.filter((row) => String(row?.__sourceFile || "") === String(fileName || "")).length;
  const latestBom = bomFiles.length
    ? [...bomFiles].sort((a, b) => new Date(b.loadedAt || 0) - new Date(a.loadedAt || 0))[0]
    : null;
  const latestBomRows = latestBom ? bomRowsForFile(latestBom.fileName) : 0;

  return (
    <div className="vi-source-line">
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
              // El error se muestra en la tarjeta.
            }
          }
          event.target.value = "";
        }}
      />

      <div className="vi-source-line-head">
        <div className="vi-source-title">
          <span
            className={[
              "vi-source-status-dot",
              source?.loaded ? "is-ready" : "",
              source?.error ? "is-error" : "",
              source?.loading ? "is-loading" : "",
            ].filter(Boolean).join(" ")}
            aria-hidden="true"
          />
          <span>{config.label}</span>
          <small>{source?.loaded ? "LISTO" : "EN ESPERA"}</small>
        </div>
        <HelpButton topic={config.topic} onHelp={onHelp} />
      </div>

      <p className="vi-source-description">{config.description}</p>

      {source?.error && (
        <p role="alert" className="vi-source-warning">
          {source.error.message}
        </p>
      )}

      {manualLocked && (
        <p className="vi-source-warning vi-bot-upload-lock">
          El bot de escaneos automático está corriendo. Detén el bot antes de cargar un archivo 4Wall manual.
        </p>
      )}

      {source?.loaded ? (
        config.type === "bom" ? (
          <div className="vi-bom-source-summary">
            <button
              type="button"
              className="vi-bom-latest"
              onClick={() => latestBom && onPreview?.({ config, source, fileName: latestBom.fileName })}
              disabled={!latestBom}
            >
              <span>
                <small>ÚLTIMO BOM CARGADO</small>
                <strong>{latestBom?.fileName || "Sin archivo BOM"}</strong>
              </span>
              <b>{latestBomRows.toLocaleString("es-MX")} filas</b>
            </button>

            <div className="vi-bom-total">
              <span>TOTAL ACUMULADO</span>
              <strong>{bomRows.length.toLocaleString("es-MX")} filas</strong>
              <small>{bomFiles.length.toLocaleString("es-MX")} archivo{bomFiles.length === 1 ? "" : "s"}</small>
            </div>

            <details className="vi-source-file-list">
              <summary>
                <span>VER TODOS LOS BOM</span>
                <strong>ABRIR ▾</strong>
              </summary>
              <div>
                <button
                  type="button"
                  onClick={() => onPreview?.({ config, source, fileName: "__all" })}
                >
                  <span>VER TODOS</span>
                  <small>{bomRows.length.toLocaleString("es-MX")} filas</small>
                </button>
                {bomFiles.map((file) => {
                  const actualRows = bomRowsForFile(file.fileName);
                  return (
                    <button
                      type="button"
                      key={file.fingerprint || file.fileName}
                      onClick={() => onPreview?.({ config, source, fileName: file.fileName })}
                    >
                      <span>{file.fileName}</span>
                      <small>{actualRows.toLocaleString("es-MX")} filas</small>
                    </button>
                  );
                })}
              </div>
            </details>
          </div>
        ) : (
          <button
            type="button"
            className="vi-source-file-chip"
            onClick={() => onPreview?.({ config, source, fileName: source.fileName })}
          >
            <span>{source.fileName}</span>
            <small>{Number(source.rows?.length || 0).toLocaleString("es-MX")} filas · VER</small>
          </button>
        )
      ) : (
        <p className="vi-source-example">Ejemplo: {config.suggested}</p>
      )}

      {source?.warnings?.length > 0 && (
        <p className="vi-source-warning">
          {source.warnings.map((warning) => warning.message).join(" ")}
        </p>
      )}

      <div className="vi-source-actions">
        <button
          type="button"
          disabled={source?.loading || manualLocked}
          onClick={() => {
            if (!manualLocked) input.current?.click();
          }}
          className="source-mini-button"
          title={manualLocked ? "Detén el bot 4Wall para cargar escaneos manuales." : ""}
        >
          {source?.loading
            ? "CARGANDO…"
            : config.type === "bom"
              ? "AGREGAR BOM"
              : source?.loaded
                ? "REEMPLAZAR"
                : "CARGAR"}
        </button>

        {source?.loaded && config.type !== "bom" && (
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
  );
}

export default function SourcesDrawer({
  open = false,
  sources,
  status,
  loadFile,
  clearFile,
  botRunning = false,
  onHelp,
  onClose,
}) {
  const bulkInput = useRef(null);
  const [unknownFiles, setUnknownFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [pendingClear, setPendingClear] = useState(null);
  const [preview, setPreview] = useState(null);

  if (!open) return null;

  const loaded = status?.loadedCount || 0;
  const total = status?.totalSources || 5;

  const handleBulkFiles = async (event) => {
    if (botRunning) {
      event.target.value = "";
      return;
    }

    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setProcessing(true);
    setUnknownFiles([]);
    const unknown = [];

    try {
      for (const file of files) {
        const detected = await detectSource(file);
        if (!detected) {
          unknown.push(file.name);
          continue;
        }
        try {
          await loadFile(detected, file);
        } catch {
          unknown.push(file.name + " — revisa el mensaje de la fuente");
        }
      }
    } finally {
      setUnknownFiles(unknown);
      setProcessing(false);
      event.target.value = "";
    }
  };

  return (
    <OverlayPortal onClose={onClose}>
      <div
        className="vi-drawer-backdrop fixed inset-0 z-[100] bg-black/55 backdrop-blur-[2px]"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose?.();
        }}
      >
        <aside className="vi-drawer-panel vi-sources-drawer absolute right-0 top-0 bottom-0 w-full max-w-[620px] overflow-y-auto">
          <input
            ref={bulkInput}
            type="file"
            accept=".csv,.txt,.xlsx,.json"
            multiple
            className="hidden"
            onChange={handleBulkFiles}
          />

          <div className="vi-sources-head sticky top-0 z-10 px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="vi-eyebrow">ARCHIVOS DE REFERENCIA</p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Fuentes del inventario
                </h2>
                <p className="mt-1 text-[11px] text-slate-600">
                  Todas las fuentes admiten TXT, CSV y Excel. Los BOM nuevos se agregan sin borrar los anteriores.
                  Abre cualquier archivo cargado aquí mismo para revisar sus datos reales y descargarlo en el formato que necesites.
                </p>
              </div>
              <button type="button" onClick={onClose} className="vi-icon-close" aria-label="Cerrar fuentes">×</button>
            </div>

            <button
              type="button"
              disabled={processing || botRunning}
              title={botRunning ? "El bot 4Wall está corriendo. Deténlo antes de usar la carga masiva, porque incluye escaneos manuales." : ""}
              onClick={() => {
                if (!botRunning) bulkInput.current?.click();
              }}
              className="mt-5 w-full source-package-button"
            >
              <span>
                {processing
                  ? "IDENTIFICANDO ARCHIVOS..."
                  : botRunning
                    ? "BOT 4WALL ACTIVO · DETENER PARA CARGA MANUAL"
                    : "SUBIR TODOS LOS ARCHIVOS"}
              </span>
              <span className="text-orange-300">{loaded}/{total}</span>
            </button>

            <div className="mt-3 grid grid-cols-3 gap-1">
              {SOURCE_CONFIG.map((item) => (
                <div
                  key={item.type}
                  className={[
                    "source-progress-node",
                    sources?.[item.type]?.loaded ? "source-progress-ready" : "",
                  ].filter(Boolean).join(" ")}
                >
                  {item.short}
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 pb-7">
            {SOURCE_CONFIG.map((config) => (
              <SourceLine
                key={config.type}
                config={config}
                source={sources?.[config.type] || {}}
                loadFile={loadFile}
                clearFile={(type) => setPendingClear({ type })}
                onHelp={onHelp}
                onPreview={setPreview}
                botRunning={botRunning}
              />
            ))}

            {unknownFiles.length > 0 && (
              <div className="mt-5 border border-amber-500/25 bg-amber-500/[0.04] p-4">
                <p className="font-mono text-[11px] font-black text-amber-400">
                  ARCHIVOS NO RECONOCIDOS
                </p>
                {unknownFiles.map((file) => (
                  <p key={file} className="mt-2 font-mono text-[11px] text-slate-500">
                    {file}
                  </p>
                ))}
              </div>
            )}
          </div>
        </aside>

        <SourcePreviewModal selection={preview} onClose={() => setPreview(null)} />

        <ConfirmDialog
          open={Boolean(pendingClear)}
          title="¿Quitar archivo cargado?"
          message="Se quitará únicamente esta fuente de la sesión. Los BOM guardados no se modifican. Si quitas los escaneos manuales, el dashboard vuelve al flujo automático de 4Wall."
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
