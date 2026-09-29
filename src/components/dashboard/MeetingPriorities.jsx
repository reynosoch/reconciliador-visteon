import { useMemo } from "react";
const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
export default function MeetingPriorities({
  rows = [],
  ready,
  onSelectPart,
  onOpenSources,
}) {
  const [losses, gains, pending] = useMemo(
    () => [
      rows
        .filter((r) => r.master.hasCost && r.financial.netUsd < 0)
        .sort((a, b) => a.financial.netUsd - b.financial.netUsd)
        .slice(0, 10),
      rows
        .filter((r) => r.master.hasCost && r.financial.netUsd > 0)
        .sort((a, b) => b.financial.netUsd - a.financial.netUsd)
        .slice(0, 10),
      rows.filter((r) => r.flags.missingBom || r.flags.emptyBom),
    ],
    [rows],
  );
  if (!ready) return null;
  return (
    <section className="vi-panel vi-meeting-priorities">
      <p className="vi-eyebrow">PARA LA JUNTA</p>
      <h2>Las diferencias más grandes en dólares</h2>
      <p>
        Incluye todas las partes del comparativo, incluso las que aún no se
        cuentan. Estas diferencias no confirman pérdidas ni ganancias finales.
      </p>
      {pending.length > 0 && (
        <div className="vi-cut-warning">
          <strong>{pending.length} phantoms pendientes de BOM</strong>
          <p>
            Su escaneo se conserva, pero faltan componentes por calcular. Los
            totales pueden cambiar al agregar el BOM.
          </p>
          <button className="vi-button" onClick={onOpenSources}>
            AGREGAR BOM
          </button>
          <details>
            <summary>Ver números de parte pendientes</summary>
            {pending.map((r) => (
              <p key={r.partNumber}>
                <button onClick={() => onSelectPart(r)}>{r.partNumber}</button>{" "}
                ·{" "}
                {r.flags.missingBom
                  ? "Falta su BOM"
                  : "BOM sin filas NO de nivel .2 con Usage válido"}
              </p>
            ))}
          </details>
        </div>
      )}
      <div className="vi-meeting-columns">
        {[
          ["Top 10 pérdidas por revisar", losses],
          ["Top 10 ganancias por revisar", gains],
        ].map(([title, items]) => (
          <div key={title}>
            <h3>{title}</h3>
            {!items.length && <p>Sin diferencias valoradas de este tipo.</p>}
            {items.map((r, i) => (
              <button
                className="vi-meeting-row"
                key={r.partNumber}
                onClick={() => onSelectPart(r)}
              >
                <span>
                  {i + 1}. {r.partNumber}
                  <small>
                    {r.physical.scanCount || r.physical.bomContribution
                      ? "Con registros físicos; conteo no confirmado"
                      : "Aún sin conteo registrado"}
                    {r.flags.phantomQadBalance
                      ? " · Phantom con saldo QAD por revisar"
                      : ""}
                  </small>
                </span>
                <strong>{money(r.financial.netUsd)}</strong>
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
