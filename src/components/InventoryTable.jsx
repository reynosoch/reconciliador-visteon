const numero = (valor) => new Intl.NumberFormat("en-US").format(Math.round(valor));
const dinero = (valor) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(valor);
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
<th>4WALL</th>
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
                   {/* ETIQUETA PHANTOM AUTOMÁTICA */}
                   {item.esPhantom && (
<span style={{ fontSize: '9px', background: '#3b0764', color: '#d8b4fe', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                       PHANTOM
</span>
                   )}
</div>
</td>
<td>{numero(item.fisicoPlanta)}</td>
<td>{numero(item.dsv)}</td>
<td>{numero(item.qadTotal)}</td>
<td>
<span className={item.varPlanta < 0 ? "negative" : "positive"}>
                   {item.varPlanta > 0 ? "+" : ""}{numero(item.varPlanta)}
</span>
</td>
<td>
<span className={item.varPlantaUsd < 0 ? "negative" : "positive"}>
                   {item.varPlantaUsd > 0 ? "+" : ""}{dinero(item.varPlantaUsd)}
</span>
</td>
<td>
<span className={item.deltaTotalUsd < 0 ? "negative" : "positive"}>
                   {item.deltaTotal > 0 ? "+" : ""}{numero(item.deltaTotal)}
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
;