import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import OverlayPortal from "./OverlayPortal.jsx";
import { RubberDrawer } from "../visual/ScrollEffects.jsx";
import MykeGhost from "../visual/MykeGhost.jsx";
import SourcePreviewModal from "./SourcePreviewModal.jsx";
import { buildMykeKnowledge } from "../../domain/mykeOrganization.js";
import { answerMykeInContext, buildMykePartAnswer, buildMykeHelpAnswer, buildMykeChips, buildMykeFeedbackDraft, buildMykeFeedbackPayload } from "../../domain/mykeKnowledge.js";
import {
  getTracerSourceInventory,
  getRecommendedPartCases,
} from "../../domain/partLearningTrace.js";
import { safeReadJson, safeWriteJson } from "../../services/browserStorage.js";
import { createMykeProviderAdapter, createMykeRemoteAdapter, getMykeAIConfig } from "../../services/mykeAI.js";
import { submitDevelopmentFeedback } from "../../services/supabase.js";
import { isMykeProjectQuestion } from "../../../supabase/functions/myke-chat/public-question.mjs";
import publicKnowledge from "../../../supabase/functions/myke-chat/knowledge.generated.json";

const quickPositionKey = "visteon.ui.mykeQuickPosition.v1";
const advice = [
  "Vamos a entenderlo. Pregúntame por el tablero o una pieza.",
  "Pásame un PN. Seguimos su rastro hasta la fuente.",
  "Una diferencia no cuenta toda la historia. Revisa las localidades.",
  "Si el corte está incompleto, todavía falta contexto.",
  "Las cifras tienen origen. Abre la evidencia para comprobarlo.",
];
function ExpandIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function extractPNFromConversation(messages) { return messages.filter((message) => message.answer?.kind === "piece").at(-1)?.answer.pn || ""; }

function PieceReply({ pn, context, onEvidence, onTracer, onSources }) {
  const piece = useMemo(() => buildMykePartAnswer(pn, context), [pn, context]);
  return (
    <section className="vi-myke-piece" aria-label={`Consulta de ${pn}`}>
      <h3>{piece.pn}</h3>
      {piece.found && (
        <>
          <p>
            {piece.description || "Descripción no disponible en las fuentes"}
          </p>
          <strong>
            {piece.status} ·{" "}
            {piece.complete ? "Fuentes completas" : "Datos provisionales"}
          </strong>
        </>
      )}
      {!piece.found && <p>{piece.explanation}</p>}
      {piece.found ? (
        <>
          <p>Datos del corte actual. Toca una cifra para ver de dónde sale.</p>
          <div className="vi-myke-piece-metrics">
            {piece.metrics.map((metric) => (
              <details key={metric.id}>
                <summary>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{metric.explanation}</p>
                {metric.warning && <p>{metric.warning}</p>}
                {metric.calculation.map((formula, i) => (
                  <p key={i}>
                    {formula.general}
                    <br />
                    {formula.substitution}
                  </p>
                ))}
                <div className="vi-myke-source-actions">
                  {metric.refs.map((ref, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => onEvidence(ref, pn)}
                    >
                      Ver fuente · {ref.label}
                    </button>
                  ))}
                </div>
              </details>
            ))}
          </div>
          <p>{piece.explanation}</p>
          <details className="vi-myke-answer-sources">
            <summary>¿Por qué aparece este PN?</summary>
            {piece.origins.map((origin) => (
              <div key={origin.type}>
                <p>{origin.explanation}</p>
                <div className="vi-myke-source-actions">
                  <button
                    type="button"
                    onClick={() => onEvidence(origin.reference, pn)}
                  >
                    Ver {origin.reference.label}
                  </button>
                </div>
              </div>
            ))}
          </details>
          <details className="vi-myke-answer-sources">
            <summary>
              Advertencias y qué revisar · {piece.warnings.length}
            </summary>
            {piece.warnings.map((warning) => (
              <div key={warning.id}>
                <strong>{warning.title}</strong>
                <p>{warning.detail}</p>
                <div className="vi-myke-source-actions">
                  {warning.refs.map((ref, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => onEvidence(ref, pn)}
                    >
                      Ver {ref.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {piece.actions.map((action) => (
              <div key={action.id}>
                <strong>{action.title}</strong>
                <p>{action.detail}</p>
              </div>
            ))}
          </details>
          <div className="vi-myke-shortcuts">
            <button type="button" onClick={() => onTracer(pn)}>
              Revisar {pn} en el trazador →
            </button>
          </div>
        </>
      ) : (
        <div className="vi-myke-shortcuts">
          <button type="button" onClick={onSources}>
            Abrir archivos de inventario →
          </button>
        </div>
      )}
    </section>
  );
}
export default function MykePanel({
  open,
  onClose,
  onOpenEngineGuide,
  onOpenTracer,
  onOpenSources,
  onOpenDataAlerts,
  initialTab = "chat",
  anchor = null,
  onExpand,
  helpRequest = null,
  summary = null, diagnostics = null, botRunning = false, loading = false, error = null, inventoryId = null, reduceAnimations = false,
  providerAdapter = null,
  sources = {},
  scanRows = [],
  scanReady = false,
  snapshotMeta = null,
  reconciliation = [],
  engineSources = {},
  findings = [],
}) {
  const systemReducedMotion = useReducedMotion();
  const quietMotion = reduceAnimations || systemReducedMotion;
  const [tab, setTab] = useState(initialTab);
  const [draft, setDraft] = useState("");
  const [faqQuery, setFaqQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [gaze, setGaze] = useState(0);
  const [reaction, setReaction] = useState("welcome");
  const [accessCode, setAccessCode] = useState("");
  const [connectedCode, setConnectedCode] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("");
  const remoteConfig = useMemo(() => getMykeAIConfig(), []);
  const [preview, setPreview] = useState(null);
  const [size, setSize] = useState(() => {
    const stored = safeReadJson("visteon.ui.mykeSize.v1", null).value;
    return stored &&
      Number.isFinite(stored.width) &&
      Number.isFinite(stored.height)
      ? {
          width: Math.max(560, Math.min(1400, stored.width)),
          height: Math.max(520, Math.min(1000, stored.height)),
        }
      : { width: 1120, height: 820 };
  });
  const [quickSize, setQuickSize] = useState(() => {
    const saved = safeReadJson("visteon.ui.mykeQuickSize.v1", null).value;
    return { width: Number.isFinite(saved?.width) ? Math.max(280, Math.min(1000, saved.width)) : 400,
      height: Number.isFinite(saved?.height) ? Math.max(320, Math.min(1000, saved.height)) : 480 };
  });
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const [quickPosition, setQuickPosition] = useState(() => {
    const saved = safeReadJson(quickPositionKey, null).value;
    return Number.isFinite(saved?.x) && Number.isFinite(saved?.y) ? saved : null;
  });
  const dragChat = useRef(null);
  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    if (!open || typing || reaction === "thinking") return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") setTipIndex((index) => (index + 1) % advice.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [open, typing, reaction]);
  const narrow = viewport.width < 640;
  const quickMinX = narrow ? 8 : 92;
  const quickReserve = narrow ? 164 : 80;
  const activeSize = anchor ? quickSize : size;
  const quickWidth = Math.min(quickSize.width, viewport.width - quickMinX - 8);
  const quickHeight = Math.min(quickSize.height, viewport.height - quickReserve - 16);
  const boundPosition = (x, y) => ({
    x: Math.max(quickMinX, Math.min(viewport.width - quickWidth - 8, x)),
    y: Math.max(8, Math.min(viewport.height - quickHeight - quickReserve, y)),
  });
  const quickPoint = boundPosition(
    quickPosition?.x ?? (anchor ? anchor.x < viewport.width / 2 ? anchor.x + anchor.width + 8 : anchor.x - quickWidth - 8 : quickMinX),
    quickPosition?.y ?? (anchor ? anchor.y + anchor.height - quickHeight : 80),
  );
  const quickLeft = quickPoint.x, quickTop = quickPoint.y;
  const renderedQuickHeight = Math.min(quickSize.height, viewport.height - quickTop - quickReserve);
  const saveSize = (next) => {
    (anchor ? setQuickSize : setSize)(next);
    safeWriteJson(anchor ? "visteon.ui.mykeQuickSize.v1" : "visteon.ui.mykeSize.v1", next);
  };
  const [aiState, setAIState] = useState("local");
  const [report, setReport] = useState(null);
  const [reportStatus, setReportStatus] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const reportOpen = Boolean(report);
  const reportFlight = useRef(false);
  const seenHelp = useRef(null);
  const provider = useMemo(() => providerAdapter || (connectedCode ? createMykeRemoteAdapter({accessCode:connectedCode,config:remoteConfig}) : createMykeProviderAdapter()), [providerAdapter,connectedCode,remoteConfig]);
  const composer = useRef(null),
    conversation = useRef(null),
    end = useRef(null);
  const request = useRef(null),
    resize = useRef(null);
  const messageSequence = useRef(0);
  const organization = useMemo(() => buildMykeKnowledge(publicKnowledge), []);
  const inputs = useMemo(
    () => getTracerSourceInventory(sources, scanReady, snapshotMeta),
    [sources, scanReady, snapshotMeta],
  );
  useEffect(() => {
    if (open) { setTab(initialTab === "explore" ? "explore" : "chat"); setTyping(false); setReaction("welcome"); }
    else { setPreview(null); request.current?.abort(); request.current = null; setAIState("local"); setMessages((current) => current.map((m) => m.pending ? {...m,pending:false,aiError:"Consulta detenida al cerrar Myke."} : m)); }
    return () => { request.current?.abort(); request.current = null; };
  }, [open, initialTab]);
  useEffect(() => {
    if (!open || !["welcome", "reading", "success", "sad"].includes(reaction)) return;
    const next = reaction === "reading" ? "success" : "idle";
    const timer = setTimeout(() => setReaction(next), quietMotion ? 0 : reaction === "reading" ? 650 : reaction === "sad" ? 1800 : 1200);
    return () => clearTimeout(timer);
  }, [reaction, open, quietMotion]);
  useEffect(() => {
    const node = composer.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(144, Math.max(48, node.scrollHeight))}px`;
  }, [draft, open]);
  useEffect(() => {
    if (open && tab === "chat" && messages.length && conversation.current) {
      const latest = end.current?.previousElementSibling;
      // Only move the conversation, never the page or enclosing drawer.
      if (latest) conversation.current.scrollTop = latest.offsetTop;
    }
  }, [messages, open, tab, reportOpen, reportStatus]);
  const pieceContext = useMemo(
    () => ({
      reconciliation,
      engineSources,
      findings,
      sources,
      scanRows,
      scanReady,
      snapshotMeta, summary, diagnostics, botRunning, loading, error,
    }),
    [
      reconciliation,
      engineSources,
      findings,
      sources,
      scanRows,
      scanReady,
      snapshotMeta, summary, diagnostics, botRunning, loading, error,
    ],
  );
  useEffect(() => {
    if (!open || !helpRequest || seenHelp.current === helpRequest.id) return;
    seenHelp.current = helpRequest.id;
    setReportStatus("");
    const answer = buildMykeHelpAnswer(helpRequest.info, helpRequest.topic, { pn: helpRequest.pn });
    setMessages((current) => [...current.slice(-22), {role:"myke",id:`help-${helpRequest.id}`,answer,contextTopic:helpRequest.topic}]);
    setTab("chat"); setReaction("welcome");
  }, [open, helpRequest]);
  const lastAnswer = messages.filter((m) => m.role === "myke").at(-1)?.answer;
  const chips = useMemo(() => buildMykeChips(pieceContext, lastAnswer), [pieceContext, lastAnswer]);
  const cases = useMemo(
    () => (open ? getRecommendedPartCases(reconciliation).slice(0, 3) : []),
    [open, reconciliation],
  );
  if (!open) return null;
  const send = async (question = draft) => {
    if (!question.trim() || request.current) return;
    const text = question.slice(0,1000);
    if (!reportOpen) setReportStatus("");
    const answer = answerMykeInContext(text, organization, messages.slice(-8), pieceContext);
    const history = messages.filter((m) => m.publicQuestion || m.aiText).map((m) => ({role:m.role === "you" ? "user" : "assistant",content:m.text || m.aiText}));
    const inScope = isMykeProjectQuestion(text,history);
    const useAI = provider.configured && ["answer", "unknown"].includes(answer.kind) && inScope;
    const id = `myke-${++messageSequence.current}`;
    const controller = new AbortController(); request.current = controller;
    setMessages((current) => [...current.slice(-22),{role:"you",text,publicQuestion:inScope && answer.kind !== "piece"},{role:"myke",id,answer,pending:true}]);
    setDraft(""); setTyping(false); setAIState("pending"); setReaction("thinking");
    try {
      // Brief local review phase is not presented as a connected LLM or token streaming.
      await new Promise((resolve) => setTimeout(resolve, quietMotion ? 0 : 1250));
      if (controller.signal.aborted) return;
      const aiText = useAI ? await provider.generate({question:text,history,signal:controller.signal}) : null;
      if (controller.signal.aborted) return;
      setMessages((current) => current.map((m) => m.id === id ? {...m,pending:false,aiText,aiProvider:useAI ? provider.name : null} : m));
      const unresolved = answer.kind === "unknown" || (answer.kind === "piece" && !reconciliation.some((item) => item.partNumber === answer.pn));
      setReaction(unresolved && !aiText ? "sad" : "reading"); setAIState("local");
    } catch (failure) {
      if (controller.signal.aborted) return;
      setMessages((current) => current.map((m) => m.id === id ? {...m,pending:false,aiError:failure.message} : m));
      setReaction("sad"); setAIState("local");
    } finally { if (request.current === controller) request.current = null; }
  };
  const submitReport = async () => {
    if (reportFlight.current) return;
    let payload;
    try { payload = buildMykeFeedbackPayload(report, {inventoryId, pathname:location.pathname, width:window.innerWidth, height:window.innerHeight}); }
    catch (failure) { setReportStatus(failure.message); return; }
    setTyping(false);
    reportFlight.current = true; setReportSending(true); setReportStatus(""); setReaction("thinking");
    try {
      await submitDevelopmentFeedback(payload);
      setReport(null); setReportStatus("Reporte enviado. Gracias; no se modificó el inventario."); setReaction("success");
    } catch (failure) { setReportStatus(failure.message); setReaction("sad"); }
    finally { reportFlight.current = false; setReportSending(false); }
  };
  const boundedSize = (width, height) => {
    const maxWidth = viewport.width - (anchor ? quickLeft + 8 : 36);
    const maxHeight = viewport.height - (anchor ? quickTop + quickReserve : 88);
    return {
      width: Math.min(maxWidth, Math.max(anchor ? 280 : 560, width)),
      height: Math.min(maxHeight, Math.max(anchor ? 320 : 520, height)),
    };
  };
  const showEvidence = (ref, pn) => {
    if (!inputs.find((input) => input.type === ref.type)?.loaded) {
      onClose();
      onOpenSources();
      return;
    }
    setPreview({
      source: ref.source,
      config: { type: ref.type, label: ref.label },
      evidence: ref.evidence,
      rule: ref.rule,
      tracePn: pn,
      initialQuery: ref.evidence.length ? "" : pn,
    });
  };
  const sourceButtons = (entry) => (
    <div className="vi-myke-source-actions">
      {entry.sources.map((type) => {
        const input = inputs.find((item) => item.type === type);
        if (!input) return null;
        return (
          <button
            key={type}
            type="button"
            onClick={() => {
              if (!input.loaded) {
                onClose();
                onOpenSources();
                return;
              }
              setPreview({
                config: { type, label: input.label },
                source:
                  type === "scans" && !sources.scans?.loaded
                    ? {
                        rows: scanRows,
                        fileName:
                          snapshotMeta?.fileName ||
                          "Copia 4Wall publicada por el bot",
                      }
                    : sources[type],
              });
            }}
          >
            <span aria-hidden="true">▤</span> {input.loaded ? "Ver" : "Cargar"}{" "}
            {input.label}
            <small>
              {input.loaded ? input.identity : "Fuente no disponible"}
            </small>
          </button>
        );
      })}
    </div>
  );
  const renderTopic = (entry, foldSources = false) => (
    <section className="vi-myke-doc-excerpt" key={entry.id}>
      <h3>{entry.title}</h3>
      {entry.paragraphs.map((text, index) => (
        <p key={index}>{text}</p>
      ))}
      <span>Explicación del reconciliador · fuentes verificables</span>
      {entry.sources.length > 0 &&
        (foldSources ? (
          <details className="vi-myke-answer-sources">
            <summary>Ver fuentes de esta explicación</summary>
            {sourceButtons(entry)}
          </details>
        ) : (
          sourceButtons(entry)
        ))}
      {entry.id === "alerts" && (
        <div className="vi-myke-shortcuts">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDataAlerts();
            }}
          >
            Ver advertencias del inventario →
          </button>
        </div>
      )}
    </section>
  );
  const companion = (
    <div className="vi-myke-living-space">
                <motion.div className="vi-myke-stage" animate={{ x: quietMotion ? 0 : gaze * 10, y: quietMotion ? 0 : typing ? -4 : reaction === "thinking" ? -3 : 0, rotate: quietMotion ? 0 : typing ? gaze * 5 : 0 }} transition={quietMotion ? {duration:0} : {type:"spring",stiffness:260,damping:24}}>
                  <MykeGhost pose={aiState === "pending" || reportSending ? "thinking" : typing ? "typing" : reaction} gaze={gaze}/>
                </motion.div>
                <div className="vi-myke-speech" aria-label="Consejo de Myke">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p key={aiState === "pending" ? "pending" : typing ? "typing" : reaction === "sad" ? "sad" : tipIndex}
                      initial={{opacity:0,y:quietMotion ? 0 : 5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:quietMotion ? 0 : -4}} transition={{duration:quietMotion ? 0 : .22}}>
                      {aiState === "pending" ? "Dame un momento. Estoy revisando la pregunta y las fuentes." : typing ? "Te sigo. Vamos a ver qué hay detrás de ese dato." : reaction === "sad" ? "Aquí falta evidencia. Probemos otra pregunta." : advice[tipIndex]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
  );
  return (
    <>
      <OverlayPortal onClose={onClose}>
        <div
          className={`vi-myke-overlay ${anchor ? "vi-myke-compact" : ""}`}
          style={anchor ? {
            "--vi-myke-anchor-x": `${quickLeft}px`,
            "--vi-myke-anchor-y": `${quickTop}px`,
          } : undefined}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <RubberDrawer
            className="vi-myke-panel"
            style={{
              "--vi-myke-width": `${activeSize.width}px`,
              "--vi-myke-height": `${anchor ? renderedQuickHeight : activeSize.height}px`,
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Myke · ayuda del reconciliador"
          >
            <header className="vi-myke-head">
              {anchor ? <button
                type="button" className="vi-myke-move" aria-label="Mover chat rápido"
                title="Arrastra el chat o muévelo con las flechas"
                onPointerDown={(event) => {
                  if (event.button !== 0 || !event.isPrimary) return;
                  dragChat.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: quickLeft, top: quickTop };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  const start = dragChat.current;
                  if (!start || start.id !== event.pointerId) return;
                  setQuickPosition(boundPosition(start.left + event.clientX - start.x, start.top + event.clientY - start.y));
                }}
                onPointerUp={(event) => {
                  const start = dragChat.current;
                  if (!start || start.id !== event.pointerId) return;
                  const next = boundPosition(start.left + event.clientX - start.x, start.top + event.clientY - start.y);
                  setQuickPosition(next); safeWriteJson(quickPositionKey, next); dragChat.current = null;
                }}
                onPointerCancel={() => { dragChat.current = null; }}
                onLostPointerCapture={() => { dragChat.current = null; }}
                onKeyDown={(event) => {
                  const delta = { ArrowLeft: [-24,0], ArrowRight: [24,0], ArrowUp: [0,-24], ArrowDown: [0,24] }[event.key];
                  if (!delta) return;
                  event.preventDefault();
                  const next = boundPosition(quickLeft + delta[0], quickTop + delta[1]);
                  setQuickPosition(next); safeWriteJson(quickPositionKey, next);
                }}
              ><span aria-hidden="true">⠿</span>Chat rápido</button> : <div><h2>Myke<span>·</span></h2>{helpRequest && <small>Sobre {helpRequest.info.title}</small>}</div>}
              <div className="vi-myke-head-actions">
                {anchor && <button type="button" className="vi-myke-expand" onClick={() => onExpand?.()}><span>Chat completo</span><ExpandIcon/></button>}
                <button type="button" className="vi-icon-close" aria-label="Cerrar Myke" onClick={onClose}>×</button>
              </div>
            </header>
            <nav className="vi-myke-tabs" aria-label="Vistas de Myke">
              {[
                ["chat", "Chat"],
                ["explore", "Explorar"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={tab === id}
                  onClick={() => {
                    setTab(id);
                    setTyping(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
            <div className="vi-myke-body" data-view={tab}>
              {tab === "chat" && (
                <>
                  <aside
                    className="vi-myke-questions"
                    aria-label="Preguntas frecuentes"
                  >
                    <strong>Preguntas frecuentes</strong>
                    <div className="vi-myke-suggestions">
                      {["dashboard", "capabilities", "opportunities", "parts"]
                        .map((id) =>
                          organization.topics.find((t) => t.id === id),
                        )
                        .filter(Boolean)
                        .map((topic) => (
                          <button
                            key={topic.id}
                            type="button"
                            disabled={aiState === "pending"}
                            onClick={() => send(topic.title)}
                          >
                            {topic.title}
                          </button>
                        ))}
                    </div>
                    <div className="vi-myke-more">
                      {!anchor && <details className="vi-myke-local-options">
                        <summary>{provider.configured ? "Conexión IA" : "Conectar IA"}</summary>
                        <p>La conversación permanece aquí. El servicio conecta con Copilot corporativo o el proveedor autorizado en el servidor; no descarga modelos.</p>
                        {!remoteConfig ? <p>No hay un servicio IA configurado en esta instalación.</p> : <>
                          <label className="vi-myke-faq-search">Código privado del servicio
                            <input type="password" autoComplete="off" value={accessCode} maxLength={256} onChange={(event) => setAccessCode(event.target.value)} />
                          </label>
                          <button type="button" disabled={!accessCode.trim() || aiState === "pending"} onClick={async () => {
                            if (request.current) return;
                            const controller = new AbortController(); request.current = controller; setAIState("pending");setReaction("thinking");setConnectionStatus("Verificando conexión…");
                            try {
                              const candidate=createMykeRemoteAdapter({accessCode,config:remoteConfig});
                              const result=await candidate.generate({question:"¿Cómo uso el tablero del reconciliador Visteon?",signal:controller.signal});
                              if(controller.signal.aborted)return;
                              setConnectedCode(accessCode);setAccessCode("");setConnectionStatus("IA conectada: las respuestas llegan a este chat.");
                              setMessages((current)=>[...current.slice(-22),{role:"myke",id:`connect-${++messageSequence.current}`,answer:answerMykeInContext("¿Cómo uso esta página?",organization,[],pieceContext),aiText:result,aiProvider:candidate.name}]);setReaction("reading");
                            }catch(failure){if(!controller.signal.aborted){setConnectionStatus(failure.message);setReaction("sad");}}
                            finally{if(request.current===controller){request.current=null;setAIState("local");}}
                          }}>Conectar y comprobar</button>
                          {connectedCode && <button type="button" onClick={()=>{request.current?.abort();setConnectedCode("");setAccessCode("");setConnectionStatus("IA desconectada.");}}>Desconectar IA</button>}
                        </>}
                        {connectionStatus && <p role="status">{connectionStatus}</p>}
                      </details>}
                      <details className="vi-myke-question-library">
                        <summary>Más preguntas</summary>
                        <label className="vi-myke-faq-search">
                          Buscar una pregunta
                          <input
                            type="search"
                            value={faqQuery}
                            onChange={(e) => setFaqQuery(e.target.value)}
                            placeholder="NET, Phantom, archivos…"
                          />
                        </label>
                        <div className="vi-myke-topics">
                          {organization.topics
                            .filter((entry) =>
                              (entry.title + " " + entry.keywords.join(" "))
                                .normalize("NFD")
                                .replace(/[\u0300-\u036f]/g, "")
                                .toLowerCase()
                                .includes(
                                  faqQuery
                                    .normalize("NFD")
                                    .replace(/[\u0300-\u036f]/g, "")
                                    .toLowerCase(),
                                ),
                            )
                            .map((entry) => (
                              <button
                                type="button"
                                key={entry.id}
                                disabled={aiState === "pending"}
                                onClick={(event) => {
                                  event.currentTarget.closest("details").open =
                                    false;
                                  send(entry.title);
                                }}
                              >
                                {entry.title}
                                <span>›</span>
                              </button>
                            ))}
                        </div>
                      </details>

                    </div>
                  </aside>
                  <section className="vi-myke-chat" aria-label="Chat">
                    <div
                      className="vi-myke-conversation"
                      ref={conversation}
                      role="log"
                      aria-label="Conversación con Myke"
                      aria-live="polite"
                      aria-relevant="additions"
                    >
                      {!messages.length && !anchor && (
                        <div className="vi-myke-message">
                          <strong>Hola, soy Myke.</strong>
                          <p>
                            Te ayudo a usar el tablero, entender el código y
                            encontrar el origen de cada dato. Escribe tu
                            pregunta o un número de parte; revisamos juntos qué
                            pasó y qué conviene confirmar.
                          </p>
                        </div>
                      )}
                      {messages.map((message, index) => (
                        <article
                          key={message.id || index}
                          className={
                            message.role === "you"
                              ? "vi-myke-user-message"
                              : "vi-myke-answer"
                          }
                        >
                          <strong>
                            {message.role === "you" ? "Tú" : "Myke"}
                          </strong>
                          {message.role === "you" ? (
                            <p>{message.text}</p>
                          ) : (
                            <>
                              {!message.pending && <>
                              {/* Live engine evidence remains authoritative even after an AI reply. */}
                              {message.answer.kind === "piece" && (
                                <PieceReply
                                  pn={message.answer.pn}
                                  context={pieceContext}
                                  onEvidence={showEvidence}
                                  onTracer={(pn) => {
                                    onClose();
                                    onOpenTracer(pn);
                                  }}
                                  onSources={() => {
                                    onClose();
                                    onOpenSources();
                                  }}
                                />
                              )}
                              {message.aiText ? (
                                <div className="vi-myke-ai-answer">
                                  <small>
                                    {message.aiProvider} · contexto del proyecto;
                                    confirma propuestas en las fuentes
                                  </small>
                                  <p>{message.aiText}</p>
                                  {message.answer.kind === "answer" && (
                                    <details className="vi-myke-answer-sources">
                                      <summary>
                                        Explicación relacionada y fuentes disponibles
                                      </summary>
                                      {message.answer.topicIds.map((id) =>
                                        renderTopic(
                                          organization.topics.find(
                                            (item) => item.id === id,
                                          ),
                                          true,
                                        ),
                                      )}
                                    </details>
                                  )}
                                </div>
                              ) : (
                                <>
                                  {message.answer.paragraphs.map((text, i) => (
                                    <p key={i}>{text}</p>
                                  ))}
                                  {message.answer.kind === "answer" &&
                                    message.answer.topicIds.map((id) =>
                                      renderTopic(
                                        organization.topics.find(
                                          (item) => item.id === id,
                                        ),
                                        true,
                                      ),
                                    )}
                                </>
                              )}
                              {message.answer.blocks?.map((block) => <div className="vi-myke-explanation" key={block.label}><small>{block.label}</small><p>{block.text}</p></div>)}
                              {message.answer.sections?.map((section) => <section className="vi-myke-case" key={section.pn}><strong>{section.title}</strong><small>HECHO</small><p>{section.fact}</p><small>INTERPRETACIÓN</small><p>{section.interpretation}</p><small>SIGUIENTE PASO</small><p>{section.next}</p><button type="button" onClick={() => send(`PN: ${section.pn}`)}>Ver evidencia de {section.pn}</button><button type="button" onClick={() => {onClose();onOpenTracer(section.pn);}}>Abrir trazador</button></section>)}
                              {message.answer.sources && <details className="vi-myke-answer-sources"><summary>Archivos y evidencia</summary>{sourceButtons(message.answer)}</details>}
                              {message.answer.actions && <div className="vi-myke-shortcuts">{message.answer.actions.map((action) => <button type="button" key={action.label} onClick={() => {
                                if (action.question) { send(action.question); return; }
                                if (action.action === "evidence") { if (message.answer.pn) send(`PN: ${message.answer.pn}`); else { onClose();onOpenSources(); } return; }
                                onClose(); if (action.action === "alerts") onOpenDataAlerts(); else onOpenSources();
                              }}>{action.label}</button>)}{message.answer.pn && message.answer.kind !== "piece" && <button type="button" onClick={() => {onClose();onOpenTracer(message.answer.pn);}}>Abrir trazador</button>}</div>}
                              {message.answer.kind === "bug" && <button type="button" className="vi-myke-report-prepare" onClick={() => {setReport(buildMykeFeedbackDraft(message.answer.problem,{topic:helpRequest?.info.title,pn:extractPNFromConversation(messages)}));setReportStatus("");}}>Preparar reporte</button>}
                              </>}
                              {message.pending && (
                                <p className="vi-myke-working" role="status">
                                  Revisando las fuentes disponibles…{" "}
                                  <span aria-hidden="true">•••</span>
                                </p>
                              )}
                              {message.aiError && (
                                <p className="vi-myke-ai-error" role="status">
                                  {message.aiError} Puedes seguir con la guía y
                                  las fuentes locales.
                                </p>
                              )}
                              {message.answer.topicIds.includes(
                                "capabilities",
                              ) &&
                                cases.length > 0 && (
                                  <div className="vi-myke-suggestions">
                                    {cases.map(({ item, reason }) => (
                                      <button
                                        type="button"
                                        key={item.partNumber}
                                        disabled={aiState === "pending"}
                                        onClick={() =>
                                          send(`PN: ${item.partNumber}`)
                                        }
                                      >
                                        {item.partNumber} · {reason}
                                      </button>
                                    ))}
                                  </div>
                                )}
                            </>
                          )}
                        </article>
                      ))}
                      {report && <section className="vi-myke-report" aria-label="Vista previa del reporte">
                        <h3>¿Lo envío?</h3><p>Tipo: {report.type} · Área: {report.area}</p>
                        <p>{report.problem}</p><p>Vista: {report.topic}{report.pn ? ` · PN: ${report.pn}` : ""}</p>
                        <label>¿Qué estabas haciendo?<textarea disabled={reportSending} value={report.action} onChange={(event) => setReport({...report,action:event.target.value})} maxLength={1000}/></label>
                        <label>¿Qué esperabas que ocurriera?<textarea disabled={reportSending} value={report.expected} onChange={(event) => setReport({...report,expected:event.target.value})} maxLength={1000}/></label>
                        <p>Contexto técnico: vista, ruta sin parámetros y tamaño de pantalla. Sin archivos, tokens ni datos completos del inventario.</p>
                        <button type="button" disabled={reportSending || !report.action.trim() || !report.expected.trim()} onClick={submitReport}>{reportSending ? "Enviando…" : "Sí, enviar reporte"}</button>
                        <button type="button" disabled={reportSending} onClick={() => {setReport(null);setReportStatus("");}}>Cancelar reporte</button>
                      </section>}
                      {reportStatus && <p className="vi-myke-report-status" role="status">{reportStatus}</p>}
                      <div ref={end} />
                    </div>
                    <div className="vi-myke-context-chips" aria-label="Sugerencias del corte">
                      {(anchor ? messages.length ? chips.slice(0,2) : [] : chips).map((chip) => <button type="button" key={chip.question} disabled={aiState === "pending"} onClick={() => send(chip.question)}>{chip.label}</button>)}
                    </div>
                    {!anchor && companion}
                    <form
                      className="vi-myke-composer"
                      onSubmit={(event) => {
                        event.preventDefault();
                        send();
                      }}
                    >
                      <label htmlFor="myke-question">Tu pregunta</label>
                      <textarea
                        id="myke-question"
                        ref={composer}
                        value={draft}
                        maxLength={1000}
                        rows={2}
                        placeholder="Escribe una pregunta o un PN"
                        onBlur={() => setTyping(false)}
                        onSelect={(event) =>
                          setGaze(
                            Math.min(
                              1,
                              (event.currentTarget.selectionStart % 48) / 24 -
                                1,
                            ),
                          )
                        }
                        onChange={(event) => {
                          setDraft(event.target.value);
                          setTyping(true);
                          setGaze(Math.min(1, (event.target.selectionStart % 48) / 24 - 1));
                        }}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" &&
                            !event.shiftKey &&
                            !event.nativeEvent.isComposing
                          ) {
                            event.preventDefault();
                            send();
                          }
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!draft.trim() || aiState === "pending"}
                        aria-label="Enviar pregunta a Myke"
                      >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </form>
                    {!anchor && <p className="vi-myke-note" role="status">
                      {aiState === "pending" ? "Revisando la pregunta y el corte…" : provider.configured ? provider.name : "Ayuda y datos locales · IA sin conectar"}{" "}
                      · No modifica inventario. No compartas contraseñas.
                    </p>}
                  </section>
                </>
              )}
              {tab === "explore" && (
                <>
                  <div className="vi-myke-message">
                    <strong>Vamos a ver cómo encaja todo</strong>
                    <p>
                      Abre el motor, sigue una pieza o mira sus archivos. En
                      Chat están las preguntas y explicaciones.
                    </p>
                  </div>
                  <div className="vi-myke-explore">
                    {[
                      [
                        "01",
                        "El motor por dentro",
                        "Un recorrido visual desde los archivos hasta NET, SWING y las alertas, con ejemplos calculados.",
                        onOpenEngineGuide,
                      ],
                      [
                        "02",
                        "Sigue una pieza",
                        "Elige un PN y encuentra las filas que participaron en su resultado.",
                        onOpenTracer,
                      ],
                      [
                        "03",
                        "Archivos del inventario",
                        "Abre las fuentes como Excel o agrega las que faltan.",
                        onOpenSources,
                      ],
                      [
                        "04",
                        "Qué necesita revisión",
                        "Advertencias actuales y lo que conviene confirmar antes de actuar.",
                        onOpenDataAlerts,
                      ],
                    ].map(([number, title, description, callback]) => (
                      <button
                        type="button"
                        key={number}
                        onClick={() => {
                          onClose();
                          callback();
                        }}
                      >
                        <span>{number}</span>
                        <strong>{title}</strong>
                        <p>{description}</p>
                        <b aria-hidden="true">→</b>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              className="vi-myke-resize"
              aria-label="Cambiar tamaño del chat de Myke"
              title="Arrastra para cambiar tamaño; con teclado usa las flechas"
              onTouchStart={(event) => event.stopPropagation()}
              onTouchEnd={(event) => event.stopPropagation()}
              onPointerDown={(event) => {
                if (event.button !== 0 || !event.isPrimary) return;
                const box = event.currentTarget
                  .closest(".vi-myke-panel")
                  .getBoundingClientRect();
                resize.current = {
                  id: event.pointerId,
                  x: event.clientX,
                  y: event.clientY,
                  width: box.width,
                  height: box.height,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                const start = resize.current;
                if (!start || start.id !== event.pointerId) return;
                (anchor ? setQuickSize : setSize)(
                  boundedSize(
                    start.width + (anchor ? 1 : 2) * (event.clientX - start.x),
                    start.height + (anchor ? 1 : 2) * (event.clientY - start.y),
                  ),
                );
              }}
              onPointerUp={() => {
                resize.current = null;
                saveSize(activeSize);
              }}
              onPointerCancel={() => {
                resize.current = null;
              }}
              onLostPointerCapture={() => {
                resize.current = null;
              }}
              onKeyDown={(event) => {
                const delta = {
                  ArrowRight: [24, 0],
                  ArrowLeft: [-24, 0],
                  ArrowDown: [0, 24],
                  ArrowUp: [0, -24],
                }[event.key];
                if (!delta) return;
                event.preventDefault();
                const box = event.currentTarget
                  .closest(".vi-myke-panel")
                  .getBoundingClientRect();
                const next = boundedSize(
                  box.width + delta[0],
                  box.height + delta[1],
                );
                saveSize(next);
              }}
            >
              <span aria-hidden="true">↘</span>
            </button>
          </RubberDrawer>
          {anchor && <aside className="vi-myke-quick-companion" style={{left: narrow ? quickLeft + 8 : quickLeft - 82, top: narrow ? quickTop + renderedQuickHeight + 8 : quickTop + renderedQuickHeight - 100}} aria-label="Myke acompaña la conversación">{companion}</aside>}
        </div>
      </OverlayPortal>
      {preview && (
        <SourcePreviewModal
          contextClass="vi-myke-evidence"
          selection={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
