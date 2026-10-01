import { Bell } from "./NotificationCenter";

function formatTime(date) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(date));
  } catch {
    return "—";
  }
}

function RefreshIcon({ spinning = false }) {
  return (
    <svg className={spinning ? "vi-refresh-icon is-spinning" : "vi-refresh-icon"} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M18.2 9A7 7 0 0 0 6.1 6.1L4 8" />
      <path d="M5.8 15A7 7 0 0 0 17.9 17.9L20 16" />
    </svg>
  );
}

function SourceState({ label, state, detail, live = false, ready = false, error = false }) {
  return (
    <div className="vi-source-state">
      <span className={`vi-source-indicator ${live ? "is-live" : ready ? "is-ready" : error ? "is-error" : ""}`} aria-hidden="true" />
      <span className="vi-source-copy">
        <strong>{label}</strong>
        <small>{state}<span className="vi-source-detail"> · {detail}</span></small>
      </span>
    </div>
  );
}

export default function CommandHeader({
  connectionStatus,
  scanCount = 0,
  lastUpdated,
  referenceStatus,
  loading = false,
  sourcesOpen = false,
  onRefresh,
  onToggleSources,
  onOpenRules,
  onOpenNotifications,
  onOpenBot,
  onOpenMenu,
  notificationCount = 0,
}) {
  const manual = connectionStatus?.state === "MANUAL";
  const liveError = connectionStatus?.state === "ERROR";
  const devSnapshot = ["DEV_LOADING", "DEV_SNAPSHOT"].includes(connectionStatus?.state);
  const referencesReady = referenceStatus?.allLoaded === true;
  const loaded = referenceStatus?.loadedCount || 0;
  const total = referenceStatus?.totalSources || 5;

  return (
    <header className="vi-command-header">
      <div className="vi-header-main">
        <div className="vi-header-brand">
          <img src={`${import.meta.env.BASE_URL}brand/visteon-logo-white.png`} alt="Visteon" className="vi-brand-logo" />
          <span className="vi-brand-divider" aria-hidden="true" />
          <span className="vi-product-name">INVENTORY RECONCILER</span>
        </div>

        <div className="vi-header-actions">
          <span className="vi-fetch-time">
            <small>ÚLTIMA CONSULTA</small>
            <strong>{formatTime(lastUpdated)}</strong>
          </span>
          <button type="button" onClick={onOpenNotifications} className="vi-button vi-button-light vi-icon-button" aria-label="Abrir notificaciones">
            <Bell />
            {notificationCount > 0 && <b className="vi-notification-badge">{notificationCount}</b>}
          </button>
          <button type="button" onClick={onOpenBot} className="vi-button vi-button-light vi-bot-button" aria-label="Control del bot de escaneo 4Wall">
            <span aria-hidden="true">▶</span><span>BOT ESCANEO 4WALL</span><small className="vi-dev-badge">DEV</small>
          </button>
          <button type="button" onClick={onToggleSources} className={`vi-button vi-button-light vi-sources-button ${sourcesOpen ? "is-selected" : ""}`} aria-expanded={sourcesOpen}>
            FUENTES <span className="vi-button-count">{loaded}/{total}</span>
          </button>
          <button type="button" disabled={loading || manual} onClick={onRefresh} className="vi-button vi-button-primary vi-refresh-button" aria-label={loading ? "Actualizando datos" : "Actualizar datos"} title={manual ? "Reemplaza el archivo manual en Fuentes para actualizar" : "Actualizar datos"}>
            <RefreshIcon spinning={loading} />
          </button>
          <button type="button" className="vi-button vi-button-light vi-menu-button" onClick={onOpenMenu} aria-label="Abrir menú">
            <span className="vi-hamburger" aria-hidden="true"><i /><i /><i /></span>
          </button>
        </div>
      </div>

      <div className="vi-source-ribbon">
        <div className="vi-source-ribbon-inner">
          <span className="vi-flow-label">FLUJO DE DATOS</span>
          <SourceState
            label="4WALL"
            state={manual ? "ARCHIVO MANUAL" : liveError ? "ERROR" : devSnapshot ? "SNAPSHOT DEV" : "BOT NO OPERATIVO"}
            detail={manual ? connectionStatus.detail : (connectionStatus?.detail || "Carga un archivo manual")}
            ready={manual}
            error={liveError}
          />
          <span className="vi-ribbon-flow" aria-hidden="true" />
          <SourceState label="QAD" state={referencesReady ? "CONGELADO" : "PENDIENTE"} detail="Planta 179A" ready={referencesReady} />
          <span className="vi-ribbon-separator" aria-hidden="true" />
          <SourceState label="REFERENCIAS" state={referencesReady ? "LISTAS" : referenceStatus?.hasErrors ? "REVISAR" : `${loaded}/${total} cargadas`} detail="ISPBB · BOM · COST" ready={referencesReady} error={referenceStatus?.hasErrors} />
          <button type="button" onClick={onOpenRules} className="vi-ribbon-help" aria-label="Abrir ayuda y metodología">
            <span>?</span><strong>AYUDA</strong>
          </button>
        </div>
      </div>
    </header>
  );
}
