# Bot 4Wall: control desde el dashboard

El botón **▶ BOT** ya está integrado en la interfaz. La página pública no contiene ni valida la contraseña por sí misma.

## Seguridad

La contraseña se configura solamente en el equipo/servidor autorizado que ejecuta `bot_control_server.py`, mediante la variable de entorno `BOT_CONTROL_PASSWORD`.

No pongas la contraseña en variables `VITE_*` ni en archivos versionados: cualquier valor de Vite termina visible en el navegador.

## Conexión

El frontend usa `VITE_BOT_CONTROL_URL` para llamar al controlador. El controlador debe ser alcanzable por HTTPS desde el navegador y permitir únicamente el origen autorizado mediante `BOT_CONTROL_ORIGIN`.

GitHub Pages no puede ejecutar Python. El controlador y `bot_extractor.py` deben correr en el equipo o servidor que tenga acceso autorizado a 4Wall.
