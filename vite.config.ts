import { defineConfig } from 'vite';

export default defineConfig({
  // Repo is served from GitHub Pages at https://axel-pm.github.io/roadmap-raiders/
  base: '/roadmap-raiders/',
  build: {
    target: 'es2022',
  },
});
