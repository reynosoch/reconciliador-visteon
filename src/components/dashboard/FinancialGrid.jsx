// src/components/dashboard/FinancialGrid.jsx
import React from "react";
import {
 Ghost,
 GhostChaseLine,
} from "../visual/PacmanGlyphs";
import {
 HelpButton,
} from "../help/HelpDrawer";
function money(value) {
 return new Intl.NumberFormat(
   "en-US",
   {
     style: "currency",
     currency: "USD",
     maximumFractionDigits: 0,
     minimumFractionDigits: 0,
   }
 ).format(
   Number(value) || 0
 );
}
function number(value) {
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
 tone,
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
   onHelp?.(topic);
 };
 return (
<div
     role="button"
     tabIndex={0}
     onClick={openHelp}
     onKeyDown={(event) => {
       if (
         event.key === "Enter" ||
         event.key === " "
       ) {
         event.preventDefault();
         openHelp();
       }
     }}
     className="
       vi-financial-cell
       text-left
       hover:bg-white/[0.015]
       transition-colors
       cursor-pointer
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
             size={14}
             tone="violet"
           />
         )}
<p className="vi-financial-label">
           {label}
</p>
</div>
<HelpButton
         topic={topic}
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
<p
       className="
         mt-2
         font-mono
         text-[8px]
         text-slate-500
       "
>
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
 const net =
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
         flex
         items-center
         justify-between
         gap-4
       "
>
<div>
<p className="vi-eyebrow">
           Financial Exposure
</p>
<h2 className="mt-1 text-lg font-black text-white vi-glow-title">
           Plant Exposure
</h2>
<p
           className="
             mt-1
             text-[10px]
             text-slate-500
           "
>
           Click any metric to inspect its source and formula.
</p>
</div>
<div
         className="
           hidden
           xl:block
           w-[280px]
         "
>
<GhostChaseLine />
</div>
</div>
<div className="vi-financial-strip">
<FinancialCell
         label="NET PLANT"
         value={
           ready
             ? money(net)
             : "---"
         }
         detail={
           ready
             ? `${number(
                 data.physicalQty
               )} PHYSICAL`
             : "WAITING REFERENCE DATA"
         }
         tone={
           net < 0
             ? "loss"
             : net > 0
               ? "gain"
               : "neutral"
         }
         topic="net"
         onHelp={onHelp}
       />
<FinancialCell
         label="GROSS LOSS"
         value={
           ready
             ? money(
                 data.grossLossUsd
               )
             : "---"
         }
         detail="SHORTAGE BEFORE OFFSET"
         tone="loss"
         topic="grossLoss"
         onHelp={onHelp}
       />
<FinancialCell
         label="GROSS GAIN"
         value={
           ready
             ? money(
                 data.grossGainUsd
               )
             : "---"
         }
         detail="SURPLUS BEFORE OFFSET"
         tone="gain"
         topic="grossGain"
         onHelp={onHelp}
       />
<FinancialCell
         label="OBSOLETE +"
         value={
           ready
             ? money(
                 data.obsoleteGainUsd
               )
             : "---"
         }
         detail="OBSOLETE SURPLUS"
         tone="gain"
         topic="obsolete"
         onHelp={onHelp}
       />
<FinancialCell
         label="SWING"
         value={
           ready
             ? money(
                 data.swingUsd
               )
             : "---"
         }
         detail={
           ready
             ? `${number(
                 data.swingPieces
               )} PCS`
             : "LOCATION DELTA"
         }
         tone="swing"
         topic="swing"
         onHelp={onHelp}
       />
<FinancialCell
         label="PHANTOMS"
         value={
           ready
             ? number(
                 data.phantomCount
               )
             : "---"
         }
         detail="ISPBB PHANTOM = YES"
         tone="phantom"
         topic="phantom"
         onHelp={onHelp}
         ghost
       />
</div>
</section>
 );
}