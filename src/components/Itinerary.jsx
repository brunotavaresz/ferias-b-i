import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  BedDouble, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ExternalLink, MapPin, Pencil, Plane, Plus, Printer, Sun,
  Ticket, TrainFront, Trash2, Utensils, X,
} from "lucide-react";
import { daysOf, destinationPackage } from "../lib/scoring.js";
import { ITEM_TYPES } from "../lib/model.js";
import { eur, fmtWeekday, plural } from "../lib/format.js";
import { ConfirmButton, EmptyState, Field, useToast } from "./common.jsx";
import DestinationForm from "./DestinationForm.jsx";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TYPE = {
  atividade: { icon: Ticket, color: "text-chart-4 bg-chart-4/10" },
  transporte: { icon: TrainFront, color: "text-chart-1 bg-chart-1/10" },
  comida: { icon: Utensils, color: "text-chart-2 bg-chart-2/10" },
  alojamento: { icon: BedDouble, color: "text-chart-3 bg-chart-3/10" },
  livre: { icon: Sun, color: "text-muted-foreground bg-muted" },
  voo: { icon: Plane, color: "text-chart-1 bg-chart-1/10" },
};

export default function Itinerary({ ctx }) {
  const { destId } = useParams();
  const nav = useNavigate();
  const [edit, setEdit] = useState(null);
  const [editDest, setEditDest] = useState(false);
  const toast = useToast();
  const dests = ctx.destinations;
  const dest = dests.find((d) => d.id === destId) || dests.find((d) => d.escolhido) || dests[0];

  const items = useMemo(() => ctx.items.filter((i) => dest && i.destinationId === dest.id)
    .sort((a, b) => (a.dia - b.dia) || (a.hora || "99").localeCompare(b.hora || "99") || ((a.ordem || 0) - (b.ordem || 0))), [ctx.items, dest]);

  if (!dests.length) return <EmptyState icon={MapPin} title="Primeiro, um destino" action={<Button asChild><Link to={ctx.base}>Ir para os destinos</Link></Button>}>O roteiro monta-se para um destino com datas.</EmptyState>;

  const days = daysOf(dest);
  const pkg = destinationPackage(dest, ctx.options, ctx.items, ctx.trip);
  const fixed = fixedEntries(pkg, days);
  const inItinerary = new Set(items.map((i) => i.optionId).filter(Boolean));
  const pending = ctx.options.filter((o) => o.destinationId === dest.id && o.escolhido && !o.descartado && (o.categoria === "atividade" || o.categoria === "transporte") && !inItinerary.has(o.id));
  const totalItems = items.reduce((s, i) => s + (Number(i.custo) || 0), 0);

  async function add(dia, data) {
    await ctx.upsert("items", { destinationId: dest.id, dia, hora: "", tipo: "atividade", custo: null, notas: "", link: "", ordem: Date.now(), ...data });
  }
  async function move(item, delta) {
    const sameDay = items.filter((i) => i.dia === item.dia);
    const idx = sameDay.findIndex((i) => i.id === item.id);
    const other = sameDay[idx + delta];
    if (!other) return;
    if ((item.hora || "") !== (other.hora || "")) return toast("Têm horas diferentes: muda a hora para os reordenar.");
    await ctx.upsert("items", { id: item.id, ordem: other.ordem ?? 0 });
    await ctx.upsert("items", { id: other.id, ordem: item.ordem ?? 0 });
  }
  async function shiftDay(item, delta) {
    const d = item.dia + delta;
    if (d < 0 || d >= days.length) return;
    await ctx.upsert("items", { id: item.id, dia: d, ordem: Date.now() });
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={dest.id} onValueChange={(v) => nav(`${ctx.base}/roteiro/${v}`)}>
            <SelectTrigger className="w-56" aria-label="Destino"><MapPin /><SelectValue /></SelectTrigger>
            <SelectContent>{dests.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}{d.escolhido ? " · escolhido" : ""}</SelectItem>)}</SelectContent>
          </Select>
          {days.length > 0 && <p className="text-sm text-muted-foreground">{plural(days.length, "dia", "dias")} · {plural(items.length, "plano", "planos")} · <span className="tabular">{eur(totalItems)}</span> em planos</p>}
        </div>
        <Button variant="outline" onClick={() => window.print()}><Printer /> Imprimir</Button>
      </div>

      {!days.length ? (
        <EmptyState icon={CalendarDays} title={`${dest.nome} ainda não tem datas`} action={<Button onClick={() => setEditDest(true)}>Pôr datas</Button>}>Com as datas de chegada e partida, a app cria os dias do roteiro.</EmptyState>
      ) : (
        <>
          {pending.length > 0 && (
            <Card className="no-print gap-3 border-amber-400/50 bg-amber-400/5 py-4">
              <CardHeader className="px-4"><CardTitle className="text-sm">Por encaixar no roteiro</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2 px-4">
                {pending.map((o) => (
                  <div key={o.id} className="flex items-center gap-2 rounded-lg border bg-card py-1 pl-3 pr-1 text-sm">
                    <span className="font-medium">{o.nome}</span>
                    <Select onValueChange={async (v) => {
                      await add(Number(v), { titulo: o.nome, optionId: o.id, tipo: o.categoria === "transporte" ? "transporte" : "atividade", custo: o.preco ?? null, link: o.link || "" });
                      toast(`"${o.nome}" foi para o dia ${Number(v) + 1}.`);
                    }}>
                      <SelectTrigger size="sm" className="h-7 w-32"><SelectValue placeholder="Pôr no dia…" /></SelectTrigger>
                      <SelectContent>{days.map((d) => <SelectItem key={d.index} value={String(d.index)}>Dia {d.index + 1} · {fmtWeekday(d.date)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {days.map((d) => {
              const its = items.filter((i) => i.dia === d.index);
              const fx = fixed.filter((f) => f.dia === d.index);
              const cost = its.reduce((s, i) => s + (Number(i.custo) || 0), 0);
              const all = [...fx.map((f) => ({ ...f, fixed: true })), ...its].sort((a, b) => (a.hora || "99").localeCompare(b.hora || "99"));
              return (
                <Card key={d.index} className="gap-3 py-5 break-inside-avoid">
                  <CardHeader className="px-5">
                    <CardTitle className="flex items-baseline gap-2"><span className="text-lg">Dia {d.index + 1}</span><span className="text-sm font-normal capitalize text-muted-foreground">{fmtWeekday(d.date)}</span></CardTitle>
                    {cost > 0 && <CardAction><Badge variant="secondary" className="tabular">{eur(cost)}</Badge></CardAction>}
                  </CardHeader>
                  <CardContent className="space-y-1.5 px-5">
                    {all.length === 0 && <p className="py-2 text-sm text-muted-foreground">Dia livre</p>}
                    {all.map((it) => {
                      const T = TYPE[it.tipo] || TYPE.atividade;
                      const I = T.icon;
                      return (
                        <div key={it.id} className={cn("group flex items-start gap-3 rounded-lg p-2 transition-colors", it.fixed ? "border border-dashed" : "hover:bg-muted/60")}>
                          <span className="w-11 pt-1 text-xs font-medium text-muted-foreground tabular">{it.hora || "—"}</span>
                          <span className={cn("grid size-7 shrink-0 place-items-center rounded-md", T.color)}><I className="size-3.5" /></span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug">{it.titulo}</p>
                            {it.notas && <p className="text-xs text-muted-foreground">{it.notas}</p>}
                            {it.link && <a href={it.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs underline underline-offset-4">link <ExternalLink className="size-3" /></a>}
                            {!it.fixed && (
                              <div className="no-print mt-1 flex gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                <Button variant="ghost" size="icon-xs" aria-label="Subir" onClick={() => move(it, -1)}><ChevronUp /></Button>
                                <Button variant="ghost" size="icon-xs" aria-label="Descer" onClick={() => move(it, 1)}><ChevronDown /></Button>
                                <Button variant="ghost" size="icon-xs" aria-label="Dia anterior" disabled={it.dia === 0} onClick={() => shiftDay(it, -1)}><ChevronLeft /></Button>
                                <Button variant="ghost" size="icon-xs" aria-label="Dia seguinte" disabled={it.dia === days.length - 1} onClick={() => shiftDay(it, 1)}><ChevronRight /></Button>
                                <Button variant="ghost" size="icon-xs" aria-label="Editar" onClick={() => setEdit(it)}><Pencil /></Button>
                              </div>
                            )}
                          </div>
                          {it.custo ? <span className="pt-0.5 text-sm font-medium tabular">{eur(it.custo)}</span> : null}
                        </div>
                      );
                    })}
                    <QuickAdd onAdd={(data) => add(d.index, data)} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
      {edit && <ItemForm ctx={ctx} item={edit} days={days} onClose={() => setEdit(null)} />}
      {editDest && <DestinationForm ctx={ctx} dest={dest} onClose={() => setEditDest(false)} />}
    </div>
  );
}

/** Entradas automáticas: chegada e partida do voo, check-in e check-out do alojamento. */
function fixedEntries(pkg, days) {
  if (!days.length) return [];
  const out = [], last = days.length - 1;
  const v = pkg.voo.opt, a = pkg.aloj.opt;
  if (v) {
    out.push({ id: "fx-ida", dia: 0, hora: v.idaHora || "", tipo: "voo", titulo: `Chegada · ${v.nome}`, notas: pkg.voo.chosen ? "" : "voo ainda por escolher" });
    out.push({ id: "fx-volta", dia: last, hora: v.voltaHora || "", tipo: "voo", titulo: `Partida · ${v.nome}`, notas: "" });
  }
  if (a) {
    out.push({ id: "fx-in", dia: 0, hora: "", tipo: "alojamento", titulo: `Check-in · ${a.nome}`, notas: a.zona || "" });
    out.push({ id: "fx-out", dia: last, hora: "", tipo: "alojamento", titulo: `Check-out · ${a.nome}`, notas: "" });
  }
  return out;
}

function QuickAdd({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ hora: "", titulo: "", tipo: "atividade", custo: "" });
  if (!open) return <Button variant="ghost" size="sm" className="no-print -ml-1 text-muted-foreground" onClick={() => setOpen(true)}><Plus /> Adicionar plano</Button>;
  return (
    <form className="no-print grid grid-cols-[5.5rem_1fr] gap-2 rounded-lg border p-2" onSubmit={async (e) => {
      e.preventDefault();
      if (!f.titulo.trim()) return;
      await onAdd({ hora: f.hora, titulo: f.titulo.trim(), tipo: f.tipo, custo: f.custo === "" ? null : Number(f.custo) });
      setF({ hora: "", titulo: "", tipo: f.tipo, custo: "" });
    }}>
      <Input aria-label="Hora" type="time" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} />
      <Input aria-label="O quê" autoFocus placeholder="O quê?" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
      <Input aria-label="Custo total (€)" type="number" min="0" placeholder="€" value={f.custo} onChange={(e) => setF({ ...f, custo: e.target.value })} />
      <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}>
        <SelectTrigger className="w-full" aria-label="Tipo"><SelectValue /></SelectTrigger>
        <SelectContent>{Object.entries(ITEM_TYPES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
      </Select>
      <div className="col-span-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}><X /> Fechar</Button>
        <Button type="submit" size="sm"><Plus /> Juntar</Button>
      </div>
    </form>
  );
}

function ItemForm({ ctx, item, days, onClose }) {
  const [f, setF] = useState({ ...item, custo: item.custo ?? "" });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar plano</DialogTitle></DialogHeader>
        <form id="itf" className="grid gap-4 sm:grid-cols-2" onSubmit={async (e) => {
          e.preventDefault();
          await ctx.upsert("items", { ...f, dia: Number(f.dia), custo: f.custo === "" ? null : Number(f.custo) });
          onClose();
        }}>
          <Field label="O quê" htmlFor="itf-t" className="sm:col-span-2"><Input id="itf-t" value={f.titulo} onChange={(e) => set("titulo", e.target.value)} /></Field>
          <Field label="Dia" htmlFor="itf-d">
            <Select value={String(f.dia)} onValueChange={(v) => set("dia", v)}>
              <SelectTrigger id="itf-d" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{days.map((d) => <SelectItem key={d.index} value={String(d.index)}>Dia {d.index + 1} · {fmtWeekday(d.date)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Hora" htmlFor="itf-h"><Input id="itf-h" type="time" value={f.hora || ""} onChange={(e) => set("hora", e.target.value)} /></Field>
          <Field label="Tipo" htmlFor="itf-y">
            <Select value={f.tipo} onValueChange={(v) => set("tipo", v)}>
              <SelectTrigger id="itf-y" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(ITEM_TYPES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Custo total (€)" htmlFor="itf-c"><Input id="itf-c" type="number" min="0" value={f.custo} onChange={(e) => set("custo", e.target.value)} /></Field>
          <Field label="Link" htmlFor="itf-l" className="sm:col-span-2"><Input id="itf-l" type="url" value={f.link || ""} onChange={(e) => set("link", e.target.value)} /></Field>
          <Field label="Notas" htmlFor="itf-n" className="sm:col-span-2"><Textarea id="itf-n" value={f.notas || ""} onChange={(e) => set("notas", e.target.value)} /></Field>
        </form>
        <DialogFooter className="sm:justify-between">
          <ConfirmButton size="default" confirmText="Apagar mesmo?" onConfirm={async () => { await ctx.remove("items", item.id); onClose(); }}><Trash2 /> Apagar</ConfirmButton>
          <div className="flex gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" form="itf">Guardar</Button></div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
