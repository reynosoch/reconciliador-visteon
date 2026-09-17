export default function Hallazgos({
 perdida,
 ganancia,
 qadCero,
 fisicoCero,
 onFiltro,
}) {
 return (
<section className="hallazgosSection">
<div className="sectionTitle">
<div>
<p className="eyebrow">
           HALLAZGOS DE CONCILIACIÓN
</p>
<h2>
           ¿Qué está fuera de conciliación?
</h2>
<p className="sectionDescription">
           Un hallazgo se considera prioritario cuando existe
           una diferencia que puede requerir investigación física
           durante el inventario.
</p>
</div>
</div>

<div className="hallazgosGrid">
<button
         className="hallazgo danger"
         onClick={() => onFiltro("PERDIDAS")}
>
<div className="hallazgoTitle">
           PÉRDIDA ECONÓMICA
</div>
<strong>
           {perdida}
</strong>
<p>
           Mayor diferencia negativa en USD
</p>
<span>
           Ver partes con pérdida →
</span>
</button>

<button
         className="hallazgo positive"
         onClick={() => onFiltro("GANANCIAS")}
>
<div className="hallazgoTitle">
           GANANCIA ECONÓMICA
</div>
<strong>
           {ganancia}
</strong>
<p>
           Mayor diferencia positiva en USD
</p>
<span>
           Ver partes con ganancia →
</span>
</button>

<button
         className="hallazgo warning"
         onClick={() => onFiltro("QAD_0")}
>
<div className="hallazgoTitle">
           QAD = 0 / FÍSICO &gt; 0
</div>
<strong>
           {qadCero}
</strong>
<p>
           Existe material físico que QAD no registra.
</p>
<span>
           Revisar →
</span>
</button>

<button
         className="hallazgo warning"
         onClick={() => onFiltro("FISICO_0")}
>
<div className="hallazgoTitle">
           FÍSICO = 0 / QAD &gt; 0
</div>
<strong>
           {fisicoCero}
</strong>
<p>
           QAD registra material que no aparece en los escaneos.
</p>
<span>
           Revisar →
</span>
</button>
</div>
</section>
 );
}