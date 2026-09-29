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
function Detail({ f, onClose }) {
  if (!f) return null;
  return (
    <OverlayPortal onClose={onClose}>
      <div className="vi-global-overlay">
        <aside className="vi-drawer-panel vi-global-drawer">
          <div className="sticky top-0 z-10 px-5 py-5 bg-white">
            <button className="vi-button float-right" onClick={onClose}>
              CERRAR
            </button>
            <p className="vi-eyebrow">{RULE[f.ruleCode] || f.ruleCode}</p>
            <h2>{f.partNumber}</h2>
          </div>
          <div className="vi-finding-detail">
            <section>
              <h3>Qué encontramos</h3>
              <p>{f.whatFound}</p>
            </section>
            <section>
              <h3>Qué podría explicarlo</h3>
              <p>{f.possibleExplanation}</p>
            </section>
            <section>
              <h3>Qué revisar</h3>
              <p>{f.nextAction}</p>
            </section>
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
}) {
  const [filter, setFilter] = useState("ALL"),
    [detail, setDetail] = useState(null);
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
      </div>
      <div className="vi-findings-filters">
        {FILTERS.map(([id, l]) => (
          <button
            key={id}
            className={filter === id ? "is-active" : ""}
            onClick={() => setFilter(id)}
          >
            {l}
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
              {rows.map((r) => (
                <tr key={r.partNumber}>
                  <td>
                    <button onClick={() => setDetail(r.findings[0])}>
                      {r.partNumber}
                    </button>
                  </td>
                  <td>
                    {r.findings.map((f) => (
                      <span className="vi-finding-tag" key={f.id}>
                        {RULE[f.ruleCode] || f.ruleCode}
                      </span>
                    ))}
                  </td>
                  <td>{money(r.netUsd)}</td>
                  <td>{r.locations.join(", ") || "—"}</td>
                  <td>{r.findings[0]?.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Detail f={detail} onClose={() => setDetail(null)} />
    </section>
  );
}
