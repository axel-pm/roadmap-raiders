import { defineConfig } from 'vite';

export default defineConfig({
  // Repo is served from GitHub Pages at https://axel-pm.github.io/munchkin/
  base: '/munchkin/',
  build: {
    target: 'es2022',
  },
});
