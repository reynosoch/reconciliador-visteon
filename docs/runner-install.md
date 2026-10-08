# 4Wall Runner para Windows

Release 1 usa Microsoft Edge instalado y solo HTTPS saliente a Supabase. No abre puertos ni necesita consola, servidor en una laptop personal o inicio automático con Windows.

## Antes del primer uso

La migración `20261008150417_fourwall_runner_control_plane.sql` y las identidades deben estar activadas en **uukhwkywmnarcfruerpp**. Este cambio no puede activarlas desde una conexión que no tenga acceso a ese proyecto.

Un administrador debe revisar `scripts/runner-preflight.sql`, detener el extractor histórico, tomar un respaldo restaurable de la DB y ejecutar la nueva migración en una ventana de mantenimiento. CURRENT se conserva en su tabla existente; su PK histórica sigue compatible, se agrega `record_id` UUID y la cantidad pasa a numeric. Los registros históricos sin identidad se adoptan solo si existe una correspondencia única y segura. Una transición ambigua rechaza el corte; requiere revisión, nunca borrado ciego.

Crear las cuentas humanas y una cuenta Auth **dedicada por runner** mediante Supabase Dashboard → Authentication. No usar una cuenta operator/admin como máquina. No habilitar altas públicas innecesarias. Crear el primer administrador desde el SQL editor, sustituyendo el UUID por el de su usuario Auth:

```sql
insert into public.bot_user_roles(user_id,role) values ('UUID_AUTH_ADMIN'::uuid,'admin');
```

Después, iniciar sesión en el drawer Bot → Administración para asignar operator/viewer por UUID y registrar `runner-cuu-4wall-01` con el UUID de su cuenta técnica. Sus credenciales se entregan fuera del chat y de Git. Para revocar una máquina, desactivar su identidad en Administración y revocar su sesión Auth. Revocar el rol humano tiene efecto inmediato en cada RPC; no se confía en `user_metadata`.

## Descargar e instalar

En GitHub → Actions → **Windows 4Wall runner**, abrir la ejecución verde del commit de main y descargar `4WallRunner-windows-<SHA>`. Extraer **toda** la carpeta; ejecutar `4WallRunner.exe` con doble clic. `BUILD.txt` identifica el código verificado. La distribución onedir incluye el driver Playwright y usa Edge instalado; no requiere descargar otro navegador.

El build incorpora únicamente URL y clave pública recuperadas del Pages existente, validando proyecto y rol anon. Para otra identidad registrada, copiar `runner.config.example.json` como `runner.config.json` junto al exe y completar URL, clave **pública** y `runner_id`. No añadir passwords, cookies, JWT de usuario ni claves privilegiadas. El archivo generado dentro de `_internal` es solo configuración pública.

El ejecutable no está firmado por un certificado corporativo. IT debe revisar/aprobar su ejecución según su política. El workflow prueba el exe y DPAPI; no prueba acceso al 4Wall interno ni comportamiento de Win+L.

## Cada mañana

1. Abrir el exe. En el primer uso se solicitan las credenciales de la cuenta técnica para enrolar esta instalación. Solo su refresh token se guarda con DPAPI, ligado al usuario Windows, bajo `%LOCALAPPDATA%/Visteon4WallRunner/<runner_id>.dpapi`. No se guarda la contraseña técnica.
2. Escribir usuario y contraseña **4Wall** en la ventana. Se mantienen en memoria; no se usan variables de entorno ni se guardan en disco, Supabase o logs.
3. La máquina reclama su lease antes de abrir Edge; una segunda instancia es rechazada. Un login 4Wall inválido no inicia extracción. Con login válido se minimiza a tray y realiza un corte inmediato, salvo Pause persistido o enabled=false.
4. Continúa con intervalo configurable (30 minutos iniciales). Win+L debe probarse en la corporativa con Edge headless; suspensión/apagado o políticas que bloqueen procesos/red detienen el trabajo.

Tray: **Estado**, **Abrir diagnóstico** (códigos/métricas, sin datos o credenciales), **Buscar actualización**, **Cerrar runner**. Para Edge visible elegir Diagnóstico en el próximo inicio; nunca se abre otro Playwright durante el run. La reautenticación 4Wall usa las credenciales que siguen solo en memoria.

Cerrar con un run activo recomienda **Terminar corte y cerrar**, incluyendo los retries acotados. Forzar cierre deja un lease stale; CURRENT anterior se conserva y Supabase registra INTERRUPTED tras el timeout/limpieza o el siguiente inicio. No hay arranque automático de Windows.

## Control remoto y sesiones

Pages y localhost usan Supabase Auth con sesión persistida por navegador y refresh normal; no se pide password por acción. Una jornada 8–12h depende de las políticas Auth que configure el administrador (no se afirma haber cambiado esas políticas remotamente). Viewer consulta; operator controla y publica 4Wall manual; admin administra roles, runners, quality gates y diagnóstico. El dashboard general sigue público por defecto. `bot_settings.require_dashboard_login` permite exigir login; RLS también protege CURRENT, estado y notificaciones.

RUN NOW tiene TTL 10 minutos y como máximo una orden pendiente durante un run. Pause termina el corte actual y permanece tras reiniciar; Resume reanuda el horario normal. Run now durante Pause es un corte puntual y no quita la pausa. Realtime despierta el runner; HTTPS cada 5s sigue funcionando sin WebSockets. Heartbeat cada 15s; el frontend muestra OFFLINE tras 45s sin heartbeat. El lease de máquina dura 60s y el de run 120s; no son passwords compartidos.

## Actualizaciones

Buscar actualización consulta la última GitHub Release, compara su versión con `runner/version.py` y ofrece abrir la descarga. No sustituye el exe automáticamente y rechaza actualizar durante un run. Hasta publicar una Release, descargar el artifact del workflow; el tray indica si no existe una release verificable. Cerrar el runner, sustituir su carpeta completa y conservar la configuración pública. DPAPI permanece fuera de la carpeta y no se copia a otra persona/máquina.

Desarrollo: `python -m pip install -r requirements-runner.txt`, preparar `runner.config.json` público y ejecutar `python bot_extractor.py` o `python runner_windows.py`. `python bot_control_server.py` es un alias compatible al runner, **no un servidor HTTP**. En sistemas no Windows el CLI no persiste tokens; la distribución Windows requiere DPAPI.

## Activación, respaldo y recuperación

- Confirmar proyecto, esquema, policies, constraints y escritores reales con el preflight. Un backup debe incluir CURRENT y definiciones/permisos previos; probar su restauración en entorno autorizado. No guardar exports ni backups corporativos en Git.
- Ejecutar la migración nueva con un administrador y verificar RLS/grants. No editar migraciones históricas. Activar pg_cron si no existe y programar `select bot_private.cleanup()` cada 5 minutos (la migración lo programa cuando encuentra pg_cron). Retiene runs/errores/auditoría 90 días y elimina staging al cerrar cada run.
- Verificar anon solo lectura permitida, viewer sin control, operator sin admin, runner sin roles generales; activar identidades y luego probar un corte corporativo. Los datos iniciales se mantienen hasta una publicación válida.
- Rollback operativo: desactivar runners y pausar publicación; volver al frontend anterior si hace falta. Conservar CURRENT y evidencia, corregir mediante una nueva migración. Para rollback del esquema/RPC, restaurar el backup probado en mantenimiento; no reactivar el viejo DELETE+INSERT sobre una DB con escritores nuevos y no DROP/TRUNCATE CURRENT como recuperación.

## Email y Teams

El dashboard muestra un aviso de fallo definitivo y acciones para reintentar/manual. El outbox crea **un job por run automático final**, no por retry; los runs manuales no envían email. `bot-notifications` implementa un adaptador Resend y el contrato `send(job)` para futuro Teams. Sin proveedor/secretos no reclama jobs: queda pendiente activar, no se afirma que envía correos.

Solo en secrets del backend: `RESEND_API_KEY`, `BOT_EMAIL_FROM`, `BOT_EMAIL_TO`, `BOT_DASHBOARD_URL`, `BOT_NOTIFICATION_CRON_SECRET`. La service-role del entorno Edge es solo del worker servidor, nunca del exe/browser. Desplegar la función al proyecto correcto y llamar POST con el secreto de cron desde un scheduler autorizado cada 5 minutos, almacenando el secreto en Vault; no usar una URL/clave secreta en SQL versionado. El cuerpo solo contiene runner, hora, último corte válido y link.

El outbox usa lock/lease, ACK y hasta cinco intentos de entrega. Reutiliza payload y clave idempotente por run. Resend conserva la clave 24h; se detiene la recuperación de un envío incierto después de 23h para evitar duplicarlo. Una interrupción prolongada de entrega exige revisión admin; no promete entrega exactamente una vez sin límites de proveedor.

## Validación corporativa pendiente

Probar login correcto/incorrecto, export Excel vigente y sus selectores, fechas locales DMY/MDY, inmediato/schedule, pause/resume/run now desde otro dispositivo, Win+L, cierre seguro/forzado, reconexión HTTPS sin WebSocket, expiración 4Wall, refresh Auth y actualización explícita. Los tests sintéticos y el smoke de packaging no sustituyen estas pruebas.
