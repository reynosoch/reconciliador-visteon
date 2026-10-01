import { useEffect, useMemo, useState } from "react";
import OverlayPortal from "../shell/OverlayPortal.jsx";
import { groupFindingsByPart } from "../../domain/buildDiscrepancyFindings.js";
import { exportDiscrepanciesWorkbook } from "../../services/exportInventoryWorkbook.js";

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
    MISSING_BOM: "Falta el BOM",
  EMPTY_BOM: "BOM sin componentes aplicables",
  PHANTOM_QAD: "Phantom con saldo QAD",
  ZERO_COST: "Costo en cero",
  QTY_DIFF: "Diferencia de cantidad",
    NO_PHYSICAL: "Sin físico registrado",
    UNEXPECTED: "Material inesperado",
    LOCATION_CANDIDATE: "Posible ubicación",
    UNVALUED: "Falta un costo confiable",
    UNMAPPED_AREA: "Área sin ubicación",
    BOM_REVIEW: "Revisar BOM",
    UNUSUAL_CHANGE: "Cambio para revisar",
  };

const HELP_ROWS = [
  {
    title: "Posible ubicación",
    subtitle: "Compara el mismo PN localidad por localidad.",
    detail:
      "Delta local = Físico − QAD. Los deltas positivos forman sobrantes; los negativos, en valor absoluto, forman faltantes. Potencialmente compensable = el menor entre ambos. Es una pista: no mueve material ni cambia NET o SWING.",
  },
  {
    title: "Cantidad",
    subtitle: "Detecta diferencias entre físico total y QAD total.",
    detail:
      "Diferencia de piezas = Físico total − QAD total. También separa casos donde QAD tiene saldo pero todavía no existe físico reconocido, y casos donde hay físico con QAD total en cero.",
  },
  {
    title: "Calidad de datos",
    subtitle: "Señala información que impide interpretar bien el resultado.",
    detail:
      "Incluye áreas sin localidad válida, referencias BOM que requieren revisión y otros datos que necesitan trazabilidad antes de sacar una conclusión operativa.",
  },
  {
    title: "Falta de costo",
    subtitle: "Hay diferencia en piezas pero no existe un costo confiable.",
    detail:
      "El PN se mantiene separado como SIN VALORAR. No se convierte a USD 0. La valoración solo aparece cuando Cost Part entrega un costo válido y no contradictorio.",
  },
];

function FindingText({ finding }) {
  return <p>{finding.whatFound}</p>;
}

function Detail({ finding, onClose, onOpenExcel }) {
  if (!finding) return null;
  return (
    <OverlayPortal onClose={onClose}>
      <div className="vi-global-overlay">
        <aside className="vi-drawer-panel vi-global-drawer vi-liquid-drawer">
          <div className="vi-drawer-glass-head vi-drawer-back-head">
            <button type="button" className="vi-back-button" onClick={onClose} aria-label="Regresar a discrepancias">
              <span aria-hidden="true">‹</span><strong>REGRESAR</strong>
            </button>
            <div className="vi-drawer-back-title">
              <p className="vi-eyebrow">{RULE[finding.ruleCode] || finding.ruleCode}</p>
              <h2>{finding.partNumber}</h2>
            </div>
          </div>

          <div className="vi-finding-detail">
            <section>
              <h3>Qué encontramos</h3>
              <FindingText finding={finding} />
            </section>
            <section>
              <h3>Qué podría explicarlo</h3>
              <p>{finding.possibleExplanation}</p>
            </section>
            <section>
              <h3>Qué revisar</h3>
              <p>{finding.nextAction}</p>
            </section>

            {finding.evidence?.length > 0 && (
              <section>
                <h3>Evidencia observada</h3>
                <div className="vi-finding-evidence">
                  {finding.evidence.map((e, index) => (
                    <div key={`${e.source}-${index}`}>
                      <strong>{e.source}</strong>
                      <span>{e.detail}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <button
              type="button"
              className="vi-button vi-button-primary vi-view-excel-button"
              onClick={() => onOpenExcel?.(finding)}
            >
              VER EVIDENCIA EN EXCEL
            </button>

            <section>
              <h3>Estado</h3>
              <p>
                {finding.valuationState === "VALORADO"
                  ? "Valorado"
                  : "Falta un costo confiable"}{" "}
                ·{" "}
                {finding.countState === "DESCONOCIDO"
                  ? "No sabemos si ya terminó el conteo"
                  : finding.countState}
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
  focusFindingOrigin,
  onFocusHandled,
  onReturnToNotifications,
  onOpenExcel,
  inventoryName = "Inventario",
  lastUpdated = null,
}) {
  const [filter, setFilter] = useState("ALL"),
    [detail, setDetail] = useState(null),
    [detailOrigin, setDetailOrigin] = useState(null),
    [helpOpen, setHelpOpen] = useState(false),
    [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (focusFindingId) {
      const f = findings.find((x) => x.id === focusFindingId);
      if (f) {
        setDetail(f);
        setDetailOrigin(focusFindingOrigin || null);
      }
      onFocusHandled?.();
    }
  }, [focusFindingId, focusFindingOrigin, findings, onFocusHandled]);

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

  const exportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportDiscrepanciesWorkbook({
        findings: filtered,
        inventoryName,
        lastUpdated,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="vi-panel vi-findings">
      <div className="vi-findings-head">
        <div>
          <h2>Discrepancias por investigar</h2>
          <p>
            Cada número de parte aparece una sola vez, aunque tenga varios
            avisos.
          </p>
        </div>

        <div className="vi-findings-head-actions">
          <div className="vi-findings-help-wrap">
            <button
              type="button"
              className="vi-round-help"
              onClick={() => setHelpOpen((value) => !value)}
              aria-expanded={helpOpen}
              aria-label="Cómo se calculan las categorías"
            >
              ?
            </button>
            {helpOpen && (
              <div className="vi-iphone-popover">
                <div className="vi-popover-title">
                  <strong>Cómo se genera cada categoría</strong>
                  <span>Abre una para ver el cálculo.</span>
                </div>
                {HELP_ROWS.map((item) => (
                  <details key={item.title} className="vi-popover-row">
                    <summary>
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.subtitle}</small>
                      </span>
                      <b>›</b>
                    </summary>
                    <p>{item.detail}</p>
                  </details>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="vi-button vi-button-glass"
            onClick={exportExcel}
            disabled={exporting || !findings.length}
          >
            {exporting ? "CREANDO EXCEL…" : "DESCARGAR EXCEL"}
          </button>
        </div>
      </div>

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
              {rows.map((r) => (
                <tr key={r.partNumber}>
                  <td>
                    <button onClick={() => {
                      setDetailOrigin(null);
                      setDetail(r.findings[0]);
                    }}>
                      {r.partNumber}
                    </button>
                  </td>
                  <td>
                    {r.findings.map((f) => (
                      <button
                        type="button"
                        className="vi-finding-tag"
                        key={f.id}
                        onClick={() => {
                          setDetailOrigin(null);
                          setDetail(f);
                        }}
                      >
                        {RULE[f.ruleCode] || f.ruleCode}
                      </button>
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

      <Detail
        finding={detail}
        onClose={() => {
          const origin = detailOrigin;
          setDetail(null);
          setDetailOrigin(null);
          if (origin === "notifications") onReturnToNotifications?.();
        }}
        onOpenExcel={(finding) => {
          const origin = detailOrigin;
          setDetail(null);
          setDetailOrigin(null);
          onOpenExcel?.(finding, { origin });
        }}
      />
    </section>
  );
}
