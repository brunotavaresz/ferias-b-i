export const eur = (v, opts = {}) =>
  v == null || Number.isNaN(Number(v)) ? "—" : `${Math.round(Number(v)).toLocaleString("pt-PT")} €${opts.suffix || ""}`;
export const num = (v, d = 1) =>
  v == null || v === "" || Number.isNaN(Number(v)) ? "—" : Number(v).toLocaleString("pt-PT", { maximumFractionDigits: d });
export const fmtDate = (s, opts = { day: "numeric", month: "short" }) => {
  if (!s) return "—";
  try { return new Date(s + "T12:00:00").toLocaleDateString("pt-PT", opts); } catch { return s; }
};
export const fmtWeekday = (s) => fmtDate(s, { weekday: "short", day: "numeric", month: "short" });
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const initials = (name = "") => name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
