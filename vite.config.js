import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // caminhos relativos: funciona em brunotavaresz.github.io/ferias-b-i/ e em localhost
  base: "./",
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  build: {
    rollupOptions: {
      output: {
        manualChunks: { firebase: ["firebase/app", "firebase/auth", "firebase/firestore"], react: ["react", "react-dom", "react-router-dom"] },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
