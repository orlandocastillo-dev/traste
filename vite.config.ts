/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({ mode }) => {
  // "npm run build:portable" genera portable/index.html: toda la app en un archivo que abre con doble clic.
  const portable = mode === "portable";

  return {
    // Rutas relativas: el build funciona en GitHub Pages, Netlify o desde una subcarpeta.
    base: "./",
    plugins: portable ? [react(), viteSingleFile()] : [react()],
    build: portable ? { outDir: "portable", emptyOutDir: true, copyPublicDir: false } : undefined,
    test: {
      environment: "jsdom",
      setupFiles: ["./tests/setup.ts"],
      include: ["tests/**/*.test.{ts,tsx}"],
    },
  };
});
