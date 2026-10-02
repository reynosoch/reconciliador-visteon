import packageInfo from "../../../package.json";
import { describeDataQuality } from "../../domain/dataQuality.js";
import SnapshotStamp from "./SnapshotStamp.jsx";

function sourceState(referenceStatus, connectionStatus) {
  const loaded = referenceStatus?.loadedCount || 0;
  const total = referenceStatus?.totalSources || 5;
  const scanState = connectionStatus?.state || "WAITING";

  if (referenceStatus?.hasErrors || scanState === "ERROR") {
    return {
      value: `${loaded}/${total}`,
      detail: "revisar fuentes",
      tone: "error",
    };
  }

  if (referenceStatus?.allLoaded) {
    const physical =
      scanState === "MANUAL"
        ? "4Wall manual"
        : scanState === "DEV_SNAPSHOT"
          ? "4Wall snapshot"
          : "4Wall pendiente";
    return {
      value: `${loaded}/${total}`,
      detail: physical,
      tone:
        scanState === "MANUAL" || scanState === "DEV_SNAPSHOT"
          ? "good"
          : "warning",
    };
  }

  return {
    value: `${loaded}/${total}`,
    detail: "referencias cargadas",
    tone: "warning",
  };
}

function environmentLabel() {
  if (import.meta.env.DEV) return "LOCAL · DEV";
  if (globalThis.location?.hostname?.endsWith("github.io")) {
    return "PAGES · PROD";
  }
  return String(import.meta.env.MODE || "production").toUpperCase();
}

function StatusItem({ label, value, detail, tone = "normal" }) {
  return (
    <div className={`vi-footer-status is-${tone}`}>
      <span className="vi-footer-status-dot" aria-hidden="true" />
      <span className="vi-footer-status-label">{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

export default function SystemFooter({
  referenceStatus,
  connectionStatus,
  diagnostics,
  snapshotMeta,
  scanCount = 0,
  lastUpdated,
}) {
  const sources = sourceState(referenceStatus, connectionStatus);
  const quality = describeDataQuality(
    diagnostics,
    referenceStatus?.allLoaded === true,
  );

  return (
    <footer className="vi-system-footer" aria-label="Estado del sistema">
      <div className="vi-system-footer-shell">
        <div className="vi-system-footer-main">
          <div className="vi-system-footer-brand">
            <span className="vi-system-footer-mark" aria-hidden="true" />
            <div>
              <strong>Inventory Reconciler</strong>
              <small>Visteon · Planta 179A</small>
            </div>
          </div>

          <div className="vi-system-footer-statuses">
            <StatusItem
              label="Fuentes"
              value={sources.value}
              detail={sources.detail}
              tone={sources.tone}
            />
            <StatusItem
              label="Calidad"
              value={quality.label}
              detail={quality.count ? `${quality.count} alertas` : "sin alertas"}
              tone={quality.tone}
            />
            <StatusItem
              label="Entorno"
              value={environmentLabel()}
            />
            <StatusItem
              label="Versión"
              value={`v${packageInfo.version}`}
            />
          </div>
        </div>

        <div className="vi-system-footer-lower">
          <SnapshotStamp
            snapshotMeta={snapshotMeta}
            scanCount={scanCount}
            lastUpdated={lastUpdated}
            compact
            className="vi-system-footer-snapshot"
          />

          <div className="vi-system-footer-credit" aria-label="Créditos del proyecto">
            <span>Desarrollo · Javier Reynoso</span>
            <i aria-hidden="true" />
            <span>Supervisión · Yessica Pina</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
