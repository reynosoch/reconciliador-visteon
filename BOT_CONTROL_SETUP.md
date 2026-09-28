# Control seguro del bot 4Wall

El dashboard incluye el botón **▶ BOT**, pero GitHub Pages es estático y no puede ejecutar `bot_extractor.py` directamente.

## Arquitectura

1. El navegador pide autorización.
2. `BotControlModal` envía la contraseña al controlador por HTTPS.
3. `bot_control_server.py` valida contra `BOT_CONTROL_PASSWORD`.
4. Solo si coincide, el controlador inicia `bot_extractor.py`.

La contraseña acordada **no se guarda en este repositorio** y tampoco debe colocarse en una variable `VITE_*`, porque esas variables terminan visibles en el JavaScript del navegador.

En el equipo autorizado configura localmente `BOT_CONTROL_PASSWORD` con la contraseña acordada por el equipo, además de las variables que ya requiere `bot_extractor.py`.

El frontend necesita `VITE_BOT_CONTROL_URL` apuntando a un endpoint HTTPS alcanzable desde la página. Si esa variable no existe, el botón explica que falta conectar el controlador y no intenta simular que arrancó el bot.

## Importante

No expongas el puerto local directamente a Internet. Para usar el botón desde GitHub Pages hace falta una ruta HTTPS autorizada por IT/seguridad hacia el host del bot. El origen permitido se controla con `BOT_CONTROL_ORIGIN`.
