import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
 plugins: [react()],
 optimizeDeps: { include: ["@huggingface/transformers"] },
 base: './', // Funciona en GitHub Pages aunque el repositorio cambie de nombre
})