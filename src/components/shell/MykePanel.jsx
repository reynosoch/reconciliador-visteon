import { useEffect, useMemo, useRef, useState } from "react";
import OverlayPortal from "./OverlayPortal.jsx";
import { RubberDrawer } from "../visual/ScrollEffects.jsx";
import MykeGhost from "../visual/MykeGhost.jsx";
import SourcePreviewModal from "./SourcePreviewModal.jsx";
import { buildMykeOrganization } from "../../domain/mykeOrganization.js";
import { answerMyke, buildMykePartAnswer } from "../../domain/mykeKnowledge.js";
import {
  getTracerSourceInventory,
  getRecommendedPartCases,
} from "../../domain/partLearningTrace.js";
import rolesMarkdown from "../../../.agents/ROLES.md?raw";
import readmeMarkdown from "../../../README.md?raw";

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
                  <span aria-hidden="true">＋</span>
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
  compact = false,
  edge = "left",
  onExpand,
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
  const send = (question = draft) => {
    if (!question.trim()) return;
    const previous =
      messages.filter((message) => message.role === "myke").at(-1)?.answer
        ?.topicIds || [];
    const answer = answerMyke(
      question.slice(0, 1000),
      organization,
      previous,
      partNumbers,
    );
    setMessages((current) => [
      ...current.slice(-22),
      { role: "you", text: question.slice(0, 1000) },
      { role: "myke", answer },
    ]);
    setDraft("");
    setTyping(false);
    composer.current?.focus();
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
                  ["explore", "Explorar"],
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
                  <div className="vi-myke-suggestions">
                    {["capabilities", "parts", "swing", "snapshot"]
                      .slice(0, compact ? 2 : 4)
                      .map((id) =>
                        organization.topics.find((topic) => topic.id === id),
                      )
                      .filter(Boolean)
                      .map((topic) => (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => send(topic.title)}
                        >
                          {topic.title}
                        </button>
                      ))}
                  </div>
                  {!compact && (
                    <details className="vi-myke-question-library">
                      <summary>Más preguntas que puedes hacer</summary>
                      <label className="vi-myke-faq-search">
                        Buscar una pregunta
                        <input
                          type="search"
                          value={faqQuery}
                          onChange={(event) => setFaqQuery(event.target.value)}
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
                            {message.answer.topicIds.includes("capabilities") &&
                              cases.length > 0 && (
                                <div className="vi-myke-suggestions">
                                  {cases.map(({ item, reason }) => (
                                    <button
                                      type="button"
                                      key={item.partNumber}
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
                        Más preguntas, Explorar y Equipo →
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
                          <MykeGhost
                            cap={false}
                            color={employee.color}
                            pose="reading"
                          />
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
              {tab === "explore" && (
                <>
                  <div className="vi-myke-message">
                    <strong>Vamos a ver cómo encaja todo</strong>
                    <p>
                      Abre el motor, sigue una pieza o mira sus archivos. Para
                      preguntar, vuelve a Chat: ahí están todas las preguntas y
                      sus explicaciones.
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
                        "Elige un PN, revisa su resultado y encuentra las filas que participaron.",
                        onOpenTracer,
                      ],
                      [
                        "03",
                        "Archivos del inventario",
                        "Mira qué fuentes están cargadas, abre la tabla como Excel o agrega las que faltan.",
                        onOpenSources,
                      ],
                      [
                        "04",
                        "Qué necesita revisión",
                        "Ve las advertencias actuales y lo que conviene confirmar antes de actuar.",
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
