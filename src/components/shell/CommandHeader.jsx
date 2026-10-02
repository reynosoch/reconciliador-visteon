import { useCallback, useEffect, useRef } from "react";
import {
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
} from "motion/react";
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
  scrollViewportRef,
}) {
  const manual = connectionStatus?.state === "MANUAL";
  const liveError = connectionStatus?.state === "ERROR";
  const devSnapshot = ["DEV_LOADING", "DEV_SNAPSHOT"].includes(connectionStatus?.state);
  const referencesReady = referenceStatus?.allLoaded === true;
  const loaded = referenceStatus?.loadedCount || 0;
  const total = referenceStatus?.totalSources || 5;
  const ribbonRef = useRef(null);
  const ribbonHeightRef = useRef(51);
  const reduceMotion = useReducedMotion();
  const ribbonTarget = useMotionValue(1);
  const ribbonSpring = useSpring(ribbonTarget, {
    stiffness: 520,
    damping: 34,
    mass: 0.55,
    restDelta: 0.002,
    restSpeed: 0.02,
  });

  const measureRibbon = useCallback(() => {
    const ribbon = ribbonRef.current;
    const inner = ribbon?.querySelector(".vi-source-ribbon-inner");
    if (!ribbon || !inner) return;
    const measured = inner.getBoundingClientRect().height;
    if (measured > 0) ribbonHeightRef.current = measured;
  }, []);

  useMotionValueEvent(ribbonSpring, "change", (latest) => {
    const ribbon = ribbonRef.current;
    if (!ribbon) return;

    const progress = Math.max(0, Math.min(1, latest));
    const height = ribbonHeightRef.current * progress;
    ribbon.style.height = `${height.toFixed(2)}px`;
    ribbon.style.opacity = progress.toFixed(3);
    ribbon.style.transform =
      `translate3d(0,${(-7 * (1 - progress)).toFixed(2)}px,0)`;
    ribbon.style.pointerEvents = progress < 0.12 ? "none" : "auto";

    if (progress > 0.995 || progress < 0.005) {
      ribbon.style.removeProperty("will-change");
    } else {
      ribbon.style.willChange = "height, opacity, transform";
    }
  });

  useEffect(() => {
    const viewport = scrollViewportRef?.current;
    const ribbon = ribbonRef.current;
    if (!viewport || !ribbon) return undefined;

    measureRibbon();

    let previousY = viewport.scrollTop;
    let direction = 0;
    let travel = 0;
    let hidden = false;
    let frame = 0;
    let touchY = null;
    let settling = false;
    let settleTimer = 0;

    const markSettling = () => {
      settling = true;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        settling = false;
        previousY = viewport.scrollTop;
        direction = 0;
        travel = 0;
      }, 280);
    };

    const setHidden = (next) => {
      if (next === hidden) return;
      hidden = next;
      direction = 0;
      travel = 0;
      previousY = viewport.scrollTop;
      markSettling();

      if (reduceMotion) {
        ribbonTarget.jump(next ? 0 : 1);
        ribbonSpring.jump(next ? 0 : 1);
      } else {
        ribbonTarget.set(next ? 0 : 1);
      }
    };

    const applyIntent = (delta) => {
      const y = viewport.scrollTop;

      if (y <= 12) {
        direction = 0;
        travel = 0;
        setHidden(false);
        return;
      }

      if (Math.abs(delta) < 0.65) return;

      const nextDirection = delta > 0 ? 1 : -1;
      if (nextDirection !== direction) {
        direction = nextDirection;
        travel = 0;
      }

      travel += Math.abs(delta);

      // Hysteresis: hiding needs more travel than revealing. Input events are
      // used here so the ribbon's own height animation cannot fake a reversal.
      if (!hidden && direction > 0 && y > 72 && travel >= 13) {
        setHidden(true);
      } else if (hidden && direction < 0 && travel >= 7) {
        setHidden(false);
      }
    };

    const onWheel = (event) => {
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? viewport.clientHeight
            : 1;
      applyIntent(event.deltaY * unit);
    };

    const onTouchStart = (event) => {
      touchY = event.touches?.length === 1 ? event.touches[0].clientY : null;
    };

    const onTouchMove = (event) => {
      if (touchY == null || event.touches?.length !== 1) return;
      const nextY = event.touches[0].clientY;
      const delta = touchY - nextY;
      touchY = nextY;
      applyIntent(delta);
    };

    const onTouchEnd = () => {
      touchY = null;
    };

    const evaluateFallbackScroll = () => {
      frame = 0;
      const y = viewport.scrollTop;
      const delta = y - previousY;
      previousY = y;

      if (y <= 12) {
        setHidden(false);
        return;
      }

      // Shrinking/expanding the sticky ribbon changes layout and can nudge
      // scrollTop. Never feed those self-generated deltas back into the spring.
      if (settling) return;
      applyIntent(delta);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(evaluateFallbackScroll);
    };

    const onResize = () => {
      measureRibbon();
      ribbonSpring.jump(hidden ? 0 : 1);
      previousY = viewport.scrollTop;
    };

    viewport.addEventListener("wheel", onWheel, { passive: true });
    viewport.addEventListener("touchstart", onTouchStart, { passive: true });
    viewport.addEventListener("touchmove", onTouchMove, { passive: true });
    viewport.addEventListener("touchend", onTouchEnd, { passive: true });
    viewport.addEventListener("touchcancel", onTouchEnd, { passive: true });
    viewport.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(settleTimer);
      cancelAnimationFrame(frame);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
      viewport.removeEventListener("touchcancel", onTouchEnd);
      viewport.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ribbonTarget.jump(1);
      ribbonSpring.jump(1);
      ribbon.style.removeProperty("height");
      ribbon.style.removeProperty("opacity");
      ribbon.style.removeProperty("transform");
      ribbon.style.removeProperty("pointer-events");
      ribbon.style.removeProperty("will-change");
    };
  }, [
    scrollViewportRef,
    measureRibbon,
    reduceMotion,
    ribbonTarget,
    ribbonSpring,
  ]);

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

      <div ref={ribbonRef} className="vi-source-ribbon">
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
