import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL("./netlify", import.meta.url)),
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  plugins: [react()],
  build: {
    emptyOutDir: true,
    outDir: fileURLToPath(new URL("./netlify-dist", import.meta.url)),
  },
  resolve: {
    alias: {
      "@": projectRoot,
    },
  },
});
