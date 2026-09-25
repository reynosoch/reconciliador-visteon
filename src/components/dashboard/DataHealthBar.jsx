import { HelpButton } from "../help/HelpDrawer";

const number = (value) => new Intl.NumberFormat("es-MX").format(Number(value) || 0);

function HealthItem({ id, label, value, tone = "normal", activeView, onSelect }) {
  return (
    <button
      type="button"
      className={`vi-health-item vi-health-${tone} ${activeView === id ? "is-active" : ""}`}
      onClick={() => onSelect?.(activeView === id ? null : id)}
      aria-expanded={activeView === id}
      aria-controls="vi-data-inspection"
      title={`Ver ${label.toLowerCase()}`}
    >
      <span className="vi-health-dot" aria-hidden="true" />
      <span className="vi-health-label">{label}</span>
      <strong>{value}</strong>
      <span className="vi-health-chevron" aria-hidden="true">{activeView === id ? "−" : "+"}</span>
    </button>
  );
}

export default function DataHealthBar({
  diagnostics,
  scanCount = 0,
  lastUpdated,
  referencesReady = false,
  liveReady = false,
  activeView,
  onSelect,
  onHelp,
}) {
  const sources = diagnostics?.sources || {};
  const warnings = diagnostics?.warnings || {};
  const warningCount = referencesReady
    ? (warnings.unmappedAreaNames?.length || 0)
      + (warnings.partsWithoutCost?.length || 0)
      + (warnings.unexpectedMaterial?.length || 0)
      + (warnings.phantomDefinitionMismatches?.length || 0)
    : 0;

  return (
    <section className="vi-panel-flat vi-health-bar" aria-label="Estado de las fuentes">
      <div className="vi-health-heading">
        <button type="button" className="vi-health-title" onClick={() => onSelect?.(activeView === "overview" ? null : "overview")} aria-expanded={activeView === "overview"} aria-controls="vi-data-inspection">
          ESTADO DE DATOS <span aria-hidden="true">↗</span>
        </button>
        <HelpButton topic="dataHealth" onHelp={onHelp} />
      </div>
      <div className="vi-health-list">
        <HealthItem id="scans" label="4Wall escaneos" value={liveReady ? number(scanCount) : "EN ESPERA"} tone={liveReady ? "live" : "warning"} activeView={activeView} onSelect={onSelect} />
        <HealthItem id="alerts" label="Alertas" value={referencesReady ? number(warningCount) : "EN ESPERA"} tone={warningCount ? "warning" : "live"} activeView={activeView} onSelect={onSelect} />
        <HealthItem id="areas" label="Áreas 4Wall" value={referencesReady ? number(sources.areaCount) : "EN ESPERA"} activeView={activeView} onSelect={onSelect} />
        <HealthItem id="qad" label="QAD" value={referencesReady ? number(sources.qadPartCount) : "EN ESPERA"} tone="frozen" activeView={activeView} onSelect={onSelect} />
        <HealthItem id="cost" label="Cost Part" value={referencesReady ? number(sources.costPartCount) : "EN ESPERA"} activeView={activeView} onSelect={onSelect} />
        <HealthItem id="bom" label="BOM" value={referencesReady ? number(sources.bomRelationCount) : "EN ESPERA"} activeView={activeView} onSelect={onSelect} />
        <HealthItem id="parents" label="Padres BOM escaneados" value={referencesReady && liveReady ? `${number(diagnostics?.phantom?.scannedParentsWithBom)} / ${number(sources.bomParentCount)}` : "EN ESPERA"} tone="phantom" activeView={activeView} onSelect={onSelect} />
        <HealthItem id="bomReview" label="Revisar BOM" value={referencesReady && liveReady ? number(diagnostics?.phantom?.bomReviewCount) : "EN ESPERA"} tone="warning" activeView={activeView} onSelect={onSelect} />
        <HealthItem id="ispbb" label="ISPBB" value={referencesReady ? number(sources.ispbbPartCount) : "EN ESPERA"} activeView={activeView} onSelect={onSelect} />
        <HealthItem id="phantoms" label="Phantoms" value={referencesReady ? number(sources.ispbbPhantomCount) : "EN ESPERA"} tone="phantom" activeView={activeView} onSelect={onSelect} />
      </div>
      {lastUpdated && <span className="vi-health-updated">CONSULTADO {new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(lastUpdated))}</span>}
    </section>
  );
}
