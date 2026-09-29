import { useEffect, useMemo, useState } from "react";
import OverlayPortal from "../shell/OverlayPortal.jsx";
import { groupFindingsByPart } from "../../domain/buildDiscrepancyFindings.js";

const money = (v) =>
    v === null
      ? "FALTA UN COSTO CONFIABLE"
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(Number(v) || 0),
  number = (v) => new Intl.NumberFormat("es-MX").format(Number(v) || 0),
  FILTERS = [
    ["ALL", "TODAS"],
    ["CANTIDAD", "CANTIDAD"],
    ["UBICACION", "POSIBLE UBICACIÓN"],
    ["CALIDAD", "CALIDAD DE DATOS"],
    ["SIN_VALORAR", "FALTA COSTO"],
  ],
  RULE = {
    QTY_DIFF: "Diferencia de cantidad",
    NO_PHYSICAL: "Sin físico registrado",
    UNEXPECTED: "Material inesperado",
    LOCATION_CANDIDATE: "Posible ubicación",
    UNVALUED: "Falta un costo confiable",
    UNMAPPED_AREA: "Área sin ubicación",
    BOM_REVIEW: "Revisar BOM",
    UNUSUAL_CHANGE: "Cambio para revisar",
  };

function LocationSentence({ finding, onOpenExcel }) {
  const a = finding.locationAnalysis;
  if (!a) return <p>{finding.whatFound}</p>;
  return (
    <p>
      Hay sobrantes locales por{" "}
      <button
        type="button"
        className="vi-inline-data-link"
        onClick={() => onOpenExcel?.(finding.partNumber, finding.id)}
        title="Ver las localidades que forman este sobrante"
      >
        {number(a.surplus)} piezas
      </button>{" "}
      y faltantes locales por{" "}
      <button
        type="button"
        className="vi-inline-data-link"
        onClick={() => onOpenExcel?.(finding.partNumber, finding.id)}
        title="Ver las localidades que forman este faltante"
      >
        {number(a.shortage)}
      </button>
      . Hasta{" "}
      <button
        type="button"
        className="vi-inline-data-link"
        onClick={() => onOpenExcel?.(finding.partNumber, finding.id)}
        title="Ver el detalle por localidad"
      >
        {number(a.compensable)} piezas
      </button>{" "}
      son potencialmente compensables entre localidades.
    </p>
  );
}

function Detail({ f, onClose, onOpenExcel }) {
  if (!f) return null;
  return (
    <OverlayPortal onClose={onClose}>
      <div className="vi-global-overlay">
        <aside className="vi-drawer-panel vi-global-drawer">
          <div className="sticky top-0 z-10 px-5 py-5 bg-white vi-finding-drawer-head">
            <button className="vi-back-link" onClick={onClose}>
              ← REGRESAR A DISCREPANCIAS
            </button>
            <p className="vi-eyebrow">{RULE[f.ruleCode] || f.ruleCode}</p>
            <h2>{f.partNumber}</h2>
          </div>
          <div className="vi-finding-detail">
            <section>
              <h3>Qué encontramos</h3>
              {f.ruleCode === "LOCATION_CANDIDATE" ? (
                <LocationSentence finding={f} onOpenExcel={onOpenExcel} />
              ) : (
                <p>{f.whatFound}</p>
              )}
            </section>
            <section>
              <h3>Qué podría explicarlo</h3>
              <p>{f.possibleExplanation}</p>
            </section>
            <section>
              <h3>Qué revisar</h3>
              <p>{f.nextAction}</p>
            </section>
            {f.evidence?.length > 0 && (
              <section>
                <h3>Evidencia observada</h3>
                <div className="vi-finding-evidence">
                  {f.evidence.map((e, index) => (
                    <div key={`${e.source}-${index}`}>
                      <strong>{e.source}</strong>
                      <span>{e.detail}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {f.ruleCode === "LOCATION_CANDIDATE" && (
              <button
                type="button"
                className="vi-button vi-button-primary vi-view-excel-button"
                onClick={() => onOpenExcel?.(f.partNumber, f.id)}
              >
                VER EN EXCEL
              </button>
            )}
            <section>
              <h3>Estado</h3>
              <p>
                {f.valuationState === "VALORADO"
                  ? "Valorado"
                  : "Falta un costo confiable"}{" "}
                ·{" "}
                {f.countState === "DESCONOCIDO"
                  ? "No sabemos si ya terminó el conteo"
                  : f.countState}
              </p>
            </section>
          </div>
        </aside>
      </div>
    </OverlayPortal>
  );
}

export default function DiscrepancyFindingsPanel({
  findings = [],
  evaluationValid,
  evaluationReason,
  focusFindingId,
  onFocusHandled,
  onOpenExcel,
}) {
  const [filter, setFilter] = useState("ALL"),
    [detail, setDetail] = useState(null),
    [showLocationMath, setShowLocationMath] = useState(false);

  useEffect(() => {
    if (focusFindingId) {
      const f = findings.find((x) => x.id === focusFindingId);
      if (f) setDetail(f);
      onFocusHandled?.();
    }
  }, [focusFindingId, findings, onFocusHandled]);

  const filtered = useMemo(
      () =>
        filter === "ALL"
          ? findings
          : findings.filter((f) => f.category === filter),
      [findings, filter],
    ),
    rows = useMemo(() => groupFindingsByPart(filtered), [filtered]),
    counts = useMemo(
      () =>
        Object.fromEntries(
          FILTERS.map(([id]) => [
            id,
            groupFindingsByPart(
              id === "ALL"
                ? findings
                : findings.filter((f) => f.category === id),
            ).length,
          ]),
        ),
      [findings],
    );

  const openExcel = (partNumber, findingId) => {
    setDetail(null);
    onOpenExcel?.(partNumber, findingId);
  };

  return (
    <section className="vi-panel vi-findings">
      <div className="vi-findings-head">
        <div>
          <p className="vi-eyebrow">JUNTAS CADA ~2 HORAS</p>
          <h2>Discrepancias por investigar</h2>
          <p>
            Cada número de parte aparece una sola vez, aunque tenga varios
            avisos.
          </p>
        </div>
        <button
          type="button"
          className="vi-button vi-location-math-button"
          onClick={() => setShowLocationMath((value) => !value)}
          aria-expanded={showLocationMath}
        >
          ¿CÓMO SE CALCULA POSIBLE UBICACIÓN?
        </button>
      </div>

      {showLocationMath && (
        <div className="vi-location-math">
          <strong>Posible ubicación compara el mismo PN localidad por localidad.</strong>
          <span>
            1. Se calcula <b>delta = físico − QAD</b> en cada localidad válida.
            Los deltas positivos forman los sobrantes locales y los negativos,
            en valor absoluto, forman los faltantes locales.
          </span>
          <span>
            2. <b>Potencialmente compensable = el menor entre sobrantes y faltantes.</b>{" "}
            Ejemplo: si sobran 5 y faltan 107,514, como máximo 5 piezas podrían
            explicarse por una diferencia de ubicación.
          </span>
          <span>
            3. Esto es una <b>pista para investigar</b>: no confirma un traslado,
            no mueve piezas automáticamente y no cambia NET ni SWING.
          </span>
        </div>
      )}

      <div className="vi-findings-filters">
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            className={filter === id ? "is-active" : ""}
            onClick={() => setFilter(id)}
          >
            {label}
            <b>{counts[id]}</b>
          </button>
        ))}
      </div>

      {!evaluationValid ? (
        <div className="vi-findings-empty">
          <strong>No se pudo evaluar este corte.</strong>
          <span>{evaluationReason}</span>
        </div>
      ) : !rows.length ? (
        <div className="vi-findings-empty">
          <strong>Sin hallazgos para este filtro.</strong>
        </div>
      ) : (
        <div className="vi-findings-table-wrap">
          <table className="vi-findings-table">
            <thead>
              <tr>
                <th>PN</th>
                <th>Etiquetas</th>
                <th>Diferencia total en dólares</th>
                <th>Localidades</th>
                <th>Siguiente acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const locationFinding = r.findings.find(
                  (f) => f.ruleCode === "LOCATION_CANDIDATE",
                );
                return (
                  <tr key={r.partNumber}>
                    <td>
                      <button onClick={() => setDetail(r.findings[0])}>
                        {r.partNumber}
                      </button>
                    </td>
                    <td>
                      {r.findings.map((f) => (
                        <button
                          type="button"
                          className="vi-finding-tag"
                          key={f.id}
                          onClick={() => setDetail(f)}
                        >
                          {RULE[f.ruleCode] || f.ruleCode}
                        </button>
                      ))}
                      {locationFinding && (
                        <button
                          type="button"
                          className="vi-excel-inline-button"
                          onClick={() => openExcel(r.partNumber, locationFinding.id)}
                        >
                          VER EN EXCEL
                        </button>
                      )}
                    </td>
                    <td>{money(r.netUsd)}</td>
                    <td>{r.locations.join(", ") || "—"}</td>
                    <td>{r.findings[0]?.nextAction}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Detail
        f={detail}
        onClose={() => setDetail(null)}
        onOpenExcel={openExcel}
      />
    </section>
  );
}
