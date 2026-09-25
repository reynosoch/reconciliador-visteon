// src/components/help/HelpDrawer.jsx
import React from "react";
const HELP = {
 overview: {
  eyebrow: "GUÍA DEL SISTEMA", title: "Cómo leer el corte de inventario",
  description: "4Wall muestra lo contado en planta. QAD muestra lo esperado. El sistema cruza ambas fuentes y ordena las diferencias por impacto en USD para decidir qué auditar durante el día.",
  source: "Escaneos 4Wall + diccionario de áreas + QAD 3.2 + ISPBB + BOM + Cost Part.",
  formula: "Físico − QAD = diferencia de piezas.\nDiferencia de piezas × costo = impacto en USD.",
  notes: ["Los escaneos de 4Wall se actualizan durante el día; las demás fuentes se cargan como archivos de referencia.", "Un material pendiente de contar puede aparecer como pérdida preliminar. Revisa la advertencia antes de interpretar el total.", "Selecciona un Part Number para ver localidades, costo y relaciones BOM disponibles."],
 },
 net: {
  eyebrow: "INDICADOR FINANCIERO", title: "NET de planta",
  description: "Es el balance firmado entre lo contado y lo esperado, sumado para todos los Part Numbers y localidades incluidas en este corte. Un valor negativo señala pérdida; uno positivo, ganancia.",
  source: "4Wall y su diccionario de áreas para el físico; QAD 3.2 para lo esperado; Cost Part para valorar la diferencia.",
  formula: "NET piezas = físico total − QAD total.\nNET USD = NET piezas × Cost Total.",
  notes: ["El signo de cada diferencia se conserva.", "Las partes QAD todavía sin escaneo se incluyen como pérdidas preliminares. Finanzas debe confirmar cuándo se consideran faltantes.", "El alcance definitivo de localidades sigue pendiente de validación."],
 },
 grossLoss: {
  eyebrow: "INDICADOR FINANCIERO", title: "Pérdida bruta",
  description: "Se suman todas las diferencias negativas de cada Part Number antes de compensarlas con ganancias.",
  source: "NET de cada Part Number, calculado con 4Wall, QAD y Cost Part.",
  formula: "Pérdida bruta = suma de los NET USD negativos.",
  notes: ["Ayuda a ver los faltantes aunque existan sobrantes en otras partes.", "Incluye partes QAD todavía no escaneadas; su interpretación intradía es preliminar."],
 },
 grossGain: {
  eyebrow: "INDICADOR FINANCIERO", title: "Ganancia bruta",
  description: "Se suman todas las diferencias positivas de cada Part Number antes de compensarlas con pérdidas.",
  source: "NET de cada Part Number, calculado con 4Wall, QAD y Cost Part.",
  formula: "Ganancia bruta = suma de los NET USD positivos.",
  notes: ["Incluye la ganancia de material OBSOLETE cuando corresponde.", "Si QAD esperaba cero, el material se señala aparte como inesperado."],
 },
 obsolete: {
  eyebrow: "INDICADOR FINANCIERO", title: "Obsoleto +",
  description: "Muestra la ganancia de material marcado OBSOLETE en Cost Part cuando el físico supera a QAD.",
  source: "Status y Cost Total de Cost Part; cantidades de 4Wall y QAD.",
  formula: "Si Status = OBSOLETE y físico > QAD:\nGanancia obsoleta = (físico − QAD) × Cost Total.",
  notes: ["Esta ganancia sigue incluida en el NET general.", "No se detecta material obsoleto por el nombre o prefijo del Part Number."],
 },
 swing: {
  eyebrow: "INDICADOR DE LOCALIDAD", title: "SWING",
  description: "Señala diferencias de ubicación: 4Wall reporta material en una localidad distinta de la registrada en QAD. También puede coexistir con una pérdida o ganancia total.",
  source: "4Wall, diccionario oficial de áreas y localidades exactas de QAD 3.2.",
  formula: "Se compara el físico y QAD localidad por localidad.\nSWING piezas = suma de las diferencias absolutas por localidad.\nSWING USD = SWING piezas × Cost Total.",
  notes: ["No se divide entre dos; Finanzas quiere ver el movimiento por localidad.", "SWING no demuestra por sí solo que falte material físicamente.", "Finanzas aún debe validar qué localidades forman el alcance financiero definitivo."],
 },
 phantom: {
  eyebrow: "BOM / PHANTOM", title: "Phantom",
  description: "ISPBB define si un componente es Phantom. Cuando se escanea un padre con una relación directa válida, el motor puede sumar al componente la cantidad derivada del BOM.",
  source: "Columna Phantom de ISPBB y relaciones Parent Item → Component del export BOM.",
  formula: "Contribución del componente = cantidad escaneada del padre × Usage.",
  notes: ["Solo ISPBB con Phantom = YES confirma esta clasificación; no se usan prefijos.", "Se usa Usage, no Grossed up Usage.", "La explosión de varios niveles sigue pendiente de un caso real validado.", "La cantidad directa 4Wall y la derivada de BOM se mantienen separadas."],
 },
 phantomRadar: {
  eyebrow: "PRIORIZACIÓN", title: "Radar Phantom",
  description: "Muestra hasta seis Part Numbers que ISPBB identifica como Phantom y que tienen el mayor impacto NET absoluto en este corte. Sirve para decidir cuáles investigar primero.",
  source: "Definición Phantom de ISPBB y resultados conciliados de 4Wall, QAD 3.2 y Cost Part.",
  formula: "Primero se filtran los Phantom confirmados en ISPBB. Después se ordenan por el tamaño del impacto NET USD, tanto si es pérdida como si es ganancia.",
  notes: ["Este radar es una lista de atención; no añade piezas ni modifica el resultado financiero.", "Selecciona un Part Number para ver su cantidad directa, posible contribución BOM y localidades.", "Si no aparecen casos, revisa que ISPBB y las demás fuentes estén cargadas."],
 },
 dataHealth: {
  eyebrow: "FUENTES DEL CORTE", title: "Estado de datos",
  description: "Cada indicador resume una fuente o una lista de revisión. Selecciónalo para ver sus registros aquí mismo; selecciónalo otra vez o pulsa CERRAR para regresar al tablero.",
  source: "Snapshot de escaneos 4Wall, archivos QAD y diagnósticos del motor.",
  formula: "Los números indican filas o Part Numbers, según la etiqueta. Alertas suma áreas sin mapeo, partes sin costo, material inesperado y diferencias de definición Phantom.",
  notes: ["Un mismo Part Number puede figurar en más de un tipo de alerta.", "El panel muestra 50 filas por página y permite buscar sin cargar miles de renglones a la vez.", "Las alertas esperan a que se carguen los cinco archivos de referencia."],
 },
 bomReview: {
  eyebrow: "PISTA DE AUDITORÍA", title: "Revisar BOM",
  description: "Destaca Part Numbers con cantidad QAD positiva, sin físico reconocido aún, que aparecen como componentes en el BOM recibido. Pueden requerir revisar un subensamble.",
  source: "QAD 3.2, físico 4Wall y referencias Parent Item → Component del BOM cargado.",
  formula: "Filtro de revisión: QAD > 0, físico = 0 y componente presente en BOM.\nNo se suma cantidad física por esta coincidencia.",
  notes: ["Una referencia BOM es una pista, no prueba de que el padre fue contado.", "Revisa padre, nivel, Usage y sitio en el detalle; confirma el material con el equipo de inventario.", "La exposición sigue en el NET preliminar hasta contar con un ajuste Phantom válido o una regla confirmada por Finanzas."],
 },
 physical: {
  eyebrow: "DATO", title: "Físico",
  description: "Cantidad que el motor reconoce para este Part Number a partir de escaneos directos y, cuando aplica, contribuciones Phantom de BOM.",
  source: "4Wall y diccionario oficial de áreas; ISPBB y BOM para la contribución derivada.",
  formula: "Físico total = escaneos directos + contribución BOM validada.",
  notes: ["Las localidades se conservan exactamente, con WHSE normalizado a ZWHSE.", "Una AreaName que no existe en el diccionario queda como UNMAPPED; no se adivina su localidad."],
 },
 qad: {
  eyebrow: "DATO", title: "QAD",
  description: "Cantidad que el congelado QAD 3.2 registra para un Part Number en sus localidades.",
  source: "QAD Inventory Detail by Item Browse, Site 179A y tipos PP, MP, FP del archivo cargado.",
  formula: "QAD total = suma de Quantity On Hand por localidad.",
  notes: ["Qty On Hand - Inv Mstr es un dato maestro repetido; no se suma.", "Se conservan las localidades exactas para revisar diferencias de ubicación."],
 },
 cost: {
  eyebrow: "DATO", title: "Costo unitario",
  description: "Es el costo con el que cada diferencia de piezas se convierte en impacto financiero.",
  source: "Campo Cost Total de Cost Part Browse.",
  formula: "Impacto USD = diferencia de piezas × Cost Total.",
  notes: ["El costo de 4Wall se guarda como referencia, pero no se usa para valorar el NET.", "Finanzas aún debe confirmar que Cost Total es el costo oficial expresado en USD.", "Si falta costo, la alerta $? lo señala; un USD cero no prueba ausencia de impacto."],
 },
 status: {
  eyebrow: "CLASIFICACIÓN", title: "Estado del Part Number",
  description: "Resume el tipo principal de diferencia para orientar la auditoría. Una misma parte también puede tener SWING aunque su estado principal sea pérdida o ganancia.",
  source: "Clasificación del motor a partir de 4Wall, QAD y Cost Part.",
  formula: "PÉRDIDA, GANANCIA, OBSOLETO +, INESPERADO, SIN FÍSICO, SWING o BALANCEADO.",
  notes: ["QAD = 0 con físico positivo se clasifica como material inesperado.", "SIN FÍSICO durante el día puede significar material pendiente de auditar."],
 },
 flags: {
  eyebrow: "CALIDAD DE DATOS", title: "Alertas",
  description: "Marcas que explican por qué una cifra necesita revisión adicional antes de tomar decisiones.",
  source: "Diagnósticos del motor y archivos cargados.",
  formula: "QAD0 = material inesperado. BOM? = revisar relación de subensamble. MAP? = área sin localidad oficial. $? = costo faltante.",
  notes: ["BOM? no acredita físico ni modifica NET.", "Abre el Part Number para revisar sus fuentes y localidades exactas."],
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
     aria-label="Explicar el origen y cálculo de este dato"
     className={`vi-help-trigger ${className}`}
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
     className="vi-drawer-backdrop fixed inset-0 z-[120] bg-black/55 backdrop-blur-[2px]"
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
         vi-drawer-panel
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
             CERRAR
</button>
</div>
</div>
<div className="p-6">
<p className="text-sm leading-relaxed text-slate-300">
           <strong className="help-label block mb-2">QUÉ SIGNIFICA</strong>
           {info.description}
</p>
<section className="mt-7">
<p className="help-label">
             FUENTE
</p>
<div className="help-block">
             {info.source}
</div>
</section>
<section className="mt-5">
<p className="help-label">
             CÓMO SE CALCULA
</p>
<pre className="help-formula">
             {info.formula}
</pre>
</section>
<section className="mt-5">
<p className="help-label">
             QUÉ DEBO REVISAR
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
<p className="text-sm leading-relaxed text-slate-300">{note}</p>
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
