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
         Financial Exposure
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
         Plant Exposure
</h2>
<p
         className="
           mt-1
           text-[11px]
           text-slate-400
         "
>
         Click any metric to inspect its source and formula.
</p>
{ready && (
<div className="mt-3 border-l-2 border-amber-400 bg-amber-400/10 px-3 py-2 text-sm text-amber-100" role="status">
  <strong>Preliminary intraday exposure.</strong>{" "}
  {formatNumber(data.qadOnlyCount ?? 0)} QAD parts have no physical scan yet
  {data.qadOnlyCount > 0 && (
    <> ({formatMoney(data.qadOnlyExposureUsd)} included in gross loss and NET)</>
  )}. They may still be awaiting audit.
  {data.qadOnlyMissingCostCount > 0 && (
    <> {formatNumber(data.qadOnlyMissingCostCount)} have no Cost Part match, so their exposure is unvalued.</>
  )} Finance must confirm when unscanned parts become losses and which locations enter the financial scope.
</div>
)}
</div>

<div className="vi-financial-strip">
<FinancialCell
         label="NET PLANT"
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
               )} PHYSICAL`
             : "WAITING REFERENCE DATA"
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
         label="GROSS LOSS"
         value={
           ready
             ? formatMoney(
                 data.grossLossUsd
               )
             : "---"
         }
         detail="SHORTAGE BEFORE OFFSET"
         tone="loss"
         topic="grossLoss"
         onHelp={
           onHelp
         }
       />

<FinancialCell
         label="GROSS GAIN"
         value={
           ready
             ? formatMoney(
                 data.grossGainUsd
               )
             : "---"
         }
         detail="SURPLUS BEFORE OFFSET"
         tone="gain"
         topic="grossGain"
         onHelp={
           onHelp
         }
       />

<FinancialCell
         label="OBSOLETE +"
         value={
           ready
             ? formatMoney(
                 data.obsoleteGainUsd
               )
             : "---"
         }
         detail="OBSOLETE SURPLUS"
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
               )} PCS`
             : "LOCATION DELTA"
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
         detail="ISPBB PHANTOM = YES"
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
