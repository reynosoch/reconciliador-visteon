import packageInfo from "../../../package.json";
import { describeDataQuality } from "../../domain/dataQuality.js";
import SnapshotStamp from "./SnapshotStamp.jsx";

function sourceState(referenceStatus, connectionStatus) {
  const loaded = referenceStatus?.loadedCount || 0;
  const total = referenceStatus?.totalSources || 5;
  const scanState = connectionStatus?.state || "WAITING";

  if (referenceStatus?.hasErrors || scanState === "ERROR") {
    return {
      value: "REVISAR",
      detail: `${loaded}/${total} referencias · error de fuente`,
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
      value: "LISTAS",
      detail: `${loaded}/${total} referencias · ${physical}`,
      tone: scanState === "MANUAL" || scanState === "DEV_SNAPSHOT" ? "good" : "warning",
    };
  }

  return {
    value: "INCOMPLETAS",
    detail: `${loaded}/${total} referencias cargadas`,
    tone: "warning",
  };
}

function environmentLabel() {
  if (import.meta.env.DEV) return "LOCAL · DEV";
  if (globalThis.location?.hostname?.endsWith("github.io")) {
    return "GITHUB PAGES · PROD";
  }
  return `${String(import.meta.env.MODE || "production").toUpperCase()} · BUILD`;
}

function MetaCard({ label, value, detail, tone = "normal" }) {
  return (
    <div className={`vi-system-meta is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
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
    <footer className="vi-system-footer" aria-label="Estado crítico del sistema">
      <div className="vi-system-footer-shell">
        <div className="vi-system-footer-heading">
          <div>
            <span className="vi-system-footer-kicker">SYSTEM STATUS</span>
            <strong>Visteon Inventory Reconciler</strong>
            <small>
              Construido por Javier Reynoso · con ayuda de Yessica Pina
            </small>
          </div>
          <span className="vi-system-footer-site">PLANTA 179A</span>
        </div>

        <div className="vi-system-footer-grid">
          <MetaCard
            label="ESTADO DE FUENTES"
            value={sources.value}
            detail={sources.detail}
            tone={sources.tone}
          />
          <MetaCard
            label="CALIDAD DE DATOS"
            value={quality.label}
            detail={quality.detail}
            tone={quality.tone}
          />
          <MetaCard
            label="VERSIÓN DEL SISTEMA"
            value={`v${packageInfo.version}`}
            detail="PoC · reglas controladas por README"
          />
          <MetaCard
            label="ENTORNO"
            value={environmentLabel()}
            detail="Build React + Vite"
          />
        </div>

        <SnapshotStamp
          snapshotMeta={snapshotMeta}
          scanCount={scanCount}
          lastUpdated={lastUpdated}
          className="vi-system-footer-snapshot"
        />
      </div>
    </footer>
  );
}
