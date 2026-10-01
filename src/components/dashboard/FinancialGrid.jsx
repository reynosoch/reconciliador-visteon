// src/components/dashboard/FinancialGrid.jsx
import {
 Ghost,
} from "../visual/PacmanGlyphs";
import {
 HelpButton,
} from "../help/HelpDrawer";

function formatMoney(value) {
 return new Intl.NumberFormat(
   "en-US",
   {
     style:
       "currency",
     currency:
       "USD",
     maximumFractionDigits:
       0,
     minimumFractionDigits:
       0,
   }
 ).format(
   Number(value) || 0
 );
}

function formatNumber(value) {
 return new Intl.NumberFormat(
   "en-US"
 ).format(
   Number(value) || 0
 );
}

function FinancialCell({
 label,
 value,
 detail,
 tone = "neutral",
 topic,
 onHelp,
 ghost = false,
}) {
 const toneClass = {
   loss:
     "vi-money-loss",
   gain:
     "vi-money-gain",
   swing:
     "vi-money-swing",
   phantom:
     "vi-money-phantom",
   neutral:
     "vi-money-neutral",
 }[tone] ||
 "vi-money-neutral";

 const openHelp = () => {
   onHelp?.(
     topic
   );
 };

 return (
<div
     role="button"
     tabIndex={0}
     onClick={
       openHelp
     }
     onKeyDown={
       (event) => {
         if (
           event.key ===
             "Enter" ||
           event.key ===
             " "
         ) {
           event.preventDefault();
           openHelp();
         }
       }
     }
     className="
       vi-financial-cell
       text-left
       cursor-pointer
       transition-colors
       hover:bg-white/[0.02]
     "
>
<div
       className="
         flex
         items-center
         justify-between
         gap-2
       "
>
<div
         className="
           flex
           items-center
           gap-2
         "
>
         {ghost && (
<Ghost
             size={13}
             tone="violet"
           />
         )}
<p className="vi-financial-label">
           {label}
</p>
</div>

<HelpButton
         topic={
           topic
         }
         onHelp={
           onHelp
         }
       />
</div>

<div
       className={`
         vi-financial-value
         ${toneClass}
       `}
>
       {value}
</div>

<p className="vi-financial-detail">
       {detail}
</p>
</div>
 );
}

export default function FinancialGrid({
 summary,
 ready = false,
 onHelp,

}) {
 const data =
   summary || {};

 const netUsd =
   Number(
     data.netUsd
   ) || 0;

 return (
<section
     className="
       vi-panel
       vi-financial-shell
     "
>
<div
       className="
         px-5
         py-4
         border-b
         border-slate-800/70
       "
>
<p className="vi-eyebrow">
         IMPACTO FINANCIERO
</p>
<h2
         className="
           mt-1
           text-lg
           font-black
           text-white
           vi-glow-title
         "
>
         Diferencias en dólares
</h2>
<p
         className="
           mt-1
           text-[11px]
           text-slate-400
         "
>
         Selecciona un indicador para ver su origen y cálculo.
</p>

{ready && (
<div className="mt-3 border-l-2 border-amber-400 bg-amber-400/10 px-3 py-2 text-sm text-amber-100" role="status">
  <strong>Resultados de lo contado hasta ahora.</strong>{" "}
  {formatNumber(data.qadOnlyCount ?? 0)} números de parte de QAD aún no tienen físico registrado
  {data.qadOnlyCount > 0 && (
    <> ({formatMoney(data.qadOnlyExposureUsd)} incluidos en pérdida bruta y NET)</>
  )}. Puede que todavía no terminen de contarlos.
  {data.qadOnlyMissingCostCount > 0 && (
    <> {formatNumber(data.qadOnlyMissingCostCount)} no tienen costo en Cost Part; todavía no podemos calcular su diferencia en dólares.</>
  )} La diferencia puede cambiar mientras avanza el conteo.
  {data.unvaluedPartCount > 0 && (
    <div className="mt-2 border-t border-amber-200/20 pt-2"><strong>Falta costo:</strong> {formatNumber(data.unvaluedPartCount)} números de parte tienen diferencias, pero falta un costo confiable para calcular sus dólares.</div>
  )}
  <div className="mt-2 border-t border-amber-200/20 pt-2">
    <strong>Partes con conteo registrado:</strong> {formatMoney(data.netUsdWithPhysicalEvidence ?? 0)} de diferencia corresponden a {formatNumber(data.partsWithPhysicalEvidence ?? 0)} números de parte con escaneos o cantidades calculadas desde un ensamble. Su conteo todavía puede estar en proceso.
  </div>
</div>
)}
</div>

<div className="vi-financial-strip">
<FinancialCell
         label={data.unvaluedPartCount > 0 ? "DIFERENCIA VALORADA EN DÓLARES" : "DIFERENCIA TOTAL EN DÓLARES"}
         value={
           ready
             ? formatMoney(
                 netUsd
               )
             : "---"
         }
         detail={
           ready
             ? `${formatNumber(
                 data.physicalQty
               ) } FÍSICO`
             : "FALTAN REFERENCIAS"
         }
         tone={
           netUsd < 0
             ? "loss"
             : netUsd > 0
               ? "gain"
               : "neutral"
         }
         topic="financialNet"
         onHelp={
           onHelp
         }
       />

<FinancialCell
         label="PÉRDIDA BRUTA"
         value={
           ready
             ? formatMoney(
                 data.grossLossUsd
               )
             : "---"
         }
         detail="TOTAL DE DIFERENCIAS NEGATIVAS"
         tone="loss"
         topic="financialGrossLoss"
         onHelp={
           onHelp
         }
       />

<FinancialCell
         label="GANANCIA BRUTA"
         value={
           ready
             ? formatMoney(
                 data.grossGainUsd
               )
             : "---"
         }
         detail="TOTAL DE DIFERENCIAS POSITIVAS"
         tone="gain"
         topic="financialGrossGain"
         onHelp={
           onHelp
         }
       />

<FinancialCell
         label="OBSOLETO +"
         value={
           ready
             ? formatMoney(
                 data.obsoleteGainUsd
               )
             : "---"
         }
         detail="SOBRANTE OBSOLETO"
         tone="gain"
         topic="financialObsolete"
         onHelp={
           onHelp
         }
       />

<FinancialCell
         label="SWING"
         value={
           ready
             ? formatMoney(
                 data.swingUsd
               )
             : "---"
         }
         detail={
           ready
             ? `${formatNumber(
                 data.swingPieces
               ) } PIEZAS`
             : "DIFERENCIA POR LOCALIDAD"
         }
         tone="swing"
         topic="financialSwing"
         onHelp={
           onHelp
         }
       />

<FinancialCell
         label="PHANTOMS"
         value={
           ready
             ? formatNumber(
                 data.phantomCount
               )
             : "---"
         }
         detail="DEFINIDOS EN ISPBB"
         tone="phantom"
         topic="financialPhantom"
         onHelp={
           onHelp
         }
         ghost
       />
</div>
</section>
 );
}
