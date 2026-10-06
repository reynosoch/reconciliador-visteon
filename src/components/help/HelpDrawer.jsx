import { createContext, useContext, useEffect, useState, lazy, Suspense } from "react";
import { RubberDrawer } from "../visual/ScrollEffects.jsx";
import OverlayPortal from "../shell/OverlayPortal.jsx";
import MykeGhost from "../visual/MykeGhost.jsx";
const SourcePreviewModal = lazy(() => import("../shell/SourcePreviewModal.jsx"));
import { buildMykeHelpAnswer } from "../../domain/mykeKnowledge.js";
import { getTracerSourceInventory } from "../../domain/partLearningTrace.js";
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

export default function HelpDrawer({ topic, sources, scanRows = [], snapshotMeta = null, onOpenChat, onOpenSources, reduceAnimations = false, onClose }) {
  const [pose,setPose]=useState("welcome");
  const [preview,setPreview]=useState(null);
  useEffect(()=>{
    if(!topic)return;
    setPose("welcome");setPreview(null);
    const speak=setTimeout(()=>setPose("reading"),900);
    const rest=setTimeout(()=>setPose("idle"),5000);
    return ()=>{clearTimeout(speak);clearTimeout(rest);};
  },[topic]);
  if (!topic) return null;

  const info = sourceHelpInfo(topic, sources) || HELP[topic] || HELP.overview;
  const notes = Array.isArray(info.notes) ? info.notes : [];
  const explanation = buildMykeHelpAnswer(info,topic);
  const inputs = getTracerSourceInventory(sources,Boolean(snapshotMeta?.complete),snapshotMeta);
  const openChat = (event) => onOpenChat?.(event.currentTarget.getBoundingClientRect());

  return (
    <OverlayPortal onClose={onClose}>
      <div
        className="vi-drawer-backdrop fixed inset-0 z-[120] bg-black/55"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose?.();
        }}
      >
        <aside className="vi-myke-help-speaker" aria-label="Myke explica esta sección">
          <button className="vi-myke-help-character" type="button" onClick={openChat} aria-label="Abrir chat con Myke sobre esta sección"><MykeGhost pose={reduceAnimations ? "idle" : pose}/><span>Te lo explico en el chat ↗</span></button>
        </aside>
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
            <div className="vi-myke-help-mobile"><button className="vi-myke-help-character" type="button" onClick={openChat} aria-label="Abrir chat con Myke sobre esta sección"><MykeGhost pose={reduceAnimations ? "idle" : pose}/><span>Te lo explico en el chat ↗</span></button></div>
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
              <div className="vi-myke-help-evidence">
                {explanation.sources.map((type)=>{
                  const input=inputs.find((item)=>item.type===type);
                  if(!input)return null;
                  return <button type="button" key={type} onClick={()=>{
                    if(!input.loaded){onOpenSources?.();return;}
                    setPreview({config:{type,label:input.label},source:type==="scans" && !sources.scans?.loaded ? {rows:scanRows,fileName:snapshotMeta?.fileName || "Copia 4Wall publicada por el bot"} : sources[type]});
                  }}>{input.loaded ? "Ver fuente" : "Cargar"} · {input.label}</button>;
                })}
              </div>
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
      {preview && <Suspense fallback={null}><SourcePreviewModal contextClass="vi-myke-evidence" selection={preview} onClose={()=>setPreview(null)}/></Suspense>}
    </OverlayPortal>
  );
}
