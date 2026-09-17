import { useState } from 'react';
export default function Dashboard() {
 const [filtroArea, setFiltroArea] = useState('TODOS');
 const [busqueda, setBusqueda] = useState('');
 const [filtroEspecial, setFiltroEspecial] = useState('NINGUNO');
 const [orden, setOrden] = useState('NINGUNO');
 // NUEVO ESTADO: Controla el menú desplegable de los archivos
 const [mostrarArchivos, setMostrarArchivos] = useState(false);
 // NUEVA DATA: Simulador de los archivos procesados en el backend
 const archivosProcesados = [
   { nombre: "QAD_Inventory_WIP_20260917.xlsx", tipo: "ERP", registros: 15420, status: "Sincronizado" },
   { nombre: "4Wall_Scan_Floor_20260917.csv", tipo: "Físico", registros: 8350, status: "Sincronizado" },
   { nombre: "DSV_Stock_Report_20260917.xlsx", tipo: "3PL", registros: 4105, status: "Sincronizado" }
 ];
 const itemsBase = [
   {
     pn: "VPTBFF-17C272-AC", fisicoPlanta: 6251, fisicoExt: 15520, qadTotal: 111284,
     varPlantaPzas: -105033, varPlantaUsd: -698830.46, deltaTotalUsd: -3322943.48, responsable: "Consignacion"
   },
   {
     pn: "VPNF6F-17C272-AF", fisicoPlanta: 0, fisicoExt: 4328, qadTotal: 3328,
     varPlantaPzas: -3328, varPlantaUsd: 0.0, deltaTotalUsd: 37122.46, responsable: "Consignacion"
   },
   {
     pn: "VPPASF-17C272-BD", fisicoPlanta: 1200, fisicoExt: 5760, qadTotal: 3146,
     varPlantaPzas: -1946, varPlantaUsd: -2500.0, deltaTotalUsd: 94500.0, responsable: "Piso"
   },
   {
     pn: "VP-FANTASMA-001", fisicoPlanta: 500, fisicoExt: 0, qadTotal: 0,
     varPlantaPzas: 500, varPlantaUsd: 15000.0, deltaTotalUsd: 15000.0, responsable: "Almacén"
   },
   {
     pn: "VP-CRITICO-002", fisicoPlanta: 0, fisicoExt: 0, qadTotal: 1500,
     varPlantaPzas: -1500, varPlantaUsd: -60000.0, deltaTotalUsd: -60000.0, responsable: "Piso"
   },
   {
     pn: "VP-GANANCIA-MAX", fisicoPlanta: 2000, fisicoExt: 0, qadTotal: 1000,
     varPlantaPzas: 1000, varPlantaUsd: 120000.0, deltaTotalUsd: 120000.0, responsable: "Almacén"
   }
 ];
 const formatearDinero = (val) =>
   new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
 let itemsMostrados = [...itemsBase]
   .filter((it) => (filtroArea === 'TODOS' ? true : it.responsable === filtroArea))
   .filter((it) => it.pn.toLowerCase().includes(busqueda.toLowerCase()));
 if (filtroEspecial === '0_FISICO') {
   itemsMostrados = itemsMostrados.filter(it => (it.fisicoPlanta + it.fisicoExt) === 0 && it.qadTotal > 0);
 } else if (filtroEspecial === '0_QAD') {
   itemsMostrados = itemsMostrados.filter(it => (it.fisicoPlanta + it.fisicoExt) > 0 && it.qadTotal === 0);
 }
 if (orden === 'PERDIDA_USD') {
   itemsMostrados.sort((a, b) => a.deltaTotalUsd - b.deltaTotalUsd);
 } else if (orden === 'GANANCIA_USD') {
   itemsMostrados.sort((a, b) => b.deltaTotalUsd - a.deltaTotalUsd);
 } else if (orden === 'PERDIDA_PZAS') {
   itemsMostrados.sort((a, b) => a.varPlantaPzas - b.varPlantaPzas);
 } else if (orden === 'GANANCIA_PZAS') {
   itemsMostrados.sort((a, b) => b.varPlantaPzas - a.varPlantaPzas);
 }
 return (
<div className="min-h-screen bg-[#0B1120] text-slate-100 p-4 md:p-8 font-sans selection:bg-amber-500/30">
     {/* Header Premium con Modal de Archivos */}
<div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 relative z-50">
<div>
<h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400">
           Visteon <span className="font-light text-slate-500">|</span> <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-amber-600">Reconciliador</span>
</h1>
<p className="text-sm text-slate-400 mt-1 font-medium">Auditoría Inteligente: Planta vs QAD & 4Wall</p>
</div>
       {/* BOTÓN INTERACTIVO DE ARCHIVOS */}
<div className="relative">
<button
           onClick={() => setMostrarArchivos(!mostrarArchivos)}
           className="flex items-center gap-3 bg-slate-800/80 hover:bg-slate-700 px-5 py-2.5 rounded-full border border-slate-600 backdrop-blur-sm transition-all cursor-pointer ring-1 ring-transparent hover:ring-amber-500/50 shadow-lg"
>
<div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
<span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
             3 Archivos Procesados
</span>
<svg className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${mostrarArchivos ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
</svg>
</button>
         {/* DROPDOWN FLOTANTE CON LA LISTA DE ARCHIVOS */}
         {mostrarArchivos && (
<div className="absolute right-0 mt-3 w-80 bg-[#0F172A] border border-slate-600 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
<div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
<h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Fuentes de Datos</h3>
<span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">Sincronizado</span>
</div>
<div className="divide-y divide-slate-700/50 max-h-64 overflow-y-auto">
               {archivosProcesados.map((archivo, index) => (
<div key={index} className="px-4 py-3 hover:bg-slate-800/30 transition-colors flex items-start gap-3">
<div className="mt-0.5 text-slate-400">
<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
</svg>
</div>
<div>
<p className="text-xs font-bold text-slate-200 break-all">{archivo.nombre}</p>
<div className="flex gap-2 mt-1">
<span className="text-[10px] text-slate-400 font-medium">Tipo: {archivo.tipo}</span>
<span className="text-[10px] text-slate-500">•</span>
<span className="text-[10px] text-slate-400 font-medium">{archivo.registros.toLocaleString()} líneas</span>
</div>
</div>
</div>
               ))}
</div>
</div>
         )}
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8 relative z-10">
<div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-600 transition-colors">
<div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
<p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-1">Var Neta Planta</p>
<h2 className="text-3xl font-black text-rose-400 tracking-tight">-$698k</h2>
</div>
<div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-600 transition-colors">
<div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
<p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-1">Var Externa (DSV)</p>
<h2 className="text-3xl font-black text-amber-400 tracking-tight">-$2.6M</h2>
</div>
<div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-600 transition-colors">
<div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
<p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-1">Top Discrepancia</p>
<h2 className="text-xl font-bold text-slate-100 tracking-tight mt-1 truncate">VPTBFF-17C272</h2>
</div>
<div className="bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-5 shadow-lg relative overflow-hidden group ring-1 ring-emerald-500/20">
<div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
<p className="text-[11px] font-bold text-emerald-400 tracking-widest uppercase mb-1">Corte Físico Total</p>
<h2 className="text-3xl font-black text-white tracking-tight">40,307</h2>
<p className="text-[10px] text-emerald-500/80 mt-1 font-medium">Planta (4Wall) + Externa (DSV)</p>
</div>
</div>
<div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-md relative z-10">
<div className="flex flex-col lg:flex-row justify-between gap-6 mb-6">
<div className="bg-slate-900/80 p-1.5 rounded-xl flex gap-1 border border-slate-700/50 overflow-x-auto">
           {['TODOS', 'Almacén', 'Piso', 'Consignacion'].map((area) => (
<button key={area} onClick={() => setFiltroArea(area)}
               className={`px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                 filtroArea === area ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-600' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
               }`}>
               {area}
</button>
           ))}
</div>
<input type="text" placeholder="Buscar número de parte..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
           className="bg-slate-900/80 border border-slate-700/50 text-sm px-5 py-2.5 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 w-full lg:w-72"
         />
</div>
<div className="flex flex-col gap-4 mb-6 p-5 bg-[#0F172A]/90 rounded-xl border border-slate-700/50 shadow-inner">
<div className="flex flex-col md:flex-row md:items-center gap-3">
<div className="w-32 text-[10px] font-black text-slate-500 tracking-widest uppercase">
             1. Filtrar Casos:
</div>
<div className="flex flex-wrap gap-2">
<button onClick={() => setFiltroEspecial(filtroEspecial === '0_QAD' ? 'NINGUNO' : '0_QAD')}
               className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                 filtroEspecial === '0_QAD' ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700/50'
               }`}>
<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
</svg>
               Tiene Físico / 0 en QAD (Sobrante)
</button>
<button onClick={() => setFiltroEspecial(filtroEspecial === '0_FISICO' ? 'NINGUNO' : '0_FISICO')}
               className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                 filtroEspecial === '0_FISICO' ? 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700/50'
               }`}>
<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
</svg>
               0 Físico / Tiene QAD (Faltante)
</button>
</div>
</div>
<div className="w-full h-px bg-slate-800/80"></div>
<div className="flex flex-col md:flex-row md:items-center gap-3">
<div className="w-32 text-[10px] font-black text-slate-500 tracking-widest uppercase">
             2. Ordenar por:
</div>
<div className="flex flex-wrap gap-2">
<button onClick={() => setOrden(orden === 'PERDIDA_USD' ? 'NINGUNO' : 'PERDIDA_USD')}
               className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 ${orden === 'PERDIDA_USD' ? 'bg-rose-900/30 border-rose-500/50 text-white' : 'bg-slate-800 border-slate-700/50 text-slate-400 hover:bg-slate-700'}`}>
<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
</svg>
               Mayor Pérdida (USD)
</button>
<button onClick={() => setOrden(orden === 'GANANCIA_USD' ? 'NINGUNO' : 'GANANCIA_USD')}
               className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 ${orden === 'GANANCIA_USD' ? 'bg-emerald-900/30 border-emerald-500/50 text-white' : 'bg-slate-800 border-slate-700/50 text-slate-400 hover:bg-slate-700'}`}>
<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
</svg>
               Mayor Ganancia (USD)
</button>
<button onClick={() => setOrden(orden === 'PERDIDA_PZAS' ? 'NINGUNO' : 'PERDIDA_PZAS')}
               className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 ${orden === 'PERDIDA_PZAS' ? 'bg-rose-900/30 border-rose-500/50 text-white' : 'bg-slate-800 border-slate-700/50 text-slate-400 hover:bg-slate-700'}`}>
<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
</svg>
               Mayor Pérdida (Pzas)
</button>
<button onClick={() => setOrden(orden === 'GANANCIA_PZAS' ? 'NINGUNO' : 'GANANCIA_PZAS')}
               className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 ${orden === 'GANANCIA_PZAS' ? 'bg-emerald-900/30 border-emerald-500/50 text-white' : 'bg-slate-800 border-slate-700/50 text-slate-400 hover:bg-slate-700'}`}>
<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
</svg>
               Mayor Ganancia (Pzas)
</button>
</div>
</div>
</div>
<div className="overflow-x-auto rounded-xl border border-slate-700/50">
<table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
<thead className="bg-[#0F172A] uppercase text-[10px] font-bold text-slate-400 tracking-wider">
<tr>
<th className="px-5 py-4 border-b border-slate-700/50">Número de Parte</th>
<th className="px-5 py-4 border-b border-slate-700/50 text-right">Físico Planta</th>
<th className="px-5 py-4 border-b border-slate-700/50 text-right">Físico DSV</th>
<th className="px-5 py-4 border-b border-slate-700/50 text-right">Teórico QAD</th>
<th className="px-5 py-4 border-b border-slate-700/50 text-right text-amber-500">Var Planta (Pzas)</th>
<th className="px-5 py-4 border-b border-slate-700/50 text-right">Var Planta (USD)</th>
<th className="px-5 py-4 border-b border-slate-700/50 text-right text-white">Delta Total (USD)</th>
</tr>
</thead>
<tbody className="divide-y divide-slate-700/50 bg-slate-800/20">
             {itemsMostrados.map((it) => (
<tr key={it.pn} className="hover:bg-slate-750/50 transition-colors group">
<td className="px-5 py-3.5 font-mono font-medium text-slate-200 group-hover:text-amber-400 transition-colors">{it.pn}</td>
<td className="px-5 py-3.5 text-right">{it.fisicoPlanta.toLocaleString()}</td>
<td className="px-5 py-3.5 text-right">{it.fisicoExt.toLocaleString()}</td>
<td className="px-5 py-3.5 text-right">{it.qadTotal.toLocaleString()}</td>
<td className="px-5 py-3.5 text-right">
<span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${it.varPlantaPzas < 0 ? 'bg-rose-500/10 text-rose-400' : it.varPlantaPzas > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-500'}`}>
                     {it.varPlantaPzas > 0 ? '+' : ''}{it.varPlantaPzas.toLocaleString()}
</span>
</td>
<td className={`px-5 py-3.5 text-right font-medium ${it.varPlantaUsd < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                   {formatearDinero(it.varPlantaUsd)}
</td>
<td className={`px-5 py-3.5 text-right font-black ${it.deltaTotalUsd < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                   {formatearDinero(it.deltaTotalUsd)}
</td>
</tr>
             ))}
             {itemsMostrados.length === 0 && (
<tr>
<td colSpan="7" className="px-5 py-12 text-center text-slate-500 font-medium">
                   No se encontraron números de parte con estos filtros.
</td>
</tr>
             )}
</tbody>
</table>
</div>
</div>
</div>
 );
}