import { useMemo, useState } from "react";

const STORAGE_KEY = "visteon.inventory.meetingCuts.v1";
const MAX_CUTS = 24;

function money(value) {
 return new Intl.NumberFormat("en-US", {
   style: "currency",
   currency: "USD",
   maximumFractionDigits: 0,
 }).format(Number(value) || 0);
}

function loadCuts() {
 try {
   const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
   return Array.isArray(parsed) ? parsed : [];
 } catch {
   return [];
 }
}

function referenceSignature(sources = {}) {
 return ["areas", "qad", "ispbb", "bom", "cost"]
   .map((key) => {
     const source = sources[key] || {};
     return {
       type: key,
       fileName: source.fileName || "",
       fingerprint: source.fingerprint || "",
     };
   });
}

export default function CutHistoryPanel({
 ready = false,
 summary,
 scanCount = 0,
 lastUpdated,
 rows = [],
 sources = {},
}) {
 const [cuts, setCuts] = useState(loadCuts);
 const lastCut = cuts[0] || null;

 const currentDelta = useMemo(() => {
   if (!lastCut || !summary) return null;
   return {
     netUsd: Number(summary.netUsd || 0) - Number(lastCut.summary?.netUsd || 0),
     grossLossUsd: Number(summary.grossLossUsd || 0) - Number(lastCut.summary?.grossLossUsd || 0),
     grossGainUsd: Number(summary.grossGainUsd || 0) - Number(lastCut.summary?.grossGainUsd || 0),
     swingUsd: Number(summary.swingUsd || 0) - Number(lastCut.summary?.swingUsd || 0),
     scans: Number(scanCount || 0) - Number(lastCut.scanCount || 0),
   };
 }, [lastCut, summary, scanCount]);

 const saveCut = () => {
   if (!ready || !summary) return;
   const cut = {
     id: Date.now(),
     savedAt: new Date().toISOString(),
     fetchedAt: lastUpdated ? new Date(lastUpdated).toISOString() : null,
     scanCount: Number(scanCount || 0),
     summary: {
       netUsd: Number(summary.netUsd || 0),
       grossLossUsd: Number(summary.grossLossUsd || 0),
       grossGainUsd: Number(summary.grossGainUsd || 0),
       swingUsd: Number(summary.swingUsd || 0),
       qadOnlyCount: Number(summary.qadOnlyCount || 0),
       qadOnlyExposureUsd: Number(summary.qadOnlyExposureUsd || 0),
       partsWithPhysicalEvidence: Number(summary.partsWithPhysicalEvidence || 0),
     },
     topParts: rows.slice(0, 10).map((item) => ({
       partNumber: item.partNumber,
       netUsd: Number(item.financial?.netUsd || 0),
       status: item.flags?.financialStatus || "",
     })),
     references: referenceSignature(sources),
   };
   const next = [cut, ...cuts].slice(0, MAX_CUTS);
   setCuts(next);
   try {
     localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
   } catch (error) {
     console.warn("No se pudo guardar el historial local de cortes.", error);
   }
 };

 const clearCuts = () => {
   setCuts([]);
   try {
     localStorage.removeItem(STORAGE_KEY);
   } catch {
     // La UI ya quedó limpia aunque el navegador bloquee storage.
   }
 };

 return (
<section className="vi-panel vi-cut-history">
 <div className="vi-cut-history-head">
  <div>
   <p className="vi-eyebrow">JUNTAS DE INVENTARIO</p>
   <h2>Historial de cortes</h2>
   <p>Guarda un corte antes de cada junta para comparar qué cambió. Este historial queda solo en este navegador.</p>
  </div>
  <div className="vi-cut-history-actions">
   {cuts.length > 0 && <button type="button" className="vi-button" onClick={clearCuts}>BORRAR HISTORIAL</button>}
   <button type="button" className="vi-button vi-button-primary" disabled={!ready} onClick={saveCut}>GUARDAR CORTE DE JUNTA</button>
  </div>
 </div>

 {currentDelta && (
  <div className="vi-cut-delta" role="status">
   <span>DESDE EL ÚLTIMO CORTE</span>
   <strong>NET {money(currentDelta.netUsd)}</strong>
   <strong>PÉRDIDA {money(currentDelta.grossLossUsd)}</strong>
   <strong>GANANCIA {money(currentDelta.grossGainUsd)}</strong>
   <strong>SWING {money(currentDelta.swingUsd)}</strong>
   <strong>{currentDelta.scans >= 0 ? "+" : ""}{currentDelta.scans.toLocaleString("es-MX")} ESCANEOS</strong>
  </div>
 )}

 {cuts.length === 0 ? (
  <p className="vi-cut-empty">Todavía no hay cortes guardados. El primer corte servirá como base para la siguiente junta.</p>
 ) : (
  <div className="vi-cut-list">
   {cuts.slice(0, 6).map((cut, index) => (
    <div className="vi-cut-row" key={cut.id}>
     <div>
      <strong>{new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" }).format(new Date(cut.savedAt))}</strong>
      <span>{cut.scanCount.toLocaleString("es-MX")} escaneos · {cut.summary.qadOnlyCount.toLocaleString("es-MX")} QAD sin físico</span>
     </div>
     <span className={cut.summary.netUsd < 0 ? "vi-money-loss" : "vi-money-gain"}>{money(cut.summary.netUsd)}</span>
     {index === 0 && <em>ÚLTIMO</em>}
    </div>
   ))}
  </div>
 )}
 <p className="vi-cut-local-note">Para una auditoría formal o para compartir cortes entre computadoras, este historial deberá moverse a base de datos. Aquí se usa como apoyo operativo sin cambiar NET ni SWING.</p>
</section>
 );
}
