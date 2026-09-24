# Visteon Inventory Reconciliation — Project Context
> IMPORTANTE PARA CUALQUIER DESARROLLADOR O IA:
> Leer este archivo completo antes de modificar el proyecto.
> No reconstruir reglas de negocio a partir de nombres, prefijos o suposiciones.
> Mantener trazabilidad de cada cálculo hasta sus fuentes.
## 1. Objetivo del proyecto
Este proyecto es una PoC para Visteon destinada a monitorear el inventario físico durante el día del inventario.
El problema actual es que Finanzas realiza juntas aproximadamente cada 2 horas, pero normalmente no conoce el impacto financiero real de las diferencias hasta que QAD genera los reportes al final del día.
La aplicación busca mostrar durante el inventario, casi en tiempo real:
- NET de inventario en USD
- Pérdidas brutas en USD
- Ganancias brutas en USD
- Ganancias provenientes de material OBSOLETE
- SWING en piezas y USD
- Material encontrado cuando QAD esperaba 0
- Phantoms y ajustes derivados del BOM
- Part Numbers con mayor exposición financiera
- Problemas de calidad de datos antes de confiar en los KPIs
La prioridad de la UI es DÓLARES, no cantidad de piezas.
---
## 2. Stack
Frontend:
- React
- Vite
- Tailwind CSS
- JavaScript
- PapaParse
Backend / Live Data:
- Supabase / PostgreSQL
- PostgREST
- RPC PostgreSQL para reemplazar el snapshot de 4Wall
Extractor:
- Python
- Playwright
- Pandas
- Requests
Hosting:
- GitHub
- GitHub Pages
En la laptop corporativa los comandos deben ejecutarse con:
```bat
npm.cmd run dev
npm.cmd run build
npm.cmd install paquete