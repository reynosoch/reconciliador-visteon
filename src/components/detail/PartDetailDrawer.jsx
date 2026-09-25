// src/components/detail/PartDetailDrawer.jsx
import React from "react";
import {
 Ghost,
 PelletRail,
} from "../visual/PacmanGlyphs";
import { HelpButton } from "../help/HelpDrawer";

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
 topic,
 onHelp,
}) {
 const entries =
   mapEntries(
     locations
   );

 return (
<div className="vi-maze-box p-4">
<div className="flex items-center justify-between gap-2"><p className="vi-eyebrow">{title}</p><HelpButton topic={topic} onHelp={onHelp} /></div>

<div className="mt-4 space-y-2">
       {entries.length ===
       0 ? (
<p className="font-mono text-[11px] text-slate-700">
           SIN DATOS DE LOCALIDAD
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
                   text-[11px]
                   text-slate-400
                 "
>
                 {location}
</span>
<span
                 className="
                   font-mono
                   text-[11px]
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
 topic,
 onHelp,
}) {
 return (
<div>
<div className="flex items-center gap-1"><p
       className="
         font-mono
         text-[11px]
         font-black
         tracking-[0.12em]
         text-slate-700
       "
>
       {label}
</p>{topic && <HelpButton topic={topic} onHelp={onHelp} />}</div>
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
 onHelp,
}) {
 const master =
   item?.master || {};
 const physical =
   item?.physical || {};

 if (!physical.scanCount && !physical.bomContribution) {
   return (
     <div className="vi-maze-box p-5 text-sm text-amber-200">
       Este Part Number aún no tiene escaneo 4Wall ni contribución BOM validada.
       La cantidad QAD sigue incluida en el NET preliminar.
     </div>
   );
 }

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
           RUTA DE TRAZABILIDAD BOM
</p>
<p
           className="
             mt-1
             text-xs
             font-black
             text-white
           "
>
           Ruta del material
</p>
</div>

<div className="flex items-center gap-2">{master.isPhantom && <Ghost size={17} tone="violet" />}<HelpButton topic="phantom" onHelp={onHelp} /></div>
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
             text-[11px]
             text-slate-700
           "
>
           FUENTE
</p>
<p
           className="
             font-mono
             text-[10px]
             font-bold
             text-white
           "
>
           {physical.scanCount ? "ESCANEO DIRECTO 4WALL" : "PADRE 4WALL → BOM"}
</p>
</div>

<div className="vi-trace-node">
<p
           className="
             font-mono
             text-[11px]
             text-slate-700
           "
>
           FÍSICO
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
             text-[11px]
             text-slate-700
           "
>
           DEFINICIÓN DEL ÍTEM
</p>
<p
           className="
             font-mono
             text-[10px]
             text-slate-300
           "
>
           {master.phantomKnown
             ? master.isPhantom ? "ISPBB: PHANTOM SÍ" : "ISPBB: PHANTOM NO"
             : "SIN DEFINICIÓN ISPBB"}
</p>
</div>

       {physical.bomContribution > 0 && (
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
               CONTRIBUCIÓN BOM PHANTOM
</p>
</div>

<p
             className="
               mt-1
               font-mono
               text-[11px]
               text-slate-700
             "
>
             Se aplica Usage del export BOM
</p>
</div>
       )}

<div className="vi-trace-node">
<p
           className="
             font-mono
             text-[11px]
             text-slate-700
           "
>
           RESULTADO
</p>
<p
           className="
             font-mono
             text-[10px]
             font-bold
             text-orange-300
           "
>
           CONCILIACIÓN FINANCIERA
</p>
</div>
</div>
</div>
 );
}

export default function PartDetailDrawer({
 item,
 onHelp,
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
             {master.isPhantom && <Ghost size={18} tone="violet" />}

<div>
<p className="vi-eyebrow">
                 INVESTIGACIÓN DEL PART NUMBER
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
             CERRAR
</button>
</div>

<PelletRail
           muted
           className="mt-4"
         />
</div>

<div className="p-5">
<div className="vi-impact-metrics
             grid
             grid-cols-2
             lg:grid-cols-4
             gap-4
           "
>
<Metric
             label="NET USD"
             topic="net" onHelp={onHelp}
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
             topic="swing" onHelp={onHelp}
             value={
               money(
                 financial.swingUsd
               )
             }
             className="vi-money-swing"
           />
<Metric
             label="FÍSICO"
             topic="physical" onHelp={onHelp}
             value={
               number(
                 physical.total
               )
             }
           />
<Metric
             label="QAD"
             topic="qad" onHelp={onHelp}
             value={
               number(
                 qad.total
               )
             }
           />
</div>

<p className="mt-4 text-xs text-slate-300">Físico directo 4Wall: {number(physical.directTotal)} · Contribución BOM: {number(physical.bomContribution)} piezas</p>

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
             title="4Wall / Físico"
             topic="physical" onHelp={onHelp}
             locations={
               physical.locations
             }
           />
<LocationColumn
             title="QAD / Sistema"
             topic="qad" onHelp={onHelp}
             locations={
               qad.locations
             }
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
             label="COSTO UNITARIO"
             topic="cost" onHelp={onHelp}
             value={
               master.hasCost
                 ? money(
                     master.unitCost
                   )
                 : "—"
             }
           />
<Metric
             label="ESTADO COST PART"
             topic="status" onHelp={onHelp}
             value={
               master.costStatus ||
               "—"
             }
           />
<Metric
             label="ESTADO ISPBB"
             topic="status" onHelp={onHelp}
             value={
               master.planningStatus ||
               "—"
             }
           />
<Metric
             label="PHANTOM"
             topic="phantom" onHelp={onHelp}
             value={
               master.phantomKnown
                 ? master.isPhantom ? "SÍ" : "NO"
                 : "DESCONOCIDO"
             }
             className={
               master.isPhantom
                 ? "vi-money-phantom"
                 : ""
             }
           />
</div>

<div className="mt-5">
<BomMaze
             item={item}
             onHelp={onHelp}
           />
</div>

{item.trace?.bomReferences?.length > 0 && (
<section className="vi-maze-box mt-5 p-5">
  <p className="vi-eyebrow">REFERENCIAS BOM</p>
  <p className="mt-2 text-xs text-slate-300">
    Este componente aparece en el BOM cargado. Esta relación indica dónde investigar; no demuestra un conteo físico ni modifica el NET.
  </p>
  <div className="mt-3 max-h-48 space-y-2 overflow-y-auto font-mono text-xs">
    {item.trace.bomReferences.slice(0, 12).map((reference, index) => (
      <div key={`${reference.parentPart}-${reference.rawLevel}-${index}`} className="border-b border-slate-800 pb-2 text-slate-200">
        PADRE {reference.parentPart} → COMPONENTE {item.partNumber} · Nivel {reference.rawLevel || "?"} · Usage {number(reference.usage)} · Sitio {reference.site || "?"}
      </div>
    ))}
    {item.trace.bomReferences.length > 12 && (
      <p className="text-slate-400">{item.trace.bomReferences.length - 12} filas adicionales en el archivo BOM.</p>
    )}
  </div>
</section>
)}

<section className="vi-maze-box mt-5 p-5">
 <p className="vi-eyebrow">ALERTAS Y TRAZABILIDAD</p>
 <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200">
  {item.flags?.isMissingPhysical && <span className="vi-tag vi-tag-swing">SIN FÍSICO · corte preliminar</span>}
  {item.flags?.isUnexpectedMaterial && <span className="vi-tag vi-tag-swing">QAD esperaba 0</span>}
  {item.flags?.hasBomReference && <span className="vi-tag vi-tag-swing">REVISAR BOM</span>}
  {item.flags?.hasUnmappedPhysicalLocation && <span className="vi-tag vi-tag-swing">ÁREA SIN MAPEO</span>}
  {!master.hasCost && <span className="vi-tag vi-tag-swing">SIN COSTO</span>}
  {!item.flags?.isMissingPhysical && !item.flags?.isUnexpectedMaterial && !item.flags?.hasBomReference && !item.flags?.hasUnmappedPhysicalLocation && master.hasCost && <span>Sin alertas adicionales.</span>}
 </div>
</section>

</div>
</aside>
</div>
 );
}
