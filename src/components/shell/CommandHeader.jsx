// src/components/shell/CommandHeader.jsx
import React from "react";
import {
 MenuChaseRail,
} from "../visual/PacmanGlyphs";

function formatTime(date) {
 if (!date) {
   return "--:--:--";
 }
 try {
   return new Intl.DateTimeFormat(
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
     new Date(date)
   );
 } catch {
   return "--:--:--";
 }
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
       gap-2.5
       min-w-[110px]
     "
>
<span
       className={`
         w-2
         h-2
         rounded-full
         flex-shrink-0
         ${
           live
             ? "bg-emerald-400"
             : ready
               ? "bg-orange-400"
               : "bg-slate-600"
         }
       `}
     />
<div>
<p
         className="
           text-[10px]
           font-bold
           text-white
           leading-tight
         "
>
         {label}
</p>
<div
         className="
           flex
           items-center
           gap-1.5
           mt-0.5
         "
>
<span
           className={`
             text-[9px]
             font-bold
             ${
               live
                 ? "text-emerald-400"
                 : ready
                   ? "text-orange-300"
                   : "text-slate-400"
             }
           `}
>
           {state}
</span>
<span
           className="
             text-[9px]
             text-slate-400
           "
>
           {detail}
</span>
</div>
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

 const referencesReady =
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
       "
>
<div
         className="
           min-h-[64px]
           flex
           items-center
           justify-between
           gap-5
         "
>
         {/* BRAND */}
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
<div
               className="
                 flex
                 items-center
                 gap-2
               "
>
<span
                 className="
                   text-xl
                   font-black
                   text-white
                   leading-none
                   vi-glow-title-soft
                 "
>
                 Visteon
</span>
<span className="text-slate-600">
                 /
</span>
<span
                 className="
                   text-[10px]
                   font-bold
                   text-slate-300
                 "
>
                 INVENTORY CONTROL
</span>
</div>
<p
               className="
                 mt-1
                 text-[9px]
                 tracking-[0.08em]
                 text-slate-400
               "
>
               FINANCIAL RECONCILIATION
</p>
</div>
</div>

         {/* FLOW */}
<div
           className="
             hidden
             lg:flex
             items-center
             justify-center
             gap-4
             flex-1
             min-w-0
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

<div
             className="
               w-[90px]
               xl:w-[140px]
             "
>
<MenuChaseRail />
</div>

<SourceState
             label="QAD"
             state={
               referencesReady
                 ? "FROZEN"
                 : "WAIT"
             }
             detail="Site 179A"
             ready={
               referencesReady
             }
           />

<div
             className="
               hidden
               xl:block
               w-[110px]
             "
>
<MenuChaseRail />
</div>

<SourceState
             label="REFERENCE"
             state={
               referencesReady
                 ? "READY"
                 : `${loaded}/${total}`
             }
             detail="BOM · COST · ISPBB"
             ready={
               referencesReady
             }
           />
</div>

         {/* ACTIONS */}
<div
           className="
             flex
             items-center
             gap-2
             flex-shrink-0
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
                 text-[9px]
                 text-slate-400
               "
>
               LAST FETCH
</p>
<p
               className="
                 text-[10px]
                 font-bold
                 text-white
               "
>
               {
                 formatTime(
                   lastUpdated
                 )
               }
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
<span className="text-slate-400">
               {loaded}/{total}
</span>
</button>

<button
             type="button"
             onClick={
               onOpenRules
             }
             className="vi-button"
             title="Ayuda y metodología"
>
             ?
</button>

<button
             type="button"
             disabled={
               loading
             }
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
</div>
</header>
 );
}
