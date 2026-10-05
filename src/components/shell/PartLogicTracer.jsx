import { useMemo, useState } from "react";
import { RubberDrawer } from "../visual/ScrollEffects.jsx";
import OverlayPortal from "./OverlayPortal.jsx";
import SourcePreviewModal from "./SourcePreviewModal.jsx";
import { buildPartLearningTrace } from "../../domain/partLearningTrace.js";

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
function Evidence({ reference, onOpen }) {
  const origins = [
    ...new Set(reference.evidence.map((row) => row.origin.fileName)),
  ];
  return (
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
  );
}
function StudyStep({ step, index, trace, item, onOpen }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="vi-logic-step" id={`study-${step.id}`}>
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
            <p className="vi-logic-rule">
              SWING no se divide entre 2. Se mantiene el costo original en el
              cálculo; la vista del costo unitario usa dos decimales.
            </p>
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
          {step.refs.map((ref) => (
            <Evidence key={ref.type} reference={ref} onOpen={onOpen} />
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
                  label={`Provenance ${ref.label}`}
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
                  ["Origen", () => "QAD aceptado"],
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
  findings = [],
}) {
  const [query, setQuery] = useState("");
  const [selectedPn, setSelectedPn] = useState("");
  const [preview, setPreview] = useState(null);
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
          })
        : null,
    [open, item, engineSources, sources, scanRows, scanReady, findings],
  );
  const select = (pn) => {
    setSelectedPn(pn);
    setQuery(pn);
    setPreview(null);
  };
  if (!open) return null;
  const showSource = (ref) =>
    setPreview({
      source: ref.source,
      config: { type: ref.type, label: ref.label },
      evidence: ref.evidence,
      rule: ref.rule,
      tracePn: item.partNumber,
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
          className="vi-logic-tracer vi-drawer-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Trazador de pieza"
        >
          <header className="vi-logic-head">
            <div>
              <p className="vi-eyebrow">
                TRAZADOR DE PIEZA · APRENDE CON UN CASO
              </p>
              <h2>Del escaneo al resultado</h2>
              <p>
                Sigue los datos, las reglas y la evidencia real de una pieza.
              </p>
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
              <div className="vi-logic-suggestions">
                {suggestions.map((row) => (
                  <button
                    type="button"
                    key={row.partNumber}
                    onClick={() => select(row.partNumber)}
                  >
                    <strong>{row.partNumber}</strong>
                    <span>{row.master.description || "Sin descripción"}</span>
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
                      : "Carga 4Wall o QAD en Fuentes para estudiar una pieza. Puedes empezar aun si faltan otras referencias."}
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
              <section className="vi-logic-result">
                <div>
                  <span>PART NUMBER</span>
                  <h3>{trace.pn}</h3>
                  <p>{trace.description || "Descripción no disponible"}</p>
                </div>
                <div>
                  <span>
                    ESTADO DEL MOTOR{!trace.complete ? " · PARCIAL" : ""}
                  </span>
                  <strong>{trace.status}</strong>
                  <p>
                    {trace.alertLabels.length} advertencias · evidencia del
                    corte actual
                  </p>
                </div>
              </section>
              <dl className="vi-study-summary">
                {trace.summary.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <nav className="vi-study-navigation" aria-label="Pasos del caso">
                {trace.steps.map((step, index) => (
                  <a href={`#study-${step.id}`} key={step.id}>
                    {index + 1} · {step.title}
                  </a>
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
