// src/components/dashboard/DataHealthBar.jsx
import React from "react";

function formatNumber(value) {
 return new Intl.NumberFormat(
   "en-US"
 ).format(
   Number(value) || 0
 );
}

function HealthItem({
 label,
 value,
 tone = "normal",
}) {
 const toneClass = {
   normal:
     "text-slate-300",
   live:
     "text-emerald-400",
   frozen:
     "text-cyan-300",
   warning:
     "text-amber-400",
   error:
     "text-rose-400",
   phantom:
     "text-violet-400",
 }[tone] || "text-slate-300";

 const dotClass = {
   normal:
     "bg-slate-500",
   live:
     "bg-emerald-400",
   frozen:
     "bg-cyan-400",
   warning:
     "bg-amber-400",
   error:
     "bg-rose-500",
   phantom:
     "bg-violet-400",
 }[tone] || "bg-slate-500";

 return (
<div
     className="
       flex
       items-center
       gap-2
       whitespace-nowrap
     "
>
<span
       className={`
         w-1.5
         h-1.5
         rounded-full
         ${dotClass}
       `}
     />

<span
       className="
         font-mono
         text-[8px]
         font-black
         uppercase
         tracking-[0.12em]
         text-slate-600
       "
>
       {label}
</span>

<span
       className={`
         font-mono
         text-[9px]
         font-bold
         ${toneClass}
       `}
>
       {value}
</span>
</div>
 );
}

function Divider() {
 return (
<span
     className="
       hidden
       sm:inline
       text-slate-800
       font-mono
       text-[10px]
     "
>
     //
</span>
 );
}

export default function DataHealthBar({
 diagnostics,
 scanCount = 0,
 lastUpdated,
 referencesReady = false,
 liveReady = false,
}) {
 const sources =
   diagnostics?.sources || {};
 const warnings =
   diagnostics?.warnings || {};

 const warningCount =
 referencesReady
   ? (
       (
         warnings
           .unmappedAreaNames
           ?.length || 0
       ) +
       (
         warnings
           .partsWithoutCost
           ?.length || 0
       ) +
       (
         warnings
           .unexpectedMaterial
           ?.length || 0
       ) +
       (
         warnings
           .phantomDefinitionMismatches
           ?.length || 0
       )
     )
   : 0;

 const hasWarnings =
   warningCount > 0;

 return (
<section
     className="
       vi-panel-flat
       px-4
       py-3
       overflow-x-auto
     "
>
<div
       className="
         flex
         items-center
         gap-3
         min-w-max
       "
>
<span
         className="
           font-mono
           text-[9px]
           font-black
           uppercase
           tracking-[0.16em]
           text-orange-400
         "
>
         System Health
</span>

<div className="w-8 h-px bg-orange-500/30" />

<HealthItem
 label="Warnings"
 value={
   referencesReady
     ? formatNumber(
         warningCount
       )
     : "WAIT"
 }
 tone={
   !referencesReady
     ? "warning"
     : hasWarnings
       ? "warning"
       : "live"
 }
/>

<Divider />

<HealthItem
         label="QAD"
         value={
           referencesReady
             ? formatNumber(
                 sources.qadPartCount
               )
             : "WAIT"
         }
         tone={
           referencesReady
             ? "frozen"
             : "warning"
         }
       />

<Divider />

<HealthItem
         label="Cost"
         value={
           referencesReady
             ? formatNumber(
                 sources.costPartCount
               )
             : "WAIT"
         }
         tone={
           referencesReady
             ? "normal"
             : "warning"
         }
       />

<Divider />

<HealthItem
         label="BOM"
         value={
           referencesReady
             ? formatNumber(
                 sources.bomRelationCount
               )
             : "WAIT"
         }
         tone={
           referencesReady
             ? "normal"
             : "warning"
         }
       />

<Divider />

<HealthItem
         label="ISPBB"
         value={
           referencesReady
             ? formatNumber(
                 sources.ispbbPartCount
               )
             : "WAIT"
         }
         tone={
           referencesReady
             ? "normal"
             : "warning"
         }
       />

<Divider />

<HealthItem
         label="Phantoms"
         value={
           referencesReady
             ? formatNumber(
                 sources.ispbbPhantomCount
               )
             : "WAIT"
         }
         tone={
           referencesReady
             ? "phantom"
             : "warning"
         }
       />

<Divider />

<HealthItem
         label="Warnings"
         value={
           formatNumber(
             warningCount
           )
         }
         tone={
           hasWarnings
             ? "warning"
             : "live"
         }
       />

       {lastUpdated && (
<>
<Divider />
<HealthItem
             label="Fetched"
             value={
               new Intl.DateTimeFormat(
                 "es-MX",
                 {
                   hour:
                     "2-digit",
                   minute:
                     "2-digit",
                   second:
                     "2-digit",
                   hour12:
                     false,
                 }
               ).format(
                 new Date(
                   lastUpdated
                 )
               )
             }
             tone="normal"
           />
</>
       )}
</div>
</section>
 );
}
