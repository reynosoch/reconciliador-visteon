import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
 plugins: [react()],
 base: '/visteon-inventory-reconciler/', // <-- Nombre exacto del repositorio entre diagonales
})