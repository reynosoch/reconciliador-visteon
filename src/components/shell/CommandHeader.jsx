// src/components/shell/CommandHeader.jsx
import React from "react";
function time(date) {
 if (!date) {
   return "--:--:--";
 }
 return new Intl.DateTimeFormat(
   "es-MX",
   {
     hour: "2-digit",
     minute: "2-digit",
     second: "2-digit",
     hour12: false,
   }
 ).format(
   new Date(date)
 );
}
function SourceState({
 label,
 state,
 detail,
 ready = false,
 live = false,
}) {
 return (
<div
     className="
       flex
       items-center
       gap-2
     "
>
<span
       className={`
         w-1.5
         h-1.5
         rounded-full
         ${
           live
             ? "bg-emerald-400"
             : ready
               ? "bg-orange-400"
               : "bg-slate-700"
         }
       `}
     />
<div>
<p
         className="
           font-mono
           text-[9px]
           font-black
           text-slate-200
         "
>
         {label}{" "}
<span
           className={
             live
               ? "text-emerald-400"
               : ready
                 ? "text-orange-300"
                 : "text-slate-500"
           }
>
           {state}
</span>
</p>
<p
         className="
           font-mono
           text-[7px]
           text-slate-500
         "
>
         {detail}
</p>
</div>
</div>
 );
}
export default function CommandHeader({
 connectionStatus,
 scanCount = 0,
 lastUpdated,
 referenceStatus,
 loading = false,
 sourcesOpen = false,
 onRefresh,
 onToggleSources,
 onOpenRules,
}) {
 const live =
   connectionStatus?.state ===
   "LIVE";
 const refsReady =
   referenceStatus?.allLoaded ===
   true;
 const loaded =
   referenceStatus
     ?.loadedCount || 0;
 const total =
   referenceStatus
     ?.totalSources || 5;
 return (
<header
     className="
       vi-command-header
       sticky
       top-0
       z-50
     "
>
<div
       className="
         max-w-[1750px]
         mx-auto
         px-4
         sm:px-6
         min-h-[60px]
         flex
         items-center
         justify-between
         gap-5
       "
>
<div
         className="
           flex
           items-center
           gap-3
           flex-shrink-0
         "
>
<div className="vi-vtag">
           V
</div>
<div>
<div className="flex items-center gap-2">
<span className="text-[20px] font-black text-white leading-none vi-glow-title-soft">
               Visteon
</span>
<span className="text-slate-800">
               /
</span>
<span
               className="
                 font-mono
                 text-[8px]
                 text-slate-400
               "
>
               INVENTORY CONTROL
</span>
</div>
<p
             className="
               font-mono
               text-[7px]
               tracking-[0.13em]
               text-slate-600
             "
>
             FINANCIAL RECONCILIATION
</p>
</div>
</div>
<div
         className="
           hidden
           lg:flex
           items-center
           gap-8
           flex-1
           justify-center
         "
>
<SourceState
           label="4WALL"
           state={
             live
               ? "LIVE"
               : "WAIT"
           }
           detail={`${scanCount.toLocaleString(
             "en-US"
           )} scans`}
           live={live}
         />
<SourceState
           label="QAD"
           state={
             refsReady
               ? "FROZEN"
               : "WAIT"
           }
           detail="Site 179A"
           ready={refsReady}
         />
<SourceState
           label="REFERENCE"
           state={
             refsReady
               ? "READY"
               : `${loaded}/${total}`
           }
           detail="Areas · ISPBB · BOM · Cost"
           ready={refsReady}
         />
</div>
<div
         className="
           flex
           items-center
           gap-2
         "
>
<div
           className="
             hidden
             sm:block
             text-right
             mr-2
           "
>
<p
             className="
               font-mono
               text-[7px]
               text-slate-600
             "
>
             LAST CUT
</p>
<p
             className="
               font-mono
               text-[9px]
               font-bold
               text-slate-300
             "
>
             {time(
               lastUpdated
             )}
</p>
</div>
<button
           type="button"
           onClick={
             onToggleSources
           }
           className={`
             vi-button
             ${
               sourcesOpen
                 ? "text-orange-300 border-orange-500/40"
                 : ""
             }
           `}
>
           SOURCES
<span className="text-slate-500">
             {loaded}/{total}
</span>
</button>
<button
           type="button"
           onClick={
             onOpenRules
           }
           className="vi-button"
>
           ?
</button>
<button
           type="button"
           disabled={loading}
           onClick={
             onRefresh
           }
           className="
             vi-button
             vi-button-primary
           "
>
           {loading
             ? "SYNC..."
             : "SYNC"}
</button>
</div>
</div>
</header>
 );
}