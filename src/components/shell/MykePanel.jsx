import { useEffect, useMemo, useRef, useState } from "react";
import OverlayPortal from "./OverlayPortal.jsx";
import { RubberDrawer } from "../visual/ScrollEffects.jsx";
import MykeGhost from "../visual/MykeGhost.jsx";
import SourcePreviewModal from "./SourcePreviewModal.jsx";
import { buildMykeKnowledge } from "../../domain/mykeOrganization.js";
import { answerMyke, buildMykePartAnswer } from "../../domain/mykeKnowledge.js";
import {
  getTracerSourceInventory,
  getRecommendedPartCases,
} from "../../domain/partLearningTrace.js";
import { safeReadJson, safeWriteJson } from "../../services/browserStorage.js";
import {
  getMykeAIConfig,
  requestMykeAI,
  summarizeMykePiece,
} from "../../services/mykeAI.js";
import publicKnowledge from "../../../supabase/functions/myke-chat/knowledge.generated.json";

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
  sources = {},
  scanRows = [],
  scanReady = false,
  snapshotMeta = null,
  reconciliation = [],
  engineSources = {},
  findings = [],
}) {
  const [tab, setTab] = useState(initialTab);
  const [draft, setDraft] = useState("");
  const [faqQuery, setFaqQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [gaze, setGaze] = useState(0);
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
      : { width: 880, height: 760 };
  });
  const [accessCode, setAccessCode] = useState("");
  const [aiEnabled, setAIEnabled] = useState(false);
  const [aiState, setAIState] = useState("local");
  const composer = useRef(null),
    conversation = useRef(null),
    end = useRef(null);
  const request = useRef(null),
    resize = useRef(null);
  const messageSequence = useRef(0);
  const organization = useMemo(() => buildMykeKnowledge(publicKnowledge), []);
  const aiConfig = useMemo(() => getMykeAIConfig(), []);
  const inputs = useMemo(
    () => getTracerSourceInventory(sources, scanReady, snapshotMeta),
    [sources, scanReady, snapshotMeta],
  );
  useEffect(() => {
    if (open) {
      setTab(initialTab === "explore" ? "explore" : "chat");
      setTyping(false);
    } else {
      setPreview(null);
      request.current?.abort();
      request.current = null;
      setMessages((current) =>
        current.map((m) =>
          m.pending
            ? {
                ...m,
                pending: false,
                aiError: "Consulta detenida al cerrar el chat.",
              }
            : m,
        ),
      );
      setAIState((current) => (current === "pending" ? "local" : current));
    }
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [open, initialTab]);
  useEffect(() => {
    if (open && tab === "chat" && messages.length && conversation.current) {
      const latest = end.current?.previousElementSibling;
      // Only move the conversation, never the page or enclosing drawer.
      if (latest) conversation.current.scrollTop = latest.offsetTop;
    }
  }, [messages, open, tab]);
  const pieceContext = useMemo(
    () => ({
      reconciliation,
      engineSources,
      findings,
      sources,
      scanRows,
      scanReady,
      snapshotMeta,
    }),
    [
      reconciliation,
      engineSources,
      findings,
      sources,
      scanRows,
      scanReady,
      snapshotMeta,
    ],
  );
  const partNumbers = useMemo(
    () => reconciliation.map((item) => item.partNumber),
    [reconciliation],
  );
  const cases = useMemo(
    () => (open ? getRecommendedPartCases(reconciliation).slice(0, 3) : []),
    [open, reconciliation],
  );
  if (!open) return null;
  const send = async (question = draft) => {
    if (!question.trim() || request.current) return;
    const text = question.slice(0, 1000);
    const previous =
      messages.filter((m) => m.role === "myke").at(-1)?.answer?.topicIds || [];
    const answer = answerMyke(text, organization, previous, partNumbers);
    const id = `myke-${++messageSequence.current}`;
    const useAI = aiEnabled && Boolean(aiConfig);
    setMessages((current) => [
      ...current.slice(-22),
      { role: "you", text },
      { role: "myke", id, answer, pending: useAI },
    ]);
    setDraft("");
    setTyping(false);
    composer.current?.focus();
    if (!useAI) return;
    const controller = new AbortController();
    request.current = controller;
    setAIState("pending");
    const history = messages.map((m) => ({
      role: m.role === "you" ? "user" : "assistant",
      content:
        m.text ||
        m.aiText ||
        [
          ...(m.answer?.paragraphs || []),
          ...(m.answer?.topicIds || []).flatMap(
            (topicId) =>
              organization.topics.find((t) => t.id === topicId)?.paragraphs ||
              [],
          ),
        ].join("\n"),
    }));
    try {
      const consultedPN =
        answer.kind === "piece"
          ? answer.pn
          : messages.filter((m) => m.answer?.kind === "piece").at(-1)?.answer
              .pn;
      const aiText = await requestMykeAI({
        question: text,
        history,
        piece: consultedPN
          ? summarizeMykePiece(buildMykePartAnswer(consultedPN, pieceContext))
          : null,
        sourceSummary: inputs,
        accessCode,
        signal: controller.signal,
        config: aiConfig,
      });
      if (controller.signal.aborted) return;
      setMessages((current) =>
        current.map((m) =>
          m.id === id ? { ...m, pending: false, aiText } : m,
        ),
      );
      setAIState("ready");
    } catch (error) {
      if (controller.signal.aborted) return;
      setMessages((current) =>
        current.map((m) =>
          m.id === id
            ? {
                ...m,
                pending: false,
                aiError:
                  error.name === "TimeoutError"
                    ? "La IA tardó demasiado. Conservamos la guía local."
                    : error.message,
              }
            : m,
        ),
      );
      setAIState("error");
    } finally {
      if (request.current === controller) request.current = null;
    }
  };
  const boundedSize = (width, height) => ({
    width: Math.max(
      Math.min(560, window.innerWidth - 32),
      Math.min(width, window.innerWidth - 32),
    ),
    height: Math.max(
      Math.min(520, window.innerHeight - 92),
      Math.min(height, window.innerHeight - 92),
    ),
  });
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
      <span>Guía del reconciliador · respuesta documentada</span>
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
  return (
    <>
      <OverlayPortal onClose={onClose}>
        <div
          className="vi-myke-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <RubberDrawer
            className="vi-myke-panel"
            style={{
              "--vi-myke-width": `${size.width}px`,
              "--vi-myke-height": `${size.height}px`,
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Myke · ayuda del reconciliador"
          >
            <header className="vi-myke-head">
              <MykeGhost
                pose={
                  typing || aiState === "pending"
                    ? "typing"
                    : messages.length
                      ? "reading"
                      : "welcome"
                }
                gaze={gaze}
              />
              <div>
                <p className="vi-eyebrow">RECONCILIADOR VISTEON</p>
                <h2>
                  Myke<span>·</span>
                </h2>
                <p>
                  {aiState === "pending"
                    ? "Estoy revisando tu pregunta…"
                    : typing
                      ? "Te sigo… ¿qué quieres saber?"
                      : "¿Qué quieres revisar?"}
                </p>
              </div>
              <button
                type="button"
                className="vi-icon-close"
                aria-label="Cerrar Myke"
                onClick={onClose}
              >
                ×
              </button>
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
                      <details className="vi-myke-connection">
                        <summary>
                          {aiEnabled ? "Opciones de IA" : "Conectar IA"}
                        </summary>
                        <p>
                          La guía local funciona siempre. La IA necesita el
                          servicio habilitado y el código privado del
                          administrador.
                        </p>
                        <p>
                          Se enviarán tu pregunta, conversación breve, estado de
                          fuentes y resumen del PN consultado; no archivos
                          completos. No escribas claves OpenAI aquí.
                        </p>
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            setAIEnabled(true);
                            setAIState("unconfirmed");
                            event.currentTarget.closest("details").open = false;
                          }}
                        >
                          <label>
                            Código privado
                            <input
                              type="password"
                              autoComplete="off"
                              value={accessCode}
                              maxLength={256}
                              disabled={aiState === "pending"}
                              onChange={(event) => {
                                setAccessCode(event.target.value);
                                setAIEnabled(false);
                                setAIState("local");
                              }}
                            />
                          </label>
                          <button
                            type="submit"
                            disabled={
                              !aiConfig ||
                              accessCode.length < 24 ||
                              aiState === "pending"
                            }
                          >
                            Usar IA
                          </button>
                          {aiEnabled && (
                            <button
                              type="button"
                              disabled={aiState === "pending"}
                              onClick={(event) => {
                                event.currentTarget.closest("details").open =
                                  false;
                                setAIEnabled(false);
                                setAccessCode("");
                                setAIState("local");
                              }}
                            >
                              Volver a guía local
                            </button>
                          )}
                        </form>
                        {!aiConfig && (
                          <p>La ruta del servicio aún no está configurada.</p>
                        )}
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
                      {!messages.length && (
                        <div className="vi-myke-message">
                          <strong>¡Hola! Soy Myke 👋</strong>
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
                                    Orientación con IA · corte al enviar;
                                    confirma propuestas en las fuentes
                                  </small>
                                  <p>{message.aiText}</p>
                                  {message.answer.kind === "answer" && (
                                    <details className="vi-myke-answer-sources">
                                      <summary>
                                        Guía relacionada y fuentes disponibles
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
                              {message.pending && (
                                <p className="vi-myke-working" role="status">
                                  Myke está revisando…{" "}
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
                      <div ref={end} />
                    </div>
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
                        onFocus={() => setTyping(true)}
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
                        Enviar ↗
                      </button>
                    </form>
                    <p className="vi-myke-note" role="status">
                      {aiState === "pending"
                        ? "Consultando IA…"
                        : aiState === "ready"
                          ? "IA conectada"
                          : aiEnabled
                            ? "IA por confirmar · guía local disponible"
                            : "Guía local · IA sin conectar"}{" "}
                      · No modifica inventario. No compartas contraseñas.
                    </p>
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
                setSize(
                  boundedSize(
                    start.width + 2 * (event.clientX - start.x),
                    start.height + 2 * (event.clientY - start.y),
                  ),
                );
              }}
              onPointerUp={() => {
                resize.current = null;
                safeWriteJson("visteon.ui.mykeSize.v1", size);
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
                setSize(next);
                safeWriteJson("visteon.ui.mykeSize.v1", next);
              }}
            >
              <span aria-hidden="true">↘</span>
            </button>
          </RubberDrawer>
        </div>
      </OverlayPortal>
      {preview && (
        <SourcePreviewModal
          selection={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
