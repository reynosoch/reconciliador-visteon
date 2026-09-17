export default function Header({ archivos }) {
 return (
<header className="header">
<div>
<div className="brand">
         VISTEON <span>|</span> RECONCILIADOR
</div>
<div className="subtitle">
         Control de inventario físico vs QAD
</div>
</div>
<div className="headerRight">
<div className="status">
<span className="statusDot"></span>
         Datos sincronizados
</div>
<details className="fileDropdown">
<summary>
           {archivos.length} Archivos Fuente
<span>⌄</span>
</summary>
<div className="fileMenu">
           {archivos.map((archivo) => (
<div key={archivo.nombre}>
<strong>{archivo.tipo}</strong>
<span>{archivo.nombre}</span>
<small>{archivo.descripcion}</small>
</div>
           ))}
</div>
</details>
</div>
</header>
 );
}