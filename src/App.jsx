import React, { useMemo, useState, useEffect } from "react";
import Header from "./components/Header";
import MetricCard from "./components/MetricCard";
import ControlPanel from "./components/ControlPanel";
import InventoryTable from "./components/InventoryTable";
import { inventarioMock, cortesInventario, archivosFuente } from "./data/mockData";
export default function App() {
 const [area, setArea] = useState("TODOS");
 const [busqueda, setBusqueda] = useState("");
 const [filtroEspecial, setFiltroEspecial] = useState("TODOS");
 const [mostrarPhantoms, setMostrarPhantoms] = useState(false);
 const [umbralUsd, setUmbralUsd] = useState(10000);
 const [datosEnVivo, setDatosEnVivo] = useState([]);
 const [estadoConexion, setEstadoConexion] = useState({ mensaje: "Conectando...", colorText: "text-amber-500" });
 // Contador que solo sirve para agitar los números visualmente, sin pegarle a Supabase
 const [ruidoVisual, setRuidoVisual] = useState(0);
 // LLAVES DE SUPABASE
 const SUPABASE_URL = "https://uukhwkywmnarcfruerpp.supabase.co/rest/v1/escaneos_4wall?select=*&order=id.desc&limit=5000";
 const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1a2h3a3l3bW5hcmNmcnVlcnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwODI4OTgsImV4cCI6MjEwNTY1ODg5OH0.ezApb_e8_Q-_yvxmZL4b3skmmMXoJaya4oupSzPz3Vc";
 // Fetch REAL a Supabase — solo trae lo poco que sí guardaste con simulador.py
 useEffect(() => {
   const fetchInventarioEnVivo = async () => {
     try {
       const response = await fetch(SUPABASE_URL, {
         headers: {
           'apikey': SUPABASE_KEY,
           'Authorization': `Bearer ${SUPABASE_KEY}`
         }
       });
       const data = await response.json();
       setDatosEnVivo(data);
       setEstadoConexion({ mensaje: "En vivo", colorText: "text-emerald-400" });
     } catch (error) {
       console.error("Error conectando con Supabase:", error);
       setEstadoConexion({ mensaje: "Desconectado", colorText: "text-rose-500" });
     }
   };
   fetchInventarioEnVivo();
   const intervalo = setInterval(fetchInventarioEnVivo, 3000);
   return () => clearInterval(intervalo);
 }, []);
 // Ruido visual — NO toca Supabase, solo dispara un recálculo cada 3 seg
 useEffect(() => {
   const intervaloRuido = setInterval(() => {
     setRuidoVisual(prev => prev + 1);
   }, 3000);
   return () => clearInterval(intervaloRuido);
 }, []);
 const datosCalculados = useMemo(() => {
   return inventarioMock.map((item) => {
     const escaneos = datosEnVivo.filter(scan => scan.numero_parte === item.pn);
     let almacenVivo = 0;
     let pisoVivo = 0;
     escaneos.forEach(scan => {
       if (scan.area_escaneo === 'ALMACEN') almacenVivo += scan.cantidad;
       if (scan.area_escaneo === 'PISO' || scan.area_escaneo === 'CUARENTENA') pisoVivo += scan.cantidad;
     });
     // Jitter determinístico: pequeño vaivén creíble, no random feo, y nunca negativo
     //const semilla = ruidoVisual + item.pn.length; ruido visual
     const jitterAlmacen = 0;
    const jitterPiso = 0;
     // const jitterAlmacen = Math.round(Math.abs(Math.sin(semilla)) * 4); ruido visual
     //const jitterPiso = Math.round(Math.abs(Math.cos(semilla)) * 3); ruido visual
     const fisicoAlmacen = (escaneos.length > 0 ? almacenVivo : 0) + jitterAlmacen;
     const fisicoPiso = (escaneos.length > 0 ? pisoVivo : 0) + jitterPiso;
     const fisicoPlanta = fisicoAlmacen + fisicoPiso;
     const fisicoTotal = fisicoPlanta + item.dsv;
     const qadAlmacen = Math.round(item.qad * 0.8);
     const qadPiso = Math.round(item.qad * 0.2);
     const varPlanta = fisicoPlanta - item.qad;
     const deltaTotal = fisicoTotal - item.qad;
     const varSwing = Math.abs(fisicoAlmacen - qadAlmacen) + Math.abs(fisicoPiso - qadPiso);
     const esPhantom = item.pn.includes("0000") || item.pn.startsWith("P7");
     const esObsoleto = item.pn.includes("VPRLXF");
     return {
       ...item,
       almacen: fisicoAlmacen, piso: fisicoPiso, fisicoPlanta, fisicoTotal,
       qadTotal: item.qad, qadAlmacen, qadPiso, varPlanta, varPlantaUsd: varPlanta * item.costo,
       deltaTotal, deltaTotalUsd: deltaTotal * item.costo, varSwing, esPhantom, esObsoleto
     };
   });
 }, [datosEnVivo, ruidoVisual]);
 const inventarioFiltrado = useMemo(() => {
   let datos = [...datosCalculados];
   if (!mostrarPhantoms) datos = datos.filter(it => !it.esPhantom);
   if (area === "Almacén") datos = datos.filter(it => it.almacen > 0);
   if (area === "Piso") datos = datos.filter(it => it.piso > 0);
   if (busqueda) datos = datos.filter(it => it.pn.toLowerCase().includes(busqueda.toLowerCase()));
   if (filtroEspecial === "PELIGRO_OBSOLETOS") datos = datos.filter(it => it.esObsoleto && it.deltaTotalUsd > 0);
   if (filtroEspecial === "QAD_0") datos = datos.filter(it => it.qadTotal === 0 && it.fisicoTotal > 0);
   if (filtroEspecial === "FISICO_0") datos = datos.filter(it => it.fisicoTotal === 0 && it.qadTotal > 0);
   if (filtroEspecial === "PERDIDA_USD") datos.sort((a, b) => a.deltaTotalUsd - b.deltaTotalUsd);
   if (filtroEspecial === "GANANCIA_USD") datos.sort((a, b) => b.deltaTotalUsd - a.deltaTotalUsd);
   if (filtroEspecial === "SWING_ALTO") datos.sort((a, b) => b.varSwing - a.varSwing);
   if (filtroEspecial === "PERDIDA_USD" || filtroEspecial === "GANANCIA_USD") {
     datos = datos.filter(it => Math.abs(it.deltaTotalUsd) >= umbralUsd);
   }
   return datos;
 }, [datosCalculados, area, busqueda, filtroEspecial, mostrarPhantoms, umbralUsd]);
 const metricas = useMemo(() => {
   const datosValidos = datosCalculados.filter(it => !it.esPhantom);
   const total4Wall = datosValidos.reduce((sum, it) => sum + it.fisicoPlanta, 0);
   const impactoNeto = datosValidos.reduce((sum, it) => sum + it.deltaTotalUsd, 0);
   const swingTotal = datosValidos.reduce((sum, it) => sum + it.varSwing, 0);
   return {
     totalFisico: total4Wall + datosValidos.reduce((sum, it) => sum + it.dsv, 0),
     impactoNeto,
     swingTotal,
     casosCriticos: datosValidos.filter(it => Math.abs(it.deltaTotalUsd) >= umbralUsd).length
   };
 }, [datosCalculados, umbralUsd]);
 return (
<main className="dashboard">
<Header archivos={archivosFuente} />
<div className="container">
<section className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-5 mb-8">
<div>
<div className="flex items-center gap-3">
<h1 className="text-3xl font-black text-white tracking-tight m-0">Ingesta de Inventario Físico</h1>
<span className={`text-xs font-bold px-2 py-1 bg-slate-800 rounded-full border border-slate-700 ${estadoConexion.colorText}`}>
               ● {estadoConexion.mensaje}
</span>
</div>
<p className="text-sm text-slate-400 mt-2">Cruce automatizado. Filtrando variaciones &lt; ${umbralUsd.toLocaleString()}</p>
</div>
</section>
<section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
<MetricCard titulo="DISCREPANCIA NETA (USD)" valor={`$${Math.abs(metricas.impactoNeto).toLocaleString()}`} descripcion="Variación Global Financiera" tipo={metricas.impactoNeto < 0 ? "negativeCard" : "positiveCard"} />
<MetricCard titulo="PIEZAS EN SWING" valor={metricas.swingTotal.toLocaleString()} descripcion="Mala ubicación (Almacén vs Piso)" tipo="warning" />
<MetricCard titulo="CORTE FÍSICO TOTAL" valor={metricas.totalFisico.toLocaleString()} descripcion="Suma global de piezas" />
<MetricCard titulo={`CRÍTICOS (> $${umbralUsd / 1000}k)`} valor={metricas.casosCriticos} descripcion="Partes que superan la tolerancia" tipo="alertCard" />
</section>
<ControlPanel
         area={area} setArea={setArea}
         busqueda={busqueda} setBusqueda={setBusqueda}
         filtroEspecial={filtroEspecial} setFiltroEspecial={setFiltroEspecial}
         mostrarPhantoms={mostrarPhantoms} setMostrarPhantoms={setMostrarPhantoms}
         umbralUsd={umbralUsd} setUmbralUsd={setUmbralUsd}
       />
<InventoryTable datos={inventarioFiltrado} />
</div>
</main>
 );
}