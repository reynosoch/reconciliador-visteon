import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
 plugins: [react()],
 base: './', // Funciona en GitHub Pages aunque el repositorio cambie de nombre
})