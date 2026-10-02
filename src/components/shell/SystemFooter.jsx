import { useEffect, useRef } from "react";
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
  const footerRef = useRef(null);
  const sources = sourceState(referenceStatus, connectionStatus);
  const quality = describeDataQuality(
    diagnostics,
    referenceStatus?.allLoaded === true,
  );

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        document.body.classList.toggle(
          "vi-system-footer-visible",
          entry.isIntersecting && entry.intersectionRatio >= 0.08,
        );
      },
      { threshold: [0, 0.08, 0.2] },
    );

    observer.observe(footer);
    return () => {
      observer.disconnect();
      document.body.classList.remove("vi-system-footer-visible");
    };
  }, []);

  return (
    <footer ref={footerRef} className="vi-system-footer" aria-label="Estado del sistema">
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
            <a
              className="vi-system-footer-github"
              href="https://github.com/reynosoch"
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir perfil de GitHub de Javier Reynoso"
              title="GitHub · reynosoch"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 .7a11.5 11.5 0 0 0-3.64 22.42c.58.1.79-.25.79-.56v-2.02c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.95.1-.75.4-1.25.73-1.54-2.57-.29-5.27-1.29-5.27-5.73 0-1.27.45-2.3 1.19-3.11-.12-.29-.52-1.47.11-3.07 0 0 .97-.31 3.16 1.19A10.9 10.9 0 0 1 12 6.27c.98 0 1.95.13 2.87.38 2.19-1.5 3.16-1.19 3.16-1.19.63 1.6.23 2.78.11 3.07.74.81 1.19 1.84 1.19 3.11 0 4.45-2.71 5.43-5.29 5.72.42.36.79 1.07.79 2.16v3.04c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z"
                />
              </svg>
              <span>reynosoch</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
