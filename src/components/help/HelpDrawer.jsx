// src/components/help/HelpDrawer.jsx
import React from "react";
const HELP = {
 overview: {
   eyebrow: "SYSTEM GUIDE",
   title: "Cómo funciona el reconciliador",
   description:
     "El dashboard combina un snapshot físico LIVE de 4Wall con fuentes congeladas de QAD para calcular exposición financiera durante el inventario.",
   source: "4Wall + QAD 3.2 + ISPBB + BOM Export + Cost Part",
   formula: "RAW → NORMALIZED → RECONCILED → USD",
   notes: [
     "4Wall cambia durante el día y llega desde Supabase.",
     "QAD, ISPBB, BOM y Cost Part se cargan como referencias congeladas.",
     "Las fórmulas viven en /domain. React solamente presenta resultados.",
   ],
 },
 net: {
   eyebrow: "FINANCIAL KPI",
   title: "NET Plant",
   description:
     "Variación financiera final entre lo encontrado físicamente y lo registrado en QAD.",
   source:
     "Physical: 4Wall + Phantom/BOM adjustments. System: QAD 3.2. Cost: Cost Part Browse.",
   formula: "NET Pieces = Physical Total - QAD Total\nNET USD = NET Pieces × Cost Total",
   notes: [
     "El signo se conserva.",
     "Negativo = pérdida.",
     "Positivo = ganancia.",
     "No se usa Math.abs para presentar NET.",
     "El corte intradía incluye partes QAD aún sin escaneo físico como pérdida provisional; Finanzas debe definir cuándo se consideran faltantes.",
     "El alcance financiero definitivo de localidades sigue pendiente de validación.",
   ],
 },
 grossLoss: {
   eyebrow: "FINANCIAL KPI",
   title: "Gross Loss",
   description:
     "Suma de todas las pérdidas antes de permitir que las ganancias las compensen.",
   source: "Resultado por Part Number del motor de conciliación.",
   formula: "Σ NET USD cuando NET USD < 0",
   notes: [
     "Sirve para no esconder faltantes detrás de sobrantes.",
     "Forma parte del NET final.",
   ],
 },
 grossGain: {
   eyebrow: "FINANCIAL KPI",
   title: "Gross Gain",
   description:
     "Suma de todas las ganancias antes de compensarlas contra pérdidas.",
   source: "Resultado por Part Number del motor de conciliación.",
   formula: "Σ NET USD cuando NET USD > 0",
   notes: [
     "Incluye las ganancias clasificadas como obsoletas.",
     "Obsolete + también se muestra por separado.",
   ],
 },
 obsolete: {
   eyebrow: "FINANCIAL KPI",
   title: "Obsolete +",
   description:
     "Ganancia proveniente de material cuyo Status en Cost Part es OBSOLETE.",
   source: "Cost Part Browse → Status + Cost Total.",
   formula:
     "Si Status = OBSOLETE y Physical > QAD:\nObsolete Gain = (Physical - QAD) × Cost Total",
   notes: [
     "No se detecta obsoleto por prefijos.",
     "La ganancia continúa formando parte del NET.",
   ],
 },
 swing: {
   eyebrow: "LOCATION KPI",
   title: "SWING",
   description:
     "Material existente pero localizado físicamente en una localidad diferente a QAD.",
   source:
     "4Wall AreaName → 4Wall Area Dictionary → QAD Location, comparado contra QAD 3.2.",
   formula:
     "SWING Pieces = Σ |Physical(location) - QAD(location)|\nSWING USD = SWING Pieces × Cost Total",
   notes: [
     "No se divide entre dos.",
     "Se preservan localidades exactas.",
     "El scope/grupo financiero definitivo de localidades todavía debe validarse con Finanzas.",
   ],
 },
 phantom: {
   eyebrow: "BOM / PHANTOM",
   title: "Phantom Radar",
   description:
     "Identifica componentes Phantom y ajustes derivados de estructuras BOM.",
   source:
     "ISPBB 50.1.4.22 → Phantom. BOM Export 50.13.8.16 → Parent / Component / Usage.",
   formula: "Contribution = scanned parent quantity × Usage",
   notes: [
     "ISPBB es la fuente autoritativa para Phantom.",
     "No se utilizan prefijos P7, 0000 ni otras reglas por Part Number.",
     "Se utiliza Usage, no Grossed up Usage.",
     "La explosión multinivel permanece deshabilitada hasta validación funcional.",
     "Solo una relación directa de nivel 1 con padre escaneado puede aportar físico derivado.",
     "Aparecer como componente en el BOM indica dónde investigar; por sí solo no acredita físico ni reduce NET.",
   ],
 },
 physical: {
   eyebrow: "DATA COLUMN",
   title: "Physical",
   description:
     "Cantidad física consolidada que el motor reconoce para el Part Number.",
   source:
     "4Wall LIVE desde Supabase + Area Dictionary + contribuciones Phantom/BOM cuando correspondan.",
   formula: "Physical Total = Σ Physical by exact QAD location",
   notes: [
     "AreaName desconocida se clasifica UNMAPPED.",
     "Nunca se adivina una localidad.",
   ],
 },
 qad: {
   eyebrow: "DATA COLUMN",
   title: "QAD",
   description:
     "Cantidad registrada en el congelado de QAD 3.2.",
   source: "QAD Inventory Detail by Item Browse.",
   formula: "QAD Total = Σ Quantity On Hand por Location",
   notes: [
     "Qty On Hand - Inv Mstr NO se suma.",
     "Actualmente el parser usa Site 179A y tipos PP, MP, FP.",
     "Las localidades exactas se conservan.",
   ],
 },
 cost: {
   eyebrow: "DATA COLUMN",
   title: "Unit Cost",
   description:
     "Costo utilizado para convertir diferencias de piezas a impacto financiero.",
   source: "Cost Part Browse → Cost Total.",
   formula: "USD Impact = Pieces × Cost Total",
   notes: [
     "El costo de 4Wall se conserva únicamente para validación.",
     "Cost Part es la fuente financiera usada por el motor actual.",
   ],
 },
 status: {
   eyebrow: "CLASSIFICATION",
   title: "Part Status",
   description:
     "Clasificación principal calculada para cada Part Number.",
   source: "Motor de reconciliación.",
   formula:
     "LOSS / GAIN / OBSOLETE_GAIN / UNEXPECTED / MISSING_PHYSICAL / SWING / BALANCED",
   notes: [
     "QAD=0 con físico se clasifica UNEXPECTED.",
     "Una pieza puede tener SWING aunque su estado principal sea LOSS o GAIN.",
   ],
 },
 flags: {
   eyebrow: "DATA HEALTH",
   title: "Flags",
   description:
     "Alertas de calidad de datos que pueden afectar la interpretación financiera.",
   source: "Diagnósticos del motor.",
   formula: "QAD0 / MAP? / $? / Phantom mismatch",
   notes: [
     "QAD0 = QAD esperaba cero y apareció físico.",
     "MAP? = AreaName sin mapeo oficial.",
     "$? = falta costo.",
   ],
 },
};
export function HelpButton({
 topic,
 onHelp,
 className = "",
}) {
 const openHelp = (event) => {
   event.stopPropagation();
   onHelp?.(topic);
 };
 return (
<span
     role="button"
     tabIndex={0}
     onClick={openHelp}
     onKeyDown={(event) => {
       if (
         event.key === "Enter" ||
         event.key === " "
       ) {
         event.preventDefault();
         openHelp(event);
       }
     }}
     title="¿De dónde sale este dato?"
     className={`
       inline-flex
       items-center
       justify-center
       w-4
       h-4
       rounded-full
       border
       border-slate-700
       text-[8px]
       font-black
       text-slate-400
       hover:text-orange-300
       hover:border-orange-500/40
       transition-colors
       cursor-pointer
       ${className}
     `}
>
     ?
</span>
 );
}
export default function HelpDrawer({
 topic,
 onClose,
}) {
 if (!topic) {
   return null;
 }
 const info =
   HELP[topic] ||
   HELP.overview;
 return (
<div
     className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-[2px]"
     onMouseDown={(event) => {
       if (
         event.target ===
         event.currentTarget
       ) {
         onClose?.();
       }
     }}
>
<aside
       className="
         absolute
         top-0
         right-0
         bottom-0
         w-full
         max-w-[470px]
         bg-[#06111b]
         border-l
         border-slate-700/60
         shadow-[-30px_0_90px_rgba(0,0,0,.45)]
         overflow-y-auto
       "
>
<div
         className="
           sticky
           top-0
           z-10
           bg-[#06111b]/95
           backdrop-blur-xl
           px-6
           py-5
           border-b
           border-slate-800
         "
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="vi-eyebrow">
               {info.eyebrow}
</p>
<h2 className="mt-1 text-xl font-black text-white vi-glow-title">
               {info.title}
</h2>
</div>
<button
             type="button"
             onClick={onClose}
             className="vi-button"
>
             CLOSE
</button>
</div>
</div>
<div className="p-6">
<p className="text-sm leading-relaxed text-slate-300">
           {info.description}
</p>
<section className="mt-7">
<p className="help-label">
             SOURCE
</p>
<div className="help-block">
             {info.source}
</div>
</section>
<section className="mt-5">
<p className="help-label">
             FORMULA / RULE
</p>
<pre className="help-formula">
             {info.formula}
</pre>
</section>
<section className="mt-5">
<p className="help-label">
             NOTES
</p>
<div className="space-y-3 mt-3">
             {info.notes.map(
               (note, index) => (
<div
                   key={index}
                   className="flex gap-3"
>
<span className="text-yellow-400 mt-[2px]">
                     •
</span>
<p className="text-xs leading-relaxed text-slate-400">
                     {note}
</p>
</div>
               )
             )}
</div>
</section>
</div>
</aside>
</div>
 );
}
