import { createContext, useContext } from "react";
import { RubberDrawer } from "../visual/ScrollEffects.jsx";
import OverlayPortal from "../shell/OverlayPortal.jsx";
import { HELP, sourceHelpInfo } from "./helpContent.js";

const MykeHelpContext = createContext(null);
export function MykeHelpProvider({ onHelp, children }) {
  return <MykeHelpContext.Provider value={onHelp}>{children}</MykeHelpContext.Provider>;
}

export function HelpButton({ topic, onHelp, className = "" }) {
  const contextualHelp = useContext(MykeHelpContext);
  const openHelp = (event) => {
    event.stopPropagation();
    (contextualHelp || onHelp)?.(topic);
  };

  return (
    <button
      type="button"
      onClick={openHelp}
      title="Pregúntale a Myke por este dato"
      aria-label="Explicar el origen y cálculo de este dato"
      className={`vi-help-trigger ${className}`}
    >
      ?
    </button>
  );
}

export default function HelpDrawer({ topic, sources, onClose }) {
  if (!topic) return null;

  const info = sourceHelpInfo(topic, sources) || HELP[topic] || HELP.overview;
  const notes = Array.isArray(info.notes) ? info.notes : [];

  return (
    <OverlayPortal onClose={onClose}>
      <div
        className="vi-drawer-backdrop fixed inset-0 z-[120] bg-black/55"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose?.();
        }}
      >
        <RubberDrawer className="vi-drawer-panel vi-help-drawer">
          <header className="vi-help-head">
            <div className="vi-help-head-copy">
              <span className="vi-help-mark" aria-hidden="true">?</span>
              <div>
                <p className="vi-eyebrow">{info.eyebrow}</p>
                <h2>{info.title}</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="vi-icon-close"
              aria-label="Cerrar ayuda"
            >
              ×
            </button>
          </header>

          <div className="vi-help-body">
            <section className="vi-help-intro">
              <span className="vi-help-index">01</span>
              <div>
                <p className="vi-help-section-label">QUÉ SIGNIFICA</p>
                <p>{info.description}</p>
              </div>
            </section>

            <section className="vi-help-section">
              <div className="vi-help-section-head">
                <span className="vi-help-index">02</span>
                <p className="vi-help-section-label">FUENTE</p>
              </div>
              <div className="vi-help-source-card">{info.source}</div>
            </section>

            <section className="vi-help-section">
              <div className="vi-help-section-head">
                <span className="vi-help-index">03</span>
                <p className="vi-help-section-label">
                  {info.methodLabel || "CÓMO SE CALCULA"}
                </p>
              </div>
              <pre className="vi-help-formula-card">{info.formula}</pre>
            </section>

            <section className="vi-help-section">
              <div className="vi-help-section-head">
                <span className="vi-help-index">04</span>
                <p className="vi-help-section-label">OBSERVACIONES / DETALLES</p>
              </div>
              <div className="vi-help-notes">
                {notes.map((note, index) => (
                  <div className="vi-help-note" key={`${index}-${note}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <p>{note}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </RubberDrawer>
      </div>
    </OverlayPortal>
  );
}
