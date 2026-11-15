import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/* Toasts (sonner). Mantém a assinatura antiga: toast(msg, "err"). */
export function useToast() {
  return (msg, kind) => (kind === "err" ? toast.error(msg) : toast(msg));
}

/* Pontuação 0–100 num anel. */
export function ScoreRing({ value, size = 52, highlight, className }) {
  const stroke = 5, r = size / 2 - stroke, c = 2 * Math.PI * r;
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  const color = highlight ? "var(--warn)" : v >= 70 ? "var(--good)" : v >= 45 ? "var(--brand)" : "var(--bad)";
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} aria-label={`Pontuação ${value ?? "sem dados"} em 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c.toFixed(1)} strokeDashoffset={(c * (1 - v / 100)).toFixed(1)} className="transition-[stroke-dashoffset] duration-500" />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-semibold tabular">{value ?? "–"}</span>
    </div>
  );
}

/* Barra de um critério (0–1), com valor à direita. */
export function Meter({ label, value, text }) {
  const v = value == null ? null : Math.max(0, Math.min(1, value));
  const color = v == null ? "" : v >= 0.67 ? "bg-good" : v <= 0.33 ? "bg-bad" : "bg-brand";
  return (
    <div className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        {v != null && <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.max(4, v * 100)}%` }} />}
      </div>
      <span className="text-right font-medium tabular">{text ?? (v == null ? <span className="font-normal text-muted-foreground" title="Sem dados">—</span> : Math.round(v * 100))}</span>
    </div>
  );
}

/* Estrelas 1–5. Clicar de novo na mesma apaga. */
export function Stars({ value, onChange, label, readOnly, size = "default" }) {
  const [hover, setHover] = useState(null);
  const shown = hover ?? value ?? 0;
  const s = size === "sm" ? "size-4" : "size-5";
  return (
    <span className="inline-flex items-center gap-0.5" role={readOnly ? "img" : "radiogroup"} aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => {
        const icon = <Star className={cn(s, i <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />;
        return readOnly ? <span key={i}>{icon}</span> : (
          <button key={i} type="button" aria-label={`${i} de 5`} aria-pressed={value === i}
            className="rounded-sm transition-transform hover:scale-110 focus-visible:outline-2"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onChange(value === i ? null : i)}>{icon}</button>
        );
      })}
    </span>
  );
}

/* Importância de 0 a 5, em segmentos. */
export function WeightControl({ label, value, onChange, icon: Icon }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium">{Icon && <Icon className="size-4 text-muted-foreground" />}{label}</span>
        <span className="text-xs text-muted-foreground tabular">{value === 0 ? "ignorar" : `${value}/5`}</span>
      </div>
      <div className="flex gap-1" role="group" aria-label={`Importância de ${label}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" aria-label={`${label}: ${i} de 5`} onClick={() => onChange(i === value ? i - 1 : i)}
            className={cn("h-2 flex-1 rounded-full transition-colors", i <= value ? "bg-brand" : "bg-muted hover:bg-muted-foreground/20")} />
        ))}
      </div>
    </div>
  );
}

/* Botão de apagar que pede confirmação no 2.º clique. */
export function ConfirmButton({ children, confirmText = "Tens a certeza?", onConfirm, size = "sm", variant = "ghost", className }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3500); return () => clearTimeout(t); }, [armed]);
  return (
    <Button type="button" size={size} variant={armed ? "destructive" : variant} className={cn(!armed && "text-destructive hover:text-destructive", className)}
      onClick={() => (armed ? onConfirm() : setArmed(true))}>{armed ? confirmText : children}</Button>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-card/50 px-6 py-14 text-center">
      {Icon && <div className="grid size-12 place-items-center rounded-full bg-muted"><Icon className="size-6 text-muted-foreground" /></div>}
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold">{title}</h3>
        {children && <div className="mx-auto max-w-prose text-sm text-muted-foreground">{children}</div>}
      </div>
      {action}
    </div>
  );
}

/* Lista de vantagens e desvantagens. */
export function ProsCons({ pros, cons, minePros = [], mineCons = [], stacked }) {
  const Col = ({ title, auto, mine, good }) => (
    <div className="space-y-1.5">
      <p className={cn("text-xs font-semibold uppercase tracking-wide", good ? "text-good" : "text-bad")}>{title}</p>
      {auto.length + mine.length === 0 ? <p className="text-sm text-muted-foreground">Nada a apontar</p> : (
        <ul className="space-y-1 text-sm">
          {auto.map((t, i) => <li key={"a" + i} className="flex gap-2"><span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", good ? "bg-good" : "bg-bad")} />{t}</li>)}
          {mine.map((t, i) => <li key={"m" + i} className="flex gap-2 italic text-muted-foreground"><span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", good ? "bg-good" : "bg-bad")} />{t}</li>)}
        </ul>
      )}
    </div>
  );
  return (
    <div className={cn("grid gap-4", !stacked && "sm:grid-cols-2")}>
      <Col title="Vantagens" auto={pros} mine={minePros.filter(Boolean)} good />
      <Col title="Desvantagens" auto={cons} mine={mineCons.filter(Boolean)} />
    </div>
  );
}

/* Campo de formulário com etiqueta. */
export function Field({ label, htmlFor, children, className, hint }) {
  return (
    <div className={cn("grid gap-2", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium leading-none">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
