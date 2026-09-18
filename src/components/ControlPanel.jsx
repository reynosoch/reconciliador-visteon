import React from "react";

export default function ControlPanel({
  area, setArea,
  busqueda, setBusqueda,
  filtroEspecial, setFiltroEspecial,
  mostrarPhantoms, setMostrarPhantoms,
  umbralUsd, setUmbralUsd
}) {
  const accionesYessica = [
    { 
      id: "PELIGRO_OBSOLETOS", label: "Obsoletos con Ganancia", tipo: "danger_max", 
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg> 
    },
    { 
      id: "PERDIDA_USD", label: "Mayor Pérdida (USD)", tipo: "danger", 
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" /></svg> 
    },
    { 
      id: "GANANCIA_USD", label: "Mayor Ganancia (USD)", tipo: "positive", 
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> 
    },
    { 
      id: "QAD_0", label: "0 QAD (Sobrante Físico)", tipo: "warning", 
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> 
    },
    { 
      id: "FISICO_0", label: "0 Físico (Faltante)", tipo: "warning", 
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> 
    },
    { 
      id: "SWING_ALTO", label: "Mayor Error Swing", tipo: "info", 
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg> 
    }
  ];

  return (
    <section className="mt-10 bg-[#0e1217] border border-slate-800 rounded-xl p-5 shadow-lg">
      
      {/* HEADER DEL PANEL */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 mb-6">
        <div>
          <p className="text-[10px] font-black text-slate-500 tracking-[0.15em] uppercase mb-1">Acción Inmediata</p>
          <h2 className="text-xl font-bold text-slate-200">Filtros Tácticos</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          
          {/* UMBRAL DE TOLERANCIA USD */}
          <div className="flex items-center bg-[#11151a] border border-slate-700 rounded-lg overflow-hidden flex-grow sm:flex-grow-0">
            <span className="text-[10px] font-bold text-slate-400 px-3 py-3 uppercase tracking-wider bg-slate-800/50 flex items-center border-r border-slate-700 whitespace-nowrap">
              Tolerancia USD $
            </span>
            <input 
              type="number" 
              value={umbralUsd}
              onChange={(e) => setUmbralUsd(Number(e.target.value))}
              className="w-full sm:w-24 bg-transparent text-amber-400 font-bold px-3 py-2 focus:outline-none text-sm"
            />
          </div>

          {/* TOGGLE PHANTOMS */}
          <label className="flex items-center justify-center gap-2 bg-[#11151a] border border-slate-700 px-4 py-2.5 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors flex-grow sm:flex-grow-0">
            <input 
              type="checkbox" 
              checked={mostrarPhantoms} 
              onChange={(e) => setMostrarPhantoms(e.target.checked)}
              className="w-4 h-4 accent-indigo-500 rounded bg-slate-900 border-slate-700"
            />
            <span className="text-xs font-bold text-indigo-400 whitespace-nowrap">Ver Phantoms</span>
          </label>

          {/* BUSCADOR */}
          <div className="relative flex-grow sm:flex-grow-0 w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text" 
              placeholder="Buscar # Parte..." 
              value={busqueda} 
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full sm:w-56 bg-[#11151a] border border-slate-700 text-slate-200 text-sm pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500/50 placeholder-slate-500"
            />
          </div>
        </div>
      </div>

      {/* PESTAÑAS */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2 scrollbar-hide">
        {["TODOS", "Almacén", "Piso", "Consignación"].map((opcion) => (
          <button 
            key={opcion} 
            onClick={() => setArea(opcion)}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              area === opcion 
                ? "bg-slate-200 text-slate-900 shadow-sm" 
                : "bg-[#11151a] border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}>
            {opcion}
          </button>
        ))}
      </div>

      {/* BOTONES DE YESSICA */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {accionesYessica.map((accion) => {
          const isActive = filtroEspecial === accion.id;
          let activeClasses = "bg-[#11151a] border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200";
          
          if (isActive) {
            if (accion.tipo === "danger") activeClasses = "bg-rose-950/40 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.1)]";
            else if (accion.tipo === "danger_max") activeClasses = "bg-red-600 border-red-400 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-pulse";
            else if (accion.tipo === "positive") activeClasses = "bg-emerald-950/40 border-emerald-500/50 text-emerald-400";
            else if (accion.tipo === "warning") activeClasses = "bg-amber-950/40 border-amber-500/50 text-amber-400";
            else if (accion.tipo === "info") activeClasses = "bg-cyan-950/40 border-cyan-500/50 text-cyan-400";
          }

          return (
            <button 
              key={accion.id} 
              onClick={() => setFiltroEspecial(isActive ? "TODOS" : accion.id)}
              className={`flex flex-col justify-center items-center gap-2 p-3 rounded-lg border text-[10px] uppercase font-bold transition-all text-center ${activeClasses}`}>
              <div className={`p-1.5 rounded-md ${isActive ? (accion.tipo === 'danger_max' ? 'bg-red-800' : 'bg-black/20') : 'bg-slate-800/50'}`}>
                {accion.icon}
              </div>
              <span className="tracking-wide leading-tight">{accion.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
