import { useEffect, useMemo, useRef, useState } from "react";
import OverlayPortal from "./OverlayPortal.jsx";
import { RubberDrawer } from "../visual/ScrollEffects.jsx";
import MykeGhost from "../visual/MykeGhost.jsx";
import SourcePreviewModal from "./SourcePreviewModal.jsx";
import { buildMykeOrganization } from "../../domain/mykeOrganization.js";
import { answerMyke } from "../../domain/mykeKnowledge.js";
import { getTracerSourceInventory } from "../../domain/partLearningTrace.js";
import rolesMarkdown from "../../../.agents/ROLES.md?raw";
import readmeMarkdown from "../../../README.md?raw";

const badges = {
  DOM: "ƒ",
  ING: "▤",
  DATA: "▦",
  BOT: "⚙",
  UX: "✦",
  QA: "✓",
  SEC: "◇",
};
export default function MykePanel({
  open,
  onClose,
  onOpenEngineGuide,
  onOpenTracer,
  onOpenSources,
  onOpenDataAlerts,
  initialTab = "chat",
  compact = false,
  edge = "left",
  onExpand,
  sources = {},
  scanRows = [],
  scanReady = false,
  snapshotMeta = null,
}) {
  const [tab, setTab] = useState(initialTab);
  const [topicId, setTopicId] = useState("engine");
  const [draft, setDraft] = useState("");
  const [faqQuery, setFaqQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [gaze, setGaze] = useState(0);
  const [preview, setPreview] = useState(null);
  const composer = useRef(null);
  const end = useRef(null);
  const organization = useMemo(
    () => buildMykeOrganization(rolesMarkdown, readmeMarkdown),
    [],
  );
  const inputs = useMemo(
    () => getTracerSourceInventory(sources, scanReady, snapshotMeta),
    [sources, scanReady, snapshotMeta],
  );
  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setTyping(false);
    } else setPreview(null);
  }, [open, initialTab]);
  useEffect(() => {
    if (open && tab === "chat" && messages.length)
      end.current?.previousElementSibling?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
  }, [messages, open, tab]);
  if (!open) return null;
  const topic = organization.topics.find((entry) => entry.id === topicId);
  const send = (question = draft) => {
    if (!question.trim()) return;
    const previous =
      messages.filter((message) => message.role === "myke").at(-1)?.answer
        ?.topicIds || [];
    const answer = answerMyke(question.slice(0, 1000), organization, previous);
    setMessages((current) => [
      ...current.slice(-22),
      { role: "you", text: question.slice(0, 1000) },
      { role: "myke", answer },
    ]);
    setDraft("");
    setTyping(false);
    composer.current?.focus();
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
      {foldSources ? (
        <details className="vi-myke-answer-sources">
          <summary>Ver fuentes de esta explicación</summary>
          {sourceButtons(entry)}
        </details>
      ) : (
        sourceButtons(entry)
      )}
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
  const shortcut = (label, callback) => (
    <button
      type="button"
      onClick={() => {
        onClose();
        callback();
      }}
    >
      {label} →
    </button>
  );
  return (
    <>
      <OverlayPortal onClose={onClose}>
        <div
          className={
            compact ? "vi-myke-overlay vi-myke-quick" : "vi-myke-overlay"
          }
          data-edge={edge}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <RubberDrawer
            className={
              compact ? "vi-myke-panel vi-myke-quick-panel" : "vi-myke-panel"
            }
            role="dialog"
            aria-modal="true"
            aria-label="Myke · ayuda del reconciliador"
          >
            <header className="vi-myke-head">
              <MykeGhost
                pose={
                  typing ? "typing" : messages.length ? "reading" : "welcome"
                }
                gaze={gaze}
              />
              <div>
                <p className="vi-eyebrow">TU COMPAÑERO DEL RECONCILIADOR</p>
                <h2>
                  Myke<span>·</span>
                </h2>
                <p>
                  {typing
                    ? "Te sigo… ¿qué quieres saber?"
                    : "Entiende cada dato, paso a paso."}
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
            {!compact && (
              <nav className="vi-myke-tabs" aria-label="Vistas de Myke">
                {[
                  ["chat", "Chat"],
                  ["help", "Preguntas frecuentes"],
                  ["team", "Equipo"],
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
            )}
            <div className="vi-myke-body">
              {tab === "chat" && (
                <>
                  {(!compact || !messages.length) && (
                    <div className="vi-myke-message">
                      <strong>¡Hola! Soy Myke 👋</strong>
                      <p>
                        {compact
                          ? "Te cuento cómo funciona el reconciliador y su código. ¿Qué quieres saber?"
                          : "Puedo explicarte cómo funciona el reconciliador y su código, de dónde viene cada dato y qué revisar cuando algo no cuadra. Pregúntame aquí."}
                      </p>
                    </div>
                  )}
                  {(!compact || !messages.length) && (
                    <div className="vi-myke-suggestions">
                      {[
                        "¿De dónde salen los PN?",
                        "¿Por qué SWING no se divide entre dos?",
                        "¿Cómo funciona Phantom?",
                      ]
                        .slice(0, compact ? 2 : 3)
                        .map((question) => (
                          <button
                            key={question}
                            type="button"
                            onClick={() => send(question)}
                          >
                            {question}
                          </button>
                        ))}
                    </div>
                  )}
                  <div
                    className="vi-myke-conversation"
                    role="log"
                    aria-label="Conversación con Myke"
                    aria-live="polite"
                    aria-relevant="additions"
                  >
                    {messages.map((message, index) => (
                      <article
                        key={index}
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
                            {message.answer.kind === "piece" && (
                              <div className="vi-myke-shortcuts">
                                {shortcut(
                                  `Revisar ${message.answer.pn} en el trazador`,
                                  () => onOpenTracer(message.answer.pn),
                                )}
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
                      placeholder="¿De dónde sale el físico?"
                      onFocus={() => setTyping(true)}
                      onBlur={() => setTyping(false)}
                      onSelect={(event) =>
                        setGaze(
                          Math.min(
                            1,
                            (event.currentTarget.selectionStart % 48) / 24 - 1,
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
                      disabled={!draft.trim()}
                      aria-label="Enviar pregunta a Myke"
                    >
                      Enviar ↗
                    </button>
                  </form>
                  {compact && (
                    <div className="vi-myke-shortcuts">
                      <button type="button" onClick={onExpand}>
                        Abrir menú de Myke · preguntas y equipo →
                      </button>
                    </div>
                  )}
                  <p className="vi-myke-note">
                    {compact
                      ? "Ayuda local · IA aún sin conectar. No escribas contraseñas."
                      : "Ayuda local basada en la documentación. No hay IA externa conectada ni ejecución de tareas. La conversación dura mientras esta página esté abierta; no escribas contraseñas."}
                  </p>
                </>
              )}
              {tab === "team" && (
                <>
                  <div className="vi-myke-manager">
                    <strong>Myke · Product Manager</strong>
                    <span>{organization.manager?.summary}</span>
                  </div>
                  <div className="vi-myke-message">
                    <strong>Mi equipo</strong>
                    <p>
                      Tengo {organization.employees.length} especialistas a mi
                      disposición. Estos son los puestos que cubren cada área
                      del proyecto; toca un puesto para ver qué hace.
                    </p>
                  </div>
                  <div className="vi-myke-team">
                    {organization.employees.map((employee) => (
                      <details key={employee.id}>
                        <summary>
                          <span
                            className="vi-myke-agent-icon"
                            aria-hidden="true"
                          >
                            {badges[employee.id] || "✦"}
                          </span>
                          <span>
                            <strong>{employee.title}</strong>
                          </span>
                          <b aria-hidden="true">+</b>
                        </summary>
                        <p>{employee.summary}</p>
                      </details>
                    ))}
                  </div>
                </>
              )}
              {tab === "help" && (
                <>
                  <div className="vi-myke-message">
                    <strong>Myke</strong>
                    <p>
                      Estas son algunas de las preguntas más frecuentes. Elige
                      una y te cuento cómo funciona; cuando haga falta, vemos
                      juntos el archivo original.
                    </p>
                  </div>
                  <label className="vi-myke-faq-search">
                    Buscar una pregunta
                    <input
                      value={faqQuery}
                      onChange={(event) => setFaqQuery(event.target.value)}
                      placeholder="NET, Phantom, fuentes…"
                      type="search"
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
                          aria-pressed={topicId === entry.id}
                          onClick={() => setTopicId(entry.id)}
                        >
                          {entry.title}
                          <span>›</span>
                        </button>
                      ))}
                  </div>
                  {topic && (
                    <>
                      <div className="vi-myke-user-message">
                        <strong>Tú</strong>
                        <p>{topic.title}</p>
                      </div>
                      <div className="vi-myke-answer">
                        <strong>Myke</strong>
                        {renderTopic(topic)}
                      </div>
                    </>
                  )}
                  <div className="vi-myke-shortcuts">
                    {shortcut(
                      "Ver el recorrido visual del motor",
                      onOpenEngineGuide,
                    )}
                    {shortcut("Seguir una pieza y sus filas", onOpenTracer)}
                    {shortcut("Abrir archivos de inventario", onOpenSources)}
                  </div>
                </>
              )}
            </div>
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
