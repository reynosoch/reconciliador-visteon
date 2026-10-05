# Visteon Inventory Reconciler — 4Wall vs QAD

<!-- AGENT_CONTEXT_START -->
## Agent entrypoint — lee esto primero

Si eres un agente trabajando en este repo, **no leas todo el README ni recorras todo `src/` de entrada**. Empieza con este bloque y abre únicamente los archivos indicados para tu tarea. El resto del README es referencia detallada.

### Qué es este proyecto

PoC de Visteon para reconciliar **4Wall físico vs QAD congelado** durante inventario. Prioriza impacto en USD, conserva detalle por localidad y usa ISPBB/BOM/Cost Part para explicar diferencias. Los datos de desarrollo son de prueba; no presentar resultados como pérdidas reales sin validación operativa.

### Reglas que no debes romper

- `NET piezas = Físico total - QAD total`; `NET USD = NET piezas × costo`; conservar signo.
- `SWING = Σ ABS(Físico(localidad) - QAD(localidad)) × costo`; **no dividir entre 2**.
- Phantom: fuente autoritativa **ISPBB**; no usar prefijos.
- BOM: usar `Usage`, no `Grossed up Usage`; regla vigente `Level .2 / 0.2` + `Comp Phantom = NO`; no recursivo.
- `OBSOLETE` sale de Cost Part. `Físico > QAD` puede producir ganancia obsoleta, pero sigue dentro del NET.
- `QAD=0 && Físico>0` = material inesperado.
- `QAD>0 && Físico=0` durante conteo = **Sin físico registrado**, no pérdida final confirmada.
- Área 4Wall → catálogo 4Wall-Area → Localidad QAD. Solo normalización confirmada: `WHSE → ZWHSE`. Si no existe mapeo: `UNMAPPED`.
- React no debe duplicar fórmulas del motor. Lógica de negocio en `src/domain/`.
- No mezclar 4Wall manual con automático.
- No poner secretos en frontend, Git o variables `VITE_*`.
- GitHub Pages es manual; push a `main` no despliega Pages automáticamente. Para publicar usa `npm.cmd run deploy`, que dispara el workflow actual de Pages.
- Mantener scroll nativo en el centro. `ScrollEffects.jsx` es la única implementación del rubber band; Motion solo controla el overscroll de borde, no reemplaza `scrollTop`.

### Arquitectura mínima

```text
Fuentes → parsers → normalización → src/domain → hooks → React/UI
```

### Abre solo lo que corresponda

| Si vas a tocar… | Empieza por… |
| --- | --- |
| Fórmulas NET/SWING/flags | `src/domain/reconcileInventory.js`, `src/domain/inventoryEngine.js` |
| Phantom/BOM | `src/domain/explodeBom.js`, `src/domain/bomLibrary.js`, `src/parsers/parseBom.js` |
| Áreas/localidades | `src/domain/normalize.js`, `src/parsers/parse4WallAreas.js` |
| Hallazgos/notificaciones | lógica: `src/domain/buildDiscrepancyFindings.js`, `src/domain/notificationState.js`; UI: `src/components/shell/NotificationCenter.jsx` + `src/styles/modules/notifications-drawer.css` |
| Tabla principal | `src/components/dashboard/InventoryWorkspace.jsx`; radar en `InventoryRadar.jsx`; formatos/filtros en `inventoryWorkspaceSupport.js` |
| Trazador de pieza / aprendizaje | `src/domain/partLearningTrace.js`, `src/domain/sourceEvidence.js`; UI: `src/components/shell/PartLogicTracer.jsx` + `SourcePreviewModal.jsx`; estilos en `data-review.css` |
| LAB · Cómo funciona el motor | `src/domain/engineGuide.js`; UI: `src/components/shell/EngineGuideDrawer.jsx`, entrada en `MainMenu.jsx`; ejemplos calculados por `inventoryEngine`, separados del inventario real |
| Myke / organización virtual | `.agents/ROLES.md` define equipo y textos; `src/domain/mykeOrganization.js` lee documentación; UI en `MykePanel.jsx` + `visual/MykeMascot.jsx` / `MykeGhost.jsx`; chat local basado en este README y consultas PN a la evidencia del dominio, sin conexión IA |
| Visor de datos / evidencia | `src/components/dashboard/DataInspectionPanel.jsx`; construcción de vistas/export helpers en `dataInspectionSupport.js` |
| Fuentes/importación | lógica: `src/domain/sourceCatalog.js`, `src/services/sourceDetection.js`, `src/hooks/useReferenceFiles.js`; UI: `src/components/shell/SourcesDrawer.jsx` + `src/components/shell/sources/` |
| 4Wall automático / Bot | lógica: `src/hooks/useInventoryEngine.js`, `src/services/supabase.js`, `bot_extractor.py`, `bot_control_server.py`; UI: `src/components/shell/BotControlModal.jsx`, acceso desde navbar y `MainMenu.jsx` |
| Supabase/BOM cloud | `src/services/bomCloud.js`, `supabase/migrations/` |
| Scroll/rubber band | `src/components/visual/ScrollEffects.jsx` + `src/styles/modules/interaction-motion.css` |
| Pac-Man / LAB / rendimiento | `src/components/visual/PacmanGlyphs.jsx`, `src/components/shell/MainMenu.jsx` + `src/styles/modules/interaction-motion.css` |
| Navbar / footer | `src/components/shell/CommandHeader.jsx`, `src/components/shell/SystemFooter.jsx` + `src/styles/modules/navigation-footer.css` |
| Drawers / overlays / ayuda | componentes en `src/components/shell/` y `src/components/help/`; textos en `src/components/help/helpContent.js`; estilos en `src/styles/modules/overlays-drawers.css` |
| Fuentes visual | `src/components/shell/SourcesDrawer.jsx` + `src/styles/modules/sources-drawer.css` |
| Visores, tablas y superficies de datos | componente correspondiente + `src/styles/modules/data-review.css` |
| Base visual / dashboard general | `src/styles/modules/foundation-dashboard.css` |
| Excel/exportación | `src/services/exportInventoryWorkbook.js`, `src/services/exportBomWorkbook.js` |
| Persistencia local | `src/services/browserStorage.js` |
| Estado/gestos auxiliares de App | `src/hooks/useBotRunningStatus.js`, `src/hooks/useMobileMenuSwipe.js`; `App.jsx` queda como orquestador |
| Reglas/decisiones del proyecto | sección relevante de este `README.md` |

### Comandos

Windows corporativo:

```powershell
git pull origin main --no-edit
npm.cmd ci
npm.cmd run build
npm.cmd run dev
# publicar Pages cuando corresponda:
npm.cmd run deploy
```

Para cargar solo este contexto en otra sesión/agente:

```powershell
npm.cmd run context
```

Antes de hacer push, `npm.cmd run build` debe quedar verde. Ese build exige: ESLint sin warnings, cero módulos runtime huérfanos, cero dependencias runtime sin uso, cero CSS `vi-*` huérfano salvo clases dinámicas documentadas, verificaciones financieras/BOM/imports/Dexie/Supabase y build Vite.

### Estado técnico actual

- React 19 + Vite 8 + Tailwind 3.
- Supabase/PostgreSQL + Dexie/IndexedDB.
- TanStack Virtual en la tabla grande.
- El scroll normal es nativo. Motion usa `useSpring` únicamente para rubber band/overscroll y transiciones puntuales del shell; nunca sustituye `scrollTop`.
- SheetJS fijado localmente en `vendor/xlsx-0.20.3.tgz`.
- Paneles pesados usan `DeferredPanel` + `React.lazy`: se cargan al primer uso, conservando las búsquedas/selecciones que antes persistían al cerrar. Vidrio ligero y Quitar animaciones son preferencias independientes; no cambian scroll ni cálculos.
- `README.md` es la fuente de verdad de reglas, arquitectura y decisiones del proyecto. La coordinación de la organización virtual vive en [`.agents/README.md`](.agents/README.md); los agentes leen después [`.agents/AGENTS.md`](.agents/AGENTS.md) y solo los roles/contratos necesarios para su tarea.

### Handoff UI actual — 02 OCT 2026

- **No eliminar funcionalidad para "optimizar".** Se puede reducir memoria/composición o simplificar CSS, pero funciones existentes deben conservarse salvo instrucción explícita.
- Navbar: `CommandHeader.jsx` muestra logo Visteon + 179A, estado rápido de 4Wall, hora de actualización y acciones esenciales. Debajo vive **Flujo de datos**, que se repliega al bajar y reaparece al subir con spring/histéresis.
- Rubber band: scroll medio 100% nativo; Motion spring en bordes. Configuración vigente: `stiffness 520 / damping 34 / mass .55`; arriba ~54 px y abajo ~42 px. **Ambos bordes usan exactamente la misma acumulación, guard de momentum, handoff, release de 46 ms y spring; solo cambia la amplitud visual máxima inferior.** No volver a crear una ruta/timer/impulso exclusivo para abajo ni transformar el elemento que posee el scroll.
- Pac-Man ambiental continúa durante scroll/rubber band cuando está habilitado. El menú guarda preferencias persistentes en **RENDIMIENTO**: Pac-Man puede apagarse por separado y **Quitar animaciones** pausa movimiento decorativo/transiciones sin quitar scroll ni rubber band. **LAB → Ver animación** sigue siendo una vista explícita a pantalla completa.
- **Bot 4Wall**: el mismo control seguro se abre desde navbar o hamburguesa. El menú muestra estado rápido CORRIENDO/ABRIR y el drawer del bot incluye una animación de scanner puramente visual; proceso, PID y snapshot siempre provienen del controlador real, no de la animación.
- **Ayuda**: los botones `?` siguen usando `HelpDrawer.jsx` + `helpContent.js`, pero el drawer visual es compacto y consistente con Fuentes/Notificaciones (Qué significa → Fuente → Método → Detalles).
- Footer: está **pegado al final del dashboard**, con logo Visteon, `/reynosoch`, Fuentes/Calidad/Entorno/Versión centrados, snapshot y créditos lowkey. El botón **Reportar** permanece disponible también al llegar al footer; el acceso flotante conserva su espacio.
- Fuentes: `SourcesDrawer.jsx` usa entrada universal multiarquivo, filas compactas de estado y resultados de carga colapsados: muestra 3 y luego **Ver más / Ver menos**. BOM conserva lista/preview/borrado controlado y BOM Focus.
- El drawer de Fuentes fue reconstruido recientemente; cualquier siguiente ajuste debe ser **visual/ergonómico**, no volver a tarjetas grandes ni desplegar todos los archivos de golpe.
- Antes de editar UI, revisar los últimos commits de `main` porque puede haber trabajo concurrente de otros agentes.

**Solo si tu tarea requiere contexto adicional, continúa con la sección correspondiente abajo.**
<!-- AGENT_CONTEXT_END -->


> **Fuente de verdad del proyecto:** reglas de inventario, decisiones del dominio, pendientes, seguridad, arquitectura y operación de la aplicación deben mantenerse en este README. [`.agents`](.agents/README.md) define responsabilidades y coordinación del trabajo entre humanos/agentes, sin sustituir ni duplicar las reglas del reconciliador.

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
- Preguntas de lógica documentadas únicamente en este README; no ocupan espacio en la interfaz de notificaciones.
- Historial de juntas almacenado localmente en IndexedDB.
- Exportación de un Excel único para juntas, con dashboard, fecha/hora, conciliación, localidades, hallazgos, 4Wall, fuentes y guía de interpretación.
- Control local del bot con estado de proceso y último resultado publicado.
- Manejo de fallos de almacenamiento y Error Boundary.
- Diseño responsive para laptop, iPad y móvil.
- Referencias visuales sutiles de Pac-Man.
- Drawers laterales compactos y legibles. **Fuentes** y **Notificaciones** comparten el mismo lenguaje industrial: panel derecho de 560 px máx., header compacto, listas densas y naranja solo como acento.
- `Estado de datos` abre un visor tipo hoja de cálculo con letras de columna, números de fila, búsqueda, pestaña de hoja y navegación de regreso al hallazgo.
- `Posible ubicación` explica su cálculo en UI y permite abrir el PN directamente en el visor por localidad; los vínculos de cantidades son evidencia navegable, no ajustes automáticos.
- La animación ambiental de Pac-Man puede activarse o desactivarse desde **RENDIMIENTO** en el menú; la preferencia se guarda en este dispositivo. **Quitar animaciones** pausa Pac-Man, fantasmas y transiciones decorativas sin tocar el scroll/rubber band. El LAB permite verla a pantalla completa de forma explícita.
- Navbar compacto orientado a lectura rápida: estado de 4Wall, actualización, Fuentes, notificaciones, bot, refresh y menú; el detalle secundario vive en **Flujo de datos** y se repliega con el scroll.
- Footer de sistema pegado al final del dashboard con estado de Fuentes/Calidad/Entorno/Versión, snapshot, logo Visteon, `/reynosoch` y créditos discretos.

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

React presenta resultados; las reglas financieras y de hallazgos viven en `src/domain`. El scroll principal sigue siendo nativo; Motion solo suaviza el rubber band en los bordes y algunas transiciones del shell. La tabla grande de conciliación usa TanStack Virtual para mantener pequeño el DOM.

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
└── styles/
    ├── app.css                 # entrypoint; solo imports ordenados
    └── modules/
        ├── foundation-dashboard.css  # variables, botones, cards y dashboard base
        ├── overlays-drawers.css      # drawers, overlays, ayuda y modales
        ├── data-review.css           # tablas, Excel-like views, notificaciones y revisión
        ├── interaction-motion.css    # scroll, rubber band, Motion, Pac-Man y LAB
        ├── navigation-footer.css     # navbar, flujo de datos y footer
        ├── sources-drawer.css        # workspace visual de Fuentes
        └── notifications-drawer.css  # workspace visual de Notificaciones
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

### Workspace de Fuentes

El drawer **Fuentes** funciona como un workspace de entrada y revisión:

- La **Entrada universal** acepta `.txt`, `.csv`, `.xlsx` y respaldos BOM `.json`.
- Puede recibir varios archivos mezclados en una sola selección o por drag & drop.
- Primero intenta reconocer la fuente por nombre; si el nombre no ayuda, inspecciona encabezados/columnas.
- XLSX se inspecciona una sola vez para identificar el tipo antes de pasar al parser normal.
- Cada archivo reconocido se carga usando el mismo validador de columnas que la carga individual.
- Si el bot 4Wall está corriendo, solo se bloquea un archivo detectado como **escaneo 4Wall manual**; QAD, Áreas, ISPBB, Cost y BOM pueden seguir cargándose.
- QAD, Áreas, ISPBB, Cost y 4Wall manual son fuentes de **sesión**: pueden reemplazarse o quitarse sin escribir esos archivos a Supabase.
- BOM mantiene el comportamiento especial existente: biblioteca incremental local + respaldo compartido en Supabase cuando la conexión/permisos están disponibles.
- El borrado BOM sigue siendo controlado: se confirma el archivo exacto y se usa su fingerprint/revisión para evitar borrar una versión equivocada.
- **BOM Focus** filtra por coincidencia exacta de `Parent Item`, muestra cuántas filas y archivos contienen ese PN y abre el visor/descarga solo con esa selección.
- La UI de Fuentes usa filas compactas en lugar de cards grandes. La carga masiva enseña solo los primeros **3 resultados** y ofrece **Ver más / Ver menos** cuando se seleccionan muchos archivos.
- No volver a renderizar todos los archivos cargados al inicio del drawer: la prioridad es que el estado de cada fuente sea visible en pocos segundos y que las listas extensas sean expandibles.

El catálogo de tipos y columnas vive en `src/domain/sourceCatalog.js`; la detección universal vive en `src/services/sourceDetection.js`. No duplicar esquemas de columnas dentro de la UI.

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

Las preguntas vigentes no se muestran en la interfaz. Se documentan en este README para revisarlas fuera del flujo operativo del dashboard. Se confirmaron USD, actualización por reemplazo de escaneos, Top 10 y selección BOM nivel .2 / componente NO. No volver a presentar esas decisiones como pendientes.

## Bot 4Wall

El frontend usa `VITE_BOT_CONTROL_URL` para hablar con el controlador. GitHub Pages no puede ejecutar Python: `bot_control_server.py` y `bot_extractor.py` deben correr en el equipo/servidor autorizado que tenga acceso a 4Wall. El controlador usa `BOT_CONTROL_PASSWORD` y `BOT_CONTROL_ORIGIN`; ninguna contraseña debe vivir en una variable `VITE_*`.

`bot_extractor.py` usa Playwright para entrar al 4Wall interno, exportar el reporte, limpiar cantidades inválidas y publicar un corte mediante el RPC de Supabase.

`bot_control_server.py` controla el arranque del extractor localmente:

- evita arranques concurrentes;
- valida que exista el extractor;
- diferencia solicitud aceptada de snapshot publicado;
- expone estado y último resultado sin devolver credenciales;\n- permite detener de forma controlada el proceso antes de usar escaneos manuales;
- usa contraseña desde `BOT_CONTROL_PASSWORD`;
- por defecto solo escucha en loopback.

No guardar usuarios, contraseñas ni `service_role` dentro del frontend o del repositorio. `WALL_USER`, `WALL_PASS`, `SUPABASE_SERVICE_KEY` y `BOT_CONTROL_PASSWORD` pertenecen únicamente al entorno del bot/servidor. Si una credencial apareció alguna vez en Git, quitarla del archivo actual no la revoca: debe rotarse.

Antes de producción, un administrador de Supabase debe verificar que `anon` y `authenticated` no puedan ejecutar `reemplazar_escaneos`, que RLS esté habilitado y que la escritura del snapshot quede reservada al rol del bot/servidor.

## Metadatos de snapshot

Un snapshot es una copia de los escaneos de un momento concreto. Permite comparar ese conteo con el QAD congelado; la última consulta de la app no demuestra cuándo se extrajo el reporte original.

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

El build ejecuta primero verificaciones de higiene del repo, módulos `src/` huérfanos, Finanzas, discrepancias, seguridad de UI, IndexedDB, XLSX, imports, reglas de junta y migraciones Supabase; después compila Vite.

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

La interfaz conserva una estética líquida Visteon, pero las superficies de lectura son deliberadamente más opacas y evitan blur costoso en el hot path. Los reflejos/gradientes son estáticos; el rendimiento y la legibilidad financiera tienen prioridad.

El menú hamburguesa contiene una sección **LAB** con el Trazador de pieza y **Ver animación**. Ver animación oculta temporalmente todo el dashboard y deja únicamente el ambiente Pac-Man, con salida por `×` o `Esc`; no altera la preferencia persistente de Pac-Man.

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
- Las preguntas pendientes se mantienen en este README, no mezcladas con alertas operativas. Cualquier cambio de alcance, reporte QAD, versión BOM, costo o almacenamiento compartido debe documentarse aquí antes de cambiar lógica.
- No se inventa el cierre de un área. Una localidad QAD puede agrupar varias áreas 4Wall. El filtro actual sigue en Site 179A y tipos PP/MP/FP hasta recibir los códigos que correspondan al alcance acordado.
- La contraseña se indicó con cambio cada 90 días; debe actualizarse en la configuración local del bot cuando corresponda, nunca en el repositorio. Falta confirmar qué cuenta aplica; no se programó cambio automático.

### Verificación y publicación

`npm.cmd install` y `npm.cmd run build` en Windows. Las pruebas incluyen casos sintéticos de la nueva regla, niveles ignorados, cantidades fraccionarias, conservación de QAD y acumulación/conflictos BOM.

Esta actualización se sube a **main solamente**. No ejecutar el despliegue manual de Pages hasta que se solicite. El workflow de verificación de main puede ejecutarse sin publicar Pages.


## Actualización 30/09/2026: archivos, respaldo y visor

- Se aceptan CSV, TXT delimitado y XLSX en todas las fuentes. Excel se lee directamente en memoria; no se vuelve a convertir y leer para calcular. Para repetir cargas, usar CSV (evita abrir/descomprimir un libro). TXT delimitado tiene un costo de lectura parecido; la extensión por sí sola no garantiza velocidad.
- Se busca una hoja con las columnas de la fuente entre sus primeras 50 filas. Si dos hojas coinciden, se pide separar la hoja correcta. Se conservan ceros formateados en identificadores y precisión numérica en costos. Excel no ejecuta fórmulas en esta app: necesita sus valores guardados.
- Excel se descomprime y convierte a CSV una sola vez al cargarlo. La app conserva sus filas y descarta el libro y el texto CSV temporales. Los BOM registrados se descargan como Excel (.xlsx).
- Los escaneos manuales se muestran en el visor y en el Excel exportado, con cantidad, parte, área y columnas adicionales. Reemplazan el reporte completo; no se suman al del bot.
- El visor tiene fondo opaco; Para la junta separa los dos top 10 y muestra la suma de **cada lista**, no la del inventario completo. Phantom Radar y Obsoletos + conservan sus reglas y tienen tarjetas más legibles.
- Reportar distingue errores de configuración/permisos, evita envíos simultáneos y conserva el formulario si falla. Sus opciones Tipo/Área tienen fondo y texto oscuros/claros definidos.

### Respaldo BOM sin login (01/10/2026)

La app usa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` para escaneos, BOM y reportes. El proyecto usado por Pages es `uukhwkywmnarcfruerpp` (`visteon-demo`). Las 97 columnas de fuentes y la limpieza de tablas se verificaron allí el 01/10/2026. El respaldo BOM sin login requiere su esquema y permiso de lectura/guardado incremental.

Aplicar las migraciones en orden histórico. Para BOM incremental/borrado, las relevantes son `supabase/migrations/20261001140733_inventory_bom_incremental_no_login.sql`, `supabase/migrations/20261001142606_inventory_source_columns.sql` y `supabase/migrations/20261001144500_inventory_bom_delete_no_login.sql`. No se necesita correo, contraseña ni habilitar usuarios anónimos en Auth. El cliente consulta el consolidado y agrega padres nuevos mediante `merge_inventory_bom`; el borrado explícito de un archivo usa `remove_inventory_bom`, exige la revisión actual y la huella SHA-256 exacta, crea una nueva revisión de respaldo y elimina las filas con la procedencia de ese archivo. Las tablas siguen sin admitir escrituras directas desde el navegador y el historial permanece privado.

El respaldo local se guarda primero en IndexedDB al agregar BOM. Para borrar, el orden se invierte deliberadamente: primero debe confirmarse la eliminación compartida en Supabase y solo entonces se actualiza IndexedDB. Si el RPC de borrado no está instalado, la X muestra un error y conserva tanto la copia local como la compartida. Al abrir la app, recuperar conexión o cada dos minutos, la colección se compara contra Supabase. Repetir un archivo no crea filas ni revisiones; una definición distinta para un padre existente sigue tratándose como conflicto. Este flujo sin login permite a quien tenga la configuración pública consultar/agregar y, una vez habilitado el RPC de borrado, eliminar un BOM con su fingerprint; por eso debe usarse solo en el entorno controlado previsto para este PoC.

REPORTAR usa `development_feedback` con permiso de inserción y sin lectura desde el navegador. Para verificarlo en el proyecto correcto, enviar un reporte de prueba y comprobarlo desde el panel administrativo. Una configuración de otro proyecto no valida la instalación local.

### Organización de UI para agentes

- `App.jsx`: orquesta estado y conecta dominios; evitar meter polling, gestos o contenido estático aquí.
- `components/help/helpContent.js`: textos y explicaciones; `HelpDrawer.jsx` solo renderiza el drawer compacto de ayuda.
- `components/dashboard/dataInspectionSupport.js`: arma vistas, columnas y exportación; `DataInspectionPanel.jsx` maneja interacción.
- `components/dashboard/inventoryWorkspaceSupport.js`: filtros y formatos; `InventoryRadar.jsx`: radar; `InventoryWorkspace.jsx`: búsqueda, virtualización y tabla.
- `components/shell/sources/sourceConfig.js`: catálogo visual de Fuentes; `SourceRow.jsx`: una fila; `SourcesDrawer.jsx`: carga masiva, BOM Focus y coordinación.
- Los motores de `src/domain/` se mantienen cohesionados a propósito: no separarlos solo por tamaño. Cambiar fórmulas exige revisar verificadores financieros.

### Rendimiento y librerías UI

- `motion` / `motion/react`: solo microinteracciones pequeñas; no reemplaza la física del scroll.
- React Bits: se toman patrones/componentes puntuales y se guardan localmente en `src/components/ui/`; no se instala una librería monolítica.
- `@tanstack/react-virtual`: virtualiza la tabla de conciliación para no montar miles de filas simultáneamente. En React 19 se usa `useFlushSync: false`.
- `src/components/visual/ScrollEffects.jsx`: mantiene scroll nativo en el centro y aplica rubber band únicamente en los extremos. No crear una segunda implementación paralela del efecto.
- `src/styles/app.css` es únicamente el entrypoint de estilos. Las reglas viven en `src/styles/modules/` con nombres por responsabilidad. Mantener el orden de imports de `app.css` porque conserva la cascada actual; no meter reglas de features directamente en el entrypoint.
- Mapa rápido CSS: dashboard/base → `foundation-dashboard.css`; drawers/ayuda → `overlays-drawers.css`; visores/tablas/notificaciones → `data-review.css`; scroll/rubber/Pac-Man → `interaction-motion.css`; navbar/footer → `navigation-footer.css`; Fuentes → `sources-drawer.css`.

### Instalación en redes corporativas

SheetJS 0.20.3 está fijado como `file:vendor/xlsx-0.20.3.tgz`, copia del paquete oficial. `npm ci` no contacta `cdn.sheetjs.com`, conserva la versión actual y mantiene la validación TLS. Ver `vendor/README.md` para origen y hash. El resto de paquetes se instala desde sus orígenes del lockfile.

### Validación de este cambio

`npm.cmd run build` también prueba importación XLSX, ceros iniciales, precisión, hojas ambiguas, escaneos manuales y conflictos entre colecciones. Las migraciones se ejecutan en Postgres local mediante PGlite para verificar permisos, reportes de solo inserción, historial y rechazo de versiones viejas. Eso no sustituye la prueba de conexión en el proyecto real.

Después de bajar main: `npm.cmd install` y `npm.cmd run dev`. GitHub Pages sigue siendo publicación manual; este cambio no lo despliega.


## Preguntas de lógica para próxima revisión

Estas preguntas se mantienen fuera del dashboard para no mezclarlas con alertas operativas:

- Definir el agrupamiento final de localidades para reportes ejecutivos (externos, docks, holds, 800 y cualquier grupo especial).
- Definir cómo presentar durante el día los Part Numbers de QAD que todavía no han sido escaneados, sin tratarlos prematuramente como pérdida confirmada.
- Mantener documentado cualquier cambio futuro de filtros QAD (Site / Item Type) antes de modificar la lógica.
- Cuando cambie una regla financiera o BOM, registrar aquí la decisión, la fecha y el responsable antes de desplegarla.


## Higiene del repositorio

Este README es la conciencia técnica; no crear `PROJECT_CONTEXT.md`, `SECURITY_REVIEW.md`, `BOT_CONTROL_SETUP.md` u otros documentos paralelos con reglas duplicadas. `.agents/` es el modelo operativo de coordinación solicitado: las decisiones de inventario siguen documentándose aquí.

El build ejecuta:

- `npm run lint` para detectar imports, variables, claves duplicadas y errores estáticos reales. Las reglas específicas de React Compiler están desactivadas porque este PoC no usa ese compilador.
- `scripts/verify-repo-clean.mjs` para bloquear backups/artefactos legacy conocidos.
- `scripts/verify-unused.mjs` para exigir que todo módulo JavaScript/JSX dentro de `src/` sea alcanzable desde `src/main.jsx`.
- `scripts/verify-runtime-deps.mjs` para evitar dependencias declaradas que nunca se importan desde el runtime.
- `scripts/audit-css-usage.mjs` para hacer fallar el build si aparece CSS `vi-*` huérfano; las únicas excepciones son clases dinámicas documentadas explícitamente.

No versionar `node_modules/`, `dist/`, `.env.local`, `inventario.db`, descargas temporales de 4Wall ni `bot_snapshot_status.json`. `dist/` es generado por Vite y se puede borrar localmente en cualquier momento.

Sí conservar aunque no aparezcan directamente en la UI: migraciones históricas, verificadores de CI, scripts del bot, `supabase/source-column-map.json`, el vendor de SheetJS y archivos claramente ligados al roadmap vigente.

### Trazador de aprendizaje y Bot — 05/10/2026

- **Trazador**: diez pasos desde escaneo hasta clasificación, con busca/dato/motivo/resultado/siguiente paso, resumen, reglas expandibles y conclusión sin IA externa. `src/domain/partLearningTrace.js` construye el caso solo para el PN seleccionado usando parsers, trace, flags y hallazgos. React no recalcula finanzas ni Phantom; `reconcileInventory` entrega SWING USD por localidad. Costo visual a dos decimales; fórmulas con precisión original.
- **Ver en fuente** reutiliza `SourcePreviewModal` + `sourceEvidence.js`: archivo/hoja/fila, columnas usadas, valor original → normalizado y motivo de cada celda. Incluye padres que aportan BOM y filas BOM excluidas. Búsqueda, filtro de evidencia/hoja, páginas de 60 filas y exportación CSV/XLSX/TXT conservada; evidencia pesada solo al abrirla.
- El lector conserva coordenadas XLSX con títulos/vacíos y líneas CSV/TXT multilínea. Parsers guardan índices aceptados. BOM guarda coordenadas en `files.rowOrigins`, fuera de las filas del contrato compartido; sin cambios de esquema/RPC. Fuentes antiguas o nombres BOM ambiguos muestran **Registro de colección**, sin inventar fila/hoja. Reimportar BOM ya registrado no rellena coordenadas antiguas.
- **Datos incompletos**: el PN puede estudiarse con fuentes faltantes, señalando resultados provisionales. Sin costo: **Sin valorar**; BOM faltante y sin filas elegibles se distinguen. QAD Phantom conserva saldo. SWING no se divide entre dos; BOM usa Usage, Level .2 / 0.2 y Comp Phantom NO, sin recursión.
- **Bot**: estado confirmado y última consulta/publicación primero; acciones y scanner conservados, errores visibles y timeout. Requiere `VITE_BOT_CONTROL_URL` y controlador accesible; el frontend no ejecuta Python. Tipografía y controles adaptados a iPad. Esc cierra solo el visor superior. `ScrollEffects`, física Motion, Pac-Man, navbar y footer intactos; solo el CSS del trazador se trasladó de `interaction-motion.css` a `data-review.css`.
- `verify-tracer.mjs` entra al build/CI: finanzas, BOM directo/derivado, filtros, faltantes, coordenadas y compatibilidad. Revisión local con datos sintéticos a 1366, 1024, 768 y 390 px. Pages sigue manual.

### Origen del PN, hojas visuales y borde inferior — 05/10/2026

- La lista inicial del trazador conserva el orden del motor por NET absoluto y explica su universo: 4Wall aceptado, QAD aceptado o componente generado por BOM. Cost Part/ISPBB solos no agregan candidatos. `getPartEntryOrigins` lee mapas aceptados (incluidos saldos cero); el drawer identifica archivos/snapshot activos y, para cada PN, los caminos de entrada y la fuente de descripción. Cost Part tiene precedencia incluso con descripción vacía.
- Seleccionar/reabrir el caso lleva el drawer al inicio, con resumen enfocado sin salto y encabezado/cierre accesibles. Los pasos muestran hasta tres filas originales por fuente mediante `buildEvidenceExcerpt`, con acceso directo por índice, sin recorrer el archivo completo. `SourceEvidenceSheet` es el renderer compartido con el visor paginado; celdas muestran original → normalizado y motivo. Son datos reales, no capturas inventadas. Sin archivo/fila/coordenada se informa la ausencia.
- `ScrollEffects` consulta el rango nativo actual al evaluar bordes/handoff y usar el rail. El encabezado replegable está fuera del contenido observado: su cambio de altura podía dejar el fondo cacheado por encima del real después de F5. La corrección comparte camino arriba/abajo y conserva spring, amplitudes, momentum y release; sin listeners globales nuevos ni cambios a navbar/footer/Pac-Man.
- Verificación local: selección/reapertura, origen BOM sin escaneo, costos/fuentes faltantes, tablas, paginación y Esc en 1366/1024/768/390 px; regresión de altura cambiante con rueda/touch y retorno al reposo. Safari en iPad físico requiere comprobación en dispositivo.

### Casos recomendados, resumen con fuentes y guía del motor — 05/10/2026

- El trazador conserva buscador y propone PN reales con situaciones distintas (NET, SWING, Phantom, BOM, conteo pendiente, costo y balance). `getRecommendedPartCases` lee resultados ya calculados; selección única y acotada. La lista completa/origen abre el visor común bajo demanda y se identifica como **resultado generado**, no archivo original; los archivos BOM exactos se indican solo si la aportación los conserva.
- Cada uno de los nueve campos del resumen abre explicación, regla y archivos; NET/SWING incluyen sustitución real, costo original y desglose. Distingue **4Wall manual / automático del bot** y **QAD 3.2 congelado**. Phantom desconocido, obsolescencia sin registro y falta de definición requieren revisión; un `Missing BOM = No` no valida un BOM si Phantom sigue desconocido. Advertencias y plan de revisión salen del dominio; no ejecutan ajustes ni confirman movimientos/pérdidas.
- Los pasos son botones que desplazan/enfocan únicamente el drawer; no cambian hash ni historial (los enlaces de fragmento podían cerrar el overlay). Origen con filas compactas y entrada Motion breve, respetando Quitar animaciones. Snapshot se explica como copia de los escaneos de un momento concreto. Campos internos `raw_record`/`source_columns` no se exponen en el visor; PN sin fila aceptada permite buscar coincidencias originales sin marcarlas como utilizadas.
- **LAB → Cómo funciona el motor** es una guía independiente con seis etapas RAW→PARSERS→NORMALIZED→DOMAIN ENGINE→RECONCILIATION→UI, fuentes activas consultables y tres ejemplos explícitamente didácticos. `engineGuide.js` usa el motor de producción y las mismas fórmulas descriptivas del trazador; React presenta los resultados. Caso de localidades: 20 físico / 20 QAD en ubicaciones distintas da NET $0 y SWING $168 con costo $4.20, sin dividir entre dos. No se mezclan ejemplos con inventario real.
- Build/CI verifica candidatos, resumen/advertencias/acciones, precisión, metadatos ocultos, faltantes y ejemplos NET/SWING/Phantom. Pruebas de navegador a 1366/1024/768/390 px: diez pasos sin salir al dashboard, fuentes paginadas, guía desde LAB, Esc y transición al trazador. Sin nuevas dependencias ni cambios a scroll, Pac-Man, navbar, footer o ejecución del bot. Pages sigue manual.

## Organización virtual de ingeniería

El modelo operativo está en [`.agents/README.md`](.agents/README.md): guía humana, reglas para agentes, orquestador Engineering Manager/Product Owner, especialistas, ownership del dominio/código, derechos de decisión, contratos versionados, matriz de interacción, escalaciones y gates de entrega. Incluye plantilla de trabajo y un caso ilustrativo del trazador con evidencia; no son resultados ejecutados.

El orquestador se llama **Myke** y conserva el identificador `ORCH`. Puede adaptar puestos temporales al trabajo, manteniendo responsables y revisiones; los cambios permanentes siguen los derechos de decisión del modelo. La mascota web muestra esa organización y ofrece ayuda local sobre el reconciliador; no ejecuta tareas de ingeniería desde el dashboard.

Puede usarse con un ejecutor, varios agentes cuando la sesión lo permita, o coordinación humana. Cada revisión declara su independencia y el SHA/árbol verificado. La autoridad humana ya concedida se conserva; cambiar reglas financieras, operar datos compartidos o desplegar requiere la autoridad correspondiente. La documentación no instala un scheduler, validación automática de mensajes, autenticación empresarial ni agentes desatendidos. Los controles automáticos actuales siguen siendo `npm run build` y Verify main; Pages continúa manual.

### Myke, legibilidad y superficies — 05/10/2026

- **Reportar** está siempre accesible, incluido el footer, otros drawers y LAB de animación. Usa el overlay compartido para Escape/foco/scroll y conserva borrador, captura y envío existentes. Nuevas áreas: Trazador, visor Excel/evidencia, guía del motor/LAB, Myke, ayuda, exportación, rendimiento, scroll, menús/vidrio y footer.
- Tipografía ampliada en toda la aplicación; formularios de reporte a 16 px, controles táctiles y menús con mayor espaciado. Vidrio más denso: superficies oscuras con mayor opacidad y un blur moderado solo en el panel; encabezados/capas internas conservan lectura sin sumar filtros.
- **Vidrio ligero** en RENDIMIENTO quita blur/sombras y usa superficies sólidas. Es independiente de **Quitar animaciones** y Pac-Man, y se guarda localmente. No se cambia física Motion, scroll nativo, implementación de `ScrollEffects` ni animación Pac-Man.
- **Myke** es un fantasma vectorial con movimiento CSS pequeño, sin loop JS adicional. Chat local consultable, equipo leído de `.agents/ROLES.md` y preguntas frecuentes extraídas del README; no hay API, IA externa ni reparto real de tareas desde la página. Respeta Quitar animaciones y `prefers-reduced-motion`.
- Se reutilizan React/Motion/TanStack instalados; no se agregan librerías. Fuentes, Bot, trazador, guía y Myke se cargan al primer uso y conservan estado al cerrar; el visor de inspección se carga al abrirlo y mantiene su ciclo de cierre anterior; polling del inventario/estado del bot y notificaciones siguen activos. XLSX y evidencia mantienen carga/paginación existentes. Los cambios se verifican con fixtures/mocks; no sustituyen pruebas en Safari/iPad físico ni ejecución corporativa real de 4Wall.

- Verificación de esta actualización: navegación responsive en Chromium a 1366/1024/768/390 px, Reportar/borrador/overlays anidados, equipo/documentación de Myke, preferencias independientes y recarga/scroll rápido; 350 PN sintéticos a 1366/390 px verifican virtualización, NET/SWING, diez pasos, visor y búsqueda retenida. Safari/iPad físico y conexión IA siguen fuera de estas pruebas.

## Preguntas frecuentes de Myke

Estas respuestas son la ayuda humana que consume el chat local. Los identificadores y palabras de búsqueda enlazan preguntas con respuestas; no sustituyen el motor ni calculan inventarios. Las referencias de datos abren el visor común de archivos disponibles, nunca un enlace al código. Si falta una fuente se indica cómo cargarla. Las respuestas generales explican reglas; una consulta PN consume `buildPartLearningTrace` y aporta las referencias usadas por el motor. No se toman cifras escritas en el chat como resultados.

### ¿Qué puedo hacer?
<!-- myke: capabilities | capacidades ayudar ayuda puedo hacer opciones servicios preguntas | -->
Puedo explicarte cómo funciona el reconciliador, de dónde vienen los datos, qué significan NET y SWING, cómo trabaja Phantom y qué revisar ante una advertencia. Elige una pregunta sugerida o escribe la tuya.

También puedes escribir un número de parte, por ejemplo «PN: TU-NUMERO», o pegar uno que esté cargado. Verás físico, QAD, costo, NET, SWING, etiquetas, advertencias y un plan de revisión del corte actual. Toca una cifra para ver su explicación y abrir las filas reales en el visor tipo Excel; el trazador conserva el recorrido completo.

En Explorar puedes abrir el motor por dentro, seguir una pieza, revisar archivos y ver advertencias. Soy ayuda local: no ejecuto ajustes, no modifico el inventario ni tengo IA externa conectada. Si no encuentro un PN o falta una fuente, te lo digo.

### ¿Cómo funciona el reconciliador y su código?
<!-- myke: engine | motor arquitectura codigo reconciliador funciona react parser normalizado | scans qad ispbb bom cost areas -->
El reconciliador compara lo contado con lo que QAD esperaba encontrar. Primero lee los archivos, ordena sus campos y confirma dónde está cada pieza. Después reconoce el físico, aplica las reglas Phantom y compara cantidades y costos.

El recorrido del código es: archivos originales → lectores de archivos → datos ordenados → motor de reglas → conciliación → pantalla. React presenta los resultados: las fórmulas y reglas viven en el motor, para poder probarlas sin abrir la interfaz.

Abre el recorrido visual para ver cada etapa; abre el trazador para seguir una pieza real y sus filas de origen.

### ¿De dónde salen los números de parte de la lista?
<!-- myke: parts | pn numero parte numeros partes lista recomendado buscador trazador seleccion | scans qad bom -->
La lista reúne los PN del físico, del QAD aceptado y de componentes que recibieron un ajuste BOM. Un PN que solo aparece en Cost Part o ISPBB no entra por eso a la lista.

Los casos recomendados muestran situaciones distintas: diferencia total, diferencia por localidad, Phantom pendiente, componente BOM, conteo pendiente y costo por revisar. Son piezas del corte actual, no ejemplos inventados ni una lista exclusiva de pérdidas.

En el trazador, «Ver fuente de los PN» abre sus registros. Selecciona un PN para conocer qué filas participaron en su resultado.

### ¿De dónde viene el físico: archivo manual o bot 4Wall?
<!-- myke: physical | fisico physical conteo cantidad escaneo escaneos manual automatico 4wall bot origen | scans areas -->
4Wall aporta PN, cantidad y área de escaneo. La app indica si proviene de un archivo manual cargado o de la copia publicada por el bot. Un archivo manual sustituye por completo al físico automático; no se mezclan los dos.

El área pasa por el catálogo de Áreas para obtener la localidad QAD. El físico reconocido puede incluir componentes obtenidos de un padre Phantom mediante BOM; por eso no siempre coincide con la cantidad escaneada directamente del PN.

No se inventan auditor, ticket ni hora si el archivo o la copia del bot no los contiene.

### ¿Qué es un snapshot o corte?
<!-- myke: snapshot | snapshot corte congelado copia fecha actualizacion antiguedad publicado completo parcial | scans qad -->
Es una copia de los escaneos de un momento concreto. Sirve para comparar ese conteo con el inventario congelado de QAD, como guardar una foto de los datos, no una captura de pantalla.

La hora de la última consulta de la app no prueba cuándo se extrajo 4Wall. Si falta esa fecha o un identificador real, la antigüedad del reporte no está confirmada.

Si los datos cambian mientras se leen las páginas, el corte queda incompleto. Espera una lectura estable antes de sacar conclusiones.

### ¿Qué representa QAD y qué filas se aceptan?
<!-- myke: qad | qad congelado esperado saldo localidad planta site 179a pp mp fp filtro | qad -->
QAD 3.2 es el inventario congelado: la cantidad esperada por PN y localidad. El motor acepta Site 179A y los tipos PP, MP y FP; una coincidencia de PN en una fila fuera del filtro no significa que participó en el cálculo.

Un saldo cero aceptado y un PN ausente del QAD filtrado son situaciones distintas. El trazador muestra esa diferencia y permite revisar la fila original.

### ¿Cómo sale NET y qué significa su signo?
<!-- myke: net | net diferencia total negativo positivo perdida ganancia unidades dolares usd | scans qad cost -->
NET piezas = Físico reconocido total − QAD total.

NET USD = NET piezas × costo unitario de Cost Part. Se conserva el signo: negativo indica menos físico; positivo indica más físico. Durante un conteo en curso, no confirma por sí solo una pérdida o ganancia definitiva.

El desglose con los valores reales del PN está en el trazador. Sin costo confiable no se presenta un valor de cero dólares como válido.

### ¿Qué es SWING y por qué no se divide entre dos?
<!-- myke: swing | swing divide dividir dos 2 mitad absoluto ubicacion localidades diferencia traslado | scans qad cost areas -->
SWING piezas = suma de ABS(Físico de cada localidad − QAD de esa localidad). SWING USD = SWING piezas × costo unitario.

No se divide entre dos porque la regla vigente mide cada diferencia por localidad. Si sobra en una y falta en otra, ambas diferencias participan. Esto ayuda a investigar ubicación, pero no demuestra que hubo un traslado.

NET mide la diferencia total; SWING mide el desajuste por localidad. No sumes NET y SWING como dos pérdidas distintas. El alcance final de localidades para SWING sigue pendiente de confirmación con el departamento.

### ¿Cómo se decide Phantom y cómo participa BOM?
<!-- myke: phantom | phantom ispbb bom usage parent component componente padre nivel level prefijo recursivo explosion | ispbb bom scans -->
ISPBB decide Phantom con YES o NO; el prefijo del PN no lo decide. Si falta una respuesta aceptada, Phantom queda por confirmar.

Para un padre Phantom YES escaneado, BOM usa Usage positivo, Level .2 / 0.2 y Comp Phantom = NO. La regla actual no es recursiva: obtiene los componentes de ese nivel y hereda la localidad del padre.

El padre conserva su escaneo visible, pero no añade físico directo reconocido; los componentes reciben el ajuste. Encontrar un PN en BOM por sí solo no crea dinero ni físico adicional. El QAD del padre se conserva y puede generar una alerta.

### ¿De dónde sale el costo y por qué puede faltar?
<!-- myke: cost | costo cost part total precio valor precision invalido faltante conflicto cero redondeo | cost -->
Cost Part Browse aporta Cost Total y Status. El motor mantiene la precisión original del costo para calcular y muestra los dólares con dos decimales.

Un costo ausente, inválido o en conflicto requiere revisión; no se convierte silenciosamente en cero. Un costo realmente igual a cero sí puede ser válido.

### ¿Qué significa obsoleto?
<!-- myke: obsolete | obsoleto obsolete status estado sobrante | cost -->
Se toma de Status = OBSOLETE en Cost Part. Un sobrante obsoleto se puede aislar para revisión, pero sigue formando parte del NET del PN; no es otra ganancia que debas sumar aparte.

### ¿Qué significan Unexpected, Missing BOM y sin físico registrado?
<!-- myke: alerts | advertencia alerta unexpected inesperado missing bom faltante sin fisico registrado clasificacion | scans qad ispbb bom cost -->
Material inesperado: hay físico y QAD es cero. Revisa si el PN tenía saldo cero aceptado o si estaba ausente del QAD filtrado.

Sin físico registrado: QAD es mayor que cero y todavía no hay físico reconocido. Durante el conteo puede faltar capturar; no se trata automáticamente como pérdida confirmada.

Missing BOM indica que se requiere BOM para reconocer componentes y no existe evidencia utilizable según las reglas actuales. Revisa el padre, Usage, nivel y Comp Phantom antes de concluir.

### ¿Qué reviso y qué acciones puedo tomar ante una diferencia?
<!-- myke: action | accion acciones plan solucion resolver investigar revisar diferencia problema discrepancia | scans qad areas ispbb bom cost -->
Primero confirma que el corte esté completo y que los archivos correspondan al mismo inventario. Verifica PN, cantidades, Site, tipo y localidad en sus fuentes.

Si hay diferencias por localidad, revisa área y mapeo; no registres un traslado solo por ver SWING. Si hay Phantom o Missing BOM, revisa ISPBB y la relación padre/componente. Si falta costo, confirma Cost Part antes de valorar.

Completa el conteo pendiente y documenta las filas que sustentan el hallazgo. El trazador propone revisiones según las alertas de la pieza; esta ayuda no modifica inventario ni confirma ajustes contables.

### ¿Cómo veo los archivos como Excel y la evidencia?
<!-- myke: preview | fuente fuentes excel visor fila filas celda celdas columna columnas evidencia archivo sheet hoja original normalizado | scans qad ispbb bom cost areas -->
«Ver en fuente» abre el archivo disponible dentro de la app, con hojas, encabezados, filtros y páginas de hasta 60 filas. No te manda al código.

Desde un paso del trazador se marcan las filas y columnas utilizadas, con valor original, valor ordenado y regla aplicada. Desde estas preguntas se abre la fuente general: no se marca una fila como usada sin seleccionar un PN y su paso.

Si falta el archivo o no hay una coordenada real, se indica; no se inventa una fila de Excel ni una captura. La copia del bot puede mostrarse como tabla de datos aunque no exista un XLSX original disponible.

### ¿Cómo cargo o reemplazo fuentes y BOM?
<!-- myke: upload | cargar carga importar reemplazar quitar archivo csv xlsx txt json respaldo biblioteca fuentes | scans qad ispbb bom cost areas -->
En Fuentes puedes cargar varios archivos TXT, CSV, XLSX y respaldos BOM JSON. La app reconoce el tipo y valida las columnas necesarias.

QAD, Áreas, ISPBB, Cost y escaneos manuales son fuentes de sesión. BOM tiene una biblioteca incremental local y un respaldo compartido cuando la conexión y permisos están disponibles. Para borrar BOM se confirma el archivo exacto y su versión.

Mientras el bot esté corriendo, detén el extractor antes de cargar escaneos manuales. Las otras referencias se pueden cargar sin mezclar físico manual y automático.

### ¿Qué hace el bot y por qué puede no arrancar?
<!-- myke: bot | bot extractor arrancar iniciar detener corriendo error conexion controlador automatico 4wall | scans -->
El bot entra a 4Wall, exporta el reporte y publica una copia de los escaneos. La página controla el proceso mediante un servidor autorizado; GitHub Pages no ejecuta el extractor por sí solo.

Una solicitud de arranque aceptada no prueba que ya se publicó un corte. Revisa el estado, el último resultado y la disponibilidad del controlador. No escribas contraseñas ni claves en este chat.

### ¿Cómo funcionan historial y comparación de cortes?
<!-- myke: history | historial anterior comparar comparacion inventario guardar dispositivo navegador indexeddb version | scans qad -->
El historial local se guarda en este navegador; no sincroniza automáticamente con otra computadora. Para comparar cortes completos se revisan metadatos y versión de cálculo compatibles.

Cambiar referencias o alcance puede volver injusta una comparación. Confirma la identidad y las fuentes de ambos cortes antes de interpretar el cambio.

### ¿Cómo se cuida rendimiento, scroll y animaciones?
<!-- myke: performance | rendimiento lento fluido optimizacion scroll congelado ipad animaciones vidrio pacman rubber band | -->
Las tablas grandes muestran solo las filas necesarias y el visor usa páginas. Los paneles pesados se cargan al abrirlos. El centro de la página conserva scroll nativo; el efecto elástico se aplica en los bordes.

«Vidrio ligero» reduce blur y sombras. «Quitar animaciones» pausa movimiento decorativo; es independiente del vidrio. Puedes ocultar a Myke sin perder su chat desde el menú.

### ¿Quién está en el equipo de Myke?
<!-- myke: team | myke equipo agente agentes empleados especialista puestos organizador tareas empleado | -->
Myke organiza alcance, responsables y revisiones. El equipo tiene once puestos senior: motor y finanzas, archivos y evidencia, integración de datos, automatización, UX, interfaces UI, calidad, auditoría de inventario, base de datos, rendimiento y seguridad. Myke coordina producto y entrega.

Mi equipo cubre esas áreas del proyecto. Este chat consulta ayuda local; los cambios de código se realizan dentro del trabajo autorizado. Puede adaptar puestos en el modelo operativo, conservando responsables y los permisos de decisión correspondientes.

### ¿Cómo se verifica y publica el código?
<!-- myke: delivery | prueba pruebas test lint build ci github actions publicar despliegue deploy version import css modulo | -->
El build verifica lint, higiene de archivos, imports, módulos y CSS usados, reglas financieras, discrepancias, trazador, exportación y otras comprobaciones del proyecto antes de compilar.

Verify main ejecuta esos controles en GitHub Actions. La publicación de GitHub Pages sigue siendo manual. Cambiar una regla financiera necesita la decisión autorizada y actualizar la documentación antes de integrarla.

### Myke naranja, chat y preguntas frecuentes — 05/10/2026

- Fantasma naranja con poses vectoriales (reposo, saludo, lectura, escritura y arrastre), seguimiento de texto y acople al borde más cercano. Posición y visibilidad se conservan localmente; teclado permite moverlo con flechas. Sin listeners globales de scroll, nuevas dependencias ni cambios a la física.
- Chat local funcional: búsqueda de estas respuestas, varios temas y continuidad breve; reconoce preguntas sobre piezas concretas y remite a su evidencia en el trazador. No interpreta cifras escritas por el usuario como datos reales. Respuestas sin respaldo indican el límite; no se conecta IA externa ni se ejecutan tareas.
- Menú hamburguesa: activar/desactivar mascota, abrir chat y preguntas frecuentes aun con la mascota oculta. Equipo muestra los siete especialistas reales y sus responsabilidades. Los visores usan los archivos actuales y paginación compartida; sin archivo se ofrece cargar fuentes.

### Myke asomado y conversación compacta — 05/10/2026

- Se revisó e integró el commit `c62f9c6` antes de continuar. El fantasma se asoma desde el borde sin recuadro, tiene rostro más amable y mayor tamaño; se revela al tocar/enfocar y acompaña el arrastre. Su X oculta la mascota y conserva el acceso desde hamburguesa.
- Tocar la mascota abre el chat pequeño; hamburguesa abre el panel completo con Chat, Preguntas frecuentes y Equipo. FAQ usa diálogo y archivos reales del visor compartido. Equipo muestra siete puestos y sus funciones, sin IDs internos; los textos siguen viniendo de `.agents/ROLES.md`.
- Se consolidó la ayuda en estas preguntas del README y la búsqueda en `mykeKnowledge`; se conserva identificación de PN y se abre el trazador por props, sin inyectar eventos ni temporizadores en sus inputs. Las cifras siguen perteneciendo al motor. Se elimina el puente de eventos que quedó sin consumidores al usar los visores comunes.
- IA externa sigue pendiente de la siguiente etapa; el chat actual ofrece respuestas documentadas y declara cuando no encuentra respaldo. No ejecuta tareas ni escribe inventario.

- Verificación: chat/documentación y casos de falta de respuesta probados sin React; Chromium a 1366/1024/768/390 px con fixtures locales verifica arrastre, persistencia, X, chat pequeño/completo, siete puestos, fuentes faltantes, visor 60/10 filas, Escape anidado, PN enviado al trazador y retorno de scroll desde el borde inferior tras recarga. El build completo verifica finanzas, imports, CSS/módulos y datos parciales; Safari/iPad físico y bot corporativo quedan pendientes.

### Myke con gorra, consultas de piezas y Explorar — 05/10/2026

- Myke se asoma un poco menos y lleva una gorra Visteon. La X conserva 44 px de área táctil y queda sobre la mascota; ocultarla no quita el chat del menú. Se mantienen arrastre, posición guardada, teclado y preferencias de movimiento. Los gestos táctiles de Myke no disparan el swipe del menú hamburguesa.
- Chat pequeño y completo ofrecen preguntas útiles, incluida «¿Qué puedo hacer?». Todas las preguntas del README están en Chat. **Explorar** sustituye la antigua pestaña de preguntas y abre motor, trazador, fuentes y advertencias.
- Una consulta PN lee resultados reales de `reconciliation` mediante `buildMykePartAnswer` → `buildPartLearningTrace`. No calcula dinero en JSX ni usa cifras del mensaje. Se construye evidencia solo para la pieza consultada; las cifras siguen el corte actual cuando llegan nuevos datos. Fuentes, filas, reglas, advertencias y plan de revisión usan el visor compartido de 60 filas por página. Un PN ausente y un costo desconocido no se convierten en cero.
- `.agents/ROLES.md` incorpora UI, DBA, AUD y PERF y alimenta once retratos de fantasmas de colores sin gorra. Ownership, decisiones, contratos existentes, matriz, escalamiento y flujos delimitan responsabilidades; Myke conserva ORCH. Son puestos del modelo operativo, no empleados conectados ni ejecución autónoma desde el chat. La IA externa continúa sin conectar.

- Verificación de esta actualización: Chromium a 1366/1024/768/390 px con fixtures locales comprueba X y área táctil en los cuatro bordes, arrastre/persistencia, chat pequeño y completo, consulta PN ausente, once retratos, preguntas en Chat, Explorar, fuentes faltantes, filas usadas y paginación 60/10, Escape anidado, trazador y retorno de scroll tras recarga. `verify-myke` prueba resultados del motor, SWING sin dividir, costo cero/ausente/inválido, Phantom desconocido/YES y BOM faltante. Safari/iPad físico e IA externa siguen pendientes.
