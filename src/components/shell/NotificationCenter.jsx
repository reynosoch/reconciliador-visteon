import { useEffect, useMemo, useRef, useState } from "react";
import OverlayPortal from "./OverlayPortal.jsx";
import { DEPARTMENT_QUESTIONS } from "../dashboard/PendingDecisions.jsx";
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
    body: "Las preguntas para confirmar con el departamento están en esta campana. Todos los importes están en dólares.",
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
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(active.length / PAGE) - 1),
  );
  const visible = active.slice(currentPage * PAGE, (currentPage + 1) * PAGE);
  const groups = Object.entries(
    active.reduce((a, x) => {
      const label = LABEL[x.ruleCode] || "Por revisar";
      a[label] = (a[label] || 0) + 1;
      return a;
    }, {}),
  );
  if (!open) return null;
  return (
    <OverlayPortal onClose={onClose}>
      <div className="vi-global-overlay">
        <aside className="vi-drawer-panel vi-global-drawer">
          <div className="sticky top-0 z-10 px-5 py-5 bg-white">
            <div className="flex justify-between gap-4">
              <div>
                <p className="vi-eyebrow">NOTIFICACIONES</p>
                <h2 className="mt-1 text-xl font-black">Por revisar</h2>
                <p className="mt-1 text-[11px]">
                  El historial queda en este navegador. Las alertas se
                  comprueban con los archivos cargados.
                </p>
              </div>
              <button className="vi-button" onClick={onClose}>
                CERRAR
              </button>
            </div>
            <div className="vi-notification-tabs">
              <button
                className={tab === "OPERATIVAS" ? "is-active" : ""}
                onClick={() => {
                  setTab("OPERATIVAS");
                  setPage(0);
                }}
              >
                ALERTAS <b>{unread}</b>
              </button>
              <button
                className={tab === "DEPARTAMENTO" ? "is-active" : ""}
                onClick={() => setTab("DEPARTAMENTO")}
              >
                CONFIRMAR CON EL DEPARTAMENTO
              </button>
              <button
                className={tab === "NOVEDADES" ? "is-active" : ""}
                onClick={() => setTab("NOVEDADES")}
              >
                NOVEDADES <b>{news}</b>
              </button>
            </div>
          </div>
          {tab === "DEPARTAMENTO" ? (
            <div className="vi-notification-list">
              <p>
                Estas preguntas nos ayudan a acordar cómo revisar el inventario.
                Todos los importes están en dólares.
              </p>
              {DEPARTMENT_QUESTIONS.map((q) => (
                <article className="vi-finance-question" key={q.id}>
                  <strong>{q.q}</strong>
                  <p>
                    <b>Por qué lo necesitamos:</b> {q.why}
                  </p>
                  <p>
                    <b>Ejemplo:</b> {q.example}
                  </p>
                  <p>
                    <b>Qué falta confirmar:</b> {q.need}
                  </p>
                </article>
              ))}
            </div>
          ) : tab === "NOVEDADES" ? (
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
                  <div className="vi-alert-summary">
                    {groups.map(([label, n]) => (
                      <span key={label}>
                        <b>{n.toLocaleString("es-MX")}</b> {label}
                      </span>
                    ))}
                  </div>
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
                  {active.length > PAGE && (
                    <div className="vi-pager">
                      <button
                        disabled={!currentPage}
                        onClick={() => setPage(currentPage - 1)}
                      >
                        ANTERIOR
                      </button>
                      <span>
                        {currentPage + 1}/{Math.ceil(active.length / PAGE)}
                      </span>
                      <button
                        disabled={(currentPage + 1) * PAGE >= active.length}
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
