import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { RubberDrawer } from "../visual/ScrollEffects.jsx";
import OverlayPortal from "./OverlayPortal.jsx";
import SourcePreviewModal from "./SourcePreviewModal.jsx";
import { buildEngineGuide } from "../../domain/engineGuide.js";
import { getTracerSourceInventory } from "../../domain/partLearningTrace.js";

const number = (value) =>
  Number(value ?? 0).toLocaleString("es-MX", { maximumFractionDigits: 8 });
const money = (value) =>
  value == null
    ? "Sin valorar"
    : Number(value).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      });

export default function EngineGuideDrawer({
  open,
  onClose,
  onOpenTracer,
  sources = {},
  scanRows = [],
  scanReady = false,
  snapshotMeta = null,
  reduceAnimations = false,
}) {
  const [stageIndex, setStageIndex] = useState(0);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [preview, setPreview] = useState(null);
  const prefersReducedMotion = useReducedMotion();
  const guide = useMemo(() => (open ? buildEngineGuide() : null), [open]);
  const inputs = useMemo(
    () => getTracerSourceInventory(sources, scanReady, snapshotMeta),
    [sources, scanReady, snapshotMeta],
  );
  if (!open) return null;
  const stage = guide.stages[stageIndex],
    example = guide.examples[exampleIndex];
  const showSource = (input) =>
    setPreview({
      config: { type: input.type, label: input.label },
      source:
        input.type === "scans" && !sources.scans?.loaded
          ? {
              rows: scanRows,
              fileName:
                snapshotMeta?.fileName || "Copia 4Wall publicada por el bot",
            }
          : sources[input.type],
    });
  return (
    <OverlayPortal onClose={onClose}>
      <div
        className="vi-global-overlay vi-logic-overlay"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose?.();
        }}
      >
        <RubberDrawer
          className="vi-engine-guide vi-drawer-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Cómo funciona el motor"
        >
          <header className="vi-logic-head">
            <div>
              <p className="vi-eyebrow">LAB · CÓMO FUNCIONA EL MOTOR</p>
              <h2>De tus archivos a la diferencia</h2>
              <p>
                Qué entra, qué hace cada etapa y por qué el resultado cambia.
              </p>
            </div>
            <button
              type="button"
              className="vi-icon-close"
              onClick={onClose}
              aria-label="Cerrar guía del motor"
            >
              ×
            </button>
          </header>
          <div className="vi-logic-flow">
            <p className="vi-engine-intro">
              El motor compara lo contado en 4Wall con el inventario congelado
              de QAD. Primero confirma ubicación y Phantom, reconoce el físico y
              después usa Cost Part para expresar las diferencias en dólares.
            </p>
            <nav className="vi-engine-pipeline" aria-label="Etapas del motor">
              {guide.stages.map((entry, index) => (
                <button
                  type="button"
                  key={entry.id}
                  aria-pressed={index === stageIndex}
                  onClick={() => setStageIndex(index)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{entry.title}</strong>
                </button>
              ))}
            </nav>
            <motion.section
              className="vi-engine-stage"
              key={stage.id}
              aria-label={`Etapa ${stageIndex + 1}`}
              initial={
                prefersReducedMotion || reduceAnimations
                  ? false
                  : { opacity: 0, y: 5 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.14 }}
            >
              <p className="vi-eyebrow">
                ETAPA {stageIndex + 1} DE {guide.stages.length}
              </p>
              <h3>{stage.title}</h3>
              <dl className="vi-study-facts">
                <div>
                  <dt>Recibe</dt>
                  <dd>{stage.input}</dd>
                </div>
                <div>
                  <dt>Produce</dt>
                  <dd>{stage.result}</dd>
                </div>
                <div>
                  <dt>Por qué importa</dt>
                  <dd>{stage.why}</dd>
                </div>
              </dl>
              <ul>
                {stage.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <details>
                <summary>Nombre de esta etapa en el código</summary>
                <p>{stage.technical}</p>
                <ul>
                  {stage.modules.map((module) => (
                    <li key={module}>
                      <code>{module}</code>
                    </li>
                  ))}
                </ul>
              </details>
              <div className="vi-engine-stage-actions">
                <button
                  type="button"
                  disabled={stageIndex === 0}
                  onClick={() => setStageIndex((i) => i - 1)}
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  disabled={stageIndex === guide.stages.length - 1}
                  onClick={() => setStageIndex((i) => i + 1)}
                >
                  Siguiente →
                </button>
              </div>
            </motion.section>
            <section
              className="vi-engine-files"
              aria-label="Qué aporta cada fuente"
            >
              <h3>Qué aporta cada fuente</h3>
              <p>
                Estos son los archivos o lecturas activos en tu app. Puedes
                abrirlos con el visor.
              </p>
              {guide.sources.map((definition) => {
                const input = inputs.find((r) => r.type === definition.type);
                return (
                  <div className="vi-engine-file" key={definition.type}>
                    <div>
                      <strong>{input.label}</strong>
                      <p>{definition.purpose}</p>
                      <small>
                        {input.loaded ? input.identity : "Sin fuente cargada"}
                      </small>
                    </div>
                    <button
                      type="button"
                      disabled={!input.loaded}
                      onClick={() => showSource(input)}
                    >
                      Ver fuente ↗
                    </button>
                  </div>
                );
              })}
            </section>
            <section
              className="vi-engine-examples"
              aria-label="Ejemplos del motor"
            >
              <h3>NET y SWING, con ejemplos</h3>
              <p className="vi-study-partial">
                Ejemplos didácticos, separados de tu inventario. Los resultados
                los calcula el mismo motor de la app.
              </p>
              <div
                className="vi-engine-example-tabs"
                role="group"
                aria-label="Elegir ejemplo"
              >
                {guide.examples.map((entry, index) => (
                  <button
                    type="button"
                    key={entry.id}
                    aria-pressed={index === exampleIndex}
                    onClick={() => setExampleIndex(index)}
                  >
                    {entry.title}
                  </button>
                ))}
              </div>
              <h4>{example.title}</h4>
              <p>{example.description}</p>
              <dl className="vi-study-summary">
                {[
                  ["Físico", example.physical],
                  ["QAD", example.qad],
                  ["NET USD", example.net],
                  ["SWING USD", example.swing],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              {example.contributions.map((row, index) => (
                <p className="vi-logic-rule" key={index}>
                  BOM: {number(row.scannedParentQty)} padres × Usage{" "}
                  {number(row.usage)} = {number(row.contribution)} componentes
                  en {row.location}.
                </p>
              ))}
              {[
                example.formulas.physical,
                example.formulas.netPieces,
                example.formulas.netUsd,
                example.formulas.swing,
              ].map((formula) => (
                <div className="vi-logic-formula" key={formula.general}>
                  <span>{formula.general}</span>
                  <strong>{formula.substitution}</strong>
                </div>
              ))}
              <div
                className="vi-engine-location-grid"
                role="table"
                aria-label="Desglose del ejemplo por localidad"
              >
                <div role="row">
                  <b role="columnheader">Localidad</b>
                  <b role="columnheader">Físico</b>
                  <b role="columnheader">QAD</b>
                  <b role="columnheader">Diferencia sin signo</b>
                  <b role="columnheader">SWING USD</b>
                </div>
                {example.locations.map((row) => (
                  <div role="row" key={row.location}>
                    <span role="cell">{row.location}</span>
                    <span role="cell">{number(row.physicalQty)}</span>
                    <span role="cell">{number(row.qadQty)}</span>
                    <span role="cell">{number(row.swingPieces)}</span>
                    <span role="cell">{money(row.swingUsd)}</span>
                  </div>
                ))}
              </div>
              <p className="vi-logic-rule">
                SWING suma la diferencia de cada localidad. Un sobrante en una y
                un faltante en otra participan por separado; dividir entre dos
                cambiaría la métrica. No es una cantidad de traslado confirmado
                y no se suma al NET como otra pérdida.
              </p>
            </section>
            <section className="vi-engine-finish">
              <h3>Del resultado a la revisión</h3>
              <p>
                Si faltan fuentes, Phantom no está definido o el costo no es
                confiable, el resultado necesita revisión. El motor conserva la
                evidencia; no inventa componentes, no borra QAD y no ejecuta
                ajustes.
              </p>
              <p>
                Para un PN real, abre el trazador: verás sus fuentes, fórmulas,
                advertencias y plan de revisión.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  onOpenTracer?.();
                }}
              >
                Abrir trazador de pieza →
              </button>
            </section>
          </div>
        </RubberDrawer>
      </div>
      {preview && (
        <SourcePreviewModal
          selection={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </OverlayPortal>
  );
}
