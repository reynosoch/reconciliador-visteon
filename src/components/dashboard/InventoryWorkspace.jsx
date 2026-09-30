const unitMoney = value => new Intl.NumberFormat("en-US", {style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
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
   label: "TODOS",
 },
 {
   id: "LOSS",
   label: "PÉRDIDA",
 },
 {
   id: "GAIN",
   label: "GANANCIA",
 },
 {
   id: "HAS_SWING",
   label: "CON SWING",
 },
 {
   id: "UNEXPECTED",
   label: "QAD 0",
 },
 {
   id: "OBSOLETE_GAIN",
   label: "OBSOLETO +",
 },
 {
   id: "PHANTOM",
   label: "PHANTOM",
 },
 {
   id: "BOM_REVIEW",
   label: "REVISAR BOM",
 },
 {
   id: "UNVALUED",
   label: "SIN VALORAR",
 },
];

const STATUS_LABELS = {
 LOSS: "PÉRDIDA", GAIN: "GANANCIA", OBSOLETE_GAIN: "OBSOLETO +",
 UNEXPECTED: "INESPERADO", MISSING_PHYSICAL: "SIN FÍSICO",
 SWING: "SWING", UNVALUED: "SIN VALORAR", BALANCED: "BALANCEADO",
};

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

function ObsoleteIcon() {
 return (
<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
<path d="M4 8.5A8 8 0 0 1 18.5 6"/><path d="M18.5 3v3h-3"/>
<path d="M20 15.5A8 8 0 0 1 5.5 18"/><path d="M5.5 21v-3h3"/>
<path d="M9 9h6v6H9z"/>
</svg>
 );
}

function Radar({
 rows,
 onSelectPart,
 onHelp,
}) {
 const ghosts = useMemo(
   () => rows
     .filter((item) => item?.master?.isPhantom === true)
     .sort((a,b) => Math.abs(Number(b?.financial?.netUsd)||0)-Math.abs(Number(a?.financial?.netUsd)||0))
     .slice(0,6),
   [rows]
 );
 const obsolete = useMemo(
   () => rows
     .filter((item) => item?.flags?.isObsolete === true && Number(item?.financial?.obsoleteGainUsd || 0) > 0)
     .sort((a,b) => Number(b?.financial?.obsoleteGainUsd||0)-Number(a?.financial?.obsoleteGainUsd||0))
     .slice(0,6),
   [rows]
 );

 const list = (items, empty) => items.length ? (
<div className="space-y-1">
 {items.map((item) => (
<button
  type="button"
  key={item.partNumber}
  onClick={() => onSelectPart?.(item)}
  className="vi-radar-row"
>
<span className="vi-radar-pn">{item.partNumber}</span>
<span className={`vi-money text-[11px] ${moneyTone(item?.financial?.netUsd)}`}>
 {money(item?.financial?.netUsd)}
</span>
</button>
 ))}
</div>
 ) : <p className="vi-radar-empty">{empty}</p>;

 return (
<aside className="vi-radar-stack">
<section className="vi-radar-card vi-liquid-mini">
<header className="vi-radar-card-head">
<div className="flex items-center gap-2">
<Ghost size={15} tone="violet" />
<span>PHANTOM RADAR</span>
</div>
<HelpButton topic="phantomRadar" onHelp={onHelp}/>
</header>
<p className="vi-radar-caption">Phantoms con las mayores diferencias en dólares.</p>
<div className="vi-radar-card-body">{list(ghosts,"No hay phantoms para mostrar.")}</div>
</section>

<section className="vi-radar-card vi-liquid-mini vi-obsolete-radar">
<header className="vi-radar-card-head">
<div className="flex items-center gap-2">
<span className="vi-obsolete-icon"><ObsoleteIcon/></span>
<span>OBSOLETOS +</span>
</div>
<HelpButton topic="obsolete" onHelp={onHelp}/>
</header>
<p className="vi-radar-caption">Material obsoleto con sobrante en dólares.</p>
<div className="vi-radar-card-body">{list(obsolete,"No hay obsoletos con sobrante.")}</div>
</section>
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
 const [page, setPage] = useState(0);

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

 const lastPage = Math.max(0, Math.ceil(filtered.length / 50) - 1);
 const currentPage = Math.min(page, lastPage);
 const visibleRows = filtered.slice(currentPage * 50, (currentPage + 1) * 50);

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
           onChange={(event) =>
             { setSearch(event.target.value); setPage(0); }
           }
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
               onClick={() => { setFilter(option.id); setPage(0); }}
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
                     Part Number / Estado
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
                     FÍSICO
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
                     COSTO
</HeaderHelp>
</th>
<th className="text-center">
<HeaderHelp
                     topic="flags"
                     onHelp={onHelp}
                     align="center"
>
                     ALERTA
</HeaderHelp>
</th>
</tr>
</thead>

<tbody>
               {visibleRows.map(
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
</tbody>
</table>
{filtered.length > 50 && <div className="vi-table-pagination">
  <span>{(currentPage * 50 + 1).toLocaleString("es-MX")}–{Math.min((currentPage + 1) * 50, filtered.length).toLocaleString("es-MX")} de {filtered.length.toLocaleString("es-MX")}</span>
  <div><button type="button" className="vi-button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>ANTERIOR</button><span>{currentPage + 1} / {lastPage + 1}</span><button type="button" className="vi-button" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>SIGUIENTE</button></div>
</div>}
</div>

<div className="vi-radar-slot">
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
