import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetch4WallScans } from "../services/supabase.js";
import { buildInventoryEngine } from "../domain/inventoryEngine.js";
const DEFAULT_REFRESH_MS = 3 * 60 * 1000;
export function useInventoryEngine({
  manualScans = null,
  areaRows = [],
  qadRows = [],
  ispbbRows = [],
  bomRows = [],
  costRows = [],
  refreshMs = DEFAULT_REFRESH_MS,
  criticalUsdThreshold = 10000,
  enabled = true,
} = {}) {
  const [scanRows, setScanRows] = useState([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(null),
    [lastUpdated, setLastUpdated] = useState(null),
    [scanCount, setScanCount] = useState(0),
    [snapshotMeta, setSnapshotMeta] = useState(null);
  const abortControllerRef = useRef(null),
    requestRef = useRef(0);
  const refresh = useCallback(async () => {
    if (!enabled || manualScans) return;
    const requestId = ++requestRef.current;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      setLoading(true);
      setError(null);
      const result = await fetch4WallScans({ signal: controller.signal });
      if (requestId !== requestRef.current) return;
      setScanRows(result.rows);
      setScanCount(result.count);
      setLastUpdated(result.fetchedAt);
      setSnapshotMeta(result.snapshotMeta);
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (requestId !== requestRef.current) return;
      console.error("Error actualizando 4Wall:", err);
      setError(
        err instanceof Error
          ? err
          : new Error("Error desconocido consultando 4Wall."),
      );
    } finally {
      if (requestId === requestRef.current && !controller.signal.aborted)
        setLoading(false);
    }
  }, [enabled, manualScans]);
  useEffect(() => {
    if (!enabled || manualScans) {
      requestRef.current++;
      abortControllerRef.current?.abort();
      setLoading(false);
      return undefined;
    }
    refresh();
    const id = window.setInterval(refresh, refreshMs);
    return () => {
      window.clearInterval(id);
      abortControllerRef.current?.abort();
    };
  }, [enabled, manualScans, refresh, refreshMs]);
  const activeRows = manualScans?.rows ?? scanRows;
  const activeMeta = useMemo(
    () =>
      manualScans
        ? {
            complete: true,
            snapshotId: `manual:${manualScans.fingerprint}`,
            consistencyToken: manualScans.fingerprint,
            source: "manual",
            fileName: manualScans.fileName,
          }
        : snapshotMeta,
    [manualScans, snapshotMeta],
  );
  const activeDate = manualScans?.loadedAt ?? lastUpdated;
  const engine = useMemo(() => {
    try {
      return buildInventoryEngine({
        areaRows,
        scanRows: activeRows,
        qadRows,
        ispbbRows,
        bomRows,
        costRows,
        options: {
          site: "179A",
          criticalUsdThreshold,
          filterQadItemTypes: true,
        },
      });
    } catch (err) {
      console.error("Error ejecutando inventoryEngine:", err);
      return {
        reconciliation: [],
        summary: {
          netUsd: 0,
          grossLossUsd: 0,
          grossGainUsd: 0,
          swingUsd: 0,
          swingPieces: 0,
          obsoleteGainUsd: 0,
          phantomCount: 0,
          criticalCount: 0,
          totalParts: 0,
        },
        diagnostics: null,
        sources: null,
      };
    }
  }, [
    areaRows,
    activeRows,
    qadRows,
    ispbbRows,
    bomRows,
    costRows,
    criticalUsdThreshold,
  ]);
  const connectionStatus = useMemo(
    () =>
      error
        ? {
            state: "ERROR",
            label: "Actualización fallida",
            detail: error.message,
          }
        : loading && !lastUpdated
          ? {
              state: "DEV_LOADING",
              label: "Leyendo snapshot 4Wall",
              detail: "Supabase · bot automático todavía no operativo",
            }
          : lastUpdated
            ? {
                state: "DEV_SNAPSHOT",
                label: "Snapshot 4Wall de desarrollo",
                detail: `${scanCount.toLocaleString()} registros · bot automático no operativo`,
              }
            : {
                state: "WAITING",
                label: "4Wall automático no operativo",
                detail: "Carga un archivo manual para trabajar con datos físicos",
              },
    [error, loading, lastUpdated, scanCount],
  );
  return {
    engine,
    reconciliation: engine.reconciliation,
    summary: engine.summary,
    diagnostics: engine.diagnostics,
    scanRows: activeRows,
    scanCount: manualScans ? activeRows.length : scanCount,
    lastUpdated: activeDate,
    snapshotMeta: activeMeta,
    loading: manualScans ? false : loading,
    error: manualScans ? null : error,
    connectionStatus: manualScans
      ? {
          state: "MANUAL",
          label: "Archivo manual 4Wall",
          detail: manualScans.fileName,
        }
      : connectionStatus,
    refresh,
  };
}
