import React, { useMemo, useState } from "react";
import Header from "./components/Header";
import MetricCard from "./components/MetricCard";
import ControlPanel from "./components/ControlPanel";
import InventoryTable from "./components/InventoryTable";
import { inventarioMock, cortesInventario, archivosFuente } from "./data/mockData";
export default function App() {
 const [area, setArea] = useState("TODOS");
 const [busqueda, setBusqueda] = useState("");
 const [filtroEspecial, setFiltroEspecial] = useState("TODOS");
 const [corteActivo, setCorteActivo] = useState(cortesInventario[cortesInventario.length - 1].hora);
 // 1. Cálculos Base (Incluyendo Phantoms)
 const datosCalculados = useMemo(() => {
   return inventarioMock.map((item) => {
     const fisicoPlanta = item.almacen + item.piso;
     const fisicoTotal = fisicoPlanta + item.dsv;
     const varPlanta = fisicoPlanta - item.qad;
     const deltaTotal = fisicoTotal - item.qad;
     return {
       ...item,
       fisicoPlanta,
       fisicoTotal,
       qadTotal: item.qad,
       varPlanta,
       varPlantaUsd: varPlanta * item.costo,
       deltaTotal,
       deltaTotalUsd: deltaTotal * item.costo,
       esPhantom: item.pn.includes("000"), // Identificador lógico de Phantom
     };
   });
 }, []);
 // 2. Filtros y Ordenamientos tácticos
 const inventarioFiltrado = useMemo(() => {
   let datos = [...datosCalculados];
   // Búsqueda y Pestañas
   if (area === "Almacén") datos = datos.filter(it => it.almacen > 0);
   if (area === "Piso") datos = datos.filter(it => it.piso > 0);
   if (area === "Consignación") datos = datos.filter(it => it.dsv > 0);
   if (busqueda) datos = datos.filter(it => it.pn.toLowerCase().includes(busqueda.toLowerCase()));
   // Casos Críticos (Filtros)
   if (filtroEspecial === "QAD_0") datos = datos.filter(it => it.qadTotal === 0 && it.fisicoTotal > 0);
   if (filtroEspecial === "FISICO_0") datos = datos.filter(it => it.fisicoTotal === 0 && it.qadTotal > 0);
   // Tops (Ordenamientos)
   if (filtroEspecial === "PERDIDA_USD") datos.sort((a, b) => a.deltaTotalUsd - b.deltaTotalUsd);
   if (filtroEspecial === "GANANCIA_USD") datos.sort((a, b) => b.deltaTotalUsd - a.deltaTotalUsd);
   if (filtroEspecial === "PERDIDA_PZAS") datos.sort((a, b) => a.varPlanta - b.varPlanta);
   if (filtroEspecial === "GANANCIA_PZAS") datos.sort((a, b) => b.varPlanta - a.varPlanta);
   return datos;
 }, [datosCalculados, area, busqueda, filtroEspecial]);
 // 3. KPIs del Dashboard
 const metricas = useMemo(() => {
   const total4Wall = datosCalculados.reduce((sum, it) => sum + it.fisicoPlanta, 0);
   const totalDsv = datosCalculados.reduce((sum, it) => sum + it.dsv, 0);
   const qadTotal = datosCalculados.reduce((sum, it) => sum + it.qadTotal, 0);
   return {
     total4Wall, totalDsv,
     totalFisico: total4Wall + totalDsv,
     varPlanta: total4Wall - qadTotal,
     impactoUsd: datosCalculados.reduce((sum, it) => sum + it.deltaTotalUsd, 0),
     casosCriticos: datosCalculados.filter(it => (it.qadTotal === 0 && it.fisicoTotal > 0) || (it.fisicoTotal === 0 && it.qadTotal > 0)).length
   };
 }, [datosCalculados]);
 return (
<main className="dashboard">
<Header archivos={archivosFuente} />
<div className="container">
       {/* HERO Y SELECTOR DE CORTES (TAILWIND PURO) */}
<section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5 mb-8">
<div>
<p className="text-[10px] font-black text-slate-500 tracking-[0.15em] uppercase mb-2">Dashboard Táctico</p>
<h1 className="text-3xl font-black text-white tracking-tight m-0">Reconciliador de Inventario</h1>
<p className="text-sm text-slate-400 mt-2">Monitoreo de Phantoms, 4Wall y QAD en tiempo real.</p>
</div>
<div className="flex items-center gap-3 bg-[#11151a] px-4 py-2.5 rounded-lg border border-slate-700 shadow-sm">
<span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Corte (16 Oct):</span>
<select
             value={corteActivo}
             onChange={(e) => setCorteActivo(e.target.value)}
             className="bg-transparent border-none text-amber-400 font-bold text-sm outline-none cursor-pointer"
>
             {cortesInventario.map(c => (
<option key={c.hora} value={c.hora} className="bg-slate-900">{c.hora}</option>
             ))}
</select>
</div>
</section>
       {/* METRICAS */}
<section className="metrics">
<MetricCard titulo="VAR PLANTA" valor={`${metricas.varPlanta.toLocaleString()} pzas`} descripcion="Físico 4Wall vs QAD" tipo={metricas.varPlanta < 0 ? "negativeCard" : "positiveCard"} />
<MetricCard titulo="IMPACTO ECONÓMICO" valor={`$${Math.abs(metricas.impactoUsd).toLocaleString()}`} descripcion={metricas.impactoUsd < 0 ? "Pérdida (USD)" : "Ganancia (USD)"} tipo={metricas.impactoUsd < 0 ? "negativeCard" : "positiveCard"} />
<MetricCard titulo="CORTE FÍSICO TOTAL" valor={metricas.totalFisico.toLocaleString()} descripcion={`Planta ${metricas.total4Wall.toLocaleString()} + DSV ${metricas.totalDsv.toLocaleString()}`} />
<MetricCard titulo="CASOS CRÍTICOS" valor={metricas.casosCriticos} descripcion="Sobrantes y Faltantes" tipo="alertCard" />
</section>
       {/* PANEL TÁCTICO (ControlPanel.jsx) */}
<ControlPanel
         area={area} setArea={setArea}
         busqueda={busqueda} setBusqueda={setBusqueda}
         filtroEspecial={filtroEspecial} setFiltroEspecial={setFiltroEspecial}
       />
       {/* TABLA DE RESULTADOS */}
<InventoryTable datos={inventarioFiltrado} />
       {/* FOOTER */}
<footer>
<span>Visteon Reconciliador • Planta Chihuahua</span>
<span>Corte activo: {corteActivo}</span>
</footer>
</div>
</main>
 );
}