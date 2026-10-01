import { useEffect, useMemo, useRef, useState } from "react";
import OverlayPortal from "./OverlayPortal.jsx";
import {
  READ_NEWS_KEY,
  syncOperationalAlerts,
} from "../../domain/notificationState.js";
import { currentAlerts } from "../../domain/visibleAlerts.js";
import {
  loadAlerts,
  saveAlerts,
  safeReadJson,
  safeWriteJson,
  STORAGE_WARNING,
} from "../../services/browserStorage.js";

export const CHANGELOG = [
  {
    id: "dexie-20260929",
    title: "Mejoras al guardar el historial",
    body: "Mejoramos el guardado de resultados y alertas en este equipo. Sin archivos cargados, las alertas anteriores ya no aparecen como actuales.",
  },
  {
    id: "copy-20260929",
    title: "Explicaciones más claras",
    body: "Las alertas explican qué revisar en cada parte. Todos los importes están en dólares.",
  },
];
export function Bell() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
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
  QTY_DIFF: "La cantidad no coincide",
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
  initialTab = "OPERATIVAS",
  onOpenFinding,
  onCountChange,
  onOperationalStateChange,
  onPersistenceError,
}) {
  const [tab, setTab] = useState(initialTab);
  const [record, setRecord] = useState({ inventoryId: null, value: {} });
  const stateRef = useRef({});
  const [page, setPage] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [readNews, setReadNews] = useState(() => {
    const stored = safeReadJson(READ_NEWS_KEY, []).value;
    return new Set(Array.isArray(stored) ? stored : []);
  });
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
      setTab(initialTab);
      setPage(0);
      setSelectedGroup(null);
    }
  }, [open, initialTab]);
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
  const unread = active.filter((x) => !x.read).length;
  const news = CHANGELOG.filter((x) => !readNews.has(x.id)).length;
  useEffect(() => {
    onCountChange?.(unread + news);
  }, [unread, news, onCountChange]);
  useEffect(() => {
    if (!open || tab !== "NOVEDADES") return;
    const next = new Set(CHANGELOG.map((x) => x.id));
    setReadNews(next);
    if (!safeWriteJson(READ_NEWS_KEY, [...next]).ok)
      onPersistenceError?.(STORAGE_WARNING);
  }, [open, tab, onPersistenceError]);
  const openAlert = (alert) => {
    if (!loaded || !evaluationValid) return;
    const next = { ...stateRef.current, [alert.id]: { ...alert, read: true } };
    stateRef.current = next;
    setRecord({ inventoryId, value: next });
    saveAlerts(inventoryId, next).catch(() =>
      onPersistenceError?.(STORAGE_WARNING),
    );
    onOperationalStateChange?.(next);
    onOpenFinding?.(alert.id);
    onClose?.();
  };
  const groups = Object.entries(
    active.reduce((a, x) => {
      const label = LABEL[x.ruleCode] || "Por revisar";
      a[label] = (a[label] || 0) + 1;
      return a;
    }, {}),
  );
  const groupedAlerts = selectedGroup
    ? active.filter((x) => (LABEL[x.ruleCode] || "Por revisar") === selectedGroup)
    : active;
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(groupedAlerts.length / PAGE) - 1),
  );
  const visible = groupedAlerts.slice(
    currentPage * PAGE,
    (currentPage + 1) * PAGE,
  );
  if (!open) return null;
  return (
    <OverlayPortal onClose={onClose}>
      <div className="vi-global-overlay">
        <aside className="vi-drawer-panel vi-global-drawer">
          <div className="vi-notification-head">
            <div className="vi-notification-navrow">
              {(tab !== "OPERATIVAS" || selectedGroup) ? (
                <button
                  type="button"
                  className="vi-back-button"
                  onClick={() => {
                    if (selectedGroup) {
                      setSelectedGroup(null);
                      setPage(0);
                    } else {
                      setTab("OPERATIVAS");
                      setPage(0);
                    }
                  }}
                  aria-label="Regresar"
                >
                  <span aria-hidden="true">‹</span><strong>REGRESAR</strong>
                </button>
              ) : <span />}
              <button type="button" className="vi-icon-close" onClick={onClose} aria-label="Cerrar notificaciones">×</button>
            </div>
            <div className="vi-notification-heading-copy">
              <p className="vi-eyebrow">NOTIFICACIONES</p>
              <h2>Por revisar</h2>
              <p>El historial queda en este navegador. Las alertas se comprueban con los archivos cargados.</p>
            </div>
            <div className="vi-notification-tabs">
              <button
                className={tab === "OPERATIVAS" ? "is-active" : ""}
                onClick={() => { setTab("OPERATIVAS"); setSelectedGroup(null); setPage(0); }}
              >
                <span>ALERTAS</span><b>{unread}</b>
              </button>
              <button
                className={tab === "NOVEDADES" ? "is-active" : ""}
                onClick={() => { setTab("NOVEDADES"); setSelectedGroup(null); }}
              >
                <span>NOVEDADES</span><b>{news}</b>
              </button>
            </div>
          </div>
          {tab === "NOVEDADES" ? (
            <div className="vi-notification-list">
              {CHANGELOG.map((x) => (
                <article className="vi-notification-item" key={x.id}>
                  <strong>{x.title}</strong>
                  <p>{x.body}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="vi-notification-list">
              {!evaluationValid ? (
                <div className="vi-bot-status">
                  Carga los archivos y espera a que termine la actualización
                  para revisar las alertas. El historial anterior sigue
                  guardado, pero no se cuenta como una alerta actual.
                </div>
              ) : (
                <>
                  <p>
                    {new Set(
                      active.map((x) => x.partNumber),
                    ).size.toLocaleString("es-MX")}{" "}
                    números de parte por revisar. Un número de parte puede tener
                    varios avisos.
                  </p>
                  <div className="vi-alert-summary" aria-label="Tipos de alertas">
                    <button
                      type="button"
                      className={!selectedGroup ? "is-active" : ""}
                      onClick={() => {
                        setSelectedGroup(null);
                        setPage(0);
                      }}
                    >
                      <b>{active.length.toLocaleString("es-MX")}</b> TODAS
                    </button>
                    {groups.map(([label, n]) => (
                      <button
                        type="button"
                        className={selectedGroup === label ? "is-active" : ""}
                        key={label}
                        onClick={() => {
                          setSelectedGroup(label);
                          setPage(0);
                        }}
                      >
                        <b>{n.toLocaleString("es-MX")}</b> {label}
                      </button>
                    ))}
                  </div>
                  {selectedGroup && (
                    <div className="vi-alert-group-head">
                      <strong>{selectedGroup}</strong>
                      <span>
                        {groupedAlerts.length.toLocaleString("es-MX")} avisos.
                        Selecciona un número de parte para abrir el detalle y ver
                        qué encontramos y qué revisar.
                      </span>
                    </div>
                  )}
                  {!active.length && (
                    <p>No encontramos alertas con estos archivos.</p>
                  )}
                  {visible.map((a) => (
                    <button
                      disabled={!loaded}
                      className="vi-operational-alert"
                      key={a.id}
                      onClick={() => openAlert(a)}
                    >
                      <strong>{a.partNumber}</strong>
                      <span>{LABEL[a.ruleCode] || "Por revisar"}</span>
                      <small>{a.read ? "VISTA" : "NUEVA"}</small>
                    </button>
                  ))}
                  {groupedAlerts.length > PAGE && (
                    <div className="vi-pager">
                      <button
                        disabled={!currentPage}
                        onClick={() => setPage(currentPage - 1)}
                      >
                        ANTERIOR
                      </button>
                      <span>
                        {currentPage + 1}/{Math.ceil(groupedAlerts.length / PAGE)}
                      </span>
                      <button
                        disabled={(currentPage + 1) * PAGE >= groupedAlerts.length}
                        onClick={() => setPage(currentPage + 1)}
                      >
                        SIGUIENTE
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </aside>
      </div>
    </OverlayPortal>
  );
}
