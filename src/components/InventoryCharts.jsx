export default function InventoryCharts({ cortes }) {
 const maxUsd = Math.max(
   ...cortes.map((corte) => Math.abs(corte.diferenciasUsd))
 );
 return (
<section className="chartsSection">
<div className="sectionTitle">
<div>
<p className="eyebrow">
           SEGUIMIENTO DEL INVENTARIO
</p>
<h2>
           Evolución durante el día
</h2>
<p className="sectionDescription">
           Comparación de las diferencias detectadas en cada
           corte de inventario.
</p>
</div>
</div>

<div className="chartsGrid">
       {/* GRÁFICA USD */}
<div className="chartCard">
<div className="chartHeader">
<div>
<span>
               DIFERENCIA ECONÓMICA
</span>
<strong>
               USD
</strong>
</div>
<small>
             Cada 2 horas
</small>
</div>

<div className="bars">
           {cortes.map((corte) => {
             const altura =
               (Math.abs(corte.diferenciasUsd) / maxUsd) * 100;
             return (
<div className="barColumn" key={corte.hora}>
<div className="barValue">
                   ${(Math.abs(corte.diferenciasUsd) / 1000000).toFixed(1)}M
</div>
<div className="barWrapper">
<div
                     className="bar"
                     style={{
                       height: `${altura}%`,
                     }}
                   />
</div>
<span>
                   {corte.hora}
</span>
</div>
             );
           })}
</div>
</div>

       {/* ESTADO DEL INVENTARIO */}
<div className="chartCard">
<div className="chartHeader">
<div>
<span>
               PARTES INVESTIGADAS
</span>
<strong>
               PROGRESO
</strong>
</div>
<small>
             Durante el inventario
</small>
</div>

<div className="progressList">
           {cortes.map((corte) => {
             const anterior =
               cortes.length > 0
                 ? cortes[cortes.length - 1].investigados
                 : 1;
             const porcentaje =
               (corte.investigados / anterior) * 100;
             return (
<div
                 className="progressRow"
                 key={corte.hora}
>
<span>
                   {corte.hora}
</span>
<div className="progressTrack">
<div
                     className="progressBar"
                     style={{
                       width: `${Math.min(
                         porcentaje,
                         100
                       )}%`,
                     }}
                   />
</div>
<strong>
                   {corte.investigados}
</strong>
</div>
             );
           })}
</div>
</div>
</div>

     {/* RESUMEN PARA JUNTA */}
<div className="meetingSummary">
<div>
<span>ÚLTIMO CORTE</span>
<strong>
           {cortes[cortes.length - 1].hora}
</strong>
</div>
<div>
<span>DIFERENCIA ACTUAL</span>
<strong>
           {(
             Math.abs(
               cortes[cortes.length - 1].diferenciasUsd
             ) / 1000000
           ).toFixed(2)}
           M USD
</strong>
</div>
<div>
<span>PARTES INVESTIGADAS</span>
<strong>
           {cortes[cortes.length - 1].investigados}
</strong>
</div>
<div>
<span>PRÓXIMO CORTE</span>
<strong>
           20:00
</strong>
</div>
</div>
</section>
 );
}