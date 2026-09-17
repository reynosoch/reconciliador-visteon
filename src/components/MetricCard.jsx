export default function MetricCard({
 titulo,
 valor,
 descripcion,
 tipo = "normal",
}) {
 return (
<div className={`metricCard ${tipo}`}>
<div className="metricHeader">
<span>{titulo}</span>
</div>
<strong>{valor}</strong>
<small>{descripcion}</small>
</div>
 );
}