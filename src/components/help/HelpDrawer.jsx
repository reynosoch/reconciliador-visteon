import { RubberDrawer } from "../visual/ScrollEffects.jsx";
// src/components/help/HelpDrawer.jsx
import OverlayPortal from "../shell/OverlayPortal.jsx";
const HELP = {
 overview: {
  eyebrow: "GUÍA DEL SISTEMA", title: "Cómo usar el tablero",
  description: "Carga los archivos, actualiza 4Wall y revisa las diferencias. Antes de la junta, guarda los resultados para compararlos después.",
  source: "Escaneos 4Wall + diccionario de áreas + QAD 3.2 + ISPBB + BOM + Cost Part.",
  formula: "Físico − QAD = diferencia de piezas.\nDiferencia de piezas × costo = impacto en USD.",
  notes: ["Los escaneos de 4Wall se actualizan durante el día; las demás fuentes se cargan como archivos de referencia.", "Un material pendiente de contar puede aparecer como pérdida preliminar. Revisa la advertencia antes de interpretar el total.", "Selecciona un Part Number para ver localidades, costo y relaciones BOM disponibles."],
 },
 net: {
  eyebrow: "INDICADOR FINANCIERO", title: "Diferencia total en dólares",
  description: "Compara lo contado con lo que aparece en QAD. Un número negativo significa que llevamos menos piezas; uno positivo, que llevamos más. El resultado puede cambiar mientras siguen contando.",
  source: "4Wall y su diccionario de áreas para el físico; QAD 3.2 para lo esperado; Cost Part para valorar la diferencia.",
  formula: "NET piezas = físico total − QAD total.\nNET USD = NET piezas × Cost Total.",
  notes: ["El signo de cada diferencia se conserva.", "Las partes de QAD que aún no se cuentan reducen este resultado. La interpretación final debe respetar el alcance operativo acordado cuándo tratarlas como faltantes.", "Falta acordar con el departamento qué lugares vamos a incluir."],
 },
 grossLoss: {
  eyebrow: "INDICADOR FINANCIERO", title: "Pérdida bruta",
  description: "Se suman todas las diferencias negativas de cada Part Number antes de compensarlas con ganancias.",
  source: "NET de cada Part Number, calculado con 4Wall, QAD y Cost Part.",
  formula: "Pérdida bruta = suma de los NET USD negativos.",
  notes: ["Ayuda a ver los faltantes aunque existan sobrantes en otras partes.", "Incluye material que puede estar pendiente de contar. No significa que ya se confirmó una pérdida."],
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
  description: "Compara las cantidades lugar por lugar. Aumenta si falta o sobra material en algún lugar, aunque la cantidad total del número de parte coincida. Por sí solo no confirma que el material se movió.",
  source: "4Wall, diccionario oficial de áreas y localidades exactas de QAD 3.2.",
  formula: "Se compara el físico y QAD localidad por localidad.\nSWING piezas = suma de las diferencias absolutas por localidad.\nSWING USD = SWING piezas × Cost Total.",
  notes: ["La fórmula actual suma las diferencias de cada lugar sin dividir entre dos.", "SWING no demuestra por sí solo que falte material físicamente.", "La interpretación final depende del alcance operativo acordado qué lugares se incluyen."],
 },
 phantom: {
  eyebrow: "BOM / PHANTOM", title: "Phantom",
  description: "ISPBB indica qué escaneos son phantom. Buscamos ese número en Parent Item del BOM y calculamos sus componentes NO de nivel .2 multiplicando Usage por lo escaneado.",
  source: "Columna Phantom de ISPBB y relaciones Parent Item → Component del export BOM.",
  formula: "Contribución del componente = cantidad escaneada del padre × Usage.",
  notes: ["Solo ISPBB con Phantom = YES confirma esta clasificación; no se usan prefijos.", "Se usa Usage, no Grossed up Usage.", "Acuerdo del 29/09: solo filas Level .2 / 0.2 y Comp Phantom NO. Los demás niveles se ignoran; no se recorren otros BOM.", "El escaneo phantom queda visible como origen, pero no se suma como físico directo. Sus componentes se suman a los escaneos directos de cada componente."],
 },
 phantomRadar: {
  eyebrow: "PRIORIZACIÓN", title: "Radar Phantom",
  description: "Muestra hasta seis Part Numbers que ISPBB identifica como Phantom y que tienen las diferencias más grandes en dólares. Sirve para decidir cuáles investigar primero.",
  source: "Definición Phantom de ISPBB y resultados conciliados de 4Wall, QAD 3.2 y Cost Part.",
  formula: "Primero se filtran los Phantom confirmados en ISPBB. Después se ordenan por el tamaño del impacto NET USD, tanto si es pérdida como si es ganancia.",
  notes: ["Este radar es una lista de atención; no añade piezas ni modifica el resultado financiero.", "Selecciona un Part Number para ver lo escaneado, lo calculado desde un ensamble y sus lugares.", "Si no aparecen casos, revisa que ISPBB y las demás fuentes estén cargadas."],
 },
 dataHealth: {
  eyebrow: "FUENTES DEL CORTE", title: "Estado de datos",
  description: "Cada indicador resume una fuente o una lista de revisión. Selecciónalo para ver sus registros aquí mismo; selecciónalo otra vez o pulsa × para regresar al tablero.",
  source: "Reporte de escaneos 4Wall, archivos QAD y revisión de los datos.",
  formula: "Los números indican filas o Part Numbers, según la etiqueta. Alertas suma áreas sin mapeo, partes sin costo, material inesperado y diferencias de definición Phantom.",
  notes: ["Un mismo número de parte puede tener varios avisos.", "El panel muestra 50 filas por página y permite buscar sin cargar miles de renglones a la vez.", "Las alertas esperan a que se carguen los cinco archivos de referencia."],
 },
 bomReview: {
  eyebrow: "PISTA DE AUDITORÍA", title: "Revisar BOM",
  description: "Destaca Part Numbers con cantidad QAD positiva, sin físico reconocido aún, que aparecen como componentes en el BOM recibido. Pueden requerir revisar un subensamble.",
  source: "QAD 3.2, físico 4Wall y referencias Parent Item → Component del BOM cargado.",
  formula: "Filtro de revisión: QAD > 0, físico = 0 y componente presente en BOM.\nNo se suma cantidad física por esta coincidencia.",
  notes: ["Una referencia BOM es una pista, no prueba de que el padre fue contado.", "Revisa padre, nivel, Usage y sitio en el detalle; confirma el material con el equipo de inventario.", "La diferencia sigue en el total hasta que haya datos para explicarla o una regla acordada con el departamento."],
 },
 physical: {
  eyebrow: "DATO", title: "Físico",
  description: "Cantidad que el motor reconoce para este Part Number a partir de escaneos directos y, cuando aplica, contribuciones Phantom de BOM.",
  source: "4Wall y diccionario oficial de áreas; ISPBB y BOM para la contribución derivada.",
  formula: "Físico total = escaneos directos + cantidad calculada con el BOM.",
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
  notes: ["El costo de 4Wall se guarda como referencia, pero no se usa para valorar el NET.", "Todos los importes están en dólares. La interpretación final depende del alcance operativo acordado que Cost Total sea el costo que debemos usar.", "Si falta costo, la alerta $? lo señala; un USD cero no prueba ausencia de impacto."],
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
  notes: ["BOM? solo pide revisar el ensamble. No agrega piezas ni cambia los dólares.", "Abre el Part Number para revisar sus fuentes y localidades exactas."],
 },
};

const SOURCE_HELP = {
  scans: {
    title: "Escaneos 4Wall manuales",
    description: "Es el reporte físico capturado por 4Wall cuando se carga manualmente. Sustituye temporalmente el snapshot automático para que el motor use exactamente las filas de este archivo.",
    expected: "4wSc*.csv / .txt / .xlsx",
    update: "Se reemplaza completo cada vez que cargas otro archivo manual. Si el bot 4Wall está ejecutándose, la carga manual queda bloqueada hasta detenerlo.",
    notes: ["Part Number, Quantity y AreaName son los campos principales para reconocer físico.", "Las áreas se traducen a localidades QAD usando el archivo Áreas 4Wall.", "Quitar el archivo manual devuelve el dashboard al flujo automático de 4Wall."]
  },
  areas: {
    title: "Áreas 4Wall",
    description: "Es el diccionario que convierte el nombre del área capturada en 4Wall a la Localidad QAD correcta. No contiene cantidades de inventario.",
    expected: "4Wall-Area.csv / .txt / .xlsx",
    update: "Se reemplaza completo al cargar una versión nueva. El cambio vuelve a calcular la distribución por localidad.",
    notes: ["Nombre identifica el área de 4Wall.", "Localidad QAD es el valor usado para comparar contra QAD 3.2.", "Si un área no existe o no tiene localidad válida se conserva como UNMAPPED; el sistema no la adivina."]
  },
  qad: {
    title: "Inventario QAD congelado",
    description: "Es la fotografía del inventario esperado en QAD para el corte. Aporta Part Number, Site, Location, Item Type y Quantity On Hand.",
    expected: "Congelado QAD 3.2*.csv / .txt / .xlsx",
    update: "Se reemplaza completo al cargar un nuevo congelado. El motor vuelve a calcular QAD total, NET y diferencias por localidad.",
    notes: ["Quantity On Hand es la cantidad que se suma por localidad.", "Qty On Hand - Inv Mstr no se suma porque puede venir repetido.", "El visor muestra el archivo real cargado para revisar cualquier duda."]
  },
  ispbb: {
    title: "ISPBB / definición Phantom",
    description: "Es la fuente autoritativa para saber si un Part Number está marcado como Phantom. No se infiere por prefijos ni por el nombre del material.",
    expected: "ISPBB 179A*.csv / .txt / .xlsx",
    update: "Se reemplaza completo al cargar una versión nueva. Cambiar ISPBB puede cambiar qué escaneos se explotan mediante BOM.",
    notes: ["La columna Phantom determina YES/NO.", "Site ayuda a validar el alcance de planta.", "Un Phantom confirmado necesita su BOM aplicable para convertir el escaneo del padre en componentes."]
  },
  bom: {
    title: "BOM Export",
    description: "Relaciona Parent Item con Component y Usage. Es la base para transformar escaneos Phantom en cantidades derivadas de sus componentes según las reglas vigentes.",
    expected: "BOM*.csv / .txt / .xlsx",
    update: "Los BOM nuevos se agregan sin borrar los anteriores. Si una versión intenta cambiar un Parent Item ya guardado, el sistema detiene la mezcla y pide revisión.",
    notes: ["Para la regla actual se usan filas Level .2 / 0.2 con Comp Phantom = NO y Usage válido.", "Usage multiplica la cantidad escaneada del padre.", "En Fuentes puedes abrir VER TODOS o cada archivo BOM individual y descargar exactamente la selección abierta."]
  },
  cost: {
    title: "Cost Part",
    description: "Aporta el costo unitario y el Status usados para convertir diferencias de piezas a impacto financiero y reconocer material OBSOLETE.",
    expected: "Cost Part*.csv / .txt / .xlsx",
    update: "Se reemplaza completo al cargar otra versión. El motor vuelve a valorar NET, pérdida bruta, ganancia, SWING y obsoletos.",
    notes: ["Cost Total es el campo usado por la lógica actual.", "Status = OBSOLETE permite separar sobrante obsoleto.", "Un costo vacío, inválido o contradictorio queda como SIN VALORAR; no se convierte silenciosamente a USD 0."]
  }
};

Object.assign(HELP, {
  financialNet: {...HELP.net, title:"Diferencia total / NET", description:"Resume el impacto total del inventario por Part Number y después lo agrega al corte. Conserva el signo: negativo es faltante neto y positivo es sobrante neto."},
  financialGrossLoss: {...HELP.grossLoss, title:"Pérdida bruta del corte"},
  financialGrossGain: {...HELP.grossGain, title:"Ganancia bruta del corte"},
  financialObsolete: {...HELP.obsolete, title:"Sobrante obsoleto valorizado"},
  financialSwing: {...HELP.swing, title:"SWING total del corte"},
  financialPhantom: {...HELP.phantom, title:"Phantoms definidos en ISPBB", description:"Cuenta los Part Numbers que ISPBB identifica como Phantom dentro del universo conciliado. La clasificación proviene de ISPBB; el BOM se usa después para derivar componentes cuando corresponde."},
  obsoleteRadar: {...HELP.obsolete, eyebrow:"PRIORIZACIÓN", title:"Radar de obsoletos +", description:"Prioriza Part Numbers con Status OBSOLETE y sobrante físico valorizado. Sirve para investigar los impactos más relevantes sin cambiar el NET."},
  tableStatus: {...HELP.status, title:"Estado en la tabla de conciliación", description:"Etiqueta la situación principal del Part Number en esta fila de la tabla. Sirve para orientar la investigación; no reemplaza el detalle de alertas ni la evidencia."},
  tableNet: {...HELP.net, title:"NET USD de la tabla", description:"Es el NET del Part Number de esta fila, calculado con su físico total, QAD total y costo válido."},
  tableSwing: {...HELP.swing, title:"SWING de la tabla", description:"Muestra la magnitud de diferencias por localidad para el Part Number de esta fila. Puede existir aunque el total físico y QAD coincidan."},
  tablePhysical: {...HELP.physical, title:"Físico reconocido en la tabla", description:"Es la cantidad física total que usa el motor para este Part Number: escaneo directo más contribuciones Phantom válidas cuando aplican."},
  tableQad: {...HELP.qad, title:"QAD esperado en la tabla", description:"Es la suma de Quantity On Hand del Part Number en el congelado QAD filtrado para el alcance vigente."},
  tableCost: {...HELP.cost, title:"Costo de la tabla", description:"Es el Cost Total válido usado para valorar este Part Number. Si no es confiable, el resultado queda SIN VALORAR."},
  tableFlags: {...HELP.flags, title:"Alertas de la fila", description:"Resume las banderas de calidad o investigación de este Part Number. Cada código indica una causa distinta y puede coexistir con otras."},
  detailNet: {...HELP.net, title:"NET USD de este Part Number"},
  detailSwing: {...HELP.swing, title:"SWING de este Part Number"},
  detailPhysical: {...HELP.physical, title:"Físico total de este Part Number"},
  detailQad: {...HELP.qad, title:"QAD total de este Part Number"},
  detailPhysicalLocations: {...HELP.physical, eyebrow:"LOCALIDADES 4WALL", title:"Localidades del físico", description:"Desglosa dónde fue reconocido el físico de este Part Number. Las áreas vienen de 4Wall y se traducen con el diccionario Áreas 4Wall."},
  detailQadLocations: {...HELP.qad, eyebrow:"LOCALIDADES QAD", title:"Localidades esperadas en QAD", description:"Desglosa Quantity On Hand por Location para este Part Number dentro del congelado QAD cargado."},
  detailCost: {...HELP.cost, title:"Costo unitario de este Part Number"},
  detailCostStatus: {...HELP.status, eyebrow:"COST PART", title:"Status de Cost Part", description:"Es el Status recibido en Cost Part para este Part Number. Se usa, entre otras cosas, para reconocer OBSOLETE; no describe el estado de conteo."},
  detailPlanningStatus: {...HELP.status, eyebrow:"ISPBB", title:"Status de planeación ISPBB", description:"Es el Status de planeación recibido en ISPBB. Es distinto al Status de Cost Part y no se usa como sustituto del campo Phantom."},
  detailPhantom: {...HELP.phantom, title:"Clasificación Phantom de este Part Number", description:"Indica si ISPBB marca específicamente este Part Number como Phantom YES o NO."},
  detailPhantomRule: {...HELP.phantom, title:"Cómo se aplica el BOM a este Phantom", description:"Explica la relación del Part Number seleccionado con sus componentes BOM y la cantidad derivada por Usage. El escaneo del padre queda como trazabilidad y no se suma dos veces."}
});

function sourceHelpInfo(topic, sources = {}) {
  if (!String(topic || "").startsWith("source:")) return null;
  const type = String(topic).slice(7);
  const config = SOURCE_HELP[type];
  if (!config) return null;
  const source = sources?.[type] || {};
  let sourceText = "Archivo esperado: " + config.expected + ".";
  if (type === "bom" && Array.isArray(source.files) && source.files.length) {
    sourceText = "Archivos cargados: " + source.files.map((file) => file.fileName).join(", ") + ".";
  } else if (source.loaded && source.fileName) {
    sourceText = "Archivo cargado: " + source.fileName + ".";
  }
  return {
    eyebrow: "FUENTE DEL INVENTARIO",
    title: config.title,
    description: config.description,
    source: sourceText,
    formula: config.update,
    methodLabel: "CÓMO SE ACTUALIZA",
    notes: config.notes
  };
}

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
 sources,
 onClose,
}) {
 if (!topic) {
   return null;
 }
 const info =
   sourceHelpInfo(topic, sources) ||
   HELP[topic] ||
   HELP.overview;
 return (
<OverlayPortal onClose={onClose}>
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
<RubberDrawer
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
<button type="button" onClick={onClose} className="vi-icon-close" aria-label="Cerrar ayuda">×</button>
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
             {info.methodLabel || "CÓMO SE CALCULA"}
</p>
<pre className="help-formula">
             {info.formula}
</pre>
</section>
<section className="mt-5">
<p className="help-label">
             OBSERVACIONES / DETALLES
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
</RubberDrawer>
</div>
</OverlayPortal>
 );
}
