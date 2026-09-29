import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  buildSnapshot,
  snapshotsComparable,
} from "../../domain/buildDiscrepancyFindings.js";
import {
  downloadJson,
  browserDb,
  idbGet,
  idbSet,
  STORAGE_WARNING,
} from "../../services/browserStorage.js";
import ConfirmDialog from "../shell/ConfirmDialog.jsx";
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
  sources = {},
  snapshotMeta,
  inventory,
  onRenameInventory,
  onCreateInventory,
  onLatestCut,
  onPersistenceError,
}) {
  const [draft, setDraft] = useState(inventory.name);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [memory, setMemory] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
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
    setDraft(inventory.name);
  }, [inventory.id, inventory.name]);
  useEffect(() => {
    if (loaded && !stored.ok) {
      setError(STORAGE_WARNING);
      onPersistenceError?.(STORAGE_WARNING);
    }
  }, [loaded, stored, onPersistenceError]);
  useEffect(() => {
    onLatestCut?.(last);
  }, [last, onLatestCut]);
  const nameDirty = draft.trim() !== inventory.name.trim();
  useEffect(() => {
    if (!nameDirty && !busy && !memory) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [nameDirty, busy, memory]);
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
  const backup = async () => {
    // Include archived older versions so migration never makes them inaccessible.
    let legacy = {};
    try {
      const keys = await browserDb.state.toCollection().primaryKeys();
      for (const k of keys.filter((k) => String(k).startsWith("legacy:")))
        legacy[k] = await browserDb.state.get(k);
    } catch {
      setError(
        "El respaldo incluye los cortes abiertos. No pudimos leer los archivos del historial anterior.",
      );
    }
    downloadJson(`respaldo-${inventory.id}.json`, { inventory, cuts, legacy });
  };
  return (
    <section className="vi-panel vi-cut-history">
      <div className="vi-cut-history-head">
        <div>
          <p className="vi-eyebrow">JUNTAS DE INVENTARIO</p>
          <h2>Resultados guardados para las juntas</h2>
          <p>
            Guarda los resultados de este momento para revisarlos en la
            siguiente junta.
          </p>
        </div>
        <div className="vi-cut-history-actions">
          <label className="vi-campaign-label">
            NOMBRE DEL INVENTARIO
            <input
              className="vi-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </label>
          <button
            className="vi-button"
            disabled={!nameDirty || !draft.trim()}
            onClick={() => onRenameInventory?.(draft.trim())}
          >
            GUARDAR NOMBRE
          </button>
          <button className="vi-button" onClick={onCreateInventory}>
            CREAR INVENTARIO
          </button>
          <button className="vi-button" onClick={backup}>
            DESCARGAR RESPALDO
          </button>
          <button
            className="vi-button"
            disabled={!cuts.length || busy}
            onClick={() => setConfirmClear(true)}
          >
            LIMPIAR HISTORIAL
          </button>
          <button
            className="vi-button vi-button-primary"
            disabled={!canSave || busy || !loaded}
            onClick={save}
          >
            {busy ? "GUARDANDO…" : "GUARDAR RESULTADOS"}
          </button>
        </div>
      </div>
      <p className="vi-cut-local-note" role="status">
        {busy
          ? "Guardando…"
          : memory?.key === key
            ? "Hay resultados que aún no se han guardado."
            : nameDirty
              ? "Falta guardar el nombre."
              : !loaded
                ? "Abriendo el historial…"
                : "Historial disponible en este navegador."}
      </p>
      {error && (
        <p className="vi-cut-error" role="alert">
          {error}
        </p>
      )}
      {last && canSave && !comparison.ok && (
        <p className="vi-cut-warning">
          No podemos comparar estos resultados: {comparison.reason}
        </p>
      )}
      {!cuts.length ? (
        <p className="vi-cut-empty">
          Todavía no hay resultados guardados para este inventario.
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
      <p className="vi-cut-local-note">
        Estos resultados quedan en este equipo. Descarga un respaldo si
        necesitas llevarlos a otro.
      </p>
      <ConfirmDialog
        open={confirmClear}
        title="¿Limpiar el historial?"
        message="Descarga un respaldo si necesitas conservar estos resultados. Solo se borrará el historial de este inventario."
        confirmLabel="Limpiar historial"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false);
          persist([]);
        }}
      />
    </section>
  );
}
