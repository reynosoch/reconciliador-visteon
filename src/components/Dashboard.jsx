import { useState } from 'react';
 export default function Dashboard() {
 const [filtroArea, setFiltroArea] = useState('TODOS');
 const [busqueda, setBusqueda] = useState('');
 const items = [
   {
     pn: "VPTBFF-17C272-AC",
     fisicoPlanta: 6251,
     fisicoExt: 15520,
     qadTotal: 111284,
     varPlantaUsd: -698830.46,
     varExtUsd: -2624113.02,
     deltaTotalUsd: -3322943.48,
     responsable: "Consignacion"
   },
   {
     pn: "VPNF6F-17C272-AF",
     fisicoPlanta: 0,
     fisicoExt: 4328,
     qadTotal: 3328,
     varPlantaUsd: 0.0,
     varExtUsd: 37122.46,
     deltaTotalUsd: 37122.46,
     responsable: "Consignacion"
   },
   {
     pn: "VPPASF-17C272-BD",
     fisicoPlanta: 1200,
     fisicoExt: 5760,
     qadTotal: 3146,
     varPlantaUsd: -2500.0,
     varExtUsd: 97000.0,
     deltaTotalUsd: 94500.0,
     responsable: "Piso"
   }
 ];
 const formatearDinero = (val) =>
   new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
 return (
<div className="min-h-screen bg-slate-900 text-slate-100 p-6">
     {/* Header */}
<div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
<div>
<h1 className="text-2xl font-bold text-white tracking-tight">
           Visteon Chihuahua | <span className="text-amber-500 font-medium">Reconciliador de Inventario</span>
</h1>
<p className="text-xs text-slate-400">Auditoría Planta vs QAD & 4Wall</p>
</div>
<div className="text-right">
<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
           ● QAD Congelado Activo
</span>
</div>
</div>
     {/* KPI Cards */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
<div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
<p className="text-xs font-semibold text-slate-400 uppercase">Var Neta Planta (WIP + Almacén)</p>
<h2 className="text-2xl font-black text-rose-400 mt-1">-$698,830 USD</h2>
<p className="text-[11px] text-slate-400 mt-1">Operación física interna</p>
</div>
<div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
<p className="text-xs font-semibold text-slate-400 uppercase">Var Externa (DSV / 3PL)</p>
<h2 className="text-2xl font-black text-amber-400 mt-1">-$2,624,113 USD</h2>
<p className="text-[11px] text-amber-500/80 mt-1">Sujeto a confirmación proveedor</p>
</div>
<div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
<p className="text-xs font-semibold text-slate-400 uppercase">Top Discrepancia Global</p>
<h2 className="text-xl font-bold text-white mt-1">VPTBFF-17C272-AC</h2>
<p className="text-[11px] text-rose-400 mt-1">79% de la variación total</p>
</div>
<div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
<p className="text-xs font-semibold text-slate-400 uppercase">Corte Físico 4Wall</p>
<h2 className="text-2xl font-black text-white mt-1">40,307 pzas</h2>
<p className="text-[11px] text-emerald-400 mt-1">Último escaneo procesado</p>
</div>
</div>
     {/* Grid Principal */}
<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
<div className="lg:col-span-3 bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
<div className="flex gap-2">
             {['TODOS', 'Almacén', 'Piso', 'Consignacion'].map((area) => (
<button
                 key={area}
                 onClick={() => setFiltroArea(area)}
                 className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                   filtroArea === area
                     ? 'bg-amber-500 text-slate-950 font-bold'
                     : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                 }`}
>
                 {area}
</button>
             ))}
</div>
<input
             type="text"
             placeholder="Buscar # parte..."
             value={busqueda}
             onChange={(e) => setBusqueda(e.target.value)}
             className="bg-slate-900 border border-slate-700 text-xs px-3 py-2 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 w-full md:w-56"
           />
</div>
<div className="overflow-x-auto">
<table className="w-full text-left text-xs text-slate-300">
<thead className="bg-slate-900/60 uppercase text-[10px] text-slate-400 border-b border-slate-700">
<tr>
<th className="p-3">Número de Parte</th>
<th className="p-3 text-right">Físico Planta</th>
<th className="p-3 text-right">Físico DSV</th>
<th className="p-3 text-right">Teórico QAD</th>
<th className="p-3 text-right">Var Planta (USD)</th>
<th className="p-3 text-right">Delta Total (USD)</th>
</tr>
</thead>
<tbody className="divide-y divide-slate-700">
               {items
                 .filter((it) => (filtroArea === 'TODOS' ? true : it.responsable === filtroArea))
                 .filter((it) => it.pn.toLowerCase().includes(busqueda.toLowerCase()))
                 .map((it) => (
<tr key={it.pn} className="hover:bg-slate-750">
<td className="p-3 font-mono font-bold text-white">{it.pn}</td>
<td className="p-3 text-right">{it.fisicoPlanta.toLocaleString()}</td>
<td className="p-3 text-right">{it.fisicoExt.toLocaleString()}</td>
<td className="p-3 text-right">{it.qadTotal.toLocaleString()}</td>
<td
                       className={`p-3 text-right font-semibold ${
                         it.varPlantaUsd < 0 ? 'text-rose-400' : 'text-emerald-400'
                       }`}
>
                       {formatearDinero(it.varPlantaUsd)}
</td>
<td
                       className={`p-3 text-right font-black ${
                         it.deltaTotalUsd < 0 ? 'text-rose-400' : 'text-emerald-400'
                       }`}
>
                       {formatearDinero(it.deltaTotalUsd)}
</td>
</tr>
                 ))}
</tbody>
</table>
</div>
</div>
       {/* Panel lateral */}
<div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
<div>
<h3 className="text-sm font-bold text-white mb-3">Auditoría Rápida</h3>
<div className="space-y-3">
<div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60">
<p className="text-[11px] font-bold text-rose-300">Atención Inmediata</p>
<p className="text-xs text-rose-200 mt-1">
                 Revisar confirmación de saldos de Rosa Fernández para la cuenta DSV (80030902).
</p>
</div>
<div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
<p className="text-[11px] font-semibold text-slate-400">Actualización de Corte</p>
<p className="text-xs text-slate-300 mt-1">
                 Arrastra el nuevo Excel de 4Wall descargado a las 12:00 PM para refrescar.
</p>
</div>
</div>
</div>
<button className="w-full mt-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition-colors">
           Exportar Resumen a PDF
</button>
</div>
</div>
</div>
 );
}