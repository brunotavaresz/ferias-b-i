import { useState } from "react";
import { Trash2 } from "lucide-react";
import { CATEGORIES, FIELDS } from "../lib/model.js";
import { nightsOf } from "../lib/scoring.js";
import { ConfirmButton, Field, Stars } from "./common.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PRICE_HINT = {
  voo: "Total ida e volta para todos os viajantes, com as malas que vão levar.",
  alojamento: "Total da estadia para todos, com taxas.",
  transporte: "Total para todos (ida e volta, se for o caso).",
  atividade: "Total para todos.",
};
const NAME_PH = { voo: "easyJet direto, sexta à tarde", alojamento: "Hotel de Berne", transporte: "Tram do aeroporto", atividade: "Museus do Vaticano" };

export default function OptionForm({ ctx, dest, categoria, option, onClose }) {
  const isNew = !option;
  const [f, setF] = useState(() => ({
    categoria, nome: "", link: "", preco: "", notas: "", prosMeus: [], contrasMeus: [],
    ...(categoria === "alojamento" ? { cama: "casal", tipo: "hotel" } : {}),
    ...(categoria === "voo" ? { bagagem: "cabine", escalas: 0, idaData: dest.inicio || "", voltaData: dest.fim || "" } : {}),
    ...(option || {}),
  }));
  const [prosTxt, setProsTxt] = useState((option?.prosMeus || []).join("\n"));
  const [consTxt, setConsTxt] = useState((option?.contrasMeus || []).join("\n"));
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const fields = FIELDS[categoria];
  const nights = nightsOf(dest);
  const toNum = (v) => (v === "" || v == null ? null : Number(String(v).replace(",", ".")));
  const lines = (t) => t.split("\n").map((s) => s.trim()).filter(Boolean);

  async function submit(e) {
    e.preventDefault();
    const obj = { ...f, destinationId: dest.id, nome: (f.nome || "").trim() || defaultName(f, categoria) };
    for (const fd of fields) if (fd.type === "number") obj[fd.k] = toNum(f[fd.k]);
    obj.preco = toNum(f.preco);
    obj.noites = toNum(f.noites);
    obj.prosMeus = lines(prosTxt);
    obj.contrasMeus = lines(consTxt);
    await ctx.upsert("options", obj);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "Novo" : "Editar"} {CATEGORIES[categoria].one.toLowerCase()}</DialogTitle>
          <DialogDescription>{dest.nome}{nights ? ` · ${nights} noites` : ""}</DialogDescription>
        </DialogHeader>
        <form id="of" className="grid gap-4 sm:grid-cols-3" onSubmit={submit}>
          <Field label="Nome" htmlFor="of-nome" className="sm:col-span-2"><Input id="of-nome" autoFocus={isNew} value={f.nome} placeholder={NAME_PH[categoria]} onChange={(e) => set("nome", e.target.value)} /></Field>
          <Field label="Preço total (€)" htmlFor="of-preco" hint={PRICE_HINT[categoria]}><Input id="of-preco" type="number" step="any" min="0" value={f.preco ?? ""} onChange={(e) => set("preco", e.target.value)} /></Field>
          <Field label="Link" htmlFor="of-link" className="sm:col-span-3"><Input id="of-link" type="url" value={f.link || ""} placeholder="https://…" onChange={(e) => set("link", e.target.value)} /></Field>
          {categoria === "alojamento" && (
            <Field label="Noites" htmlFor="of-noites"><Input id="of-noites" type="number" min="1" placeholder={nights ? String(nights) : ""} value={f.noites ?? ""} onChange={(e) => set("noites", e.target.value)} /></Field>
          )}
          {fields.filter((x) => x.type !== "bool").map((fd) => <FieldInput key={fd.k} fd={fd} value={f[fd.k]} onChange={(v) => set(fd.k, v)} />)}
          {fields.some((x) => x.type === "bool") && (
            <div className="grid gap-3 rounded-lg border p-3 sm:col-span-3 sm:grid-cols-2">
              {fields.filter((x) => x.type === "bool").map((fd) => (
                <label key={fd.k} htmlFor={`of-${fd.k}`} className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                  {fd.label}<Switch id={`of-${fd.k}`} checked={!!f[fd.k]} onCheckedChange={(v) => set(fd.k, v)} />
                </label>
              ))}
            </div>
          )}
          <Separator className="sm:col-span-3" />
          <Field label="Vantagens que vocês notaram" htmlFor="of-pros" hint="Uma por linha.">
            <Textarea id="of-pros" value={prosTxt} onChange={(e) => setProsTxt(e.target.value)} />
          </Field>
          <Field label="Desvantagens que vocês notaram" htmlFor="of-cons" hint="Uma por linha.">
            <Textarea id="of-cons" value={consTxt} onChange={(e) => setConsTxt(e.target.value)} />
          </Field>
          <Field label="Notas" htmlFor="of-notas"><Textarea id="of-notas" value={f.notas || ""} onChange={(e) => set("notas", e.target.value)} /></Field>
        </form>
        <DialogFooter className="sm:justify-between">
          {!isNew ? <ConfirmButton size="default" confirmText="Apagar mesmo?" onConfirm={async () => { await ctx.remove("options", option.id); onClose(); }}><Trash2 /> Apagar</ConfirmButton> : <span />}
          <div className="flex gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" form="of">Guardar</Button></div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldInput({ fd, value, onChange }) {
  const id = `of-${fd.k}`;
  if (fd.type === "select") {
    return (
      <Field label={fd.label} htmlFor={id}>
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full"><SelectValue placeholder="Escolher…" /></SelectTrigger>
          <SelectContent>{fd.options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
    );
  }
  if (fd.type === "stars") return <Field label={fd.label}><Stars label={fd.label} value={value ?? null} onChange={onChange} /></Field>;
  return <Field label={fd.label} htmlFor={id}><Input id={id} type={fd.type} step={fd.step ?? undefined} placeholder={fd.ph || ""} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></Field>;
}

function defaultName(f, c) {
  if (c === "voo") return [f.companhia, f.origem && f.destinoAeroporto ? `${f.origem} → ${f.destinoAeroporto}` : ""].filter(Boolean).join(" ") || "Voo";
  return CATEGORIES[c].one;
}
