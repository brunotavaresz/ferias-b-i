import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // caminhos relativos: funciona em brunotavaresz.github.io/ferias-b-i/ e em localhost
  base: "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks: { firebase: ["firebase/app", "firebase/auth", "firebase/firestore"], react: ["react", "react-dom", "react-router-dom"] },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
