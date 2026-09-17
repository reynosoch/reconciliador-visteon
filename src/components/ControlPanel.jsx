export default function ControlPanel({
 area, setArea,
 busqueda, setBusqueda,
 filtroEspecial, setFiltroEspecial
}) {
 const accionesYessica = [
   {
     id: "PERDIDA_USD", label: "Mayor Pérdida (USD)", tipo: "danger",
     icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" /></svg>
   },
   {
     id: "GANANCIA_USD", label: "Mayor Ganancia (USD)", tipo: "positive",
     icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
   },
   {
     id: "PERDIDA_PZAS", label: "Mayor Pérdida (Pzas)", tipo: "danger",
     icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
   },
   {
     id: "GANANCIA_PZAS", label: "Mayor Ganancia (Pzas)", tipo: "positive",
     icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
   },
   {
     id: "QAD_0", label: "0 QAD (Sobrante Físico)", tipo: "warning",
     icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
   },
   {
     id: "FISICO_0", label: "0 Físico (Faltante Crítico)", tipo: "warning",
     icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
   }
 ];
 return (
<section className="mt-10 bg-[#0e1217] border border-slate-800 rounded-xl p-5 shadow-lg">
     {/* Header y Buscador */}
<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
<div>
<p className="text-[10px] font-black text-slate-500 tracking-[0.15em] uppercase mb-1">Acción Inmediata</p>
<h2 className="text-xl font-bold text-slate-200">Filtros de Auditoría</h2>
</div>
<div className="w-full md:w-72">
<input
           type="text"
           placeholder="Buscar # Parte..."
           value={busqueda}
           onChange={(e) => setBusqueda(e.target.value)}
           className="w-full bg-[#11151a] border border-slate-700 text-slate-200 text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all placeholder-slate-500"
         />
</div>
</div>
     {/* Pestañas de Área */}
<div className="flex gap-2 mb-5 overflow-x-auto pb-2 scrollbar-hide">
       {["TODOS", "Almacén", "Piso", "Consignación"].map((opcion) => (
<button
           key={opcion}
           onClick={() => setArea(opcion)}
           className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
             area === opcion
               ? "bg-slate-200 text-slate-900 border border-slate-200 shadow-sm"
               : "bg-[#11151a] border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
           }`}
>
           {opcion}
</button>
       ))}
</div>
     {/* Grid de Acciones de Yessica */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
       {accionesYessica.map((accion) => {
         const isActive = filtroEspecial === accion.id;
         let activeClasses = "";
         if (isActive) {
           if (accion.tipo === "danger") activeClasses = "bg-rose-950/40 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.1)]";
           if (accion.tipo === "positive") activeClasses = "bg-emerald-950/40 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
           if (accion.tipo === "warning") activeClasses = "bg-amber-950/40 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]";
         } else {
           activeClasses = "bg-[#11151a] border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 hover:border-slate-600";
         }
         return (
<button
             key={accion.id}
             onClick={() => setFiltroEspecial(isActive ? "TODOS" : accion.id)}
             className={`flex items-center gap-3 p-3 rounded-lg border text-xs font-bold transition-all text-left ${activeClasses}`}
>
<div className={`p-1.5 rounded-md ${isActive ? 'bg-black/20' : 'bg-slate-800/50'}`}>
               {accion.icon}
</div>
<span className="tracking-wide">{accion.label}</span>
</button>
         );
       })}
</div>
</section>
 );
}