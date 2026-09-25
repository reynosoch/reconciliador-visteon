// src/components/dashboard/InventoryWorkspace.jsx
import React, {
 useMemo,
 useState,
} from "react";
import {
 Ghost,
} from "../visual/PacmanGlyphs";
import {
 HelpButton,
} from "../help/HelpDrawer";

const FILTERS = [
 {
   id: "ALL",
   label: "All",
 },
 {
   id: "LOSS",
   label: "Loss",
 },
 {
   id: "GAIN",
   label: "Gain",
 },
 {
   id: "HAS_SWING",
   label: "Has Swing",
 },
 {
   id: "UNEXPECTED",
   label: "QAD 0",
 },
 {
   id: "OBSOLETE_GAIN",
   label: "Obsolete +",
 },
 {
   id: "PHANTOM",
   label: "Phantom",
 },
 {
   id: "BOM_REVIEW",
   label: "BOM Review",
 },
];

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

function moneyTone(value) {
 const n =
   Number(value) || 0;
 if (n < 0) {
   return "vi-money-loss";
 }
 if (n > 0) {
   return "vi-money-gain";
 }
 return "text-slate-500";
}

function Radar({
 rows,
 onSelectPart,
 onHelp,
}) {
 const ghosts =
   useMemo(
     () =>
       rows
         .filter(
           (item) =>
             item?.master
               ?.isPhantom ===
             true
         )
         .sort(
           (a, b) =>
             Math.abs(
               Number(
                 b?.financial
                   ?.netUsd
               ) || 0
             ) -
             Math.abs(
               Number(
                 a?.financial
                   ?.netUsd
               ) || 0
             )
         )
         .slice(
           0,
           6
         ),
     [rows]
   );

 return (
<aside
     className="
       border-l
       border-slate-800
       bg-black/10
       h-full
     "
>
<div
       className="
         px-4
         py-3.5
         border-b
         border-slate-800
       "
>
<div
         className="
           flex
           items-center
           justify-between
         "
>
<div className="flex items-center gap-2">
<Ghost
             size={15}
             tone="violet"
           />
<span
             className="
               font-mono
               text-[8px]
               font-black
               tracking-[0.12em]
               text-violet-400
             "
>
             PHANTOM RADAR
</span>
</div>

<HelpButton
           topic="phantom"
           onHelp={onHelp}
         />
</div>
</div>

<div className="p-3">
       {ghosts.length ===
       0 ? (
<p
           className="
             py-8
             text-center
             font-mono
             text-[8px]
             text-slate-700
           "
>
           NO ACTIVE PHANTOM PARTS
</p>
       ) : (
<div className="space-y-1">
           {ghosts.map(
             (item) => (
<button
                 type="button"
                 key={
                   item.partNumber
                 }
                 onClick={() =>
                   onSelectPart?.(
                     item
                   )
                 }
                 className="
                   w-full
                   flex
                   items-center
                   justify-between
                   gap-3
                   px-2
                   py-2
                   text-left
                   hover:bg-violet-500/[0.04]
                   transition-colors
                 "
>
<span
                   className="
                     font-mono
                     text-[8px]
                     text-slate-400
                     truncate
                   "
>
                   {
                     item.partNumber
                   }
</span>
<span
                   className={`
                     vi-money
                     text-[8px]
                     ${moneyTone(
                       item
                         ?.financial
                         ?.netUsd
                     )}
                   `}
>
                   {money(
                     item
                       ?.financial
                       ?.netUsd
                   )}
</span>
</button>
             )
           )}
</div>
       )}
</div>
</aside>
 );
}

function HeaderHelp({
 children,
 topic,
 onHelp,
 align = "left",
}) {
 return (
<div
     className={`
       flex
       items-center
       gap-1.5
       ${
         align === "right"
           ? "justify-end"
           : align === "center"
             ? "justify-center"
             : ""
       }
     `}
>
<span>
       {children}
</span>
<HelpButton
       topic={topic}
       onHelp={onHelp}
     />
</div>
 );
}

export default function InventoryWorkspace({
 rows = [],
 ready = false,
 onSelectPart,
 onHelp,
}) {
 const [
   search,
   setSearch,
 ] = useState("");

 const [
   filter,
   setFilter,
 ] = useState("ALL");

 const filtered =
   useMemo(() => {
     const query =
       search
         .trim()
         .toUpperCase();

     return rows.filter(
       (item) => {
         if (
           query &&
           !String(
             item.partNumber || ""
           )
             .toUpperCase()
             .includes(query)
         ) {
           return false;
         }

         if (
           filter ===
           "PHANTOM"
         ) {
           return (
             item?.master
               ?.isPhantom ===
             true
           );
         }

         if (filter === "BOM_REVIEW") {
           return item?.flags?.isMissingPhysical === true &&
             item?.flags?.hasBomReference === true;
         }

         if (
           filter ===
           "HAS_SWING"
         ) {
           return (
             Number(
               item?.financial
                 ?.swingUsd
             ) > 0
           );
         }

         if (
           filter !== "ALL" &&
           String(
             item?.flags
               ?.financialStatus || ""
           ).toUpperCase() !==
             filter
         ) {
           return false;
         }

         return true;
       }
     );
   }, [
     rows,
     search,
     filter,
   ]);

 return (
<section
     className="
       vi-panel
       overflow-hidden
     "
>
<div
       className="
         px-4
         py-3.5
         border-b
         border-slate-800
       "
>
<div
         className="
           flex
           flex-col
           lg:flex-row
           lg:items-center
           justify-between
           gap-3
         "
>
<div>
<p className="vi-eyebrow">
             Inventory Workspace
</p>
<p
             className="
               mt-0.5
               text-[9px]
               text-slate-600
             "
>
             Click any Part Number to inspect locations and calculation trace.
</p>
</div>

<input
           value={search}
           disabled={!ready}
           onChange={(event) =>
             setSearch(
               event.target.value
             )
           }
           className="
             vi-input
             lg:max-w-[310px]
           "
           placeholder="SEARCH PART NUMBER..."
         />
</div>

<div
         className="
           flex
           gap-1
           mt-3
           overflow-x-auto
         "
>
         {FILTERS.map(
           (option) => (
<button
               key={
option.id
               }
               type="button"
               disabled={!ready}
               onClick={() =>
                 setFilter(
option.id
                 )
               }
               className={`
                 workspace-filter
                 ${
                   filter ===
option.id
                     ? "workspace-filter-active"
                     : ""
                 }
               `}
>
               {option.label}
</button>
           )
         )}

<span
           className="
             ml-auto
             self-center
             font-mono
             text-[7px]
             text-slate-700
             whitespace-nowrap
           "
>
           {filtered.length.toLocaleString(
             "en-US"
           )}{" "}
           PARTS
</span>
</div>
</div>

     {!ready ? (
<div
         className="
           min-h-[220px]
           flex
           items-center
           justify-center
           text-center
           px-6
         "
>
<div>
<p
             className="
               text-sm
               font-black
               text-slate-300
             "
>
             Reference package required
</p>
<p
             className="
               mt-2
               text-[9px]
               text-slate-600
             "
>
             Open SOURCES and select the five files in a single upload.
</p>
</div>
</div>
     ) : (
<div
         className="
           grid
           grid-cols-1
           2xl:grid-cols-[minmax(0,1fr)_270px]
         "
>
<div
           className="
             min-w-0
             overflow-x-auto
           "
>
<table className="vi-table">
<thead>
<tr>
<th>
<HeaderHelp
                     topic="status"
                     onHelp={onHelp}
>
                     Part / Status
</HeaderHelp>
</th>
<th className="text-right">
<HeaderHelp
                     topic="net"
                     onHelp={onHelp}
                     align="right"
>
                     NET USD
</HeaderHelp>
</th>
<th className="text-right">
<HeaderHelp
                     topic="swing"
                     onHelp={onHelp}
                     align="right"
>
                     SWING
</HeaderHelp>
</th>
<th className="text-right">
<HeaderHelp
                     topic="physical"
                     onHelp={onHelp}
                     align="right"
>
                     PHYSICAL
</HeaderHelp>
</th>
<th className="text-right">
<HeaderHelp
                     topic="qad"
                     onHelp={onHelp}
                     align="right"
>
                     QAD
</HeaderHelp>
</th>
<th className="text-right">
<HeaderHelp
                     topic="cost"
                     onHelp={onHelp}
                     align="right"
>
                     COST
</HeaderHelp>
</th>
<th className="text-center">
<HeaderHelp
                     topic="flags"
                     onHelp={onHelp}
                     align="center"
>
                     FLAG
</HeaderHelp>
</th>
</tr>
</thead>

<tbody>
               {filtered.map(
                 (item) => {
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
                   const flags =
                     item.flags ||
                     {};

                   return (
<tr
                       key={
                         item.partNumber
                       }
                       onClick={() =>
                         onSelectPart?.(
                           item
                         )
                       }
                       className="cursor-pointer"
>
<td>
<div
                           className="
                             flex
                             items-center
                             gap-2
                           "
>
                           {master.isPhantom && (
<Ghost
                               size={12}
                               tone="violet"
                             />
                           )}
<div>
<p
                               className="
                                 vi-pn
                                 text-[9px]
                               "
>
                               {
                                 item.partNumber
                               }
</p>
<span
                               className="
                                 font-mono
                                 text-[6px]
                                 text-slate-700
                               "
>
                               {
                                 flags.financialStatus ||
                                 "UNKNOWN"
                               }
</span>
</div>
</div>
</td>

<td className="text-right">
<span
                           className={`
                             vi-money
                             text-[10px]
                             ${moneyTone(
                               financial.netUsd
                             )}
                           `}
>
                           {money(
                             financial.netUsd
                           )}
</span>
</td>

<td
                         className="
                           text-right
                           vi-money
                           vi-money-swing
                           text-[9px]
                         "
>
                         {money(
                           financial.swingUsd
                         )}
</td>

<td
                         className="
                           text-right
                           font-mono
                           text-[8px]
                         "
>
                         {number(
                           physical.total
                         )}
</td>

<td
                         className="
                           text-right
                           font-mono
                           text-[8px]
                         "
>
                         {number(
                           qad.total
                         )}
</td>

<td
                         className="
                           text-right
                           font-mono
                           text-[8px]
                           text-slate-500
                         "
>
                         {master.hasCost
                           ? money(
                               master.unitCost
                             )
                           : "—"}
</td>

<td
                         className="
                           text-center
                           font-mono
                           text-[7px]
                           text-slate-500
                         "
>
                         {flags.isUnexpectedMaterial
                           ? "QAD0"
                           : flags.isMissingPhysical && flags.hasBomReference
                             ? "BOM?"
                           : flags.hasUnmappedPhysicalLocation
                             ? "MAP?"
                             : !master.hasCost
                               ? "$?"
                               : "·"}
</td>
</tr>
                   );
                 }
               )}
</tbody>
</table>
</div>

<div className="hidden 2xl:block">
<Radar
             rows={rows}
             onSelectPart={
               onSelectPart
             }
             onHelp={
               onHelp
             }
           />
</div>
</div>
     )}
</section>
 );
}
