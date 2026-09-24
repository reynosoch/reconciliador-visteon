// src/components/detail/PartDetailDrawer.jsx
import React from "react";
import {
 PacDot,
 Ghost,
 PelletRail,
} from "../visual/PacmanGlyphs";

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
   "en-US",
   {
     maximumFractionDigits: 2,
   }
 ).format(
   Number(value) || 0
 );
}

function mapEntries(map) {
 if (
   !map ||
   typeof map.entries !==
     "function"
 ) {
   return [];
 }
 return Array.from(
   map.entries()
 )
   .filter(
     ([, qty]) =>
       Number(qty) !== 0
   )
   .sort(
     (a, b) =>
       Math.abs(
         Number(b[1])
       ) -
       Math.abs(
         Number(a[1])
       )
   );
}

function LocationColumn({
 title,
 locations,
}) {
 const entries =
   mapEntries(
     locations
   );

 return (
<div className="vi-maze-box p-4">
<p className="vi-eyebrow">
       {title}
</p>

<div className="mt-4 space-y-2">
       {entries.length ===
       0 ? (
<p className="font-mono text-[8px] text-slate-700">
           NO LOCATION DATA
</p>
       ) : (
         entries.map(
           ([
             location,
             qty,
           ]) => (
<div
               key={
                 location
               }
               className="
                 flex
                 items-center
                 justify-between
                 gap-3
                 border-b
                 border-slate-800/60
                 pb-2
               "
>
<span
                 className="
                   font-mono
                   text-[9px]
                   text-slate-400
                 "
>
                 {location}
</span>
<span
                 className="
                   font-mono
                   text-[9px]
                   font-bold
                   text-white
                 "
>
                 {number(qty)}
</span>
</div>
           )
         )
       )}
</div>
</div>
 );
}

function Metric({
 label,
 value,
 className = "",
}) {
 return (
<div>
<p
       className="
         font-mono
         text-[7px]
         font-black
         tracking-[0.12em]
         text-slate-700
       "
>
       {label}
</p>
<p
       className={`
         vi-money
         mt-1
         text-sm
         text-white
         ${className}
       `}
>
       {value}
</p>
</div>
 );
}

function BomMaze({
 item,
}) {
 const master =
   item?.master || {};
 const physical =
   item?.physical || {};

 return (
<div
     className="
       vi-maze-box
       p-5
       overflow-hidden
     "
>
<div
       className="
         flex
         items-center
         justify-between
         gap-4
       "
>
<div>
<p className="vi-eyebrow">
           BOM Maze Trace
</p>
<p
           className="
             mt-1
             text-xs
             font-black
             text-white
           "
>
           Material Route
</p>
</div>

       {master.phantom ? (
<Ghost
           size={28}
           tone="violet"
         />
       ) : (
<PacDot
           size={28}
         />
       )}
</div>

<PelletRail
       className="mt-5"
     />

<div
       className="
         mt-5
         vi-trace
       "
>
<div className="vi-trace-node">
<p
           className="
             font-mono
             text-[8px]
             text-slate-700
           "
>
           SOURCE
</p>
<p
           className="
             font-mono
             text-[10px]
             font-bold
             text-white
           "
>
           4WALL SCAN
</p>
</div>

<div className="vi-trace-node">
<p
           className="
             font-mono
             text-[8px]
             text-slate-700
           "
>
           PHYSICAL
</p>
<p
           className="
             font-mono
             text-[10px]
             text-cyan-300
           "
>
           {number(
             physical.total
           )} PCS
</p>
</div>

<div className="vi-trace-node">
<p
           className="
             font-mono
             text-[8px]
             text-slate-700
           "
>
           ITEM DEFINITION
</p>
<p
           className="
             font-mono
             text-[10px]
             text-slate-300
           "
>
           {master.phantom
             ? "ISPBB â†’ PHANTOM YES"
             : "ISPBB â†’ REGULAR"}
</p>
</div>

       {master.phantom && (
<div className="vi-trace-node">
<div
             className="
               flex
               items-center
               gap-2
             "
>
<Ghost
               size={16}
               tone="violet"
             />
<p
               className="
                 font-mono
                 text-[10px]
                 font-bold
                 text-violet-300
               "
>
               BOM PHANTOM CONTRIBUTION
</p>
</div>

<p
             className="
               mt-1
               font-mono
               text-[8px]
               text-slate-700
             "
>
             Usage multiplier preserved from BOM Export
</p>
</div>
       )}

<div className="vi-trace-node">
<p
           className="
             font-mono
             text-[8px]
             text-slate-700
           "
>
           DESTINATION
</p>
<p
           className="
             font-mono
             text-[10px]
             font-bold
             text-orange-300
           "
>
           FINANCIAL ENGINE
</p>
</div>
</div>
</div>
 );
}

export default function PartDetailDrawer({
 item,
 onClose,
}) {
 if (!item) {
   return null;
 }

 const financial =
   item.financial ||
   {};
 const physical =
   item.physical ||
   {};
 const qad =
   item.qad || {};
 const master =
   item.master ||
   {};

 return (
<div
     className="vi-detail-overlay"
     onMouseDown={
       (event) => {
         if (
           event.target ===
           event.currentTarget
         ) {
           onClose?.();
         }
       }
     }
>
<aside className="vi-detail-drawer">
<div
         className="
           sticky
           top-0
           z-10
           bg-[#05111a]/95
           backdrop-blur-xl
           border-b
           border-slate-800
           px-5
           py-4
         "
>
<div
           className="
             flex
             items-start
             justify-between
             gap-4
           "
>
<div
             className="
               flex
               items-center
               gap-3
             "
>
             {master.phantom ? (
<Ghost
                 size={28}
                 tone="violet"
               />
             ) : (
<PacDot
                 size={28}
               />
             )}

<div>
<p className="vi-eyebrow">
                 Part Trace
</p>
<h2
                 className="
                   mt-1
                   font-mono
                   text-base
                   font-black
                   text-white
                 "
>
                 {item.partNumber}
</h2>
</div>
</div>

<button
             type="button"
             onClick={
               onClose
             }
             className="vi-button"
>
             CLOSE
</button>
</div>

<PelletRail
           muted
           className="mt-4"
         />
</div>

<div className="p-5">
<div
           className="
             grid
             grid-cols-2
             lg:grid-cols-4
             gap-4
           "
>
<Metric
             label="NET USD"
             value={
               money(
                 financial.netUsd
               )
             }
             className={
               Number(
                 financial.netUsd
               ) < 0
                 ? "vi-money-loss"
                 : "vi-money-gain"
             }
           />
<Metric
             label="SWING"
             value={
               money(
                 financial.swingUsd
               )
             }
             className="vi-money-swing"
           />
<Metric
             label="PHYSICAL"
             value={
               number(
                 physical.total
               )
             }
           />
<Metric
             label="QAD"
             value={
               number(
                 qad.total
               )
             }
           />
</div>

<div
           className="
             mt-5
             grid
             grid-cols-1
             sm:grid-cols-2
             gap-4
           "
>
<LocationColumn
             title="4Wall / Physical"
             locations={
               physical.locations
             }
           />
<LocationColumn
             title="QAD / System"
             locations={
               qad.locations
             }
           />
</div>

<div className="mt-5">
<BomMaze
             item={item}
           />
</div>

<div
           className="
             mt-5
             grid
             grid-cols-2
             sm:grid-cols-4
             gap-4
           "
>
<Metric
             label="UNIT COST"
             value={
               master.hasCost
                 ? money(
                     master.unitCost
                   )
                 : "â€”"
             }
           />
<Metric
             label="COST STATUS"
             value={
               master.costStatus ||
               "â€”"
             }
           />
<Metric
             label="PLANNING"
             value={
               master.planningStatus ||
               "â€”"
             }
           />
<Metric
             label="PHANTOM"
             value={
               master.phantom
                 ? "YES"
                 : "NO"
             }
             className={
               master.phantom
                 ? "vi-money-phantom"
                 : ""
             }
           />
</div>
</div>
</aside>
</div>
 );
}
