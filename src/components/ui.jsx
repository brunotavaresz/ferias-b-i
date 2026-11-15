import { useEffect, useId, useState, createContext, useContext, useCallback } from "react";

/* ---------- Modal ---------- */
export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);
  const id = useId();
  return (
    <div className="mbg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={"modal" + (wide ? " wide" : "")} role="dialog" aria-modal="true" aria-labelledby={id}>
        <div className="mhead">
          <h2 id={id}>{title}</h2>
          <button className="btn ghost icon" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="mbody">{children}</div>
        {footer && <div className="mfoot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Pontuação em anel ---------- */
export function Ring({ value, size = 56, highlight, label }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r;
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="ring" style={{ width: size, height: size }} aria-label={label || `Pontuação ${value ?? "sem dados"} em 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface2)" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={highlight ? "var(--lemon)" : "var(--accent)"} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={c.toFixed(1)} strokeDashoffset={(c * (1 - v / 100)).toFixed(1)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <b className="num">{value ?? "–"}</b>
    </div>
  );
}

/* ---------- Barra de critério ---------- */
export function Meter({ label, value, text }) {
  const v = value == null ? null : Math.max(0, Math.min(1, value));
  const cls = v == null ? "" : v >= 0.67 ? "g" : v <= 0.33 ? "b" : "";
  return (
    <div className="meter">
      <span className="ml">{label}</span>
      <div className="track">{v != null && <i className={cls} style={{ width: `${Math.max(5, v * 100)}%` }} />}</div>
      <span className="mv num">{text ?? (v == null ? "sem dados" : Math.round(v * 100))}</span>
    </div>
  );
}

/* ---------- Estrelas (1 a 5) ---------- */
export function Stars({ value, onChange, label, readOnly, size }) {
  const [hover, setHover] = useState(null);
  const shown = hover ?? value ?? 0;
  return (
    <span className={"stars" + (readOnly ? " ro" : "") + (size === "sm" ? " sm" : "")} role={readOnly ? "img" : "radiogroup"} aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        readOnly ? <span key={i} className={i <= shown ? "on" : ""}>★</span> :
        <button key={i} type="button" className={i <= shown ? "on" : ""} aria-label={`${i} de 5`} aria-pressed={value === i}
          onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
          onClick={() => onChange(value === i ? null : i)}>★</button>
      ))}
    </span>
  );
}

/* ---------- Pesos 0–5 ---------- */
export function WeightDots({ label, value, onChange, hint }) {
  return (
    <div className="wd" title={hint}>
      <span>{label}</span>
      <div className="dots" role="group" aria-label={`Importância de ${label}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" className={i <= value ? "f" : ""} aria-label={`${label}: ${i} de 5`} onClick={() => onChange(i === value ? i - 1 : i)} />
        ))}
      </div>
    </div>
  );
}

/* ---------- Segmented ---------- */
export function Seg({ value, onChange, options, label }) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} role="tab" aria-selected={value === v} className={value === v ? "on" : ""} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

/* ---------- Toasts ---------- */
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const push = useCallback((msg, kind) => {
    const id = Math.random();
    setList((l) => [...l, { id, msg, kind }]);
    setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {list.map((t) => <div key={t.id} className={"toast " + (t.kind || "")}>{t.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ---------- Confirmação em dois cliques ---------- */
export function ConfirmButton({ children, confirmText = "Tens a certeza?", onConfirm, className = "btn danger sm" }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3500); return () => clearTimeout(t); }, [armed]);
  return <button type="button" className={className + (armed ? " armed" : "")} onClick={() => (armed ? onConfirm() : setArmed(true))}>{armed ? confirmText : children}</button>;
}

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <div className="emptytxt">{children}</div>}
      {action}
    </div>
  );
}
