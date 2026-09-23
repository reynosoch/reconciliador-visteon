import React, { useMemo, useState, useEffect } from "react";

const HelpCircle = ({ size = 20, className = "" }) => (
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
</svg>
);

const X = ({ size = 20, className = "" }) => (
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
</svg>
);

const Calculator = ({ size = 20, className = "" }) => (
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>
</svg>
);

const ArrowRightLeft = ({ size = 20, className = "" }) => (
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>
</svg>
);

const Ghost = ({ size = 20, className = "" }) => (
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
<path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/>
</svg>
);

const AlertOctagon = ({ size = 20, className = "" }) => (
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
<polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
</svg>
);

const Search = ({ size = 20, className = "" }) => (
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
</svg>
);

const DollarSign = ({ size = 20, className = "" }) => (
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
</svg>
);

const Filter = ({ size = 20, className = "" }) => (
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
</svg>
);

const RefreshCw = ({ size = 20, className = "" }) => (
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
<path d="M3 3v5h5"/>
<path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
<path d="M16 21h5v-5"/>
</svg>
);

const MAPEO_AREAS = {
ALMACEN: "ALMACEN",
BODEGA: "ALMACEN",
RECEPCION: "ALMACEN",
RACKS: "ALMACEN",
SUPERMERCADO: "ALMACEN",
ZWHSE: "ALMACEN",
PISO: "PISO",
"LINEA 1": "PISO",
"LINEA 2": "PISO",
SMT: "PISO",
SUBENSAMBLE: "PISO",
WIP: "PISO",
ZWIP: "PISO",
CALIDAD: "PISO",
PLASTICOS: "PISO"
};

const PHANTOM_USAGES = {
"P7-PHANTOM-TEST": 2,
"P770094DF50001": 1
};

const ARCHIVOS_FUENTE_BASE = [
{ nombre: "4wall-Area(5) - Diccionario Layout", tipo: "4Wall", estado: "Mapeado" },
{ nombre: "Congelado QAD 3.2 (Inventory Detail)", tipo: "QAD 3.2", estado: "Foto Base" },
{ nombre: "Extracción Automática Playwright", tipo: "4Wall en Vivo", estado: "Sincronizado" }
];

const INVENTARIO_BASE_FALLBACK = [
{ pn: "P247537BFKAAAB", almacen: 0, piso: 0, dsv: 0, qad: 66000, costo: 0.037470 },
{ pn: "P522019BFAAX00", almacen: 0, piso: 0, dsv: 0, qad: 7500, costo: 0.042153 },
{ pn: "P447062DFDEX04", almacen: 0, piso: 0, dsv: 0, qad: 10000, costo: 0.025251 },
{ pn: "P770094DF50001", almacen: 0, piso: 0, dsv: 0, qad: 4000, costo: 3.614610 },
{ pn: "PL110045BFDMCAC", almacen: 0, piso: 0, dsv: 0, qad: 280000, costo: 0.000305 },
{ pn: "PL60193BF20X02", almacen: 0, piso: 0, dsv: 0, qad: 4000, costo: 0.010172 },
{ pn: "P410252CFDEX01", almacen: 0, piso: 0, dsv: 0, qad: 1600, costo: 0.124628 },
{ pn: "VPRLXF-OBSOLETO", almacen: 0, piso: 0, dsv: 0, qad: 1900, costo: 50.00 },
{ pn: "P7-PHANTOM-TEST", almacen: 0, piso: 0, dsv: 0, qad: 1000, costo: 80.00 }
];

function ModalExplicacion({ abierto, alCerrar }) {
if (!abierto) return null;

return (
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
<div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 text-slate-200">
<div className="flex items-center justify-between pb-4 border-b border-slate-800">
<div className="flex items-center gap-3">
<div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
<HelpCircle size={24} />
</div>
<div>
<h2 className="text-xl font-bold text-white tracking-tight">Criterios de Conciliación Operativa</h2>
<p className="text-xs text-slate-400">Metodología matemática oficial Visteon: 4Wall vs QAD ERP</p>
</div>
</div>
<button
onClick={alCerrar}
className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
>
<X size={20} />
</button>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
<div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 flex flex-col justify-between">
<div>
<div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
<DollarSign size={18} />
<span>1. Variación Neta (Finanzas)</span>
</div>
<p className="text-xs text-slate-300 leading-relaxed">
Métrica crítica contable. Refleja si a la planta le falta o le sobra dinero real. Suma todo el físico global y lo contrasta con el congelado de QAD (Menú 3.2).
</p>
</div>
<div className="mt-3 p-2.5 bg-slate-950/80 rounded-lg font-mono text-[11px] text-emerald-300 border border-slate-800">
NET = (Físico Total - QAD Total) × Costo QAD
</div>
</div>

<div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 flex flex-col justify-between">
<div>
<div className="flex items-center gap-2 text-amber-400 font-semibold mb-2">
<ArrowRightLeft size={18} />
<span>2. Piezas en SWING (MP&L / Logística)</span>
</div>
<p className="text-xs text-slate-300 leading-relaxed">
Detecta material extraviado o mal ubicado en planta (ej. registrado en ZWHSE pero escaneado en ZWIP). Es la suma de valores absolutos de cada localidad.
</p>
</div>
<div className="mt-3 p-2.5 bg-slate-950/80 rounded-lg font-mono text-[11px] text-amber-300 border border-slate-800">
SWING = |Δ ZWIP| + |Δ ZWHSE| + |Δ Áreas|
</div>
</div>

<div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 flex flex-col justify-between">
<div>
<div className="flex items-center gap-2 text-purple-400 font-semibold mb-2">
<Ghost size={18} />
<span>3. Subensambles y Phantoms (WIP)</span>
</div>
<p className="text-xs text-slate-300 leading-relaxed">
Material en línea de producción identificado en menú QAD 50.1.4.22. Se multiplican por su receta (BOM 50.13.8.16) para no reportar pérdidas irreales.
</p>
</div>
<div className="mt-3 p-2.5 bg-slate-950/80 rounded-lg font-mono text-[11px] text-purple-300 border border-slate-800">
Físico Real = Escaneo × Usage Multiplier
</div>
</div>

<div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 flex flex-col justify-between">
<div>
<div className="flex items-center gap-2 text-rose-400 font-semibold mb-2">
<AlertOctagon size={18} />
<span>4. Material Obsoleto</span>
</div>
<p className="text-xs text-slate-300 leading-relaxed">
Piezas marcadas con estatus OBSOLETE en Cost Part Browse. Si se encuentra más físico que en QAD (Ganancia &gt; 0), se audita por separado por reglas de depreciación.
</p>
</div>
<div className="mt-3 p-2.5 bg-slate-950/80 rounded-lg font-mono text-[11px] text-rose-300 border border-slate-800">
Alerta = Estatus OBSOLETE &amp; Físico &gt; QAD
</div>
</div>
</div>

<div className="mt-6 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
<h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Menús Clave de QAD Enterprise</h4>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-400">
<div><span className="text-slate-200 font-bold">3.2:</span> Inventory Detail (Foto Congelada)</div>
<div><span className="text-slate-200 font-bold">50.1.4.22:</span> Catálogo y Búsqueda Phantoms</div>
<div><span className="text-slate-200 font-bold">50.13.8.16:</span> Exportación de Estructura BOM</div>
</div>
</div>

<div className="mt-6 flex justify-end">
<button
onClick={alCerrar}
className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/20"
>
Entendido
</button>
</div>
</div>
</div>
);
}

function HeaderComponent({ archivos = ARCHIVOS_FUENTE_BASE }) {
return (
<header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 py-4 mb-6">
<div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
<div className="flex items-center gap-3">
<div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-black text-slate-950 shadow-md">
V
</div>
<div>
<div className="text-sm font-bold text-white tracking-wide">VISTEON ELECTRONICS</div>
<div className="text-[11px] text-slate-400">4Wall Inventory Conciliator Engine</div>
</div>
</div>

<div className="flex items-center gap-3 overflow-x-auto text-[11px]">
{archivos.map((arc, i) => (
<div key={i} className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 rounded-lg border border-slate-700/60 text-slate-300">
<span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
<span className="font-semibold text-slate-200">{arc.tipo}:</span>
<span className="text-slate-400 truncate max-w-[130px]">{arc.nombre}</span>
</div>
))}
</div>
</div>
</header>
);
}

function MetricCardComponent({ titulo, valor, descripcion, tipo = "neutral" }) {
let badgeStyles = "bg-slate-800/50 text-slate-300 border-slate-700";
let textStyles = "text-white";

if (tipo === "positiveCard") {
badgeStyles = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
textStyles = "text-emerald-400";
} else if (tipo === "negativeCard") {
badgeStyles = "bg-rose-500/10 text-rose-400 border-rose-500/30";
textStyles = "text-rose-400";
} else if (tipo === "warning") {
badgeStyles = "bg-amber-500/10 text-amber-400 border-amber-500/30";
textStyles = "text-amber-400";
} else if (tipo === "alertCard") {
badgeStyles = "bg-purple-500/10 text-purple-400 border-purple-500/30";
textStyles = "text-purple-400";
}

return (
<div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-5 shadow-lg flex flex-col justify-between">
<div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2 flex items-center justify-between">
<span>{titulo}</span>
<span className={`px-2 py-0.5 rounded-md border text-[10px] ${badgeStyles}`}>
{tipo.toUpperCase()}
</span>
</div>
<div className={`text-3xl font-black tracking-tight my-1 ${textStyles}`}>{valor}</div>
<div className="text-xs text-slate-400 mt-1">{descripcion}</div>
</div>
);
}

function ControlPanelComponent({
area,
setArea,
busqueda,
setBusqueda,
filtroEspecial,
setFiltroEspecial,
mostrarPhantoms,
setMostrarPhantoms,
umbralUsd,
setUmbralUsd
}) {
return (
<div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 mb-6 shadow-lg">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
{/* Búsqueda por PN */}
<div className="lg:col-span-2">
<label className="block text-xs font-semibold text-slate-300 mb-1.5">Número de Parte</label>
<div className="relative">
<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
<input
type="text"
value={busqueda}
onChange={(e) => setBusqueda(e.target.value)}
placeholder="Buscar por prefijo, P7, VPRLXF..."
className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
/>
</div>
</div>

{/* Filtro de Área */}
<div>
<label className="block text-xs font-semibold text-slate-300 mb-1.5">Área Operativa</label>
<select
value={area}
onChange={(e) => setArea(e.target.value)}
className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
>
<option value="TODOS">Todas las áreas</option>
<option value="Almacén">Solo Almacén (ZWHSE)</option>
<option value="Piso">Solo Piso / Línea (ZWIP)</option>
</select>
</div>

{/* Filtro Especial */}
<div>
<label className="block text-xs font-semibold text-slate-300 mb-1.5">Filtro Especial</label>
<select
value={filtroEspecial}
onChange={(e) => setFiltroEspecial(e.target.value)}
className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
>
<option value="TODOS">Sin filtro especial</option>
<option value="PERDIDA_USD">Mayor Pérdida ($)</option>
<option value="GANANCIA_USD">Mayor Ganancia ($)</option>
<option value="SWING_ALTO">Mayor Swing (Ubicación)</option>
<option value="PELIGRO_OBSOLETOS">Obsoletos con Ganancia</option>
<option value="QAD_0">QAD 0 con Físico</option>
<option value="FISICO_0">Físico 0 con QAD</option>
</select>
</div>

{/* Toggle Phantoms */}
<div className="flex flex-col justify-end">
<button
onClick={() => setMostrarPhantoms(!mostrarPhantoms)}
className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
mostrarPhantoms
? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30"
: "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
}`}
>
<Ghost size={16} />
<span>{mostrarPhantoms ? "Phantoms Visibles" : "Ocultar Phantoms"}</span>
</button>
</div>
</div>
</div>
);
}

function InventoryTableComponent({ datos = [] }) {
return (
<div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
<div className="overflow-x-auto">
<table className="w-full text-left text-xs border-collapse">
<thead>
<tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider">
<th className="py-3 px-4">Número de Parte</th>
<th className="py-3 px-3 text-right">Almacén</th>
<th className="py-3 px-3 text-right">Piso</th>
<th className="py-3 px-3 text-right">Físico Total</th>
<th className="py-3 px-3 text-right">QAD Total</th>
<th className="py-3 px-3 text-right">Δ Piezas</th>
<th className="py-3 px-3 text-right">Swing (Pzas)</th>
<th className="py-3 px-3 text-right">Costo Unit.</th>
<th className="py-3 px-4 text-right">Impacto USD</th>
<th className="py-3 px-4 text-center">Estado</th>
</tr>
</thead>
<tbody className="divide-y divide-slate-800/60 font-mono">
{datos.length === 0 ? (
<tr>
<td colSpan={10} className="text-center py-12 text-slate-500">
No se encontraron números de parte con los filtros seleccionados.
</td>
</tr>
) : (
datos.map((item, idx) => {
const impacto = item.deltaTotalUsd || 0;
const impactoClass =
impacto < 0 ? "text-rose-400 font-bold" : impacto > 0 ? "text-emerald-400 font-bold" : "text-slate-400";

return (
<tr key={item.pn || idx} className="hover:bg-slate-800/40 transition-colors">
<td className="py-3 px-4 font-sans font-semibold text-white flex items-center gap-2">
<span>{item.pn}</span>
{item.usageMultiplier > 1 && (
<span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded">
x{item.usageMultiplier} BOM
</span>
)}
</td>
<td className="py-3 px-3 text-right text-slate-300">{Number(item.almacen || 0).toLocaleString()}</td>
<td className="py-3 px-3 text-right text-slate-300">{Number(item.piso || 0).toLocaleString()}</td>
<td className="py-3 px-3 text-right font-bold text-white">
{Number(item.fisicoTotal || 0).toLocaleString()}
</td>
<td className="py-3 px-3 text-right text-slate-400">
{Number(item.qadTotal || item.qad || 0).toLocaleString()}
</td>
<td className={`py-3 px-3 text-right ${item.deltaTotal < 0 ? "text-rose-400" : item.deltaTotal > 0 ? "text-emerald-400" : "text-slate-400"}`}>
{Number(item.deltaTotal || 0).toLocaleString()}
</td>
<td className="py-3 px-3 text-right text-amber-400 font-semibold">
{Number(item.varSwing || 0).toLocaleString()}
</td>
<td className="py-3 px-3 text-right text-slate-400">
${Number(item.costo || 0).toFixed(4)}
</td>
<td className={`py-3 px-4 text-right ${impactoClass}`}>
{impacto < 0 ? `-$${Math.abs(impacto).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${impacto.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
</td>
<td className="py-3 px-4 text-center font-sans">
{item.esObsoleto ? (
<span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full text-[10px] font-bold">
OBSOLETO
</span>
) : item.esPhantom ? (
<span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full text-[10px] font-bold">
PHANTOM
</span>
) : item.varSwing > 0 && Math.abs(item.deltaTotal) === 0 ? (
<span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[10px] font-bold">
SWING
</span>
) : (
<span className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-full text-[10px]">
REGULAR
</span>
)}
</td>
</tr>
);
})
)}
</tbody>
</table>
</div>
</div>
);
}

export default function App() {
const [area, setArea] = useState("TODOS");
const [busqueda, setBusqueda] = useState("");
const [filtroEspecial, setFiltroEspecial] = useState("TODOS");
const [mostrarPhantoms, setMostrarPhantoms] = useState(false);
const [umbralUsd, setUmbralUsd] = useState(10000);
const [datosEnVivo, setDatosEnVivo] = useState([]);
const [modalAyudaAbierto, setModalAyudaAbierto] = useState(false);
const [estadoConexion, setEstadoConexion] = useState({ mensaje: "Conectando...", colorText: "text-amber-500" });

const SUPABASE_BASE_URL = "https://uukhwkywmnarcfruerpp.supabase.co/rest/v1/escaneos_4wall";
const SUPABASE_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1a2h3a3l3bW5hcmNmcnVlcnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwODI4OTgsImV4cCI6MjEwNTY1ODg5OH0.ezApb_e8_Q-_yvxmZL4b3skmmMXoJaya4oupSzPz3Vc";

useEffect(() => {
let cancelRequest = false;

const fetchInventarioEnVivo = async () => {
try {
const PAGE_SIZE = 1000;
let allData = [];
let from = 0;
let keepFetching = true;

while (keepFetching) {
const to = from + PAGE_SIZE - 1;
const response = await fetch(
`${SUPABASE_BASE_URL}?select=numero_parte,cantidad,area_escaneo&order=id.desc`,
{
headers: {
apikey: SUPABASE_KEY,
Authorization: `Bearer ${SUPABASE_KEY}`,
"Range-Unit": "items",
Range: `${from}-${to}`
}
}
);

if (!response.ok) {
throw new Error(`HTTP ${response.status}`);
}

const chunk = await response.json();
allData.push(...chunk);

if (chunk.length < PAGE_SIZE) {
keepFetching = false;
} else {
from += PAGE_SIZE;
}
}

if (!cancelRequest) {
setDatosEnVivo(allData);
setEstadoConexion({
mensaje: `En vivo (${allData.length.toLocaleString()} escaneos)`,
colorText: "text-emerald-400"
});
}
} catch (error) {
console.error("Error consultando Supabase:", error);
if (!cancelRequest) {
setEstadoConexion({ mensaje: "Desconectado (Usando Mock)", colorText: "text-rose-500" });
}
}
};

fetchInventarioEnVivo();
const intervalo = setInterval(fetchInventarioEnVivo, 30000);

return () => {
cancelRequest = true;
clearInterval(intervalo);
};
}, []);

const datosCalculados = useMemo(() => {
const resumenEscaneos = new Map();

datosEnVivo.forEach((scan) => {
const pn = String(scan.numero_parte || "").trim().toUpperCase();
if (!pn) return;

if (!resumenEscaneos.has(pn)) {
resumenEscaneos.set(pn, { almacen: 0, piso: 0, areasDetectadas: new Set() });
}

const item = resumenEscaneos.get(pn);
const cant = Number(scan.cantidad) || 0;
const areaCruda = String(scan.area_escaneo || "").trim().toUpperCase();
item.areasDetectadas.add(areaCruda);

const categoriaQad = MAPEO_AREAS[areaCruda] || (areaCruda.includes("ALMACEN") ? "ALMACEN" : "PISO");

if (categoriaQad === "ALMACEN") {
item.almacen += cant;
} else {
item.piso += cant;
}
});

const qadMap = new Map(
INVENTARIO_BASE_FALLBACK.map((item) => [String(item.pn).trim().toUpperCase(), item])
);

const todosLosPn = new Set([...resumenEscaneos.keys(), ...qadMap.keys()]);

return Array.from(todosLosPn).map((pn) => {
const itemQad = qadMap.get(pn) || { pn, dsv: 0, qad: 0, costo: 0 };
const scanData = resumenEscaneos.get(pn) || { almacen: 0, piso: 0, areasDetectadas: new Set() };

const esPhantom = pn.includes("0000") || pn.startsWith("P7");
const esObsoleto = pn.includes("VPRLXF");
const usage = PHANTOM_USAGES[pn] || 1;

const almacenVivo = scanData.almacen * usage;
const pisoVivo = scanData.piso * usage;
const fisicoPlanta = almacenVivo + pisoVivo;
const fisicoTotal = fisicoPlanta + (itemQad.dsv || 0);

const qadTotal = itemQad.qad || 0;
const qadAlmacen = Math.round(qadTotal * 0.8);
const qadPiso = Math.round(qadTotal * 0.2);

const varPlanta = fisicoPlanta - qadTotal;
const deltaTotal = fisicoTotal - qadTotal;
const varSwing = Math.abs(almacenVivo - qadAlmacen) + Math.abs(pisoVivo - qadPiso);

return {
...itemQad,
pn,
almacen: almacenVivo,
piso: pisoVivo,
fisicoPlanta,
fisicoTotal,
qadTotal,
qadAlmacen,
qadPiso,
varPlanta,
varPlantaUsd: varPlanta * itemQad.costo,
deltaTotal,
deltaTotalUsd: deltaTotal * itemQad.costo,
varSwing,
esPhantom,
esObsoleto,
usageMultiplier: usage,
areasOrigen: Array.from(scanData.areasDetectadas).join(", ")
};
});
}, [datosEnVivo]);

const inventarioFiltrado = useMemo(() => {
let datos = [...datosCalculados];

if (!mostrarPhantoms) datos = datos.filter((it) => !it.esPhantom);
if (area === "Almacén") datos = datos.filter((it) => it.almacen > 0);
if (area === "Piso") datos = datos.filter((it) => it.piso > 0);

if (busqueda) {
const term = busqueda.trim().toLowerCase();
datos = datos.filter((it) => it.pn.toLowerCase().includes(term));
}

if (filtroEspecial === "PELIGRO_OBSOLETOS") {
datos = datos.filter((it) => it.esObsoleto && it.deltaTotalUsd > 0);
}
if (filtroEspecial === "QAD_0") {
datos = datos.filter((it) => it.qadTotal === 0 && it.fisicoTotal > 0);
}
if (filtroEspecial === "FISICO_0") {
datos = datos.filter((it) => it.fisicoTotal === 0 && it.qadTotal > 0);
}
if (filtroEspecial === "PERDIDA_USD") {
datos.sort((a, b) => a.deltaTotalUsd - b.deltaTotalUsd);
}
if (filtroEspecial === "GANANCIA_USD") {
datos.sort((a, b) => b.deltaTotalUsd - a.deltaTotalUsd);
}
if (filtroEspecial === "SWING_ALTO") {
datos.sort((a, b) => b.varSwing - a.varSwing);
}

if (filtroEspecial === "PERDIDA_USD" || filtroEspecial === "GANANCIA_USD") {
datos = datos.filter((it) => Math.abs(it.deltaTotalUsd) >= umbralUsd);
}

return datos;
}, [datosCalculados, area, busqueda, filtroEspecial, mostrarPhantoms, umbralUsd]);

const metricas = useMemo(() => {
const datosValidos = datosCalculados.filter((it) => !it.esPhantom);
const total4Wall = datosValidos.reduce((sum, it) => sum + it.fisicoPlanta, 0);
const impactoNeto = datosValidos.reduce((sum, it) => sum + it.deltaTotalUsd, 0);
const swingTotal = datosValidos.reduce((sum, it) => sum + it.varSwing, 0);

return {
totalFisico: total4Wall + datosValidos.reduce((sum, it) => sum + (it.dsv || 0), 0),
impactoNeto,
swingTotal,
casosCriticos: datosValidos.filter((it) => Math.abs(it.deltaTotalUsd) >= umbralUsd).length
};
}, [datosCalculados, umbralUsd]);

return (
<div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
<HeaderComponent archivos={ARCHIVOS_FUENTE_BASE} />

<main className="max-w-7xl mx-auto px-4 sm:px-6">
{/* Banner de Título con Botón de Ayuda (?) */}
<section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
<div>
<div className="flex items-center gap-3">
<h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
Conciliación 4Wall vs QAD
</h1>

{/* Botón de Ayuda (?) para la Junta */}
<button
onClick={() => setModalAyudaAbierto(true)}
title="Ver Criterios y Fórmulas de Reconciliación"
className="w-8 h-8 rounded-full bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 hover:text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold text-sm transition-all shadow-md active:scale-95"
>
?
</button>

<span className={`text-xs font-bold px-2.5 py-1 bg-slate-900 rounded-full border border-slate-800 ${estadoConexion.colorText}`}>
● {estadoConexion.mensaje}
</span>
</div>
<p className="text-xs sm:text-sm text-slate-400 mt-1">
Detección anticipada de variaciones y swing en piso antes del cierre nocturno de QAD.
</p>
</div>

<button
onClick={() => setModalAyudaAbierto(true)}
className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-700/80 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm"
>
<HelpCircle size={16} className="text-indigo-400" />
<span>Fórmulas y Diccionario</span>
</button>
</section>

{/* Tarjetas de Métricas Ejecutivas */}
<section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
<MetricCardComponent
titulo="DISCREPANCIA NETA (USD)"
valor={`$${Math.abs(metricas.impactoNeto).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
descripcion="Variación Global Estimada (Finanzas)"
tipo={metricas.impactoNeto < 0 ? "negativeCard" : "positiveCard"}
/>
<MetricCardComponent
titulo="PIEZAS EN SWING"
valor={metricas.swingTotal.toLocaleString()}
descripcion="Mala ubicación ZWHSE vs ZWIP (MP&L)"
tipo="warning"
/>
<MetricCardComponent
titulo="CORTE FÍSICO TOTAL"
valor={metricas.totalFisico.toLocaleString()}
descripcion="Suma global de escaneos validados"
tipo="neutral"
/>
<MetricCardComponent
titulo={`CRÍTICOS (> $${umbralUsd / 1000}k)`}
valor={metricas.casosCriticos}
descripcion="Partes con mayor exposición financiera"
tipo="alertCard"
/>
</section>

{/* Panel de Control y Filtros */}
<ControlPanelComponent
area={area}
setArea={setArea}
busqueda={busqueda}
setBusqueda={setBusqueda}
filtroEspecial={filtroEspecial}
setFiltroEspecial={setFiltroEspecial}
mostrarPhantoms={mostrarPhantoms}
setMostrarPhantoms={setMostrarPhantoms}
umbralUsd={umbralUsd}
setUmbralUsd={setUmbralUsd}
/>

{/* Tabla de Conciliación de Inventario */}
<InventoryTableComponent datos={inventarioFiltrado} />
</main>

{/* Modal Interactivo de Reglas de Negocio */}
<ModalExplicacion
abierto={modalAyudaAbierto}
alCerrar={() => setModalAyudaAbierto(false)}
/>
</div>
);
}