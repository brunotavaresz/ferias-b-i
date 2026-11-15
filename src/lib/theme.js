import { useEffect, useState, useSyncExternalStore } from "react";

/* Tema claro/escuro/sistema, guardado no browser e aplicado com a classe .dark (convenção do shadcn). */
const KEY = "ferias-tema";
const mq = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
const subs = new Set();
const read = () => { try { return localStorage.getItem(KEY) || "system"; } catch { return "system"; } };
let current = read();
function apply() {
  const dark = current === "dark" || (current === "system" && mq?.matches);
  document.documentElement.classList.toggle("dark", !!dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}
if (mq) { apply(); mq.addEventListener("change", () => { apply(); subs.forEach((f) => f()); }); }

export function setTheme(t) {
  current = t;
  try { localStorage.setItem(KEY, t); } catch { /* sem armazenamento */ }
  apply();
  subs.forEach((f) => f());
}
export function useTheme() {
  const theme = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => current);
  const [resolved, setResolved] = useState("light");
  useEffect(() => setResolved(theme === "dark" || (theme === "system" && mq?.matches) ? "dark" : "light"), [theme]);
  return { theme, resolved, setTheme };
}
