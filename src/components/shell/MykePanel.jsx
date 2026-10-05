import { useMemo, useState } from "react";
import OverlayPortal from "./OverlayPortal.jsx";
import { RubberDrawer } from "../visual/ScrollEffects.jsx";
import MykeGhost from "../visual/MykeGhost.jsx";
import { buildMykeOrganization } from "../../domain/mykeOrganization.js";
import rolesMarkdown from "../../../.agents/ROLES.md?raw";
import readmeMarkdown from "../../../README.md?raw";

const REPO = "https://github.com/reynosoch/reconciliador-visteon";
export default function MykePanel({
  open,
  onClose,
  onOpenEngineGuide,
  onOpenTracer,
}) {
  const [tab, setTab] = useState("chat");
  const [topicId, setTopicId] = useState("");
  const organization = useMemo(
    () => buildMykeOrganization(rolesMarkdown, readmeMarkdown),
    [],
  );
  if (!open) return null;
  const topic = organization.topics.find((entry) => entry.id === topicId);
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
          aria-label="Myke · organización virtual"
        >
          <header className="vi-myke-head">
            <MykeGhost />
            <div>
              <p className="vi-eyebrow">TU ORGANIZADOR</p>
              <h2>
                Myke<span>·</span>
              </h2>
              <p>Una petición. El equipo indicado.</p>
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
              ["help", "Cómo funciona"],
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
                <div className="vi-myke-message">
                  <strong>Hola, soy Myke.</strong>
                  <p>
                    Organizo las mejoras y busco al especialista adecuado.
                    Puedes darme tus instrucciones en Work o Chat; mi
                    organización está definida en .agents.
                  </p>
                </div>
                <div
                  className="vi-myke-demo"
                  aria-label="Demostración visual del reparto de tareas"
                >
                  <span className="vi-myke-demo-label">
                    ASÍ ORGANIZO · DEMOSTRACIÓN
                  </span>
                  <div className="vi-myke-flow">
                    <span>Tu petición</span>
                    <i aria-hidden="true">→</i>
                    <span>Myke</span>
                    <i aria-hidden="true">→</i>
                    <span>Especialistas</span>
                  </div>
                  <p>
                    Defino el alcance, reparto el trabajo y reviso el resultado.
                  </p>
                </div>
                <div className="vi-myke-chat-state">
                  <i aria-hidden="true" />
                  <span>Vista previa · IA aún sin conectar</span>
                </div>
                <label className="vi-myke-composer">
                  <span>Chat con Myke</span>
                  <textarea
                    disabled
                    rows="2"
                    placeholder="Aquí podrás preguntar sobre el reconciliador…"
                  />
                  <button type="button" disabled>
                    Enviar ↗
                  </button>
                </label>
                <p className="vi-myke-note">
                  Esta animación no envía mensajes ni ejecuta tareas. Mientras
                  tanto, puedes consultar la documentación en Cómo funciona.
                </p>
              </>
            )}
            {tab === "team" && (
              <>
                <p className="vi-myke-intro">
                  Mi equipo combina especialistas. Activo los puestos necesarios
                  según el trabajo.
                </p>
                <div className="vi-myke-manager">
                  <strong>{organization.manager?.title || "Myke"}</strong>
                  <span>
                    {organization.manager?.summary ||
                      "Organizador de la ingeniería"}
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
                  Puedo crear, fusionar o retirar puestos en el modelo de
                  trabajo, manteniendo un responsable para cada decisión y las
                  revisiones necesarias. Aquí se muestra la organización
                  documentada; no son procesos activos.
                </p>
                <a
                  className="vi-myke-doc-link"
                  href={`${REPO}/tree/main/.agents`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver organización en .agents ↗
                </a>
              </>
            )}
            {tab === "help" && (
              <>
                <p className="vi-myke-intro">
                  Respuestas tomadas del README del proyecto. Elige un tema para
                  consultar su fuente.
                </p>
                <div className="vi-myke-topics">
                  {organization.topics.map((entry) => (
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
                  <section
                    className="vi-myke-doc-excerpt"
                    aria-label={`Documentación: ${topic.title}`}
                  >
                    <span>FUENTE · README / {topic.heading}</span>
                    {topic.available ? (
                      topic.paragraphs.map((text, index) => (
                        <p key={index}>{text}</p>
                      ))
                    ) : (
                      <p>
                        Esta sección no está disponible en la documentación
                        actual.
                      </p>
                    )}
                    <a
                      href={`${REPO}/blob/main/README.md`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir documentación completa ↗
                    </a>
                  </section>
                )}
                <div className="vi-myke-shortcuts">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenEngineGuide();
                    }}
                  >
                    Abrir guía del motor →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTracer();
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
