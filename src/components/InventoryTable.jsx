import React, { useEffect, useState, useRef } from "react";
// Formateadores
const numero = (valor) => new Intl.NumberFormat("en-US").format(Math.round(valor));
const dinero = (valor) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(valor);
// 🟢 1. NUEVA CÉLULA VISUAL (EFECTO FLASH VERDE)
const CeldaEnVivo = ({ valor, tipo = "numero" }) => {
 const [parpadeo, setParpadeo] = useState(false);
 const valorAnterior = useRef(valor);
 useEffect(() => {
   // Si el valor cambia, encendemos el destello verde
   if (valor !== valorAnterior.current) {
     setParpadeo(true);
     const timer = setTimeout(() => setParpadeo(false), 1000); // Dura 1 segundo encendido
     valorAnterior.current = valor;
     return () => clearTimeout(timer);
   }
 }, [valor]);
 const displayValor = tipo === "dinero" ? dinero(valor) : numero(valor);
 return (
<div style={{
     backgroundColor: parpadeo ? '#22c55e' : 'transparent',
     color: parpadeo ? '#ffffff' : 'inherit',
     transition: 'all 0.5s ease',
     padding: '4px 8px',
     borderRadius: '4px',
     fontWeight: parpadeo ? '900' : 'normal',
     transform: parpadeo ? 'scale(1.1)' : 'scale(1)'
   }}>
     {displayValor}
</div>
 );
};
export default function InventoryTable({ datos }) {
 return (
<section className="tableSection">
<div className="tableHeader">
<div>
<p className="eyebrow">DETALLE DE CONCILIACIÓN</p>
<h2>Números de Parte</h2>
</div>
<span>{datos.length} registros</span>
</div>
<div className="tableContainer">
<table>
<thead>
<tr>
<th>NÚMERO DE PARTE</th>
<th>4WALL (EN VIVO)</th>
<th>DSV</th>
<th>QAD</th>
<th>VAR PLANTA</th>
<th>VAR USD</th>
<th>DELTA TOTAL</th>
<th>ACCIÓN</th>
</tr>
</thead>
<tbody>
           {datos.map((item) => (
<tr key={item.pn}>
<td>
<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
<strong className="pn">{item.pn}</strong>
                   {item.esPhantom && (
<span style={{ fontSize: '9px', background: '#3b0764', color: '#d8b4fe', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                       PHANTOM
</span>
                   )}
</div>
</td>
               {/* 🟢 2. APLICAMOS LA CELDA ANIMADA EN LOS VALORES QUE CAMBIAN */}
<td>
<CeldaEnVivo valor={item.fisicoPlanta} />
</td>
<td>{numero(item.dsv)}</td>
<td>{numero(item.qadTotal)}</td>
<td>
<span className={item.varPlanta < 0 ? "negative" : "positive"}>
                   {item.varPlanta > 0 ? "+" : ""}
<CeldaEnVivo valor={item.varPlanta} />
</span>
</td>
<td>
<span className={item.varPlantaUsd < 0 ? "negative" : "positive"}>
                   {item.varPlantaUsd > 0 ? "+" : ""}
<CeldaEnVivo valor={item.varPlantaUsd} tipo="dinero" />
</span>
</td>
<td>
<span className={item.deltaTotal < 0 ? "negative" : "positive"}>
                   {item.deltaTotal > 0 ? "+" : ""}
<CeldaEnVivo valor={item.deltaTotal} />
</span>
</td>
<td>
<button
                   className="investigate"
                   onClick={() =>
                     alert(
                       `MANDAR A INVESTIGAR A PISO:\n\nPN: ${item.pn}\nFaltan: ${numero(Math.abs(item.varPlanta))} piezas.\nImpacto: ${dinero(item.varPlantaUsd)}`
                     )
                   }
>
                   Investigar Físico
</button>
</td>
</tr>
           ))}
</tbody>
</table>
</div>
</section>
 );
}