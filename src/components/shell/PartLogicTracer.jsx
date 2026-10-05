import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { RubberDrawer } from "../visual/ScrollEffects.jsx";
import OverlayPortal from "./OverlayPortal.jsx";
import SourcePreviewModal from "./SourcePreviewModal.jsx";
import {
  buildPartLearningTrace,
  getPartEntryOrigins,
  getTracerSourceInventory,
  getRecommendedPartCases,
  buildPartCatalogSource,
} from "../../domain/partLearningTrace.js";
import { buildEvidenceExcerpt } from "../../domain/sourceEvidence.js";
import SourceEvidenceSheet from "./SourceEvidenceSheet.jsx";

const clean = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase();
const number = (value) =>
  Number(value ?? 0).toLocaleString("es-MX", { maximumFractionDigits: 8 });
const money = (value) =>
  value == null
    ? "Sin valorar"
    : Number(value).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      });
function scrollInsideDrawer(viewport, target) {
  if (!viewport || !target) return;
  const inset =
    viewport.querySelector(".vi-logic-head")?.getBoundingClientRect().height ||
    0;
  viewport.scrollTo({
    top:
      viewport.scrollTop +
      target.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top -
      inset -
      12,
    behavior: "instant",
  });
  target.focus({ preventScroll: true });
}
function Formula({ formula }) {
  return (
    <div className="vi-logic-formula">
      <span>{formula.general}</span>
      <strong>{formula.substitution}</strong>
    </div>
  );
}
function PageRows({ rows, columns, label }) {
  const [limit, setLimit] = useState(12);
  return (
    <div className="vi-study-table">
      <div role="table" aria-label={label}>
        <div role="row" className="vi-study-table-head">
          {columns.map(([name]) => (
            <b role="columnheader" key={name}>
              {name}
            </b>
          ))}
        </div>
        {rows.slice(0, limit).map((row, index) => (
          <div role="row" key={index}>
            {columns.map(([name, render]) => (
              <span role="cell" key={name}>
                {render(row)}
              </span>
            ))}
          </div>
        ))}
      </div>
      {!rows.length && <p>No hay filas calculadas para este paso.</p>}
      {rows.length > limit && (
        <button type="button" onClick={() => setLimit((value) => value + 12)}>
          Ver 12 más · {rows.length - limit} pendientes
        </button>
      )}
    </div>
  );
}
function Evidence({ reference, onOpen, visual = false }) {
  const [cell, setCell] = useState(null);
  const excerpt = useMemo(
    () => (visual ? buildEvidenceExcerpt(reference) : null),
    [reference, visual],
  );
  const origins = [
    ...new Set(reference.evidence.map((row) => row.origin.fileName)),
  ];
  return (
    <div className="vi-study-evidence">
      <div className="vi-study-reference">
        <div>
          <span>FUENTE · {reference.label}</span>
          <strong>
            {origins.join(" · ") ||
              reference.source.fileName ||
              "Sin archivo original disponible"}
          </strong>
          <small>
            {reference.evidence
              .slice(0, 4)
              .map(
                (row) =>
                  `${row.origin.sheetName ? row.origin.sheetName + " · " : ""}${row.origin.rowNumber ? "Fila " + row.origin.rowNumber : "Registro " + (row.sourceIndex + 1) + " (sin fila original)"}`,
              )
              .join(" / ")}
            {reference.evidence.length > 4 ? " / …" : ""}
          </small>
          <small>
            {reference.evidence.length} filas identificadas ·{" "}
            {[
              ...new Set(
                reference.evidence.flatMap((row) =>
                  row.cells.map((c) => c.column),
                ),
              ),
            ].join(" / ") || "Sin columnas localizadas"}
          </small>
        </div>
        <button type="button" onClick={() => onOpen(reference)}>
          Ver en fuente ↗
        </button>
      </div>
      {excerpt?.entries.length > 0 && (
        <figure className="vi-study-sheet">
          <figcaption>
            Dato original · {excerpt.entries.length} de{" "}
            {reference.evidence.length} filas del paso. Toca una celda para
            entenderla.
          </figcaption>
          <SourceEvidenceSheet {...excerpt} compact onCell={setCell} />
          {cell && (
            <div className="vi-study-cell" role="status">
              <strong>
                {cell.column} · {cell.letter || "Sin coordenada"}
              </strong>
              <span>
                Original: {String(cell.original ?? "Vacío")} → Normalizado:{" "}
                {String(cell.normalized ?? "Vacío")}
              </span>
              <p>{cell.reason}</p>
            </div>
          )}
        </figure>
      )}
    </div>
  );
}
function StudyStep({ step, index, trace, item, onOpen }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="vi-logic-step" id={`study-${step.id}`} tabIndex={-1}>
      <div className="vi-logic-step-index">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="vi-logic-step-body">
        <div className="vi-logic-step-head">
          <div>
            <span>PASO {index + 1}</span>
            <h3>{step.title}</h3>
          </div>
          <b data-tone={step.tone}>
            {step.tone === "ok" ? "✓ Evidencia / regla" : "! Por revisar"}
          </b>
        </div>
        <dl className="vi-study-facts">
          <div>
            <dt>Busca</dt>
            <dd>{step.search}</dd>
          </div>
          <div>
            <dt>Encontró</dt>
            <dd>{step.found}</dd>
          </div>
          <div>
            <dt>Importa porque</dt>
            <dd>{step.why}</dd>
          </div>
        </dl>
        <p className="vi-study-result">
          <strong>Resultado</strong>
          {step.result}
        </p>
        {step.id === "recognized" && (
          <Formula formula={trace.formulas.physical} />
        )}
        {step.id === "net" && (
          <>
            <Formula formula={trace.formulas.netPieces} />
            <Formula formula={trace.formulas.netUsd} />
          </>
        )}
        {step.id === "swing" && (
          <>
            <Formula formula={trace.formulas.swing} />
            <p className="vi-logic-rule">{trace.swingExplanation}</p>
          </>
        )}
        {step.id === "bom" && (
          <p className="vi-logic-rule">
            ISPBB decide Phantom. BOM usa Usage, Level .2 / 0.2 y Comp Phantom =
            NO. Sin prefijos, sin Grossed up Usage, sin recursión.
          </p>
        )}
        {step.id === "final" && (
          <div className="vi-logic-flags">
            {trace.alertLabels.length ? (
              trace.alertLabels.map((label) => <span key={label}>{label}</span>)
            ) : (
              <span>Sin advertencias del motor</span>
            )}
          </div>
        )}
        <div className="vi-study-references">
          {step.refs.map((ref, refIndex) => (
            <Evidence
              key={ref.type}
              reference={ref}
              onOpen={onOpen}
              visual={
                refIndex === 0 &&
                [
                  "physical",
                  "mapping",
                  "phantom",
                  "bom",
                  "qad",
                  "cost",
                ].includes(step.id)
              }
            />
          ))}
        </div>
        <button
          className="vi-study-expand"
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "− Ocultar" : "+ Ver"} reglas y desglose
        </button>
        {expanded && (
          <div className="vi-study-advanced">
            {step.refs.map((ref) => (
              <div key={ref.type}>
                <p>
                  <strong>{ref.label}:</strong> {ref.rule}
                </p>
                <PageRows
                  rows={ref.evidence.flatMap((row) =>
                    row.cells.map((cell) => ({
                      ...cell,
                      origin: row.origin,
                      sourceIndex: row.sourceIndex,
                    })),
                  )}
                  label={`Origen de los datos · ${ref.label}`}
                  columns={[
                    [
                      "Fila · campo",
                      (r) =>
                        `${r.origin.sheetName || ref.label} · ${r.origin.rowNumber ? "Fila " + r.origin.rowNumber : "Registro " + (r.sourceIndex + 1)} · ${r.column}`,
                    ],
                    [
                      "Original → normalizado",
                      (r) =>
                        `${r.original ?? "Vacío"} → ${r.normalized ?? "Vacío"}`,
                    ],
                    ["Regla", (r) => r.reason],
                  ]}
                />
              </div>
            ))}
            {step.id === "mapping" && (
              <PageRows
                rows={item.trace.sourceRows}
                label="Mapeo directo del PN"
                columns={[
                  ["Área", (r) => r.areaName || "Sin área"],
                  ["Localidad", (r) => r.qadLocation],
                  ["Piezas", (r) => number(r.quantity)],
                ]}
              />
            )}
            {step.id === "bom" && (
              <PageRows
                rows={trace.contributions}
                label="Aportaciones reales BOM"
                columns={[
                  [
                    "Origen → destino",
                    (r) =>
                      `${r.direction}: ${r.parentPart} → ${r.componentPart} · ${r.location}`,
                  ],
                  [
                    "Cantidad × Usage",
                    (r) => `${number(r.scannedParentQty)} × ${number(r.usage)}`,
                  ],
                  ["Aportación", (r) => number(r.contribution)],
                ]}
              />
            )}
            {step.id === "qad" && (
              <PageRows
                rows={[...item.qad.locations].map(([location, quantity]) => ({
                  location,
                  quantity,
                }))}
                label="Saldo QAD por localidad"
                columns={[
                  ["Localidad", (r) => r.location],
                  ["QAD", (r) => number(r.quantity)],
                  [
                    "Origen",
                    () =>
                      trace.inputs.find((r) => r.type === "qad")?.identity ||
                      "Archivo QAD no disponible",
                  ],
                ]}
              />
            )}
            {step.id === "swing" && (
              <PageRows
                rows={item.trace.swingByLocation}
                label="SWING completo por localidad"
                columns={[
                  [
                    "Localidad · físico / QAD",
                    (r) =>
                      `${r.location} · ${number(r.physicalQty)} / ${number(r.qadQty)}`,
                  ],
                  ["ABS(Δ) piezas", (r) => number(r.swingPieces)],
                  ["USD", (r) => money(r.swingUsd)],
                ]}
              />
            )}
            {step.id === "final" &&
              trace.findings.map((finding) => (
                <p key={finding.id}>
                  <strong>{finding.ruleCode}:</strong> {finding.whatFound}{" "}
                  <br />
                  {finding.nextAction}
                </p>
              ))}
          </div>
        )}
        <p className="vi-study-next">
          <span aria-hidden="true">↓</span>
          <strong>Después</strong>
          {step.next}
        </p>
      </div>
    </section>
  );
}
export default function PartLogicTracer({
  open,
  onClose,
  reconciliation = [],
  sources = {},
  engineSources = {},
  scanRows = [],
  scanReady = false,
  snapshotMeta = null,
  findings = [],
  reduceAnimations = false,
}) {
  const [query, setQuery] = useState("");
  const [selectedPn, setSelectedPn] = useState("");
  const [preview, setPreview] = useState(null);
  const [activeMetric, setActiveMetric] = useState("");
  const [activeStep, setActiveStep] = useState("");
  const [moreCases, setMoreCases] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const viewportRef = useRef(null);
  const resultRef = useRef(null);
  const detailRef = useRef(null);
  const inputSources = useMemo(
    () => getTracerSourceInventory(sources, scanReady, snapshotMeta),
    [sources, scanReady, snapshotMeta],
  );
  const recommended = useMemo(
    () => (open ? getRecommendedPartCases(reconciliation) : []),
    [open, reconciliation],
  );
  useLayoutEffect(() => {
    if (!open) return;
    if (selectedPn) resultRef.current?.focus({ preventScroll: true });
    viewportRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [open, selectedPn]);
  useLayoutEffect(() => {
    if (activeMetric)
      scrollInsideDrawer(viewportRef.current, detailRef.current);
  }, [activeMetric]);
  const suggestions = useMemo(() => {
    const match = clean(query),
      rows = [];
    for (const item of reconciliation) {
      if (!match || clean(item.partNumber).includes(match)) rows.push(item);
      if (rows.length === 12) break;
    }
    return rows;
  }, [query, reconciliation]);
  const item = useMemo(
    () =>
      reconciliation.find(
        (row) => clean(row.partNumber) === clean(selectedPn),
      ) || null,
    [reconciliation, selectedPn],
  );
  const trace = useMemo(
    () =>
      open && item
        ? buildPartLearningTrace({
            item,
            engineSources,
            sources,
            scanRows,
            scanReady,
            findings,
            snapshotMeta,
          })
        : null,
    [
      open,
      item,
      engineSources,
      sources,
      scanRows,
      scanReady,
      findings,
      snapshotMeta,
    ],
  );
  const select = (pn) => {
    setSelectedPn(pn);
    setQuery(pn);
    setPreview(null);
    setActiveMetric("");
    setActiveStep("");
  };
  if (!open) return null;
  const showSource = (ref) =>
    setPreview({
      source: ref.source,
      config: { type: ref.type, label: ref.label },
      evidence: ref.evidence,
      rule: ref.rule,
      tracePn: item.partNumber,
      initialQuery: ref.evidence.length ? "" : item.partNumber,
    });
  const showCatalog = (rows = reconciliation) =>
    setPreview({
      source: buildPartCatalogSource(rows, engineSources, inputSources),
      config: { type: "catalog", label: "PN · lista y origen" },
      derived: true,
      rule: "Esta lista la construye el reconciliador usando 4Wall, QAD congelado y componentes generados por BOM. No es otro archivo cargado. Los nombres de fuente indican qué archivos o lectura aportaron cada PN.",
    });
  const goToStep = (id) => {
    const viewport = viewportRef.current;
    const target = viewport?.querySelector(`#study-${id}`);
    if (!target) return;
    scrollInsideDrawer(viewport, target);
    setActiveStep(id);
  };
  const detail = trace?.summaryDetails.find((r) => r.id === activeMetric);
  return (
    <OverlayPortal onClose={onClose}>
      <div
        className="vi-global-overlay vi-logic-overlay"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose?.();
        }}
      >
        <RubberDrawer
          viewportRef={viewportRef}
          className="vi-logic-tracer vi-drawer-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Trazador de pieza"
        >
          <header className="vi-logic-head">
            <div>
              <p className="vi-eyebrow">
                TRAZADOR DE PIEZA · ORIGEN DE CADA DATO
              </p>
              <h2>{item ? "Detalle del PN" : "Del escaneo al resultado"}</h2>
              {!item && (
                <p>
                  Sigue los datos, las reglas y la evidencia real de una pieza.
                </p>
              )}
            </div>
            <button
              type="button"
              className="vi-icon-close"
              onClick={onClose}
              aria-label="Cerrar trazador"
            >
              ×
            </button>
          </header>
          <div className="vi-logic-search">
            <label htmlFor="vi-logic-pn">SELECCIONA UN PART NUMBER</label>
            <div className="vi-logic-searchbox">
              <input
                id="vi-logic-pn"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (clean(event.target.value) !== clean(selectedPn))
                    setSelectedPn("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && suggestions[0])
                    select(
                      suggestions.find(
                        (row) => clean(row.partNumber) === clean(query),
                      )?.partNumber || suggestions[0].partNumber,
                    );
                }}
                placeholder="Buscar PN…"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Limpiar selección"
                  onClick={() => select("")}
                >
                  ×
                </button>
              )}
            </div>
            {!item && (
              <div className="vi-study-catalog">
                <strong>¿De dónde salen estos PN?</strong>
                <p>
                  Del corte actual: 4Wall escaneado + QAD aceptado + componentes
                  generados por BOM. Cost Part e ISPBB enriquecen estos PN; sus
                  catálogos solos no agregan piezas a esta lista.
                </p>
                <small>
                  {reconciliation.length.toLocaleString("es-MX")} PN de las
                  fuentes activas. Las sugerencias cubren casos distintos; al
                  buscar, la lista conserva el orden por diferencia NET
                  absoluta. Los importes son NET USD.
                </small>
                <details>
                  <summary>Ver los archivos y el snapshot activos</summary>
                  <dl>
                    {inputSources.map((source) => (
                      <div key={source.type}>
                        <dt>{source.label}</dt>
                        <dd>
                          {source.loaded
                            ? source.identity
                            : "Sin fuente cargada"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <small>
                    Son las fuentes activas del corte, incluidas las que la app
                    recupera al iniciar. Selecciona un PN para localizar
                    exactamente las filas aceptadas.
                  </small>
                </details>
                <p>
                  Snapshot es una copia de los escaneos de un momento concreto,
                  publicada por el bot. Si cargas un archivo 4Wall manual, se
                  usa ese archivo en su lugar.
                </p>
                <button
                  className="vi-study-expand"
                  type="button"
                  onClick={() => showCatalog()}
                >
                  Ver lista de PN y su origen en Excel ↗
                </button>
              </div>
            )}
            {!item && !clean(query) && recommended.length > 0 && (
              <section
                className="vi-study-cases"
                aria-label="Casos recomendados"
              >
                <h3>Casos recomendados</h3>
                <p>
                  PN reales de tus fuentes: diferencias grandes, Phantom, conteo
                  pendiente y casos balanceados cuando están disponibles.
                </p>
                <div className="vi-study-case-list">
                  {recommended
                    .slice(0, moreCases ? recommended.length : 6)
                    .map(({ id, reason, item: row }) => (
                      <div className="vi-study-case" key={id}>
                        <button
                          type="button"
                          onClick={() => select(row.partNumber)}
                        >
                          <strong>{row.partNumber}</strong>
                          <span>{reason}</span>
                          <small>
                            {row.master.description || "Sin descripción"}
                          </small>
                          <em>
                            {row.master.hasCost
                              ? money(row.financial.netUsd)
                              : "Sin valorar"}{" "}
                            NET
                          </em>
                        </button>
                        <button
                          type="button"
                          onClick={() => showCatalog([row])}
                          aria-label={`Ver origen de ${row.partNumber}`}
                        >
                          Ver origen ↗
                        </button>
                      </div>
                    ))}
                </div>
                {recommended.length > 6 && (
                  <button
                    className="vi-study-expand"
                    type="button"
                    onClick={() => setMoreCases((v) => !v)}
                  >
                    {moreCases
                      ? "Ver menos"
                      : `Ver ${recommended.length - 6} casos más`}
                  </button>
                )}
              </section>
            )}
            {!item && (clean(query) || !recommended.length) && (
              <div className="vi-logic-suggestions">
                {suggestions.map((row) => (
                  <button
                    type="button"
                    key={row.partNumber}
                    onClick={() => select(row.partNumber)}
                  >
                    <strong>{row.partNumber}</strong>
                    <span>{row.master.description || "Sin descripción"}</span>
                    <small>
                      {getPartEntryOrigins(row, engineSources)
                        .map(
                          (origin) =>
                            inputSources.find(
                              (source) => source.type === origin.type,
                            )?.label || origin.label,
                        )
                        .join(" + ") || "Origen no disponible"}
                    </small>
                    <em>
                      {row.master.hasCost
                        ? money(row.financial.netUsd)
                        : "Sin valorar"}
                    </em>
                  </button>
                ))}
                {!suggestions.length && (
                  <p>
                    {reconciliation.length
                      ? "No encontramos ese PN. Revisa el número y las fuentes del corte."
                      : "Carga 4Wall o QAD en Fuentes para abrir una pieza. Puedes empezar aun si faltan otras referencias."}
                  </p>
                )}
              </div>
            )}
          </div>
          {trace && (
            <div className="vi-logic-flow" key={trace.pn}>
              <div className="vi-logic-required">
                {trace.readiness.map(([key, label, loaded]) => (
                  <div key={key} className={loaded ? "is-ready" : ""}>
                    <span>{loaded ? "✓" : "!"}</span>
                    <strong>{label}</strong>
                    <em>{loaded ? "LISTO" : "FALTA"}</em>
                  </div>
                ))}
              </div>
              {!trace.complete && (
                <p className="vi-study-partial" role="status">
                  Caso parcial. Los ceros y la clasificación del motor son
                  provisionales cuando faltan fuentes. Sigue los pasos para
                  identificar qué falta.
                </p>
              )}
              <section
                className="vi-logic-result"
                ref={resultRef}
                tabIndex={-1}
                aria-label={`Resumen de PN ${trace.pn}`}
              >
                <div>
                  <span>PART NUMBER</span>
                  <h3>{trace.pn}</h3>
                  <p>{trace.description || "Descripción no disponible"}</p>
                </div>
                <div>
                  <span>
                    RESULTADO{!trace.complete ? " · PROVISIONAL" : ""}
                  </span>
                  <strong>{trace.status}</strong>
                  <p>
                    {trace.warnings.length} puntos por revisar · datos de las
                    fuentes activas
                  </p>
                </div>
              </section>
              <dl className="vi-study-summary">
                {trace.summaryDetails.map((metric) => (
                  <div key={metric.id}>
                    <dt>{metric.label}</dt>
                    <dd>{metric.value}</dd>
                    {metric.warning && (
                      <small className="vi-study-metric-warning">
                        ! {metric.warning}
                      </small>
                    )}
                    <button
                      type="button"
                      aria-expanded={activeMetric === metric.id}
                      onClick={() =>
                        setActiveMetric((id) =>
                          id === metric.id ? "" : metric.id,
                        )
                      }
                      aria-label={`Ver origen de ${metric.label}`}
                    >
                      {metric.calculation.length
                        ? "Ver cálculo y fuentes"
                        : "Ver fuente y regla"}
                    </button>
                  </div>
                ))}
              </dl>
              {detail && (
                <section
                  className="vi-study-detail"
                  aria-label={`Origen de ${detail.label}`}
                  ref={detailRef}
                  tabIndex={-1}
                >
                  <h3>
                    {detail.label} · {detail.value}
                  </h3>
                  <p>{detail.explanation}</p>
                  {detail.calculation.map((formula) => (
                    <Formula key={formula.general} formula={formula} />
                  ))}
                  {detail.id === "swing" && (
                    <>
                      <p>{trace.swingExplanation}</p>
                      <PageRows
                        rows={item.trace.swingByLocation}
                        label="Diferencias por localidad"
                        columns={[
                          [
                            "Localidad · físico / QAD",
                            (r) =>
                              `${r.location} · ${number(r.physicalQty)} / ${number(r.qadQty)}`,
                          ],
                          [
                            "Diferencia sin signo",
                            (r) => number(r.swingPieces),
                          ],
                          ["USD", (r) => money(r.swingUsd)],
                        ]}
                      />
                    </>
                  )}
                  {detail.refs.map((ref) => (
                    <Evidence
                      key={ref.type}
                      reference={ref}
                      onOpen={showSource}
                    />
                  ))}
                  <button
                    className="vi-study-expand"
                    type="button"
                    onClick={() => goToStep(detail.stepId)}
                  >
                    Ir al paso que lo explica ↓
                  </button>
                </section>
              )}
              <details className="vi-study-warnings">
                <summary>
                  Advertencias y puntos por revisar · {trace.warnings.length}
                </summary>
                {trace.warnings.length ? (
                  trace.warnings.map((warning) => (
                    <section key={warning.id}>
                      <h3>{warning.title}</h3>
                      <p>{warning.detail}</p>
                      <div className="vi-study-source-actions">
                        {warning.refs.map((ref) => (
                          <button
                            type="button"
                            key={ref.type}
                            onClick={() => showSource(ref)}
                          >
                            Ver {ref.label} ↗
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => goToStep(warning.stepId)}
                        >
                          Ver paso ↓
                        </button>
                      </div>
                    </section>
                  ))
                ) : (
                  <p>
                    Sin advertencias en esta lectura. Confirma también el cierre
                    del conteo.
                  </p>
                )}
              </details>
              <section
                className="vi-study-origin"
                aria-label="Origen del part number"
              >
                <h3>¿Por qué aparece {trace.pn} en esta lista?</h3>
                <details>
                  <summary>¿Qué significa snapshot o copia del bot?</summary>
                  <p>{trace.snapshotExplanation}</p>
                </details>
                <div
                  className="vi-study-origin-routes"
                  aria-label="Fuentes que incorporaron este PN"
                >
                  {trace.origin.routes.map((route, index) => (
                    <motion.div
                      className="vi-study-route"
                      key={`${trace.pn}:${route.type}`}
                      initial={
                        prefersReducedMotion || reduceAnimations
                          ? false
                          : { opacity: 0, x: 8 }
                      }
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.16, delay: index * 0.035 }}
                    >
                      <span
                        className="vi-study-route-marker"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      <div>
                        <strong>{route.label}</strong>
                        <p>{route.explanation}</p>
                        <Evidence
                          reference={route.reference}
                          onOpen={showSource}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
                <details>
                  <summary>¿De dónde viene la descripción?</summary>
                  <p>{trace.origin.descriptionReference.rule}</p>
                  <Evidence
                    reference={trace.origin.descriptionReference}
                    onOpen={showSource}
                    visual
                  />
                </details>
                <p className="vi-study-reading">
                  Sigue cada resultado → mira la tabla original → toca las
                  celdas naranjas → abre «Ver en fuente» para ver el archivo
                  completo. Los detalles avanzados están en «Ver reglas y
                  desglose».
                </p>
              </section>
              <nav className="vi-study-navigation" aria-label="Pasos del caso">
                {trace.steps.map((step, index) => (
                  <button
                    type="button"
                    onClick={() => goToStep(step.id)}
                    aria-pressed={activeStep === step.id}
                    key={step.id}
                  >
                    {index + 1} · {step.title}
                  </button>
                ))}
              </nav>
              {trace.steps.map((step, index) => (
                <StudyStep
                  key={step.id}
                  step={step}
                  index={index}
                  trace={trace}
                  item={item}
                  onOpen={showSource}
                />
              ))}
              <section className="vi-study-conclusion">
                <p className="vi-eyebrow">QUÉ PASÓ CON ESTA PIEZA</p>
                {trace.conclusion.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
                <h3>Plan de revisión</h3>
                <p>
                  Posibles acciones según este caso. Confirma la causa antes de
                  ajustar inventario.
                </p>
                <ol className="vi-study-action-plan">
                  {trace.actionPlan.map((action) => (
                    <li key={action.id}>
                      <h4>{action.title}</h4>
                      <p>{action.detail}</p>
                      <button
                        type="button"
                        onClick={() => goToStep(action.stepId)}
                      >
                        Ver paso y fuentes ↑
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          )}
        </RubberDrawer>
      </div>
      {preview && (
        <SourcePreviewModal
          key={`${preview.config.type}:${trace?.pn}`}
          selection={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </OverlayPortal>
  );
}
