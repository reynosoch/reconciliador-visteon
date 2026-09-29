import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  buildSnapshot,
  snapshotsComparable,
} from "../../domain/buildDiscrepancyFindings.js";
import {
  idbGet,
  idbSet,
  STORAGE_WARNING,
} from "../../services/browserStorage.js";
import { exportInventoryWorkbook } from "../../services/exportInventoryWorkbook.js";

export const RULES_VERSION = "2026-09-28-discrepancy-v2";
const EMPTY = [];
const money = (v) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);
const refs = (s) =>
  ["areas", "qad", "ispbb", "bom", "cost"].map((type) => ({
    type,
    fingerprint: s[type]?.fingerprint || "",
    fileName: s[type]?.fileName || "",
  }));

export default function CutHistoryPanel({
  canSave,
  summary,
  scanCount = 0,
  lastUpdated,
  rows = [],
  findings = [],
  scanRows = [],
  diagnostics,
  sources = {},
  snapshotMeta,
  inventory,
  onLatestCut,
  onPersistenceError,
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [memory, setMemory] = useState(null);
  const key = `cuts:${inventory.id}`;
  const stored = useLiveQuery(
    async () => ({ ...(await idbGet(key, EMPTY)), key }),
    [key],
  );
  const loaded = stored?.key === key;
  const cuts =
    memory?.key === key
      ? memory.value
      : loaded && Array.isArray(stored.value)
        ? stored.value
        : EMPTY;
  const last = cuts[0] || null;

  useEffect(() => {
    if (loaded && !stored.ok) {
      setError(STORAGE_WARNING);
      onPersistenceError?.(STORAGE_WARNING);
    }
  }, [loaded, stored, onPersistenceError]);
  useEffect(() => {
    onLatestCut?.(last);
  }, [last, onLatestCut]);
  useEffect(() => {
    if (!busy && !memory && !exporting) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy, memory, exporting]);

  const current = useMemo(
    () =>
      buildSnapshot({
        campaignId: inventory.id,
        rows,
        references: refs(sources),
        rulesVersion: RULES_VERSION,
        snapshotMeta,
        valid: canSave,
      }),
    [inventory.id, rows, sources, snapshotMeta, canSave],
  );
  const comparison = useMemo(
    () => snapshotsComparable(last, current),
    [last, current],
  );

  const persist = async (value) => {
    if (busy || !loaded) return;
    setBusy(true);
    const result = await idbSet(key, value);
    if (!result.ok) {
      setMemory({ key, value });
      setError(STORAGE_WARNING);
      onPersistenceError?.(STORAGE_WARNING);
    } else {
      setMemory(null);
      setError("");
    }
    setBusy(false);
  };

  const save = () => {
    if (!canSave || !summary || busy || !loaded) return;
    const cut = {
      ...current,
      id: crypto.randomUUID(),
      inventoryName: inventory.name,
      summary,
      scanCount,
      fetchedAt: lastUpdated ? new Date(lastUpdated).toISOString() : null,
    };
    persist([cut, ...cuts].slice(0, 24));
  };

  const exportExcel = async () => {
    if (!canSave || !summary || exporting) return;
    setExporting(true);
    setExportMessage("");
    try {
      const result = await exportInventoryWorkbook({
        inventory,
        summary,
        rows,
        findings,
        scanRows,
        diagnostics,
        sources,
        snapshotMeta,
        lastUpdated,
      });
      setExportMessage(
        `Excel listo: ${result.sheets} hojas con dashboard, conciliación y evidencia del corte.`,
      );
    } catch (cause) {
      console.error("Excel export failed", cause);
      setExportMessage(
        "No se pudo crear el Excel. Los resultados del navegador no se borraron.",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="vi-panel vi-cut-history vi-liquid-surface">
      <div className="vi-cut-history-head vi-meeting-head">
        <div>
          <p className="vi-eyebrow">JUNTAS DE INVENTARIO</p>
          <h2>Guardar o compartir este corte</h2>
          <p>
            Guarda una copia en este navegador para comparar la siguiente junta,
            o exporta un Excel completo para compartirlo con Finanzas.
          </p>
        </div>
        <div className="vi-cut-history-actions vi-meeting-actions">
          <button
            className="vi-button vi-button-glass"
            disabled={!canSave || busy || !loaded}
            onClick={save}
          >
            {busy ? "GUARDANDO…" : "GUARDAR RESULTADOS EN NAVEGADOR"}
          </button>
          <button
            className="vi-button vi-button-primary vi-export-button"
            disabled={!canSave || exporting}
            onClick={exportExcel}
          >
            {exporting ? "CREANDO EXCEL…" : "EXPORTAR EXCEL COMPLETO"}
          </button>
        </div>
      </div>

      <div className="vi-meeting-explainer">
        <strong>¿Qué incluye el Excel?</strong>
        <span>
          Un dashboard con fecha y hora, indicadores explicados para cualquier
          lector, conciliación completa por Part Number, detalle por localidad,
          hallazgos para investigar, 4Wall actual, fuentes utilizadas y una guía
          de interpretación.
        </span>
      </div>

      <p className="vi-cut-local-note" role="status">
        {busy
          ? "Guardando resultados en este navegador…"
          : memory?.key === key
            ? "Hay resultados que aún no se han guardado de forma permanente."
            : !loaded
              ? "Abriendo el historial del navegador…"
              : "El historial queda en este navegador; el Excel es la copia para compartir."}
      </p>
      {exportMessage && (
        <p className="vi-export-message" role="status">
          {exportMessage}
        </p>
      )}
      {error && (
        <p className="vi-cut-error" role="alert">
          {error}
        </p>
      )}
      {last && canSave && !comparison.ok && (
        <p className="vi-cut-warning">
          No podemos comparar estos resultados con el corte anterior: {comparison.reason}
        </p>
      )}

      {!cuts.length ? (
        <p className="vi-cut-empty">
          Todavía no hay resultados guardados en este navegador.
        </p>
      ) : (
        <div className="vi-cut-list">
          {cuts.slice(0, 6).map((c, i) => (
            <div className="vi-cut-row" key={`${c.id}-${i}`}>
              <div>
                <strong>{new Date(c.savedAt).toLocaleString("es-MX")}</strong>
                <span>
                  {c.inventoryName || inventory.name} · {c.scanCount || 0}{" "}
                  registros
                </span>
              </div>
              <span>{money(c.summary?.netUsd)}</span>
              {i === 0 && <em>ÚLTIMO</em>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
