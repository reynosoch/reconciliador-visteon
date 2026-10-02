// src/components/dashboard/InventoryWorkspace.jsx
import {
 useEffect,
 useMemo,
 useRef,
 useState,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
 HelpButton,
} from "../help/HelpDrawer";
import InventoryRadar from "./InventoryRadar.jsx";
import {
 FILTERS,
 STATUS_LABELS,
 money,
 moneyTone,
 number,
 unitMoney,
} from "./inventoryWorkspaceSupport.js";

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
 const tableScrollRef = useRef(null);

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
                 ?.swingPieces
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

 const rowVirtualizer = useVirtualizer({
   count: filtered.length,
   getScrollElement: () => tableScrollRef.current,
   estimateSize: () => 62,
   overscan: 10,
   useFlushSync: false,
   directDomUpdates: true,
   getItemKey: (index) => filtered[index]?.partNumber || index,
 });

 const virtualRows = rowVirtualizer.getVirtualItems();
 const paddingTop = virtualRows.length ? virtualRows[0].start : 0;
 const paddingBottom = virtualRows.length
   ? Math.max(0, rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end)
   : 0;

 useEffect(() => {
   if (!filtered.length) return;
   rowVirtualizer.scrollToIndex(0, { align: "start" });
 }, [search, filter, filtered.length, rowVirtualizer]);

 return (
<section
     className="
       vi-panel
       vi-reconciliation-shell
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
             ÁREA DE CONCILIACIÓN
</p>
<p
             className="
               mt-0.5
               text-[11px]
               text-slate-600
             "
>
             Selecciona un Part Number para revisar localidades y origen de la diferencia.
</p>
</div>

<input
           value={search}
           disabled={!ready}
           onChange={(event) => setSearch(event.target.value)}
           className="
             vi-input
             lg:max-w-[310px]
           "
           placeholder="BUSCAR PART NUMBER..."
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
               onClick={() => setFilter(option.id)}
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

<HelpButton topic="bomReview" onHelp={onHelp} className="flex-shrink-0" />

<span
           className="
             ml-auto
             self-center
             font-mono
             text-[11px]
             text-slate-700
             whitespace-nowrap
           "
>
           {filtered.length.toLocaleString(
             "en-US"
           )}{" "}
           PART NUMBERS
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
             SE REQUIEREN ARCHIVOS DE REFERENCIA
</p>
<p
             className="
               mt-2
               text-[11px]
               text-slate-600
             "
>
             Abre FUENTES y carga los cinco archivos juntos.
</p>
</div>
</div>
     ) : (
<div
         className="vi-workspace-grid"
>
<div
           ref={tableScrollRef}
           className="
             vi-table-virtual-scroll
             min-w-0
             overflow-auto
           "
>
<table className="vi-table">
<thead>
<tr>
<th>
<HeaderHelp
                     topic="tableStatus"
                     onHelp={onHelp}
>
                     Part Number / Estado
</HeaderHelp>
</th>
<th className="text-right">
<HeaderHelp
                     topic="tableNet"
                     onHelp={onHelp}
                     align="right"
>
                     NET USD
</HeaderHelp>
</th>
<th className="text-right">
<HeaderHelp
                     topic="tableSwing"
                     onHelp={onHelp}
                     align="right"
>
                     SWING
</HeaderHelp>
</th>
<th className="text-right">
<HeaderHelp
                     topic="tablePhysical"
                     onHelp={onHelp}
                     align="right"
>
                     FÍSICO
</HeaderHelp>
</th>
<th className="text-right">
<HeaderHelp
                     topic="tableQad"
                     onHelp={onHelp}
                     align="right"
>
                     QAD
</HeaderHelp>
</th>
<th className="text-right">
<HeaderHelp
                     topic="tableCost"
                     onHelp={onHelp}
                     align="right"
>
                     COSTO
</HeaderHelp>
</th>
<th className="text-center">
<HeaderHelp
                     topic="tableFlags"
                     onHelp={onHelp}
                     align="center"
>
                     ALERTA
</HeaderHelp>
</th>
</tr>
</thead>

<tbody>
               {paddingTop > 0 && (
                 <tr className="vi-virtual-spacer" aria-hidden="true">
                   <td colSpan={7} style={{ height: `${paddingTop}px` }} />
                 </tr>
               )}
               {virtualRows.map(
                 (virtualRow) => {
                   const item = filtered[virtualRow.index];
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
                       className="cursor-pointer vi-result-row" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectPart?.(item); } }} aria-label={`Investigar ${item.partNumber}`}
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
                                 text-[11px]
                               "
>
                               {
                                 item.partNumber
                               }
</p>
<span
                               className="
                                 font-mono
                                 text-[11px]
                                 text-slate-700
                               "
>
                               {
                                 STATUS_LABELS[flags.financialStatus] || "DESCONOCIDO"
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
                           {master.hasCost ? money(financial.netUsd) : "SIN VALORAR"}
</span>
</td>

<td
                         className="
                           text-right
                           vi-money
                           vi-money-swing
                           text-[11px]
                         "
>
                         {master.hasCost ? money(financial.swingUsd) : financial.swingPieces > 0 ? "SIN VALORAR" : money(0)}
</td>

<td
                         className="
                           text-right
                           font-mono
                           text-[11px]
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
                           text-[11px]
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
                           text-[11px]
                           text-slate-500
                         "
>
                         {master.hasCost
                           ? unitMoney(
                               master.unitCost
                             )
                           : "SIN VALORAR"}
</td>

<td
                         className="
                           text-center
                           font-mono
                           text-[11px]
                           text-slate-500
                         "
>
                         {flags.financialStatus === "UNVALUED"
                           ? "$?"
                           : flags.isUnexpectedMaterial
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
               {paddingBottom > 0 && (
                 <tr className="vi-virtual-spacer" aria-hidden="true">
                   <td colSpan={7} style={{ height: `${paddingBottom}px` }} />
                 </tr>
               )}
</tbody>
</table>

</div>

<div className="vi-radar-slot">
<InventoryRadar
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
