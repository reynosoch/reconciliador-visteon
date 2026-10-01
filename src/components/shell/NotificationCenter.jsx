import { useEffect, useMemo, useRef, useState } from "react";
import OverlayPortal from "./OverlayPortal.jsx";
import { Ghost, PelletRail } from "../visual/PacmanGlyphs.jsx";
import { syncOperationalAlerts } from "../../domain/notificationState.js";
import { currentAlerts } from "../../domain/visibleAlerts.js";
import { loadAlerts, saveAlerts, STORAGE_WARNING } from "../../services/browserStorage.js";
import { PRODUCT_UPDATES } from "../../data/productUpdates.js";

export function Bell() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

const LABEL = {
  MISSING_BOM: "Falta el BOM",
  EMPTY_BOM: "BOM sin componentes aplicables",
  PHANTOM_QAD: "Phantom con saldo QAD",
  ZERO_COST: "Costo en cero",
  QTY_DIFF: "Diferencia de cantidad",
  NO_PHYSICAL: "Aún no hay físico registrado",
  UNEXPECTED: "Material que QAD no esperaba",
  LOCATION_CANDIDATE: "Revisar dónde está el material",
  UNVALUED: "Falta un costo confiable",
  UNMAPPED_AREA: "Área sin ubicación en QAD",
  BOM_REVIEW: "Revisar el ensamble",
  UNUSUAL_CHANGE: "Cambio desde la última junta",
};
const PAGE = 40;

export default function NotificationCenter({
  open,
  onClose,
  findings = [],
  evaluationValid = false,
  inventoryId,
  onOpenFinding,
  onCountChange,
  onOperationalStateChange,
  onPersistenceError,
  returnPulse = 0,
  missingSources = [],
}) {
  const [record, setRecord] = useState({ inventoryId: null, value: {} });
  const stateRef = useRef({});
  const [page, setPage] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [viewMode, setViewMode] = useState("actions");
  const [pulse, setPulse] = useState(false);
  const loaded = record.inventoryId === inventoryId;

  useEffect(() => {
    let cancelled = false;
    loadAlerts(inventoryId)
      .then((value) => {
        if (!cancelled) {
          stateRef.current = value;
          setRecord({ inventoryId, value });
        }
      })
      .catch(() => {
        if (!cancelled) {
          stateRef.current = {};
          setRecord({ inventoryId, value: {} });
          onPersistenceError?.(STORAGE_WARNING);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [inventoryId, onPersistenceError]);

  useEffect(() => {
    if (open) {
      setPage(0);
      setSelectedGroup(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !returnPulse) return;
    setPulse(false);
    const frame = requestAnimationFrame(() => setPulse(true));
    const timer = setTimeout(() => setPulse(false), 950);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [open, returnPulse]);

  useEffect(() => {
    if (!loaded || !evaluationValid) return;
    const next = syncOperationalAlerts(
      stateRef.current,
      findings,
      new Date().toISOString(),
      true,
    ).state;
    stateRef.current = next;
    setRecord({ inventoryId, value: next });
    onOperationalStateChange?.(next);
    saveAlerts(inventoryId, next).catch(() =>
      onPersistenceError?.(STORAGE_WARNING),
    );
  }, [
    findings,
    evaluationValid,
    loaded,
    inventoryId,
    onOperationalStateChange,
    onPersistenceError,
  ]);

  const active = useMemo(
    () => currentAlerts(loaded ? record.value : {}, findings, evaluationValid),
    [record, loaded, findings, evaluationValid],
  );
  const unread = active.filter((item) => !item.read).length;

  useEffect(() => {
    onCountChange?.(unread);
  }, [unread, onCountChange]);

  const openAlert = (alert) => {
    if (!loaded || !evaluationValid) return;
    const next = { ...stateRef.current, [alert.id]: { ...alert, read: true } };
    stateRef.current = next;
    setRecord({ inventoryId, value: next });
    saveAlerts(inventoryId, next).catch(() =>
      onPersistenceError?.(STORAGE_WARNING),
    );
    onOperationalStateChange?.(next);
    onOpenFinding?.(alert);
  };

  const groups = Object.entries(
    active.reduce((acc, item) => {
      const label = LABEL[item.ruleCode] || "Por revisar";
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {}),
  );

  const grouped = selectedGroup
    ? active.filter(
        (item) => (LABEL[item.ruleCode] || "Por revisar") === selectedGroup,
      )
    : active;

  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(grouped.length / PAGE) - 1),
  );
  const visible = grouped.slice(currentPage * PAGE, (currentPage + 1) * PAGE);

  if (!open) return null;

  return (
    <OverlayPortal onClose={onClose}>
      <div className="vi-global-overlay">
        <aside
          className={[
            "vi-drawer-panel",
            "vi-global-drawer",
            "vi-notification-drawer",
            pulse ? "is-return-pulse" : "",
          ].filter(Boolean).join(" ")}
        >
          <div className="vi-notification-head">
            <div className="vi-notification-navrow">
              {selectedGroup ? (
                <button
                  type="button"
                  className="vi-back-button"
                  onClick={() => {
                    setSelectedGroup(null);
                    setPage(0);
                  }}
                  aria-label="Regresar a todas las notificaciones"
                >
                  <span aria-hidden="true">‹</span>
                  <strong>REGRESAR</strong>
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                className="vi-icon-close"
                onClick={onClose}
                aria-label="Cerrar notificaciones"
              >
                ×
              </button>
            </div>

            <div className="vi-notification-heading-copy">
              <p className="vi-eyebrow">NOTIFICACIONES</p>
              <h2>{viewMode === "updates" ? "Novedades del sistema" : (selectedGroup || "Por revisar")}</h2>
              <p>
                {viewMode === "updates"
                  ? "Resumen de los cambios recientes del reconciliador."
                  : "Alertas del corte actual. Abre un Part Number para ver qué encontramos, qué archivos originan la evidencia y qué revisar."}
              </p>
            </div>

            <div className="vi-notification-mode-tabs" role="tablist" aria-label="Áreas de notificaciones">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "actions"}
                className={viewMode === "actions" ? "is-active" : ""}
                onClick={() => setViewMode("actions")}
              >
                ACCIONES
                {unread > 0 && <b>{unread.toLocaleString("es-MX")}</b>}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "updates"}
                className={viewMode === "updates" ? "is-active" : ""}
                onClick={() => setViewMode("updates")}
              >
                NOVEDADES
              </button>
            </div>
          </div>

          <div className="vi-notification-list">
            {viewMode === "updates" ? (
              <div className="vi-product-updates">
                {PRODUCT_UPDATES.map((update) => (
                  <article className="vi-product-update-card" key={update.id}>
                    <div className="vi-product-update-meta">
                      <span>{update.date}</span>
                      <em>BUILD NOTES</em>
                    </div>
                    <h3>{update.title}</h3>
                    <p>{update.summary}</p>
                    <ul>
                      {update.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </article>
                ))}
              </div>
            ) : 
            {!evaluationValid ? (
              <div className="vi-notification-empty-state">
                <div className="vi-notification-phantom" aria-hidden="true">
                  <Ghost size={46} tone="violet" />
                  <span className="vi-notification-orbit"><i /><i /><i /></span>
                </div>
                <div>
                  <p className="vi-eyebrow">AÚN NO HAY ACCIONES</p>
                  <h3>Carga las fuentes del inventario</h3>
                  <p>
                    Cuando estén listas, aquí aparecerán las piezas que requieren atención:
                    diferencias, ubicación, BOM, costo y demás hallazgos accionables.
                  </p>
                  {missingSources.length > 0 && (
                    <div className="vi-notification-missing">
                      <span>PENDIENTES</span>
                      <strong>{missingSources.join(" · ")}</strong>
                    </div>
                  )}
                </div>
                <PelletRail muted />
              </div>
            ) : (
              <>
                <div className="vi-notification-summary">
                  <strong>
                    {new Set(active.map((item) => item.partNumber)).size.toLocaleString("es-MX")} PN
                  </strong>
                  <span>
                    {active.length.toLocaleString("es-MX")} alertas ·{" "}
                    {unread.toLocaleString("es-MX")} nuevas
                  </span>
                </div>

                <div className="vi-alert-summary" aria-label="Tipos de alertas">
                  <button
                    type="button"
                    className={!selectedGroup ? "is-active" : ""}
                    onClick={() => {
                      setSelectedGroup(null);
                      setPage(0);
                    }}
                  >
                    <b>{active.length.toLocaleString("es-MX")}</b>
                    <span>TODAS</span>
                  </button>
                  {groups.map(([label, count]) => (
                    <button
                      type="button"
                      className={selectedGroup === label ? "is-active" : ""}
                      key={label}
                      onClick={() => {
                        setSelectedGroup(label);
                        setPage(0);
                      }}
                    >
                      <b>{count.toLocaleString("es-MX")}</b>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {!active.length && (
                  <div className="vi-notification-empty-state is-clear">
                    <div className="vi-notification-phantom" aria-hidden="true">
                      <Ghost size={38} tone="cyan" />
                    </div>
                    <div>
                      <p className="vi-eyebrow">SIN ACCIONES PENDIENTES</p>
                      <h3>El corte actual no generó alertas</h3>
                      <p>Si cambian los archivos o aparece una nueva diferencia, se mostrará aquí.</p>
                    </div>
                  </div>
                )}

                <div className="vi-notification-cards">
                  {visible.map((alert) => (
                    <button
                      disabled={!loaded}
                      className="vi-operational-alert"
                      key={alert.id}
                      onClick={() => openAlert(alert)}
                    >
                      <span className="vi-alert-main">
                        <strong>{alert.partNumber}</strong>
                        <em>{LABEL[alert.ruleCode] || "Por revisar"}</em>
                      </span>
                      <small>{alert.read ? "VISTA" : "NUEVA"}</small>
                      <b aria-hidden="true">›</b>
                    </button>
                  ))}
                </div>

                {grouped.length > PAGE && (
                  <div className="vi-pager">
                    <button
                      disabled={!currentPage}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      ANTERIOR
                    </button>
                    <span>
                      {currentPage + 1}/{Math.ceil(grouped.length / PAGE)}
                    </span>
                    <button
                      disabled={(currentPage + 1) * PAGE >= grouped.length}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      SIGUIENTE
                    </button>
                  </div>
                )}
              </>
            )}
            )}
          </div>
        </aside>
      </div>
    </OverlayPortal>
  );
}
