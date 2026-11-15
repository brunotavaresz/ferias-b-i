import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./lib/theme.js";
import { enterDemo, isDemoSession, DEMO_TRIP_ID } from "./lib/store.js";
import { demoSeed } from "./lib/demoData.js";

// #/demo abre uma viagem de exemplo, sem login e sem tocar nos dados reais.
if (location.hash.startsWith("#/demo") || isDemoSession()) {
  enterDemo(demoSeed);
  if (location.hash.startsWith("#/demo")) location.replace(`#/t/${DEMO_TRIP_ID}`);
}
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <TooltipProvider delayDuration={200}>
        <App />
        <Toaster />
      </TooltipProvider>
    </HashRouter>
  </React.StrictMode>
);
