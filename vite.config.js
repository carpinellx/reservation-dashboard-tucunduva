import { defineConfig } from 'vite';

export default defineConfig({
  // O Vite serve o index.html da raiz do projeto por padrão — sem mudança.
  // Ao rodar "npm run build", gera os arquivos finais na pasta "dist/".
  // A Vercel detecta isso automaticamente e publica o conteúdo de "dist/".
  build: {
    outDir: 'dist',
  },
});
