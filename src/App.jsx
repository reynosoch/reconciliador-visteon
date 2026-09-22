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
 // CREDENCIALES DE SUPABASE
 const SUPABASE_URL = "https://uukhwkywmnarcfruerpp.supabase.co/rest/v1/escaneos_4wall?select=*";
 const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1a2h3a3l3bW5hcmNmcnVlcnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwODI4OTgsImV4cCI6MjEwNTY1ODg5OH0.ezApb_e8_Q-_yvxmZL4b3skmmMXoJaya4oupSzPz3Vc";
 // CONEXIÓN A LA NUBE (Se actualiza cada 3 segundos)
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
     } catch (error) {
       console.error("Error conectando con la Nube:", error);
     }
   };
   fetchInventarioEnVivo();
   const intervalo = setInterval(fetchInventarioEnVivo, 3000);
   return () => clearInterval(intervalo);
 }, []);
 const datosCalculados = useMemo(() => {
   return inventarioMock.map((item) => {
     // Cruzamos los datos de Supabase
     const escaneos = datosEnVivo.filter(scan => scan.numero_parte === item.pn);
     let almacenVivo = 0;
     let pisoVivo = 0;
     // Leemos las columnas exactas de Supabase
     escaneos.forEach(scan => {
       if (scan.area_escaneo === 'ALMACEN') almacenVivo += scan.cantidad;
       if (scan.area_escaneo === 'PISO' || scan.area_escaneo === 'CUARENTENA') pisoVivo += scan.cantidad;
     });
     const fisicoAlmacen = escaneos.length > 0 ? almacenVivo : 0;
     const fisicoPiso = escaneos.length > 0 ? pisoVivo : 0;
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
 }, [datosEnVivo]);
 // ---> AQUÍ ABAJO SIGUEN TUS USEMEMO DE inventarioFiltrado, metricas Y EL return(...) NORMALES
 // ... (El resto de tus useMemo: inventarioFiltrado y metricas se quedan EXACTAMENTE igual)
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
   const qadTotal = datosValidos.reduce((sum, it) => sum + it.qadTotal, 0);
   const impactoNeto = datosValidos.reduce((sum, it) => sum + it.deltaTotalUsd, 0);
   const swingTotal = datosValidos.reduce((sum, it) => sum + it.varSwing, 0);
   return {
     totalFisico: total4Wall + datosValidos.reduce((sum, it) => sum + it.dsv, 0),
     impactoNeto, swingTotal,
     casosCriticos: datosValidos.filter(it => Math.abs(it.deltaTotalUsd) >= umbralUsd).length
   };
 }, [datosCalculados, umbralUsd]);
 return (
<main className="dashboard">
<Header archivos={archivosFuente} />
<div className="container">
<section className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-5 mb-8">
<div>
<h1 className="text-3xl font-black text-white tracking-tight m-0">Ingesta de Inventario Físico</h1>
<p className="text-sm text-slate-400 mt-2">Cruce automatizado. Filtrando variaciones {'<'} ${umbralUsd.toLocaleString()}</p>
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