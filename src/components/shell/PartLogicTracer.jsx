import { useMemo, useState } from "react";
import OverlayPortal from "./OverlayPortal.jsx";
import { Ghost, PelletRail } from "../visual/PacmanGlyphs.jsx";

const money = (value) =>
  Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
const number = (value) => Number(value || 0).toLocaleString("es-MX");
const clean = (value) => String(value ?? "").trim().toUpperCase();

function sourceName(sources, key, fallback) {
  if (key === "bom" && Array.isArray(sources?.bom?.files) && sources.bom.files.length) {
    return sources.bom.files.map((file) => file.fileName).join(" + ");
  }
  return sources?.[key]?.fileName || fallback;
}

function verdict(item) {
  if (!item) return null;
  if (!item.master?.hasCost && (item.financial?.netPieces !== 0 || item.financial?.swingPieces > 0)) {
    return ["SIN VALORAR", "Hay diferencia en piezas, pero Cost Part no aporta un costo confiable."];
  }
  if (item.master?.isObsolete && item.financial?.obsoleteGainUsd > 0) {
    return ["OBSOLETO + GANANCIA", "Cost Part marca OBSOLETE y el físico total supera a QAD."];
  }
  if (item.flags?.isUnexpectedMaterial) {
    return ["MATERIAL INESPERADO", "QAD total es 0 y sí existe físico reconocido."];
  }
  if (item.flags?.isMissingPhysical) {
    return ["SIN FÍSICO", "QAD tiene saldo y todavía no hay físico reconocido para el PN."];
  }
  if (item.financial?.netUsd < 0) return ["PÉRDIDA", "Físico total − QAD total es negativo."];
  if (item.financial?.netUsd > 0) return ["GANANCIA", "Físico total − QAD total es positivo."];
  if (item.financial?.swingUsd > 0) return ["SWING", "NET queda en cero, pero la distribución por localidad es distinta."];
  return ["BALANCEADO", "Físico y QAD coinciden en total y no queda diferencia por localidad."];
}

function Step({ number: step, title, source, state, children }) {
  return (
    <section className="vi-logic-step">
      <div className="vi-logic-step-index">{step}</div>
      <div className="vi-logic-step-body">
        <div className="vi-logic-step-head">
          <div>
            <span>{source}</span>
            <h3>{title}</h3>
          </div>
          {state && <b>{state}</b>}
        </div>
        {children}
      </div>
    </section>
  );
}

export default function PartLogicTracer({
  open,
  onClose,
  reconciliation = [],
  sources = {},
  scanReady = false,
}) {
  const [query, setQuery] = useState("");
  const [selectedPn, setSelectedPn] = useState("");

  const required = useMemo(() => ([
    ["scans", "4Wall", Boolean(sources?.scans?.loaded || scanReady)],
    ["areas", "4Wall-Area", Boolean(sources?.areas?.loaded)],
    ["qad", "QAD 3.2", Boolean(sources?.qad?.loaded)],
    ["ispbb", "ISPBB", Boolean(sources?.ispbb?.loaded)],
    ["bom", "BOM", Boolean(sources?.bom?.loaded)],
    ["cost", "Cost Part", Boolean(sources?.cost?.loaded)],
  ]), [sources, scanReady]);

  const ready = required.every(([, , loaded]) => loaded);
  const suggestions = useMemo(() => {
    const q = clean(query);
    if (!q) return reconciliation.slice(0, 12);
    return reconciliation
      .filter((item) => clean(item.partNumber).includes(q))
      .slice(0, 12);
  }, [query, reconciliation]);

  const item = useMemo(
    () => reconciliation.find((row) => clean(row.partNumber) === clean(selectedPn)) || null,
    [reconciliation, selectedPn],
  );

  if (!open) return null;

  const names = {
    scans: sourceName(sources, "scans", "4Wall / snapshot físico"),
    areas: sourceName(sources, "areas", "4Wall-Area"),
    qad: sourceName(sources, "qad", "QAD 3.2"),
    ispbb: sourceName(sources, "ispbb", "ISPBB"),
    bom: sourceName(sources, "bom", "BOM"),
    cost: sourceName(sources, "cost", "Cost Part"),
  };

  const result = verdict(item);
  const finalState = result?.[0] || "";
  const finalReason = result?.[1] || "";
  const mappingRows = item?.trace?.sourceRows || [];
  const swingRows = (item?.trace?.swingByLocation || []).filter(
    (row) => Number(row.physicalQty || 0) !== 0 || Number(row.qadQty || 0) !== 0,
  );

  return (
    <OverlayPortal onClose={onClose}>
      <div className="vi-global-overlay vi-logic-overlay" onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}>
        <aside className="vi-logic-tracer vi-drawer-panel">
          <div className="vi-logic-head">
            <div>
              <p className="vi-eyebrow">TRAZADOR DE PIEZA</p>
              <h2>Cómo piensa el reconciliador</h2>
              <p>Selecciona un Part Number y sigue exactamente qué fuentes y reglas lo convierten en phantom, swing, ganancia, pérdida u obsoleto.</p>
            </div>
            <button type="button" className="vi-icon-close" onClick={onClose} aria-label="Cerrar trazador">×</button>
          </div>

          {!ready ? (
            <div className="vi-logic-gate">
              <div className="vi-logic-gate-ghost" aria-hidden="true">
                <Ghost size={52} tone="violet" />
              </div>
              <p className="vi-eyebrow">ANTES DE TRAZAR UNA PIEZA</p>
              <h3>Necesitas cargar todas las fuentes</h3>
              <p>
                El trazador no va a inventar decisiones con información incompleta. Carga 4Wall, el diccionario de áreas, QAD, ISPBB, BOM y Cost Part.
              </p>
              <div className="vi-logic-required">
                {required.map(([key, label, loaded]) => (
                  <div className={loaded ? "is-ready" : ""} key={key}>
                    <span aria-hidden="true">{loaded ? "✓" : "○"}</span>
                    <strong>{label}</strong>
                    <em>{loaded ? "LISTO" : "FALTA"}</em>
                  </div>
                ))}
              </div>
              <PelletRail muted />
            </div>
          ) : (
            <>
              <div className="vi-logic-search">
                <label htmlFor="vi-logic-pn">¿Qué pieza quieres entender?</label>
                <div className="vi-logic-searchbox">
                  <input
                    id="vi-logic-pn"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      if (selectedPn && clean(event.target.value) !== clean(selectedPn)) setSelectedPn("");
                    }}
                    placeholder="Escribe un Part Number…"
                    autoComplete="off"
                  />
                  {query && <button type="button" onClick={() => { setQuery(""); setSelectedPn(""); }}>×</button>}
                </div>
                {!item && (
                  <div className="vi-logic-suggestions">
                    {suggestions.map((row) => (
                      <button
                        type="button"
                        key={row.partNumber}
                        onClick={() => {
                          setSelectedPn(row.partNumber);
                          setQuery(row.partNumber);
                        }}
                      >
                        <strong>{row.partNumber}</strong>
                        <span>{row.master?.description || "Sin descripción"}</span>
                        <em>{money(row.financial?.netUsd)}</em>
                      </button>
                    ))}
                    {!suggestions.length && <p>No encontramos ese Part Number en la conciliación actual.</p>}
                  </div>
                )}
              </div>

              {item && (
                <div className="vi-logic-flow">
                  <div className="vi-logic-result">
                    <div>
                      <span>PART NUMBER</span>
                      <h3>{item.partNumber}</h3>
                      <p>{item.master?.description || "Sin descripción disponible"}</p>
                    </div>
                    <div>
                      <span>RESULTADO</span>
                      <strong>{finalState}</strong>
                      <p>{finalReason}</p>
                    </div>
                  </div>

                  <Step number="01" title="Traducir el físico de 4Wall" source={names.scans} state={number(item.physical?.scannedTotal) + " pzas escaneadas"}>
                    <p>
                      4Wall entrega un <strong>AreaName</strong>. Esa área no se compara directamente contra QAD.
                      Primero se busca en <strong>{names.areas}</strong>.
                    </p>
                    <div className="vi-logic-table">
                      <div className="vi-logic-table-head"><span>Área 4Wall</span><span>→ Localidad QAD</span><span>Pzas</span></div>
                      {mappingRows.length ? mappingRows.slice(0, 16).map((row, index) => (
                        <div key={(row.areaName || "") + "-" + (row.qadLocation || "") + "-" + index}>
                          <span>{row.areaName || "SIN ÁREA"}</span>
                          <strong>{row.qadLocation || "UNMAPPED"}</strong>
                          <span>{number(row.quantity)}</span>
                        </div>
                      )) : <p>Este PN no tiene filas físicas directas en el corte actual.</p>}
                    </div>
                    <p className="vi-logic-rule">
                      Regla: Área 4Wall → catálogo 4Wall-Area → Localidad QAD. Solo <b>WHSE → ZWHSE</b> se normaliza automáticamente; cualquier otra área sin catálogo queda UNMAPPED.
                    </p>
                  </Step>

                  <Step number="02" title="Decidir si es Phantom" source={names.ispbb} state={item.master?.phantomKnown ? (item.master?.isPhantom ? "PHANTOM SÍ" : "PHANTOM NO") : "DESCONOCIDO"}>
                    <p>
                      La definición autoritativa sale de <strong>ISPBB</strong>. El reconciliador no usa prefijos ni adivina por el número de parte.
                    </p>
                    {item.master?.isPhantom ? (
                      <p className="vi-logic-rule">
                        Como ISPBB dice Phantom=YES, el físico directo del padre no se usa como inventario final del padre. Se busca su BOM y se distribuye el consumo a componentes según Usage.
                      </p>
                    ) : (
                      <p className="vi-logic-rule">Como ISPBB no lo marca phantom, su físico directo de 4Wall permanece en el PN.</p>
                    )}
                  </Step>

                  <Step number="03" title="Aplicar BOM cuando corresponde" source={names.bom} state={number(item.physical?.bomContribution) + " pzas aportadas"}>
                    <p>
                      La contribución BOM que llega a este PN es <strong>{number(item.physical?.bomContribution)}</strong> piezas.
                      Solo las relaciones permitidas por el motor aportan cantidad mediante <strong>Usage</strong>.
                    </p>
                    <p className="vi-logic-rule">
                      Si el motor recibe contribución BOM sin localidad explícita, actualmente la coloca en <b>ZWIP</b>. Las referencias BOM por sí solas son pistas de investigación y no crean físico.
                    </p>
                  </Step>

                  <Step number="04" title="Leer lo que QAD espera" source={names.qad} state={number(item.qad?.total) + " pzas"}>
                    <p>QAD aporta Quantity On Hand agrupado por Location. El total esperado para este PN es <strong>{number(item.qad?.total)}</strong>.</p>
                    <div className="vi-logic-locations">
                      {[...((item.qad?.locations instanceof Map ? item.qad.locations : new Map()).entries())].map(([location, qty]) => (
                        <span key={location}><b>{location}</b>{number(qty)}</span>
                      ))}
                    </div>
                  </Step>

                  <Step number="05" title="Definir costo y obsolescencia" source={names.cost} state={item.master?.hasCost ? money(item.master?.unitCost) : "SIN COSTO"}>
                    <p>
                      Cost Part aporta <strong>Cost Total</strong> y <strong>Status</strong>. Status actual: <b>{item.master?.costStatus || "—"}</b>.
                    </p>
                    <p className="vi-logic-rule">
                      OBSOLETE + (Físico − QAD) positivo = <b>OBSOLETO + GANANCIA</b>. En este PN: {item.master?.isObsolete ? "sí es obsoleto" : "no es obsoleto"}; ganancia obsoleta = <b>{money(item.financial?.obsoleteGainUsd)}</b>.
                    </p>
                  </Step>

                  <Step number="06" title="Calcular NET" source="Motor financiero" state={money(item.financial?.netUsd)}>
                    <div className="vi-logic-formula">
                      <span>({number(item.physical?.total)} físico − {number(item.qad?.total)} QAD)</span>
                      <b>× {money(item.master?.unitCost)} costo</b>
                      <strong>= {money(item.financial?.netUsd)}</strong>
                    </div>
                    <p>
                      Diferencia en piezas: <strong>{number(item.financial?.netPieces)}</strong>. Si es negativa es pérdida; si es positiva es ganancia. Si no hay costo confiable, las piezas se conservan pero el resultado queda SIN VALORAR.
                    </p>
                  </Step>

                  <Step number="07" title="Calcular SWING localidad por localidad" source={names.scans + " ↔ " + names.qad} state={number(item.financial?.swingPieces) + " pzas"}>
                    <p>SWING suma el valor absoluto de la diferencia en cada localidad. <strong>No se divide entre dos.</strong></p>
                    <div className="vi-logic-table">
                      <div className="vi-logic-table-head"><span>Localidad</span><span>Físico / QAD</span><span>|Δ|</span></div>
                      {swingRows.slice(0, 18).map((row) => (
                        <div key={row.location}>
                          <strong>{row.location}</strong>
                          <span>{number(row.physicalQty)} / {number(row.qadQty)}</span>
                          <span>{number(Math.abs(Number(row.delta || 0)))}</span>
                        </div>
                      ))}
                    </div>
                    <div className="vi-logic-formula">
                      <span>Σ |Físico(localidad) − QAD(localidad)|</span>
                      <b>× {money(item.master?.unitCost)}</b>
                      <strong>= {money(item.financial?.swingUsd)}</strong>
                    </div>
                  </Step>

                  <Step number="08" title="Clasificar el resultado" source="Reglas de UI" state={finalState}>
                    <p>{finalReason}</p>
                    <div className="vi-logic-flags">
                      {item.flags?.isPhantom && <span>PHANTOM</span>}
                      {item.master?.isObsolete && <span>OBSOLETE</span>}
                      {item.financial?.swingPieces > 0 && <span>SWING</span>}
                      {item.flags?.isUnexpectedMaterial && <span>UNEXPECTED</span>}
                      {item.flags?.isMissingPhysical && <span>SIN FÍSICO</span>}
                      {item.flags?.hasUnmappedPhysicalLocation && <span>UNMAPPED</span>}
                      {!item.master?.hasCost && <span>SIN COSTO</span>}
                    </div>
                  </Step>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </OverlayPortal>
  );
}
