/* Ligação ao intermediário de IA (Cloudflare Worker). */
import { auth } from "./firebase.js";

// URL do Worker. Pode ser trocado com VITE_AI_URL no .env.
const DEFAULT_AI_URL = "https://ferias-ai.picmenu-pt.workers.dev";
export const AI_URL = import.meta.env.VITE_AI_URL || DEFAULT_AI_URL;
export const aiEnabled = Boolean(AI_URL);

export async function aiExtract({ text, images = [], context = {} }) {
  if (!aiEnabled) throw new Error("A IA ainda não está configurada.");
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error("Tens de ter sessão iniciada.");
  const r = await fetch(AI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text, images, context }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) throw new Error(data.error || `Erro ${r.status}`);
  return data;
}

/** Reduz uma imagem colada para caber no pedido (máx. ~1280 px, JPEG). */
export function imageToDataUrl(file, max = 1280) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
