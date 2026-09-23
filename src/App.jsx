import React, { useMemo, useState, useEffect } from "react";
import Header from "./components/Header";
import MetricCard from "./components/MetricCard";
import ControlPanel from "./components/ControlPanel";
import InventoryTable from "./components/InventoryTable";
import { inventarioMock, cortesInventario, archivosFuente } from "./data/mockData";
// Diccionario de equivalencias: Nombre en 4Wall -> Categoría QAD
const MAPEO_AREAS = {
 // Almacén / Raw Materials
 "ALMACEN": "ALMACEN",
 "BODEGA": "ALMACEN",
 "RECEPCION": "ALMACEN",
 "RACKS": "ALMACEN",
 "SUPERMERCADO": "ALMACEN",
 // Piso / Línea de Producción / WIP
 "PISO": "PISO",
 "LINEA 1": "PISO",
 "LINEA 2": "PISO",
 "SMT": "PISO",
 "SUBENSAMBLE": "PISO",
 "WIP": "PISO",
 "CALIDAD": "PISO"
};
// Factores de uso (BOM) para Phantoms/Subensambles conocidos (Usage Multiplier)
// Si no está en la tabla, el multiplicador por defecto es 1
const PHANTOM_USAGES = {
 "P7-PHANTOM-TEST": 2, // 1 subensamble consume 2 piezas del componente base
 "P770094DF50001": 1
};
export default function App() {
 const [area, setArea] = useState("TODOS");
 const [busqueda, setBusqueda] = useState("");
 const [filtroEspecial, setFiltroEspecial] = useState("TODOS");
 const [mostrarPhantoms, setMostrarPhantoms] = useState(false);
 const [umbralUsd, setUmbralUsd] = useState(10000);
 const [datosEnVivo, setDatosEnVivo] = useState([]);
 const [estadoConexion, setEstadoConexion] = useState({ mensaje: "Conectando...", colorText: "text-amber-500" });
 const SUPABASE_BASE_URL = "https://uukhwkywmnarcfruerpp.supabase.co/rest/v1/escaneos_4wall";
 const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1a2h3a3l3bW5hcmNmcnVlcnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwODI4OTgsImV4cCI6MjEwNTY1ODg5OH0.ezApb_e8_Q-_yvxmZL4b3skmmMXoJaya4oupSzPz3Vc";
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
         if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
         setEstadoConexion({ mensaje: `En vivo (${allData.length} scans)`, colorText: "text-emerald-400" });
       }
     } catch (error) {
       console.error("Error consultando Supabase:", error);
       if (!cancelRequest) {
         setEstadoConexion({ mensaje: "Desconectado", colorText: "text-rose-500" });
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
 // 🚀 Matemáticas de conciliación en caliente para la junta
 const datosCalculados = useMemo(() => {
   // 1. Agrupar los ~6k escaneos crudos en memoria traduciendo áreas
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
     // Mapear el área cruda de 4Wall a ALMACEN o PISO de QAD
     const categoriaQad = MAPEO_AREAS[areaCruda] || (areaCruda.includes("ALMACEN") ? "ALMACEN" : "PISO");
     if (categoriaQad === "ALMACEN") {
       item.almacen += cant;
     } else {
       item.piso += cant;
     }
   });
   // 2. Diccionario QAD
   const qadMap = new Map(
     inventarioMock.map((item) => [String(item.pn).trim().toUpperCase(), item])
   );
   // 3. Catálogo unificado
   const todosLosPn = new Set([...resumenEscaneos.keys(), ...qadMap.keys()]);
   return Array.from(todosLosPn).map((pn) => {
     const itemQad = qadMap.get(pn) || { pn, dsv: 0, qad: 0, costo: 0 };
     const scanData = resumenEscaneos.get(pn) || { almacen: 0, piso: 0, areasDetectadas: new Set() };
     const esPhantom = pn.includes("0000") || pn.startsWith("P7");
     const esObsoleto = pn.includes("VPRLXF");
     // Si es Phantom, aplicamos factor de explosión (Usage) si aplica
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
   if (filtroEspecial === "PELIGRO_OBSOLETOS") datos = datos.filter((it) => it.esObsoleto && it.deltaTotalUsd > 0);
   if (filtroEspecial === "QAD_0") datos = datos.filter((it) => it.qadTotal === 0 && it.fisicoTotal > 0);
   if (filtroEspecial === "FISICO_0") datos = datos.filter((it) => it.fisicoTotal === 0 && it.qadTotal > 0);
   if (filtroEspecial === "PERDIDA_USD") datos.sort((a, b) => a.deltaTotalUsd - b.deltaTotalUsd);
   if (filtroEspecial === "GANANCIA_USD") datos.sort((a, b) => b.deltaTotalUsd - a.deltaTotalUsd);
   if (filtroEspecial === "SWING_ALTO") datos.sort((a, b) => b.varSwing - a.varSwing);
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
     totalFisico: total4Wall + datosValidos.reduce((sum, it) => sum + it.dsv, 0),
     impactoNeto,
     swingTotal,
     casosCriticos: datosValidos.filter((it) => Math.abs(it.deltaTotalUsd) >= umbralUsd).length
   };
 }, [datosCalculados, umbralUsd]);
 return (
<main className="dashboard">
<Header archivos={archivosFuente} />
<div className="container">
<section className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-5 mb-8">
<div>
<div className="flex items-center gap-3">
<h1 className="text-3xl font-black text-white tracking-tight m-0">
               Conciliación 4Wall vs QAD
</h1>
<span className={`text-xs font-bold px-2 py-1 bg-slate-800 rounded-full border border-slate-700 ${estadoConexion.colorText}`}>
               ● {estadoConexion.mensaje}
</span>
</div>
<p className="text-sm text-slate-400 mt-2">
             Detección anticipada de variaciones y swing en piso antes del cierre nocturno de QAD.
</p>
</div>
</section>
<section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
<MetricCard
           titulo="DISCREPANCIA NETA (USD)"
           valor={`$${Math.abs(metricas.impactoNeto).toLocaleString()}`}
           descripcion="Variación Global Estimada"
           tipo={metricas.impactoNeto < 0 ? "negativeCard" : "positiveCard"}
         />
<MetricCard
           titulo="PIEZAS EN SWING"
           valor={metricas.swingTotal.toLocaleString()}
           descripcion="Mala ubicación (Almacén vs Piso)"
           tipo="warning"
         />
<MetricCard
           titulo="CORTE FÍSICO TOTAL"
           valor={metricas.totalFisico.toLocaleString()}
           descripcion="Suma global de piezas escaneadas"
         />
<MetricCard
           titulo={`CRÍTICOS (> $${umbralUsd / 1000}k)`}
           valor={metricas.casosCriticos}
           descripcion="Partes con mayor impacto financiero"
           tipo="alertCard"
         />
</section>
<ControlPanel
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
<InventoryTable datos={inventarioFiltrado} />
</div>
</main>
 );
}