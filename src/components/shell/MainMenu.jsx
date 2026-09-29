import { useRef } from "react";
import OverlayPortal from "./OverlayPortal.jsx";

const DEV_ITEMS = [
  ["Análisis histórico", "Comparar inventarios y tendencias entre cortes."],
  ["Reglas de investigación", "Configurar umbrales sin tocar fórmulas financieras."],
  ["Centro de exportación", "Administrar reportes y plantillas compartibles."],
];

export default function MainMenu({ open, onClose, onAnimationOnly }) {
  const touchStart = useRef(null);
  if (!open) return null;
  return (
    <OverlayPortal onClose={onClose}>
      <div className="vi-global-overlay vi-menu-overlay" onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}>
        <aside
          className="vi-menu-panel vi-liquid-drawer"
          onTouchStart={(event) => {
            const touch = event.touches?.[0];
            if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
          }}
          onTouchEnd={(event) => {
            const origin = touchStart.current;
            touchStart.current = null;
            const touch = event.changedTouches?.[0];
            if (!origin || !touch) return;
            const dx = touch.clientX - origin.x;
            const dy = Math.abs(touch.clientY - origin.y);
            if (dx > 55 && dy < 70) onClose?.();
          }}
        >
          <div className="vi-menu-head">
            <div>
              <p className="vi-eyebrow">MENÚ</p>
              <h2>Control de inventario</h2>
            </div>
            <button type="button" className="vi-icon-close" onClick={onClose} aria-label="Cerrar menú">×</button>
          </div>

          <section className="vi-menu-section">
            <span className="vi-menu-section-title">DEVELOPMENT</span>
            {DEV_ITEMS.map(([title, detail]) => (
              <button type="button" className="vi-menu-item is-development" disabled key={title}>
                <span>
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </span>
                <em>PRÓXIMAMENTE</em>
              </button>
            ))}
          </section>

          <section className="vi-menu-section vi-menu-secret">
            <span className="vi-menu-section-title">LAB</span>
            <button
              type="button"
              className="vi-menu-item vi-animation-entry"
              onClick={() => {
                onClose?.();
                onAnimationOnly?.();
              }}
            >
              <span>
                <strong>Modo animación</strong>
                <small>Oculta el dashboard y deja únicamente el mundo Pac-Man.</small>
              </span>
              <b>›</b>
            </button>
          </section>
        </aside>
      </div>
    </OverlayPortal>
  );
}

export function AnimationOnlyView({ onClose }) {
  return (
    <div className="vi-animation-only">
      <button type="button" className="vi-animation-exit" onClick={onClose} aria-label="Volver al dashboard">
        ×
      </button>
      <div className="vi-animation-only-copy">
        <span>PAC-MAN LAB</span>
        <small>Modo visual</small>
      </div>
    </div>
  );
}
