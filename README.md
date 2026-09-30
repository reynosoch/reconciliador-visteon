# Visteon Inventory Reconciler — 4Wall vs QAD

Dashboard web para apoyar la conciliación del inventario físico de planta durante el día de inventario. El sistema compara el físico proveniente de **4Wall** contra el congelado de **QAD**, incorpora referencias de planeación, BOM y costos, y presenta diferencias en piezas y dólares para las juntas periódicas de Finanzas.

> **Importante:** los archivos usados actualmente para desarrollo y demostración son archivos de prueba. Las discrepancias mostradas por el sistema no deben interpretarse como pérdidas reales de planta.

## Objetivo operativo

Durante el inventario físico, Finanzas necesita detectar temprano qué Part Numbers requieren revisión sin esperar hasta el cierre nocturno. La aplicación prioriza impacto en USD, conserva el detalle por localidad y separa diferencias financieras de problemas de calidad de datos.

El flujo esperado es:

1. Cargar los archivos de referencia congelados.
2. Actualizar el físico vigente de 4Wall.
3. Revisar impacto financiero y discrepancias por investigar.
4. Abrir evidencia por Part Number/localidad.
5. Guardar un corte para la siguiente junta.
6. Comparar únicamente cortes válidos y compatibles.

## Estado actual

La aplicación incluye:

- Conciliación 4Wall vs QAD por Part Number y localidad.
- NET / diferencia total en dólares, pérdida bruta y ganancia bruta.
- SWING por localidad.
- Identificación de Phantom desde ISPBB.
- Referencias BOM sin crear ajustes por una coincidencia simple.
- Identificación de obsoletos desde Cost Part.
- Detección de material inesperado y QAD positivo sin físico.
- Motor de **Discrepancias por investigar** separado de React.
- Alertas operativas con IDs estables por inventario.
- Preguntas pendientes para Finanzas disponibles desde la campana.
- Historial de juntas almacenado localmente en IndexedDB.
- Exportación de un Excel único para juntas, con dashboard, fecha/hora, conciliación, localidades, hallazgos, 4Wall, fuentes y guía de interpretación.
- Control local del bot con estado de proceso y último resultado publicado.
- Manejo de fallos de almacenamiento y Error Boundary.
- Diseño responsive para laptop, iPad y móvil.
- Referencias visuales sutiles de Pac-Man.
- Superficies principales con tratamiento Liquid Glass: blur, transparencia, reflejos suaves y profundidad, manteniendo el contenido legible y evitando apilar vidrio sobre vidrio.
- `Estado de datos` abre un visor tipo hoja de cálculo con letras de columna, números de fila, búsqueda, pestaña de hoja y navegación de regreso al hallazgo.
- `Posible ubicación` explica su cálculo en UI y permite abrir el PN directamente en el visor por localidad; los vínculos de cantidades son evidencia navegable, no ajustes automáticos.
- El ambiente Pac-Man incluye persecución normal, modo power con phantoms azules, varios power pellets, frutas, puntaje visual y mayor separación entre personajes.

## Arquitectura

```text
RAW / FUENTES
   ↓
PARSERS
   ↓
NORMALIZACIÓN
   ↓
MOTOR DE DOMINIO
   ├── conciliación
   ├── SWING
   ├── Phantom / BOM
   └── hallazgos
   ↓
RESUMEN FINANCIERO
   ↓
REACT / UI
```

React presenta resultados; las reglas financieras y de hallazgos viven en `src/domain`.

### Estructura principal

```text
src/
├── App.jsx
├── domain/
│   ├── normalize.js
│   ├── explodeBom.js
│   ├── reconcileInventory.js
│   ├── inventoryEngine.js
│   ├── buildDiscrepancyFindings.js
│   ├── notificationState.js
│   └── visibleAlerts.js
├── parsers/
│   ├── parseDelimitedFile.js
│   ├── parse4WallAreas.js
│   ├── parse4WallScans.js
│   ├── parseQad32.js
│   ├── parseISPBB.js
│   ├── parseBom.js
│   └── parseCostPart.js
├── hooks/
│   ├── useInventoryEngine.js
│   └── useReferenceFiles.js
├── services/
│   ├── supabase.js
│   └── browserStorage.js
├── components/
│   ├── dashboard/
│   ├── detail/
│   ├── help/
│   ├── shell/
│   └── visual/
└── styles/pacman.css
```

## Fuentes de datos

| Fuente | Uso actual |
| --- | --- |
| 4Wall | Físico vigente: PN, cantidad y área de escaneo |
| 4Wall-Area | Traducción de área 4Wall a localidad QAD |
| QAD 3.2 | Inventario congelado por PN y localidad |
| ISPBB 50.1.4.22 | Fuente autoritativa para saber si un PN es Phantom |
| BOM | Relación Parent → Component y Usage |
| Cost Part Browse | Cost Total y Status para valoración financiera |

Los archivos de referencia se cargan manualmente en el navegador y se validan por columnas requeridas. También se calcula una huella SHA-256 para detectar si las referencias cambiaron.

### Limitación actual del 4Wall en vivo

La consulta web actual recibe de Supabase:

- `id`
- `numero_parte`
- `cantidad`
- `area_escaneo`

Por lo tanto, la interfaz **no debe inventar** Ticket/FIFO, auditor, responsable o fecha si esos campos no llegaron por el pipeline publicado.

## Reglas financieras actuales

### Diferencia total / NET

```text
NET piezas = Físico total - QAD total
NET USD    = NET piezas × costo unitario
```

El signo se conserva. El NET representa la diferencia total del PN; no se usa valor absoluto.

### Pérdida y ganancia bruta

- NET negativo → pérdida bruta.
- NET positivo → ganancia bruta.
- Un PN sin costo confiable no se presenta como USD 0 válido.

### SWING

La implementación vigente compara localidad contra localidad:

```text
SWING piezas = Σ ABS(Físico(localidad) - QAD(localidad))
SWING USD    = SWING piezas × costo unitario
```

No se divide entre dos. El alcance final de localidades para SWING sigue pendiente de confirmación con el departamento.

### Phantom

- No se identifica por prefijos del Part Number.
- La fuente autoritativa es ISPBB.
- BOM usa `Usage`, no `Grossed up Usage`.
- La explosión actual parte de escaneos phantom YES y selecciona componentes NO de nivel .2; no es recursiva.
- Una coincidencia en BOM por sí sola no debe crear un ajuste financiero nuevo.

### Obsoleto

Se toma de `Status = OBSOLETE` en Cost Part. Un sobrante obsoleto puede aislarse para revisión, pero sigue formando parte del NET del PN.

### Material inesperado

Si Físico > 0 y QAD = 0, se marca para investigar. El motor distingue cuando el PN está presente con saldo cero de cuando está ausente del archivo QAD filtrado.

### Sin físico registrado

QAD > 0 y Físico = 0 se muestra como **Sin físico registrado**. Durante el conteo intradía esto no significa automáticamente una pérdida confirmada.

## Discrepancias por investigar

`src/domain/buildDiscrepancyFindings.js` genera hallazgos con IDs estables por inventario, regla, PN y localidad.

Tipos actuales:

- Diferencia de cantidad.
- Sin físico registrado.
- Material inesperado.
- Posible ubicación.
- Falta un costo confiable.
- Área/localidad sin mapeo.
- Revisión BOM.
- Cambio inusual entre cortes comparables.

Un mismo PN puede tener varias etiquetas, pero su NET no se suma varias veces.

### Posible ubicación

Para cada localidad:

```text
deltaLocalidad = físicoLocalidad - qadLocalidad
sobrantes = suma(deltas positivos)
faltantes = suma(abs(deltas negativos))
potencialmenteCompensable = min(sobrantes, faltantes)
```

Solo es una pista de investigación. No afirma un traslado y no modifica NET ni SWING.

## Costos y calidad de datos

Cost Part distingue:

- costo válido;
- costo ausente;
- costo inválido;
- costo contradictorio.

Un valor vacío o `"$"` no debe convertirse silenciosamente en cero. Un cero numérico real se conserva como cero.

Si una columna necesaria para calcular está duplicada de forma ambigua, la fuente debe revisarse en lugar de escoger una columna silenciosamente.

## Inventarios, cortes e historial

El **nombre del inventario** y su **ID interno** son independientes. Renombrar no cambia los IDs de los hallazgos.

Los cortes grandes y alertas se guardan en IndexedDB. `localStorage` se reserva para preferencias pequeñas. La sección de juntas expone solo dos acciones principales: **Guardar resultados en navegador** y **Exportar Excel completo**.

Cada corte conserva información suficiente para validar comparabilidad, incluyendo:

- inventario;
- versión de reglas;
- referencias/huellas;
- estado del snapshot;
- resumen;
- detalle requerido para comparación.

Si IndexedDB falla, la aplicación intenta conservar el trabajo en memoria y muestra una advertencia. El historial local **no se sincroniza entre computadoras**. El Excel sirve como copia compartible del corte y contiene una hoja `Dashboard` pensada para un lector que no conoce el desarrollo: cada KPI incluye una explicación de qué significa y cómo debe leerse en junta. También incluye `Conciliacion`, `Localidades`, `Hallazgos`, `4Wall actual`, `Fuentes` y `Guia`.

Crear otro inventario no borra los archivos de referencia que ya están cargados en la sesión.

## Preguntas pendientes con el departamento

Las preguntas vigentes están únicamente en la campana y en la sección de acuerdos del 29/09 al final de este documento. Se confirmaron USD, actualización por reemplazo de escaneos, Top 10 y selección BOM nivel .2 / componente NO. No volver a presentar esas decisiones como pendientes.

## Bot 4Wall

`bot_extractor.py` usa Playwright para entrar al 4Wall interno, exportar el reporte, limpiar cantidades inválidas y publicar un corte mediante el RPC de Supabase.

`bot_control_server.py` controla el arranque del extractor localmente:

- evita arranques concurrentes;
- valida que exista el extractor;
- diferencia solicitud aceptada de snapshot publicado;
- expone estado y último resultado sin devolver credenciales;
- usa contraseña desde `BOT_CONTROL_PASSWORD`;
- por defecto solo escucha en loopback.

No guardar usuarios, contraseñas ni `service_role` dentro del frontend o del repositorio.

## Metadatos de snapshot

El extractor prepara:

- `snapshotId`
- `extractedAt`
- `publishedAt`
- `result`
- `rowCount`

La lectura frontend actual también verifica que el conjunto no cambie durante la paginación. Mientras el esquema remoto no exponga un `snapshotId` real a la consulta, el frontend indica que la antigüedad real del reporte no está confirmada.

## Desarrollo local

Requisitos:

- Node.js compatible con Vite 8.
- npm.
- Variables públicas de Supabase en `.env.local`.

En la laptop corporativa Windows se recomienda usar `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
```

Verificación y build:

```powershell
npm.cmd run build
```

El build ejecuta primero verificaciones de Finanzas, discrepancias, seguridad de UI, IndexedDB y generación XLSX; después compila Vite.

## Variables del frontend

```text
VITE_SUPABASE_URL=<url del proyecto>
VITE_SUPABASE_ANON_KEY=<anon key>
```

La anon key puede existir en el frontend; la seguridad real debe depender de RLS/permisos del backend. Nunca colocar una `service_role` en React.

## Despliegue

Vite usa la base:

```text
/reconciliador-visteon/
```

GitHub Pages está configurado para **despliegue manual**. Hacer push a `main` no publica automáticamente el dashboard.

Antes de publicar:

```powershell
git pull --ff-only origin main
npm.cmd install
npm.cmd run build
```

La publicación debe ejecutarse únicamente cuando se haya decidido qué versión se quiere mostrar.

## Diseño

La UI sigue la identidad visual de Visteon:

- Roboto.
- Visteon Orange `#F5821F`.
- Dark Blue `#00293F` / `#113B5E`.
- Prioridad visual para impacto financiero.
- Responsive para monitor/laptop, iPad y móvil.

La referencia Pac-Man es ambiental, no arcade: normalmente Pac-Man huye mientras los Phantoms lo persiguen en fila. En momentos aleatorios aparece un power pellet; cuando Pac-Man lo alcanza, los fantasmas se vuelven azules y huyen en fila. El poder dura unos segundos y después vuelve la persecución normal. `prefers-reduced-motion` desactiva esta animación.

## Principios que no deben romperse

- No inventar autorizaciones de Finanzas.
- No tratar QAD sin físico como pérdida confirmada durante un conteo incompleto.
- No usar prefijos para identificar Phantom.
- No usar `Grossed up Usage` como Usage.
- No dividir SWING entre dos.
- No convertir un área desconocida automáticamente a Piso.
- No convertir costos o cantidades inválidas silenciosamente a cero.
- No duplicar NET porque un PN tenga varias alertas.
- No presentar datos de prueba como pérdidas reales.
- No publicar automáticamente cambios a GitHub Pages.

## Pendientes técnicos/funcionales

- Confirmar alcance final de localidades/sitios con el departamento.
- Confirmar costo y moneda oficiales.
- Confirmar interpretación operativa final de SWING.
- Validar la regla acordada (.2 / NO) con los nuevos escaneos y BOM de prueba.
- Definir una fuente válida de cierre de conteo.
- Definir identidad oficial de registros/reconteos.
- Exponer metadatos de snapshot de extremo a extremo en el backend.
- Si se requieren Ticket/auditor/responsable/fecha en vivo, ampliar de forma coordinada bot + tabla/RPC + consulta frontend.
- Migrar historial compartido a una base central si las juntas necesitan ver los mismos cortes desde varios equipos.

---

Proyecto PoC de conciliación de inventario para Visteon. El dashboard apoya la investigación; no sustituye la validación operativa ni las decisiones de Finanzas.

## UX de investigación y trazabilidad

La interfaz usa una temática **Liquid Glass** como sistema visual global: paneles principales, botones, menús laterales, diálogos y controles comparten transparencia, blur, reflejos suaves y bordes translúcidos. El objetivo es mantener visible el ambiente Pac-Man sin sacrificar lectura financiera.

El menú hamburguesa contiene opciones futuras marcadas como **DEVELOPMENT** y una entrada discreta de laboratorio para activar **Modo animación**, que oculta el dashboard y deja únicamente el ambiente visual hasta cerrar con `×`.

### Discrepancias por investigar

- El encabezado ya no asume una frecuencia fija de juntas.
- El botón `?` abre un menú compacto con la explicación de Posible ubicación, Cantidad, Calidad de datos y Falta de costo.
- Cada hallazgo abre un drawer con `×` y un botón **Ver evidencia en Excel**.
- Para `SIN FÍSICO`, la evidencia abre QAD y 4Wall lado a lado y avisa cuando el snapshot físico no contiene el PN.
- Otras reglas abren las fuentes relevantes: Cost Part, BOM, diccionario 4Wall-Area o comparación 4Wall/QAD según corresponda.
- El panel puede exportarse por separado a `Visteon-Discrepancias-*.xlsx`.

### Visor tipo Excel

`Estado de datos` usa un visor con letras de columna, números de fila, barra de búsqueda y pestaña de hoja.

Para 4Wall, el pipeline nuevo preserva el registro original en `raw_record` y guarda en `source_columns` qué columnas del archivo fueron utilizadas como Part Number, cantidad y área. El visor marca esas columnas con `★ USADO`.

> Compatibilidad: los snapshots publicados antes de esta ampliación solo contienen `id`, `numero_parte`, `cantidad` y `area_escaneo`. El visor los muestra sin inventar columnas faltantes.

La migración preparada para habilitar el registro original completo está en:

```text
supabase/migrations/20260929_preserve_4wall_raw_record.sql
```

Debe aplicarse con permisos administrativos de Supabase. Después, el bot debe publicar un snapshot nuevo para que aparezcan las columnas originales completas.

### Excel ejecutivo

`Visteon-Inventario-*.xlsx` mantiene siete hojas, pero el Dashboard ya no incluye una columna de “Cómo leerlo en junta” ni preguntas pendientes con el departamento.

La hoja `Conciliacion` identifica en cada encabezado la fuente que alimenta el dato, por ejemplo 4Wall, QAD 3.2, Cost Part, ISPBB o BOM.

La hoja `Localidades` muestra de forma explícita:

```text
Área 4Wall → diccionario 4Wall-Area → Localidad QAD
```

y después compara el físico contra la cantidad de esa misma Localidad QAD.

### Radar lateral

En el área de conciliación, el bloque lateral se mantiene visible mientras se recorre la tabla e incluye:

- `PHANTOM RADAR`: principales Phantom por impacto NET absoluto.
- `OBSOLETOS +`: principales materiales obsoletos con sobrante valorizado.

Ambos bloques abren el detalle normal del Part Number.

## Acuerdos de la junta del 29 de septiembre de 2026

Esta sección reemplaza las reglas anteriores de explosión BOM. Los archivos de la junta son ejemplos de prueba, no el congelado oficial del inventario.

### Escaneos y phantoms

1. Leer el reporte completo de 4Wall. Cargar otro reporte **reemplaza** el anterior; no acumula escaneos ni reconteos. Una reducción de filas es válida (se reportó una reducción a 4,943 por preconteos; ese archivo nuevo aún debe cargarse y verificarse).
2. ISPBB `Phantom=YES` identifica el **número escaneado** que se debe convertir. Los escaneos NO se reconocen directamente. Sin definición ISPBB, se mantiene la revisión de catálogo; no se infieren prefijos.
3. Para un escaneo YES buscar su número en `Parent Item` (B).
4. Usar exclusivamente `Level` (F) `.2` / `0.2` (también `0,2` al importar) y `Comp Phantom` (M) `NO`. Ignorar nivel 1 y niveles inferiores, componentes YES y etiquetas desconocidas. **No es una multiplicación por 0.2.**
5. Multiplicar `Usage` (I) por la cantidad escaneada del phantom. No usar `Grossed up Usage`, no hacer recursión. Conservar la localidad del escaneo de origen.
6. Por componente: físico reconocido = escaneos directos NO phantom + aportaciones de BOM. El escaneo original del phantom se conserva en el detalle, pero aporta cero como físico directo. QAD nunca se reescribe a cero; un phantom con saldo QAD abre una alerta.
7. NET piezas = físico reconocido − QAD. NET USD = NET piezas × costo. SWING conserva la suma absoluta por localidad sin dividir entre dos.

Ejemplo de la junta: 48 escaneos de `VPTBFF-10849-ABT`. Para sus filas válidas, Usage 5 produce 240; Usage 0.0025 produce 0.12; Usage 8 produce 384. El Excel tiene 15 filas aplicables. Las fórmulas arrastradas a otros niveles en ese Excel **no son reglas válidas**. Z–AD son columnas añadidas para explicar aportación BOM, escaneos directos, total, QAD y diferencia; no vienen en el TXT original.

### BOM acumulativos y archivos originales

- Se admite el TXT separado por `|` tal como llega por correo, además de CSV. No hace falta convertirlo en Excel. No se importan fórmulas del Excel de demostración.
- Agregar dos BOM a una colección de 300 conserva los anteriores. La colección y sus archivos originales interpretados se guardan con Dexie en este navegador y se recuperan al recargar.
- La misma versión de un Parent Item no se suma dos veces. Un archivo que cambia un BOM existente se rechaza completo con un mensaje, manteniendo la colección anterior. No se elige silenciosamente una versión ni se deduplican componentes legítimos dentro de un BOM.
- `RESPALDAR BOM` descarga la colección como JSON, que se puede volver a cargar con AGREGAR BOM. Conservar también los TXT originales. Quitar las demás fuentes no borra la colección BOM.
- Falta BOM y BOM existente sin filas aplicables son estados diferentes. Ambos conservan el escaneo pendiente y advierten que las cantidades aún pueden estar incompletas.
- **Actualización del 30/09:** hay sincronización BOM con Supabase, sujeta a activar las tablas y autorizar las cuentas. Ver instrucciones al final. Dexie conserva la copia local.

### Uso de escaneos manuales

En Fuentes, cargar `Escaneos 4Wall (archivo manual)`. El encabezado identifica este modo. La consulta automática se pausa para que una respuesta del bot no reemplace el archivo seleccionado. El botón de actualizar no sustituye el archivo manual; usar REEMPLAZAR en Fuentes. Quitar el archivo vuelve a la consulta del bot. No se envía el archivo manual a la base remota.

### Juntas y costos

- Dos listas Top 10, pérdidas y ganancias por revisar, ordenadas por NET USD por número de parte. Incluyen el universo QAD del comparativo y señalan cuándo todavía no hay conteo; no son pérdidas finales confirmadas.
- Importes en USD. Costo unitario mostrado con dos decimales; cálculo con precisión original (un costo menor a un centavo no se convierte en cero antes de multiplicar).
- Costo cero se señala, conservando cantidades; no se interpreta como ausencia de inventario ni se inventa una causa de negociación.
- Los resultados guardados con la regla anterior no se comparan como si usaran la nueva regla; se incrementó la versión de cálculo.
- Preguntas pendientes únicamente en la campana: cierre de áreas, códigos de alcance Francia/Paso/CUU, reporte QAD 3.2 vs 3.12, versiones BOM, diferencias ISPBB/BOM, costos cero y almacenamiento compartido.
- No se inventa el cierre de un área. Una localidad QAD puede agrupar varias áreas 4Wall. El filtro actual sigue en Site 179A y tipos PP/MP/FP hasta recibir los códigos que correspondan al alcance acordado.
- La contraseña se indicó con cambio cada 90 días; debe actualizarse en la configuración local del bot cuando corresponda, nunca en el repositorio. Falta confirmar qué cuenta aplica; no se programó cambio automático.

### Verificación y publicación

`npm.cmd install` y `npm.cmd run build` en Windows. Las pruebas incluyen casos sintéticos de la nueva regla, niveles ignorados, cantidades fraccionarias, conservación de QAD y acumulación/conflictos BOM.

Esta actualización se sube a **main solamente**. No ejecutar el despliegue manual de Pages hasta que se solicite. El workflow de verificación de main puede ejecutarse sin publicar Pages.


## Actualización 30/09/2026: archivos, respaldo y visor

- Se aceptan CSV, TXT delimitado y XLSX en todas las fuentes. Excel se lee directamente en memoria; no se vuelve a convertir y leer para calcular. Para repetir cargas, usar CSV (evita abrir/descomprimir un libro). TXT delimitado tiene un costo de lectura parecido; la extensión por sí sola no garantiza velocidad.
- Se busca una hoja con las columnas de la fuente entre sus primeras 50 filas. Si dos hojas coinciden, se pide separar la hoja correcta. Se conservan ceros formateados en identificadores y precisión numérica en costos. Excel no ejecuta fórmulas en esta app: necesita sus valores guardados.
- Las fuentes XLSX ofrecen descarga CSV. La colección BOM también puede descargarse como CSV o como respaldo JSON. El CSV protege texto que Excel pudiera interpretar como fórmula.
- Los escaneos manuales se muestran en el visor y en el Excel exportado, con cantidad, parte, área y columnas adicionales. Reemplazan el reporte completo; no se suman al del bot.
- El visor tiene fondo opaco; Para la junta separa los dos top 10 y muestra la suma de **cada lista**, no la del inventario completo. Phantom Radar y Obsoletos + conservan sus reglas y tienen tarjetas más legibles.
- Reportar distingue errores de configuración/permisos, evita envíos simultáneos y conserva el formulario si falla. Sus opciones Tipo/Área tienen fondo y texto oscuros/claros definidos.

### Activar Supabase (pendiente en el proyecto real)

El proyecto de la aplicación es `uukhwkywmnarcfruerpp`. La conexión disponible durante este cambio no tenía permisos sobre él. **No se aplicaron migraciones remotas ni se modificó el proyecto distinto que sí aparecía conectado.** El respaldo remoto y la recepción de reportes no se consideran verificados en producción.

Un administrador de ese proyecto debe:

1. Aplicar `supabase/migrations/20260929_development_feedback.sql` para el botón Reportar, si aún falta esa tabla.
2. Aplicar `supabase/migrations/20260930205730_inventory_bom_cloud_and_feedback.sql` una sola vez para el respaldo BOM.
3. Crear o invitar las cuentas del equipo mediante Supabase Auth y marcar **app_metadata.inventory_access = true** con la API administrativa de Auth. `user_metadata` no sirve para otorgar este permiso. No colocar claves administrativas en el navegador ni en Git.
4. Configurar las variables públicas `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` del proyecto correcto. En Fuentes → Respaldo de BOM, entrar con una cuenta autorizada.
5. Subir un BOM de prueba: debe aparecer “BOM comparados y respaldados en Supabase”. Abrir otra computadora/cuenta autorizada y comprobar que aparece la misma colección. Repetir el archivo no debe duplicar piezas. Un BOM distinto del mismo padre debe mostrar conflicto.
6. Enviar un reporte de prueba y comprobar su fila en `development_feedback` desde el panel administrativo. La web puede enviar reportes, pero no leer los de otros usuarios.

### Cómo se guarda el BOM

Se conserva primero en IndexedDB. Al cargar un BOM, iniciar sesión, recuperar conexión y cada dos minutos, se compara con la colección compartida. Si no hay cambios no se crea otra versión. Los archivos nuevos se acumulan; si un padre tiene una definición distinta, se conserva la copia existente y se pide decidir qué versión usar. Ese caso no se resuelve sumando versiones.

`inventory_bom_current` contiene la colección actual. `inventory_bom_backups` conserva una copia por cambio confirmado (filas normalizadas y datos de procedencia, no el archivo binario original). El guardado compara la versión actual dentro de una transacción: si otra computadora llegó antes, vuelve a comparar. La app no tiene permiso para borrar el historial. Solo cuentas del equipo pueden leer los BOM o usar la función de guardado. Los reportes siguen con permiso público de inserción únicamente, como en la migración anterior.

Sin conexión o sin permisos, aparece **respaldo pendiente** y permanece la copia local. Mientras haya conflicto/pendiente, usa también Descargar copia BOM. Este respaldo no incluye otros archivos ni el historial de juntas. Cada versión completa tiene un límite de 25 MB; vigilar el espacio del proyecto a medida que crezca el historial. La app no borra versiones automáticamente.

### Validación de este cambio

`npm.cmd run build` también prueba importación XLSX, ceros iniciales, precisión, hojas ambiguas, escaneos manuales y conflictos entre colecciones. Las migraciones se ejecutan en Postgres local mediante PGlite para verificar permisos, reportes de solo inserción, historial y rechazo de versiones viejas. Eso no sustituye la prueba de conexión en el proyecto real.

Después de bajar main: `npm.cmd install` y `npm.cmd run dev`. GitHub Pages sigue siendo publicación manual; este cambio no lo despliega.
