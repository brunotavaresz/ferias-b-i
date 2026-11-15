import { useState } from "react";
import { Trash2 } from "lucide-react";
import { COST_LEVELS, SEASONS, CITY_PRESETS, suggestSeason } from "../lib/model.js";
import { cityRef } from "../lib/scoring.js";
import { ConfirmButton, Field, Stars } from "./common.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function DestinationForm({ ctx, dest, onClose, onSaved }) {
  const isNew = !dest;
  const [f, setF] = useState(() => ({
    nome: "", pais: "", inicio: "", fim: "", nivelPreco: "medio", epoca: "media", refNoite: "", refDia: "", clima: null, notas: "",
    ...(dest || {}),
  }));
  const [touched, setTouched] = useState({ nivelPreco: !isNew, epoca: !isNew });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const ref = cityRef({ ...f, refNoite: null, refDia: null });

  function onName(v) {
    set("nome", v);
    const preset = CITY_PRESETS[v.trim()];
    if (preset && !touched.nivelPreco) set("nivelPreco", preset);
  }
  function onStart(v) {
    set("inicio", v);
    if (!touched.epoca) set("epoca", suggestSeason(v));
  }
  async function submit(e) {
    e.preventDefault();
    const id = await ctx.upsert("destinations", {
      ...f, nome: f.nome.trim() || "Destino",
      refNoite: f.refNoite === "" || f.refNoite == null ? null : Number(f.refNoite),
      refDia: f.refDia === "" || f.refDia == null ? null : Number(f.refDia),
    });
    onClose();
    onSaved?.(id);
  }
  const bad = f.inicio && f.fim && f.fim <= f.inicio;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "Novo destino" : `Editar ${dest.nome}`}</DialogTitle>
          <DialogDescription>O nível de preços e a época dizem à app o que é normal pagar lá.</DialogDescription>
        </DialogHeader>
        <form id="df" className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <Field label="Cidade ou região" htmlFor="df-n">
            <Input id="df-n" list="cities" autoFocus={isNew} value={f.nome} placeholder="Nice, Roma…" onChange={(e) => onName(e.target.value)} />
            <datalist id="cities">{Object.keys(CITY_PRESETS).map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="País" htmlFor="df-p"><Input id="df-p" value={f.pais || ""} onChange={(e) => set("pais", e.target.value)} /></Field>
          <Field label="Chegada" htmlFor="df-i"><Input id="df-i" type="date" value={f.inicio || ""} onChange={(e) => onStart(e.target.value)} /></Field>
          <Field label="Partida" htmlFor="df-f"><Input id="df-f" type="date" aria-invalid={bad || undefined} value={f.fim || ""} min={f.inicio || undefined} onChange={(e) => set("fim", e.target.value)} /></Field>
          {bad && <p className="text-sm text-destructive sm:col-span-2">A partida tem de ser depois da chegada.</p>}
          <Field label="Nível de preços" htmlFor="df-l">
            <Select value={f.nivelPreco} onValueChange={(v) => { setTouched((t) => ({ ...t, nivelPreco: true })); set("nivelPreco", v); }}>
              <SelectTrigger id="df-l" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(COST_LEVELS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Época" htmlFor="df-e">
            <Select value={f.epoca} onValueChange={(v) => { setTouched((t) => ({ ...t, epoca: true })); set("epoca", v); }}>
              <SelectTrigger id="df-e" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(SEASONS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground sm:col-span-2">
            Normal lá: cerca de <b className="text-foreground">{ref.noite} €</b> por noite num quarto duplo médio e <b className="text-foreground">{ref.diaPessoa} €</b> por pessoa e por dia (comida, entradas, transportes locais). Se souberes valores melhores, escreve-os abaixo.
          </div>
          <Field label="Preço normal por noite (€)" htmlFor="df-rn"><Input id="df-rn" type="number" min="0" placeholder={String(ref.noite)} value={f.refNoite ?? ""} onChange={(e) => set("refNoite", e.target.value)} /></Field>
          <Field label="Gasto diário por pessoa (€)" htmlFor="df-rd"><Input id="df-rd" type="number" min="0" placeholder={String(ref.diaPessoa)} value={f.refDia ?? ""} onChange={(e) => set("refDia", e.target.value)} /></Field>
          <Field label="Clima esperado nessas datas" className="sm:col-span-2"><Stars label="Clima" value={f.clima} onChange={(v) => set("clima", v)} /></Field>
          <Field label="Notas" htmlFor="df-x" className="sm:col-span-2"><Textarea id="df-x" value={f.notas || ""} placeholder="Porque nos interessa, o que queremos ver…" onChange={(e) => set("notas", e.target.value)} /></Field>
        </form>
        <DialogFooter className="sm:justify-between">
          {!isNew ? <ConfirmButton size="default" confirmText="Apagar destino e opções?" onConfirm={async () => {
            for (const o of ctx.options.filter((o) => o.destinationId === dest.id)) await ctx.remove("options", o.id);
            for (const i of ctx.items.filter((i) => i.destinationId === dest.id)) await ctx.remove("items", i.id);
            await ctx.remove("destinations", dest.id); onClose();
          }}><Trash2 /> Apagar</ConfirmButton> : <span />}
          <div className="flex gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" form="df" disabled={bad}>Guardar</Button></div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
