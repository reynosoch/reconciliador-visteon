// src/components/ReconciliationTable.jsx
import React, {
 useMemo,
 useState,
} from "react";

const SearchIcon = ({
 size = 16,
}) => (
<svg
   width={size}
   height={size}
   viewBox="0 0 24 24"
   fill="none"
   stroke="currentColor"
   strokeWidth="2"
   strokeLinecap="round"
   strokeLinejoin="round"
>
<circle
     cx="11"
     cy="11"
     r="8"
   />
<path d="m21 21-4.3-4.3" />
</svg>
);

const GhostIcon = ({
 size = 14,
}) => (
<svg
   width={size}
   height={size}
   viewBox="0 0 24 24"
   fill="none"
   stroke="currentColor"
   strokeWidth="2"
   strokeLinecap="round"
   strokeLinejoin="round"
>
<path d="M9 10h.01" />
<path d="M15 10h.01" />
<path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
</svg>
);

const AlertIcon = ({
 size = 14,
}) => (
<svg
   width={size}
   height={size}
   viewBox="0 0 24 24"
   fill="none"
   stroke="currentColor"
   strokeWidth="2"
   strokeLinecap="round"
   strokeLinejoin="round"
>
<path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z" />
<line
     x1="12"
     y1="9"
     x2="12"
     y2="13"
   />
<line
     x1="12"
     y1="17"
     x2="12.01"
     y2="17"
   />
</svg>
);

function formatMoney(
 value
) {
 return new Intl.NumberFormat(
   "en-US",
   {
     style:
       "currency",
     currency:
       "USD",
     minimumFractionDigits:
       0,
     maximumFractionDigits:
       0,
   }
 ).format(
   Number(value) || 0
 );
}

function formatNumber(
 value
) {
 return new Intl.NumberFormat(
   "en-US",
   {
     maximumFractionDigits:
       2,
   }
 ).format(
   Number(value) || 0
 );
}

function getStatusConfig(
 status
) {
 const key =
   String(
     status || ""
   ).toUpperCase();

 const statusMap = {
   LOSS: {
     label:
       "Pérdida",
     className:
       "border-rose-500/30 bg-rose-500/10 text-rose-400",
   },

   GAIN: {
     label:
       "Ganancia",
     className:
       "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
   },

   OBSOLETE_GAIN: {
     label:
       "Obsoleto +",
     className:
       "border-orange-500/30 bg-orange-500/10 text-orange-400",
   },

   UNEXPECTED: {
     label:
       "QAD = 0",
     className:
       "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
   },

   MISSING_PHYSICAL: {
     label:
       "Sin físico",
     className:
       "border-red-500/30 bg-red-500/10 text-red-400",
   },

   SWING: {
     label:
       "Swing",
     className:
       "border-amber-500/30 bg-amber-500/10 text-amber-400",
   },

   BALANCED: {
     label:
       "Balanceado",
     className:
       "border-slate-700 bg-slate-800/70 text-slate-400",
   },
 };

 return (
   statusMap[key] || {
     label:
       key || "Sin estado",
     className:
       "border-slate-700 bg-slate-800 text-slate-400",
   }
 );
}

function StatusBadge({
 status,
}) {
 const config =
   getStatusConfig(
     status
   );

 return (
<span
     className={`
       inline-flex
       items-center
       rounded-full
       border
       px-2
       py-1
       text-[9px]
       font-black
       uppercase
       tracking-wider
       whitespace-nowrap
       ${config.className}
     `}
>
     {config.label}
</span>
 );
}

function PhantomBadge() {
 return (
<span
     className="
       inline-flex
       items-center
       gap-1
       rounded-full
       border
       border-violet-500/30
       bg-violet-500/10
       px-2
       py-1
       text-[9px]
       font-black
       uppercase
       tracking-wider
       text-violet-400
     "
>
<GhostIcon
       size={11}
     />
     Phantom
</span>
 );
}

function ObsoleteBadge() {
 return (
<span
     className="
       inline-flex
       items-center
       gap-1
       rounded-full
       border
       border-orange-500/30
       bg-orange-500/10
       px-2
       py-1
       text-[9px]
       font-black
       uppercase
       tracking-wider
       text-orange-400
     "
>
     Obsolete
</span>
 );
}

function DataWarning({
 children,
}) {
 return (
<span
     className="
       inline-flex
       items-center
       gap-1
       text-[9px]
       font-bold
       text-amber-400
     "
>
<AlertIcon
       size={10}
     />
     {children}
</span>
 );
}

/**
* Convierte un Map de localidades
* a texto legible.
*
* NO hace cálculos financieros.
* Solamente presenta la trazabilidad.
*/
function locationSummary(
 locations
) {
 if (
   !locations ||
   typeof locations.entries !==
     "function"
 ) {
   return "—";
 }

 const entries =
   Array.from(
     locations.entries()
   );

 if (
   entries.length === 0
 ) {
   return "—";
 }

 return entries
   .filter(
     ([, qty]) =>
       Number(qty) !== 0
   )
   .slice(0, 3)
   .map(
     ([location, qty]) =>
       `${location} ${formatNumber(
         qty
       )}`
   )
   .join(" • ");
}

function netTextClass(
 value
) {
 const number =
   Number(value) || 0;

 if (number < 0) {
   return "text-rose-400";
 }

 if (number > 0) {
   return "text-emerald-400";
 }

 return "text-slate-500";
}

function DesktopRow({
 item,
 onSelect,
}) {
 const financial =
   item?.financial || {};
 const physical =
   item?.physical || {};
 const qad =
   item?.qad || {};
 const master =
   item?.master || {};
 const flags =
   item?.flags || {};

 const phantom =
   master.phantom ===
   true;
 const obsolete =
   master.obsolete ===
   true;

 return (
<tr
     onClick={() =>
       onSelect?.(
         item
       )
     }
     className="
       group
       border-b
       border-slate-800/70
       hover:bg-slate-800/40
       cursor-pointer
       transition-colors
     "
>
     {/* PART NUMBER */}
<td className="px-4 py-4">
<div className="min-w-[180px]">
<p
           className="
             text-xs
             font-black
             text-slate-200
             group-hover:text-white
           "
>
           {
             item.partNumber
           }
</p>

<div className="flex flex-wrap items-center gap-1.5 mt-1.5">
<StatusBadge
             status={
               financial.status
             }
           />

           {phantom && (
<PhantomBadge />
           )}

           {obsolete && (
<ObsoleteBadge />
           )}
</div>

<div className="flex flex-col gap-0.5 mt-2">
           {flags.isUnexpectedMaterial && (
<DataWarning>
               Material no esperado
</DataWarning>
           )}

           {flags.hasUnmappedPhysicalLocation && (
<DataWarning>
               Área sin mapear
</DataWarning>
           )}

           {flags.missingCost && (
<DataWarning>
               Sin costo
</DataWarning>
           )}
</div>
</div>
</td>

     {/* NET USD */}
<td className="px-4 py-4 text-right">
<div
         className={`
           text-sm
           font-black
           ${netTextClass(
             financial.netUsd
           )}
         `}
>
         {formatMoney(
           financial.netUsd
         )}
</div>

<div className="text-[10px] text-slate-600 mt-1">
         {formatNumber(
           financial.netPieces
         )}{" "}
         pzas
</div>
</td>

     {/* SWING USD */}
<td className="px-4 py-4 text-right">
<div className="text-xs font-bold text-amber-400">
         {formatMoney(
           financial.swingUsd
         )}
</div>

<div className="text-[10px] text-slate-600 mt-1">
         {formatNumber(
           financial.swingPieces
         )}{" "}
         pzas
</div>
</td>

     {/* PHYSICAL */}
<td className="px-4 py-4 text-right">
<div className="text-xs font-bold text-slate-300">
         {formatNumber(
           physical.total
         )}
</div>

<div
         className="
           text-[9px]
           text-slate-600
           mt-1
           max-w-[220px]
           truncate
         "
         title={
           locationSummary(
             physical.locations
           )
         }
>
         {locationSummary(
           physical.locations
         )}
</div>
</td>

     {/* QAD */}
<td className="px-4 py-4 text-right">
<div className="text-xs font-bold text-slate-300">
         {formatNumber(
           qad.total
         )}
</div>

<div
         className="
           text-[9px]
           text-slate-600
           mt-1
           max-w-[220px]
           truncate
         "
         title={
           locationSummary(
             qad.locations
           )
         }
>
         {locationSummary(
           qad.locations
         )}
</div>
</td>

     {/* COST */}
<td className="px-4 py-4 text-right">
<div className="text-xs font-bold text-slate-300">
         {master.hasCost
           ? formatMoney(
               master.unitCost
             )
           : "—"}
</div>

<div className="text-[9px] text-slate-600 mt-1">
         {
           master.costStatus ||
           "Sin status"
         }
</div>
</td>
</tr>
 );
}

function MobileCard({
 item,
 onSelect,
}) {
 const financial =
   item?.financial || {};
 const physical =
   item?.physical || {};
 const qad =
   item?.qad || {};
 const master =
   item?.master || {};
 const flags =
   item?.flags || {};

 return (
<button
     type="button"
     onClick={() =>
       onSelect?.(
         item
       )
     }
     className="
       w-full
       text-left
       rounded-xl
       border
       border-slate-800
       bg-slate-950/40
       p-4
       hover:border-slate-700
       transition-colors
     "
>
<div className="flex items-start justify-between gap-3">
<div>
<p className="text-sm font-black text-white">
           {
             item.partNumber
           }
</p>

<div className="flex flex-wrap gap-1.5 mt-2">
<StatusBadge
             status={
               financial.status
             }
           />

           {master.phantom ===
             true && (
<PhantomBadge />
           )}

           {master.obsolete ===
             true && (
<ObsoleteBadge />
           )}
</div>
</div>

<div className="text-right">
<p
           className={`
             text-lg
             font-black
             ${netTextClass(
               financial.netUsd
             )}
           `}
>
           {formatMoney(
             financial.netUsd
           )}
</p>
<p className="text-[9px] uppercase tracking-widest text-slate-600">
           NET USD
</p>
</div>
</div>

<div className="grid grid-cols-3 gap-3 mt-4">
<div>
<p className="text-[9px] uppercase text-slate-600">
           Físico
</p>
<p className="text-xs font-bold text-slate-300 mt-1">
           {formatNumber(
             physical.total
           )}
</p>
</div>

<div>
<p className="text-[9px] uppercase text-slate-600">
           QAD
</p>
<p className="text-xs font-bold text-slate-300 mt-1">
           {formatNumber(
             qad.total
           )}
</p>
</div>

<div>
<p className="text-[9px] uppercase text-slate-600">
           Swing
</p>
<p className="text-xs font-bold text-amber-400 mt-1">
           {formatMoney(
             financial.swingUsd
           )}
</p>
</div>
</div>

     {(flags.isUnexpectedMaterial ||
       flags.hasUnmappedPhysicalLocation ||
       flags.missingCost) && (
<div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-800">
         {flags.isUnexpectedMaterial && (
<DataWarning>
             QAD esperaba 0
</DataWarning>
         )}

         {flags.hasUnmappedPhysicalLocation && (
<DataWarning>
             UNMAPPED
</DataWarning>
         )}

         {flags.missingCost && (
<DataWarning>
             Sin costo
</DataWarning>
         )}
</div>
     )}
</button>
 );
}

export default function ReconciliationTable({
 rows = [],
 referencesReady = false,
 onSelectPart,
}) {
 const [
   search,
   setSearch,
 ] = useState("");

 const filteredRows =
   useMemo(() => {
     const query =
       search
         .trim()
         .toUpperCase();

     if (!query) {
       return rows;
     }

     return rows.filter(
       (item) =>
         String(
           item?.partNumber ||
           ""
         )
           .toUpperCase()
           .includes(
             query
           )
     );
   }, [
     rows,
     search,
   ]);

 if (
   !referencesReady
 ) {
   return (
<section
       className="
         rounded-2xl
         border
         border-slate-800
         bg-slate-900/60
         p-6
       "
>
<h2 className="text-lg font-black text-slate-300">
         Conciliación
</h2>
<p className="text-xs text-slate-600 mt-2">
         La tabla se habilitará cuando estén cargadas las cinco fuentes congeladas.
</p>
</section>
   );
 }

 return (
<section
     className="
       rounded-2xl
       border
       border-slate-800
       bg-slate-900/70
       overflow-hidden
       shadow-xl
     "
>
     {/* =====================================
         HEADER
     ====================================== */}
<div
       className="
         px-5
         py-5
         border-b
         border-slate-800
         flex
         flex-col
         lg:flex-row
         lg:items-center
         justify-between
         gap-4
       "
>
<div>
<p
           className="
             text-[10px]
             font-black
             uppercase
             tracking-[0.15em]
             text-orange-400
           "
>
           Reconciliación financiera
</p>
<h2 className="text-xl font-black text-white mt-1">
           Exposición por Part Number
</h2>
<p className="text-[11px] text-slate-500 mt-1">
           Ordenada por impacto financiero del motor de conciliación.
</p>
</div>

<div className="flex items-center gap-3">
<div
           className="
             relative
             w-full
             sm:w-[280px]
           "
>
<div
             className="
               absolute
               left-3
               top-1/2
               -translate-y-1/2
               text-slate-600
             "
>
<SearchIcon />
</div>

<input
             type="text"
             value={search}
             onChange={
               (event) =>
                 setSearch(
                   event.target.value
                 )
             }
             placeholder="Buscar Part Number..."
             className="
               w-full
               rounded-lg
               border
               border-slate-800
               bg-slate-950
               py-2.5
               pl-9
               pr-3
               text-xs
               text-white
               outline-none
               placeholder:text-slate-700
               focus:border-orange-500/50
             "
           />
</div>

<div className="text-right hidden sm:block">
<p className="text-sm font-black text-white">
             {filteredRows.length.toLocaleString(
               "en-US"
             )}
</p>
<p className="text-[9px] uppercase tracking-widest text-slate-600">
             Part Numbers
</p>
</div>
</div>
</div>

     {/* =====================================
         MOBILE
     ====================================== */}
<div className="md:hidden p-3 space-y-3">
       {filteredRows.length >
       0 ? (
         filteredRows.map(
           (item) => (
<MobileCard
               key={
                 item.partNumber
               }
               item={item}
               onSelect={
                 onSelectPart
               }
             />
           )
         )
       ) : (
<div className="py-12 text-center text-xs text-slate-600">
           No se encontraron Part Numbers.
</div>
       )}
</div>

     {/* =====================================
         DESKTOP
     ====================================== */}
<div className="hidden md:block overflow-x-auto">
<table className="w-full border-collapse">
<thead>
<tr
             className="
               bg-slate-950/60
               border-b
               border-slate-800
             "
>
<th
               className="
                 px-4
                 py-3
                 text-left
                 text-[9px]
                 font-black
                 uppercase
                 tracking-wider
                 text-slate-600
               "
>
               Part Number / Estado
</th>

<th
               className="
                 px-4
                 py-3
                 text-right
                 text-[9px]
                 font-black
                 uppercase
                 tracking-wider
                 text-slate-600
               "
>
               Net USD
</th>

<th
               className="
                 px-4
                 py-3
                 text-right
                 text-[9px]
                 font-black
                 uppercase
                 tracking-wider
                 text-slate-600
               "
>
               Swing USD
</th>

<th
               className="
                 px-4
                 py-3
                 text-right
                 text-[9px]
                 font-black
                 uppercase
                 tracking-wider
                 text-slate-600
               "
>
               Físico
</th>

<th
               className="
                 px-4
                 py-3
                 text-right
                 text-[9px]
                 font-black
                 uppercase
                 tracking-wider
                 text-slate-600
               "
>
               QAD
</th>

<th
               className="
                 px-4
                 py-3
                 text-right
                 text-[9px]
                 font-black
                 uppercase
                 tracking-wider
                 text-slate-600
               "
>
               Costo Unit.
</th>
</tr>
</thead>

<tbody>
           {filteredRows.length >
           0 ? (
             filteredRows.map(
               (item) => (
<DesktopRow
                   key={
                     item.partNumber
                   }
                   item={item}
                   onSelect={
                     onSelectPart
                   }
                 />
               )
             )
           ) : (
<tr>
<td
                 colSpan={6}
                 className="
                   px-4
                   py-16
                   text-center
                   text-xs
                   text-slate-600
                 "
>
                 No se encontraron Part Numbers.
</td>
</tr>
           )}
</tbody>
</table>
</div>

     {/* =====================================
         FOOTER
     ====================================== */}
<div
       className="
         px-5
         py-3
         border-t
         border-slate-800
         bg-slate-950/30
         flex
         items-center
         justify-between
         gap-3
       "
>
<p className="text-[9px] text-slate-600">
         Selecciona una pieza para consultar su trazabilidad.
</p>

<p className="text-[9px] text-slate-600">
         {filteredRows.length.toLocaleString(
           "en-US"
         )}{" "}
         resultados
</p>
</div>
</section>
 );
}