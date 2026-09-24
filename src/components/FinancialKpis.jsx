// src/components/FinancialKpis.jsx
import React from "react";

const DollarIcon = ({
 size = 18,
 className = "",
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
   className={className}
>
<line x1="12" y1="1" x2="12" y2="23" />
<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
</svg>
);

const ArrowDownIcon = ({
 size = 18,
 className = "",
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
   className={className}
>
<path d="M12 5v14" />
<path d="m19 12-7 7-7-7" />
</svg>
);

const ArrowUpIcon = ({
 size = 18,
 className = "",
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
   className={className}
>
<path d="M12 19V5" />
<path d="m5 12 7-7 7 7" />
</svg>
);

const SwingIcon = ({
 size = 18,
 className = "",
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
   className={className}
>
<path d="m16 3 4 4-4 4" />
<path d="M20 7H4" />
<path d="m8 21-4-4 4-4" />
<path d="M4 17h16" />
</svg>
);

const GhostIcon = ({
 size = 18,
 className = "",
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
   className={className}
>
<path d="M9 10h.01" />
<path d="M15 10h.01" />
<path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
</svg>
);

const AlertIcon = ({
 size = 18,
 className = "",
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
   className={className}
>
<path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z" />
<line x1="12" y1="9" x2="12" y2="13" />
<line x1="12" y1="17" x2="12.01" y2="17" />
</svg>
);

function formatMoney(
 value,
 {
   absolute = false,
 } = {}
) {
 let number =
   Number(value) || 0;
 if (absolute) {
   number =
     Math.abs(number);
 }
 return new Intl.NumberFormat(
   "en-US",
   {
     style: "currency",
     currency: "USD",
     maximumFractionDigits: 0,
     minimumFractionDigits: 0,
   }
 ).format(number);
}

function formatNumber(value) {
 return new Intl.NumberFormat(
   "en-US",
   {
     maximumFractionDigits: 0,
   }
 ).format(
   Number(value) || 0
 );
}

function KpiCard({
 title,
 value,
 subtitle,
 icon,
 tone = "neutral",
 secondary,
}) {
 const tones = {
   neutral: {
     border:
       "border-slate-800",
     value:
       "text-white",
     icon:
       "bg-slate-800 text-slate-300",
     glow:
       "",
   },

   netNegative: {
     border:
       "border-rose-500/30",
     value:
       "text-rose-400",
     icon:
       "bg-rose-500/10 text-rose-400",
     glow:
       "shadow-[0_0_35px_rgba(244,63,94,0.05)]",
   },

   netPositive: {
     border:
       "border-emerald-500/30",
     value:
       "text-emerald-400",
     icon:
       "bg-emerald-500/10 text-emerald-400",
     glow:
       "shadow-[0_0_35px_rgba(16,185,129,0.05)]",
   },

   loss: {
     border:
       "border-rose-500/20",
     value:
       "text-rose-400",
     icon:
       "bg-rose-500/10 text-rose-400",
     glow:
       "",
   },

   gain: {
     border:
       "border-emerald-500/20",
     value:
       "text-emerald-400",
     icon:
       "bg-emerald-500/10 text-emerald-400",
     glow:
       "",
   },

   obsolete: {
     border:
       "border-orange-500/30",
     value:
       "text-orange-400",
     icon:
       "bg-orange-500/10 text-orange-400",
     glow:
       "",
   },

   swing: {
     border:
       "border-amber-500/25",
     value:
       "text-amber-400",
     icon:
       "bg-amber-500/10 text-amber-400",
     glow:
       "",
   },

   phantom: {
     border:
       "border-violet-500/30",
     value:
       "text-violet-400",
     icon:
       "bg-violet-500/10 text-violet-400",
     glow:
       "shadow-[0_0_30px_rgba(139,92,246,0.04)]",
   },

   critical: {
     border:
       "border-red-500/25",
     value:
       "text-red-400",
     icon:
       "bg-red-500/10 text-red-400",
     glow:
       "",
   },
 };

 const current =
   tones[tone] ??
   tones.neutral;

 return (
<article
     className={`
       relative
       overflow-hidden
       min-h-[150px]
       rounded-2xl
       border
       bg-slate-900/75
       p-5
       ${current.border}
       ${current.glow}
     `}
>
<div className="flex items-start justify-between gap-3">
<p
         className="
           text-[10px]
           font-black
           uppercase
           tracking-[0.13em]
           text-slate-500
         "
>
         {title}
</p>

<div
         className={`
           w-8
           h-8
           rounded-lg
           flex
           items-center
           justify-center
           ${current.icon}
         `}
>
         {icon}
</div>
</div>

<div
       className={`
         mt-4
         text-2xl
         sm:text-3xl
         font-black
         tracking-tight
         ${current.value}
       `}
>
       {value}
</div>

<div className="mt-2 flex items-end justify-between gap-2">
<p className="text-[11px] text-slate-500 leading-relaxed">
         {subtitle}
</p>

       {secondary && (
<span
           className="
             text-[10px]
             font-bold
             text-slate-400
             whitespace-nowrap
           "
>
           {secondary}
</span>
       )}
</div>
</article>
 );
}

function WaitingForSources() {
 return (
<section
     className="
       rounded-2xl
       border
       border-slate-800
       bg-slate-900/50
       px-5
       py-8
       text-center
     "
>
<div
       className="
         mx-auto
         w-10
         h-10
         rounded-xl
         bg-orange-500/10
         border
         border-orange-500/20
         flex
         items-center
         justify-center
         text-orange-400
       "
>
<DollarIcon
         size={20}
       />
</div>

<h2
       className="
         mt-4
         text-lg
         font-black
         text-slate-200
       "
>
       Esperando fuentes del corte
</h2>

<p
       className="
         mt-1
         text-xs
         text-slate-500
         max-w-xl
         mx-auto
       "
>
       Los indicadores financieros permanecerán bloqueados hasta que estén cargados Areas, QAD 3.2, ISPBB, BOM y Cost Part.
</p>

<p
       className="
         mt-3
         text-[10px]
         text-slate-600
       "
>
       Esto evita presentar dólares parciales como si fueran un resultado completo.
</p>
</section>
 );
}

export default function FinancialKpis({
 summary,
 referencesReady = false,
 criticalUsdThreshold = 10000,
}) {
 /**
  * No mostramos $0 como si fuera
  * un resultado real cuando todavía
  * faltan fuentes.
  */
 if (!referencesReady) {
   return (
<WaitingForSources />
   );
 }

 const data =
   summary ?? {};

 const netUsd =
   Number(
     data.netUsd
   ) || 0;

 const netTone =
   netUsd < 0
     ? "netNegative"
     : netUsd > 0
       ? "netPositive"
       : "neutral";

 return (
<section>
     {/* =================================================
         FILA PRINCIPAL - FINANZAS
     ================================================= */}
<div
       className="
         grid
         grid-cols-1
         sm:grid-cols-2
         xl:grid-cols-4
         gap-4
       "
>
<KpiCard
         title="Neto Planta"
         value={
           formatMoney(
             netUsd
           )
         }
         subtitle="Físico total vs QAD congelado"
         tone={netTone}
         icon={
<DollarIcon
             size={17}
           />
         }
       />

<KpiCard
         title="Pérdidas Brutas"
         value={
           formatMoney(
             data.grossLossUsd
           )
         }
         subtitle="Faltantes sin compensar ganancias"
         tone="loss"
         icon={
<ArrowDownIcon
             size={17}
           />
         }
       />

<KpiCard
         title="Ganancias Brutas"
         value={
           formatMoney(
             data.grossGainUsd
           )
         }
         subtitle="Sobrantes físicos detectados"
         tone="gain"
         icon={
<ArrowUpIcon
             size={17}
           />
         }
       />

<KpiCard
         title="Ganancia Obsoleta"
         value={
           formatMoney(
             data.obsoleteGainUsd
           )
         }
         subtitle="Status OBSOLETE con físico > QAD"
         tone="obsolete"
         icon={
<AlertIcon
             size={17}
           />
         }
       />
</div>

     {/* =================================================
         FILA OPERATIVA
     ================================================= */}
<div
       className="
         grid
         grid-cols-1
         sm:grid-cols-3
         gap-4
         mt-4
       "
>
<KpiCard
         title="Swing USD"
         value={
           formatMoney(
             data.swingUsd,
             {
               absolute: true,
             }
           )
         }
         subtitle="Exposición por mala ubicación"
         tone="swing"
         secondary={
           data.swingPieces !==
           undefined
             ? `${formatNumber(
                 data.swingPieces
               )} pzas`
             : undefined
         }
         icon={
<SwingIcon
             size={17}
           />
         }
       />

<KpiCard
         title="Phantom Radar"
         value={
           formatNumber(
             data.phantomCount
           )
         }
         subtitle="Partes Phantom detectadas por ISPBB"
         tone="phantom"
         secondary={
           data.phantomAdjustedUsd
             ? formatMoney(
                 data.phantomAdjustedUsd,
                 {
                   absolute:
                     true,
                 }
               )
             : "Sin ajuste $"
         }
         icon={
<GhostIcon
             size={17}
           />
         }
       />

<KpiCard
         title="Casos Críticos"
         value={
           formatNumber(
             data.criticalCount
           )
         }
         subtitle={`Impacto absoluto ≥ ${formatMoney(
           criticalUsdThreshold
         )}`}
         tone="critical"
         icon={
<AlertIcon
             size={17}
           />
         }
       />
</div>
</section>
 );
}