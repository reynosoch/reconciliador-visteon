import { useEffect, useMemo, useRef, useState } from "react";
import OverlayPortal from "./OverlayPortal.jsx";
import { RubberDrawer } from "../visual/ScrollEffects.jsx";
import MykeGhost from "../visual/MykeGhost.jsx";
import { buildMykeOrganization } from "../../domain/mykeOrganization.js";
import { answerMykeQuestion, MYKE_FAQ } from "../../domain/mykeKnowledge.js";
import rolesMarkdown from "../../../.agents/ROLES.md?raw";
import readmeMarkdown from "../../../README.md?raw";

const QUICK_FAQ_IDS = ["net", "swing", "phantom", "sources"];
const WELCOME = {
  id: "welcome",
  role: "myke",
  text: "Hola, soy Myke. Pregúntame por el reconciliador: datos, reglas, fuentes, alertas o un Part Number. Si la respuesta está documentada, te digo de dónde sale y te llevo a la vista correcta.",
  source: "Ayuda local · Reconciliador Visteon",
};

function focusTracerPart(partNumber, attempt = 0) {
  if (!partNumber) return;
  const input = document.getElementById("vi-logic-pn");
  if (!input) {
    if (attempt < 14)
      window.setTimeout(() => focusTracerPart(partNumber, attempt + 1), 80);
    return;
  }
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, partNumber);
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  input.focus();
  window.setTimeout(() => {
    input.dispatchEvent(
      new window.KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        bubbles: true,
      }),
    );
  }, 90);
}

export default function MykePanel({
  open,
  onClose,
  onOpenEngineGuide,
  onOpenTracer,
  reduceAnimations = false,
}) {
  const [tab, setTab] = useState("chat");
  const [topicId, setTopicId] = useState(MYKE_FAQ[0].id);
  const [messages, setMessages] = useState([WELCOME]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const timerRef = useRef(null);
  const messageSerial = useRef(1);
  const chatEndRef = useRef(null);
  const organization = useMemo(
    () => buildMykeOrganization(rolesMarkdown, readmeMarkdown),
    [],
  );
  const quickQuestions = useMemo(
    () => MYKE_FAQ.filter((entry) => QUICK_FAQ_IDS.includes(entry.id)),
    [],
  );
  const topic = MYKE_FAQ.find((entry) => entry.id === topicId) || MYKE_FAQ[0];

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );
  useEffect(() => {
    if (!open || tab !== "chat") return;
    chatEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, open, tab, typing]);

  if (!open) return null;

  const openAction = (action) => {
    if (!action) return;
    if (action.type === "faq") {
      setTab("help");
      return;
    }
    if (action.type === "team") {
      setTab("team");
      return;
    }
    onClose();
    if (action.type === "engine") {
      onOpenEngineGuide?.();
      return;
    }
    if (action.type === "tracer") {
      onOpenTracer?.();
      if (action.partNumber)
        window.setTimeout(() => focusTracerPart(action.partNumber), 120);
      return;
    }
    if (action.type === "data") {
      window.setTimeout(() => {
        window.dispatchEvent(
          new window.CustomEvent("visteon:open-data-view", {
            detail: { view: action.view },
          }),
        );
      }, 80);
    }
  };

  const ask = (value) => {
    const question = String(value ?? "").trim();
    if (!question || typing) return;
    const response = answerMykeQuestion(question);
    const serial = messageSerial.current++;
    setMessages((current) => [
      ...current,
      { id: `user-${serial}`, role: "user", text: question },
    ]);
    setDraft("");
    setTyping(true);
    timerRef.current = window.setTimeout(
      () => {
        setMessages((current) => [
          ...current,
          {
            id: `myke-${serial}`,
            role: "myke",
            text: response.answer,
            source: response.source,
            action: response.action,
          },
        ]);
        setTyping(false);
      },
      reduceAnimations ? 0 : 420,
    );
  };

  return (
    <OverlayPortal onClose={onClose}>
      <div
        className="vi-myke-overlay"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <RubberDrawer
          className="vi-myke-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Myke · asistente del reconciliador"
        >
          <header className="vi-myke-head">
            <MykeGhost watching={composerFocused || typing} />
            <div>
              <p className="vi-eyebrow">MYKE · RECONCILIADOR VISTEON</p>
              <h2>
                Myke<span>·</span>
              </h2>
              <p>Pregunta, revisa la fuente y sigue el dato.</p>
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
              ["team", "Equipo"],
              ["help", "Preguntas frecuentes"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="vi-myke-body">
            {tab === "chat" && (
              <>
                <div className="vi-myke-chat-state">
                  <i aria-hidden="true" />
                  <span>
                    Ayuda local · {MYKE_FAQ.length} respuestas documentadas
                  </span>
                </div>
                <div className="vi-myke-demo">
                  <span className="vi-myke-demo-label">ASÍ TE AYUDO</span>
                  <div className="vi-myke-flow" aria-hidden="true">
                    <span>Pregunta</span>
                    <i>→</i>
                    <span>Myke</span>
                    <i>→</i>
                    <span>Fuente</span>
                  </div>
                  <p>
                    No invento cálculos: uso las reglas y ayudas documentadas del
                    proyecto.
                  </p>
                </div>
                <div className="vi-myke-conversation" aria-live="polite">
                  {messages.map((message) => (
                    <div
                      className={`vi-myke-message ${message.role === "user" ? "is-user" : "is-myke"}`}
                      key={message.id}
                    >
                      {message.role === "myke" && (
                        <div className="vi-myke-message-avatar" aria-hidden="true">
                          <MykeGhost />
                        </div>
                      )}
                      <div>
                        <strong>{message.role === "myke" ? "Myke" : "Tú"}</strong>
                        <p>{message.text}</p>
                        {message.source && <small>{message.source}</small>}
                        {message.action && (
                          <button
                            type="button"
                            className="vi-myke-doc-link"
                            onClick={() => openAction(message.action)}
                          >
                            {message.action.label} →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {typing && (
                    <div className="vi-myke-message is-myke vi-myke-typing">
                      <div className="vi-myke-message-avatar" aria-hidden="true">
                        <MykeGhost watching />
                      </div>
                      <div>
                        <strong>Myke</strong>
                        <span aria-label="Myke está escribiendo">
                          <i />
                          <i />
                          <i />
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="vi-myke-suggestions" aria-label="Preguntas rápidas">
                  {quickQuestions.map((entry) => (
                    <button
                      type="button"
                      key={entry.id}
                      disabled={typing}
                      onClick={() => ask(entry.question)}
                    >
                      {entry.question}
                    </button>
                  ))}
                </div>
                <label className="vi-myke-composer">
                  <span>Pregúntale a Myke</span>
                  <textarea
                    rows="2"
                    value={draft}
                    onFocus={() => setComposerFocused(true)}
                    onBlur={() => setComposerFocused(false)}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        ask(draft);
                      }
                    }}
                    placeholder="Ej. ¿qué es SWING? o PN 12345ABC"
                  />
                  <button
                    type="button"
                    disabled={!draft.trim() || typing}
                    onClick={() => ask(draft)}
                  >
                    Enviar ↗
                  </button>
                </label>
                <p className="vi-myke-note">
                  Este chat explica y navega el reconciliador. No cambia datos,
                  no ejecuta el bot y avisa cuando no encuentra respaldo
                  documentado.
                </p>
              </>
            )}
            {tab === "team" && (
              <>
                <p className="vi-myke-intro">
                  Este es el equipo del proyecto. Myke organiza la solicitud y
                  cada especialista conserva una responsabilidad clara.
                </p>
                <div className="vi-myke-manager">
                  <strong>{organization.manager?.title || "Myke"}</strong>
                  <span>
                    {organization.manager?.summary ||
                      "Organizo la solicitud y reviso la entrega."}
                  </span>
                </div>
                <div className="vi-myke-team">
                  {organization.employees.map((employee) => (
                    <article key={employee.id}>
                      <span>{employee.id}</span>
                      <div>
                        <h3>{employee.title}</h3>
                        <p>{employee.summary}</p>
                      </div>
                    </article>
                  ))}
                </div>
                <p className="vi-myke-note">
                  Los puestos describen responsabilidades del proyecto; la vista
                  no simula procesos activos ni permisos que no existan.
                </p>
                <button
                  type="button"
                  className="vi-myke-doc-link"
                  onClick={() => setTab("help")}
                >
                  Ver preguntas frecuentes →
                </button>
              </>
            )}
            {tab === "help" && (
              <>
                <p className="vi-myke-intro">
                  Preguntas frecuentes del reconciliador. Cada respuesta indica
                  su referencia y, cuando aplica, abre la evidencia dentro de la
                  app.
                </p>
                <div className="vi-myke-topics">
                  {MYKE_FAQ.map((entry) => (
                    <button
                      type="button"
                      key={entry.id}
                      aria-pressed={topicId === entry.id}
                      onClick={() => setTopicId(entry.id)}
                    >
                      {entry.question}
                      <span>›</span>
                    </button>
                  ))}
                </div>
                <section
                  className="vi-myke-doc-excerpt"
                  aria-label={`Respuesta: ${topic.question}`}
                >
                  <span>{topic.source}</span>
                  <p>{topic.answer}</p>
                  {topic.action && (
                    <button
                      type="button"
                      className="vi-myke-doc-link"
                      onClick={() => openAction(topic.action)}
                    >
                      {topic.action.label} →
                    </button>
                  )}
                </section>
                <div className="vi-myke-shortcuts">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenEngineGuide?.();
                    }}
                  >
                    Abrir guía del motor →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTracer?.();
                    }}
                  >
                    Abrir trazador de pieza →
                  </button>
                </div>
              </>
            )}
          </div>
        </RubberDrawer>
      </div>
    </OverlayPortal>
  );
}
