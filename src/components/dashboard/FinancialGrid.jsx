// src/components/dashboard/FinancialGrid.jsx
import React from "react";
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
         Exposición de planta
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
  <strong>Corte intradía preliminar.</strong>{" "}
  {formatNumber(data.qadOnlyCount ?? 0)} Part Numbers de QAD aún no tienen escaneo físico
  {data.qadOnlyCount > 0 && (
    <> ({formatMoney(data.qadOnlyExposureUsd)} incluidos en pérdida bruta y NET)</>
  )}. Pueden seguir pendientes de auditar.
  {data.qadOnlyMissingCostCount > 0 && (
    <> {formatNumber(data.qadOnlyMissingCostCount)} no tienen costo en Cost Part; su exposición aún no se puede valorar.</>
  )} Finanzas debe definir cuándo un material sin escaneo cuenta como pérdida y qué localidades entran al cálculo.
</div>
)}
</div>

<div className="vi-financial-strip">
<FinancialCell
         label="NET PLANTA"
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
         topic="net"
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
         detail="ANTES DE COMPENSAR GANANCIAS"
         tone="loss"
         topic="grossLoss"
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
         detail="ANTES DE COMPENSAR PÉRDIDAS"
         tone="gain"
         topic="grossGain"
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
         topic="obsolete"
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
               ) } PZAS`
             : "DIFERENCIA POR LOCALIDAD"
         }
         tone="swing"
         topic="swing"
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
         topic="phantom"
         onHelp={
           onHelp
         }
         ghost
       />
</div>
</section>
 );
}
