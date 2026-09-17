export default function Filters({
 area,
 setArea,
 orden,
 setOrden,
 busqueda,
 setBusqueda,
}) {
 return (
<section className="filtersSection">
<div className="filterGroup">
<label>UBICACIÓN</label>
<div className="filterButtons">
         {["TODOS", "Almacén", "Piso", "Consignación"].map((opcion) => (
<button
             key={opcion}
             className={area === opcion ? "active" : ""}
             onClick={() => setArea(opcion)}
>
             {opcion}
</button>
         ))}
</div>
</div>
<div className="filterGroup">
<label>ORDENAR POR</label>
<select value={orden} onChange={(e) => setOrden(e.target.value)}>
<option value="PERDIDA_USD">Mayor pérdida USD</option>
<option value="GANANCIA_USD">Mayor ganancia USD</option>
<option value="PERDIDA_PZAS">Mayor pérdida piezas</option>
<option value="GANANCIA_PZAS">Mayor ganancia piezas</option>
</select>
</div>
<div className="search">
<label>NÚMERO DE PARTE</label>
<input
         type="text"
         placeholder="Buscar PN..."
         value={busqueda}
         onChange={(e) => setBusqueda(e.target.value)}
       />
</div>
</section>
 );
}