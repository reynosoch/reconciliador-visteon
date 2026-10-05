import { RubberDrawer } from "../visual/ScrollEffects.jsx";
import { useRef } from "react";
import OverlayPortal from "./OverlayPortal.jsx";
import SnapshotStamp from "./SnapshotStamp.jsx";
import SquishSwitch from "../ui/SquishSwitch.jsx";

const DEV_ITEMS = [
  ["Análisis histórico", "Comparar inventarios y tendencias entre cortes."],
  [
    "Reglas de investigación",
    "Configurar umbrales sin tocar fórmulas financieras.",
  ],
  ["Centro de exportación", "Administrar reportes y plantillas compartibles."],
];

export default function MainMenu({
  pacmanEnabled = true,
  reduceAnimations = false,
  lightGlass = false,
  onToggleLightGlass,
  onOpenMyke,
  onTogglePacman,
  onToggleReduceAnimations,
  open,
  onClose,
  onOpenBot,
  botRunning = false,
  onOpenLogicTracer,
  onOpenEngineGuide,
  onOpenAnimationLab,
  snapshotMeta,
  scanCount = 0,
  lastUpdated,
}) {
  const touchStart = useRef(null);
  if (!open) return null;
  return (
    <OverlayPortal onClose={onClose}>
      <div
        className="vi-global-overlay vi-menu-overlay"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <RubberDrawer
          className="vi-menu-panel vi-liquid-drawer"
          onTouchStart={(event) => {
            const touch = event.touches?.[0];
            if (touch)
              touchStart.current = { x: touch.clientX, y: touch.clientY };
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
            <button
              type="button"
              className="vi-icon-close"
              onClick={onClose}
              aria-label="Cerrar menú"
            >
              ×
            </button>
          </div>

          <section className="vi-menu-section vi-menu-snapshot-section">
            <span className="vi-menu-section-title">CORTE ACTUAL</span>
            <SnapshotStamp
              snapshotMeta={snapshotMeta}
              scanCount={scanCount}
              lastUpdated={lastUpdated}
              compact
            />
          </section>

          <section className="vi-menu-section vi-menu-bot-section">
            <span className="vi-menu-section-title">AUTOMATIZACIÓN</span>
            <button
              type="button"
              className={`vi-menu-item vi-bot-menu-entry ${botRunning ? "is-running" : ""}`}
              onClick={() => {
                onClose?.();
                onOpenBot?.();
              }}
            >
              <span className="vi-bot-menu-mark" aria-hidden="true">
                <i className="vi-bot-menu-eye" />
                <i className="vi-bot-menu-eye" />
                <i className="vi-bot-menu-beam" />
              </span>
              <span className="vi-bot-menu-copy">
                <strong>Bot 4Wall</strong>
                <small>
                  {botRunning
                    ? "Proceso activo · abre control y revisa el último snapshot publicado."
                    : "Inicia, detén o consulta el extractor automático de escaneos."}
                </small>
              </span>
              <em>{botRunning ? "CORRIENDO" : "ABRIR"}</em>
            </button>
          </section>

          <section className="vi-menu-section vi-menu-performance-section">
            <span className="vi-menu-section-title">RENDIMIENTO</span>
            <div className="vi-menu-performance-copy">
              <strong>Movimiento y carga visual</strong>
              <small>
                Controles locales para bajar trabajo gráfico sin tocar el scroll
                ni el rubber-band.
              </small>
            </div>
            <div className="vi-menu-item vi-performance-toggle">
              <span>
                <strong>Quitar animaciones</strong>
                <small>
                  {reduceAnimations
                    ? "Activo · Pausa Pac-Man, fantasmas y transiciones decorativas."
                    : "Normal · La interfaz conserva sus animaciones decorativas."}
                </small>
              </span>
              <SquishSwitch
                checked={reduceAnimations}
                onChange={() => onToggleReduceAnimations?.()}
                ariaLabel="Quitar animaciones decorativas"
              />
            </div>
            <div className="vi-menu-item vi-performance-toggle">
              <span>
                <strong>Vidrio ligero</strong>
                <small>
                  {lightGlass
                    ? "Activo · Superficies sólidas, menos trabajo gráfico. Las animaciones conservan su preferencia."
                    : "Reduce blur y sombras sin pausar animaciones ni cambiar el scroll."}
                </small>
              </span>
              <SquishSwitch
                checked={lightGlass}
                onChange={() => onToggleLightGlass?.()}
                ariaLabel="Usar vidrio ligero"
              />
            </div>
            <div className="vi-menu-item vi-pacman-toggle">
              <span>
                <strong>Animación de Pac-Man</strong>
                <small>
                  {reduceAnimations
                    ? "Pausada por Quitar animaciones · Tu preferencia se conserva."
                    : pacmanEnabled
                      ? "Activada · Se guarda en este dispositivo."
                      : "Desactivada · Se guarda en este dispositivo."}
                </small>
              </span>
              <SquishSwitch
                checked={pacmanEnabled}
                disabled={reduceAnimations}
                onChange={() => onTogglePacman?.()}
                ariaLabel="Animación de Pac-Man"
              />
            </div>
          </section>

          <section className="vi-menu-section">
            <span className="vi-menu-section-title">IDIOMA</span>
            <div
              className="vi-menu-language"
              title="Selector de idioma en desarrollo"
            >
              <button type="button" className="is-active" disabled>
                ES
              </button>
              <span>/</span>
              <button type="button" disabled>
                EN
              </button>
              <em>DEV</em>
            </div>
          </section>

          <section className="vi-menu-section">
            <span className="vi-menu-section-title">LAB</span>
            <button
              type="button"
              className="vi-menu-item"
              onClick={() => {
                onClose?.();
                onOpenMyke?.();
              }}
            >
              <span>
                <strong>Myke · tu organizador</strong>
                <small>
                  Conoce a mi equipo, consulta documentación y abre la vista
                  previa del chat.
                </small>
              </span>
              <b>›</b>
            </button>
            <button
              type="button"
              className="vi-menu-item vi-logic-entry"
              onClick={() => {
                onClose?.();
                onOpenEngineGuide?.();
              }}
            >
              <span>
                <strong>Cómo funciona el motor</strong>
                <small>
                  Qué aporta cada archivo, cómo se reconoce el físico y de dónde
                  salen NET, SWING y las advertencias.
                </small>
              </span>
              <b>›</b>
            </button>
            <button
              type="button"
              className="vi-menu-item vi-logic-entry"
              onClick={() => {
                onClose?.();
                onOpenLogicTracer?.();
              }}
            >
              <span>
                <strong>Trazador de pieza</strong>
                <small>
                  Elige un PN y mira paso a paso cómo 4Wall, QAD, ISPBB, BOM y
                  Cost Part producen su resultado.
                </small>
              </span>
              <b>›</b>
            </button>
            <button
              type="button"
              className="vi-menu-item vi-animation-lab-entry"
              onClick={() => {
                onClose?.();
                onOpenAnimationLab?.();
              }}
            >
              <span>
                <strong>Ver animación</strong>
                <small>
                  Oculta temporalmente el dashboard y deja solo el ambiente
                  Pac-Man en pantalla completa.
                </small>
              </span>
              <b>›</b>
            </button>
          </section>

          <section className="vi-menu-section">
            <span className="vi-menu-section-title">DEVELOPMENT</span>
            {DEV_ITEMS.map(([title, detail]) => (
              <button
                type="button"
                className="vi-menu-item is-development"
                disabled
                key={title}
              >
                <span>
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </span>
                <em>PRÓXIMAMENTE</em>
              </button>
            ))}
          </section>
        </RubberDrawer>
      </div>
    </OverlayPortal>
  );
}
