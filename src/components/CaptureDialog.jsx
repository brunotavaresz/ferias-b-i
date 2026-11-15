import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardPaste, ImagePlus, Loader2, Sparkles, X, RefreshCw, Check } from "lucide-react";
import { aiEnabled, aiExtract, imageToDataUrl } from "../lib/ai.js";
import { fromAi, findExisting, mergeOption } from "../lib/capture.js";
import { geocode, kmBetween } from "../lib/geo.js";
import { CATEGORIES } from "../lib/model.js";
import { eur, num } from "../lib/format.js";
import { Field, useToast } from "./common.jsx";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/* Colar uma página (hotel, lista de resultados, voo, atividade) ou imagens, e guardar o que a IA tirar de lá. */
export default function CaptureDialog({ ctx, open, onOpenChange, defaultDestId }) {
  const nav = useNavigate();
  const toast = useToast();
  const dests = ctx.destinations;
  const [destId, setDestId] = useState(null);
  const [text, setText] = useState("");
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [sel, setSel] = useState({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setDestId(defaultDestId || dests.find((d) => d.escolhido)?.id || dests[0]?.id || null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const dest = dests.find((d) => d.id === destId);

  function reset() { setText(""); setImages([]); setResult(null); setError(""); setSel({}); }
  async function addFiles(files) {
    const imgs = [...files].filter((f) => f.type.startsWith("image/")).slice(0, 6 - images.length);
    const urls = await Promise.all(imgs.map((f) => imageToDataUrl(f)));
    setImages((x) => [...x, ...urls].slice(0, 6));
  }
  async function run(t = text) {
    if (!dest) return setError("Escolhe primeiro o destino.");
    if (!t.trim() && !images.length) return setError("Cola o texto da página ou uma imagem.");
    setBusy(true); setError(""); setResult(null);
    try {
      const res = await aiExtract({ text: t, images, context: { destino: dest.nome, inicio: dest.inicio, fim: dest.fim, pessoas: ctx.trip.pessoas } });
      const r = fromAi(res, dest.id);
      if (!r.opts.length) throw new Error("Não encontrei nenhum hotel, voo ou atividade nesse texto.");
      setResult(r);
      setSel(Object.fromEntries(r.opts.map((_, i) => [i, true])));
    } catch (e) {
      setError(e.message || "Não foi possível ler.");
    } finally { setBusy(false); }
  }
  function onPaste(e) {
    const files = [...(e.clipboardData?.files || [])];
    if (files.length) { e.preventDefault(); addFiles(files); return; }
    const t = e.clipboardData?.getData("text") || "";
    if (t.length > 300 && !text) setTimeout(() => run(t), 50);
  }

  const chosen = useMemo(() => (result ? result.opts.filter((_, i) => sel[i]) : []), [result, sel]);
  async function save() {
    setSaving(true);
    let created = 0, updated = 0;
    for (const o of chosen) {
      const ex = findExisting(ctx.options, o);
      if (ex) { await ctx.upsert("options", mergeOption(ex, o)); updated++; }
      else { await ctx.upsert("options", { ...o, ratings: {} }); created++; }
    }
    // localizar no mapa quando é um só alojamento ou atividade com morada
    if (chosen.length === 1 && chosen[0].morada && (chosen[0].categoria === "alojamento" || chosen[0].categoria === "atividade")) {
      geocode(`${chosen[0].morada}, ${dest.nome}`).then((g) => {
        if (!g) return;
        const saved = findExisting(ctx.options, chosen[0]);
        const patch = { lat: g.lat, lng: g.lng, ...(chosen[0].distancia == null && dest.lat ? { distancia: kmBetween(dest, g) } : {}) };
        if (saved) ctx.upsert("options", { id: saved.id, ...patch });
      });
    }
    setSaving(false);
    toast([created && `${created} ${created === 1 ? "nova" : "novas"}`, updated && `${updated} ${updated === 1 ? "atualizada" : "atualizadas"}`].filter(Boolean).join(" · ") || "Nada guardado");
    const cat = result.categoria;
    reset();
    onOpenChange(false);
    nav(`${ctx.base}/d/${dest.id}?c=${cat}`);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="size-5 text-brand" />Guardar a partir de uma página</DialogTitle>
          <DialogDescription>Na página do Booking, da companhia aérea ou da atividade carrega em Ctrl+A e Ctrl+C e cola aqui. Também podes colar a página de resultados de uma pesquisa (vários hotéis de uma vez) ou prints das fotos.</DialogDescription>
        </DialogHeader>

        {!aiEnabled ? (
          <div className="rounded-lg border border-amber-400/50 bg-amber-400/5 p-4 text-sm">A leitura automática ainda não está ligada. Falta configurar o intermediário no Cloudflare com a chave do Gemini (ver README, secção "IA").</div>
        ) : !dests.length ? (
          <div className="rounded-lg border p-4 text-sm">Cria primeiro um destino. Assim a app sabe onde guardar.</div>
        ) : (
          <div className="space-y-4">
            <Field label="Destino">
              <Select value={destId || undefined} onValueChange={setDestId}>
                <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Escolher destino" /></SelectTrigger>
                <SelectContent>{dests.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            {!result && (
              <>
                <div className="relative">
                  <Textarea aria-label="Texto colado" value={text} onChange={(e) => setText(e.target.value)} onPaste={onPaste} disabled={busy}
                    placeholder="Cola aqui (Ctrl+V)…" className="min-h-40 resize-y font-mono text-xs" />
                  {!text && !busy && <ClipboardPaste className="pointer-events-none absolute right-3 top-3 size-5 text-muted-foreground/40" />}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {images.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt={`Imagem ${i + 1}`} className="size-16 rounded-md border object-cover" />
                      <button type="button" aria-label="Tirar imagem" className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background" onClick={() => setImages((x) => x.filter((_, j) => j !== i))}><X className="size-3" /></button>
                    </div>
                  ))}
                  {images.length < 6 && <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><ImagePlus /> Juntar fotos</Button>}
                  <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                  <span className="text-xs text-muted-foreground">Até 6 imagens: prints dos quartos, da vista, da casa de banho…</span>
                </div>
                {busy && <div className="space-y-2" aria-live="polite"><p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />A ler a página…</p><Skeleton className="h-24 rounded-lg" /></div>}
              </>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {result && <Preview result={result} sel={sel} setSel={setSel} ctx={ctx} />}
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          {result ? <Button variant="ghost" onClick={() => { setResult(null); }}><RefreshCw /> Voltar a colar</Button> : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            {result
              ? <Button onClick={save} disabled={!chosen.length || saving}>{saving ? <Loader2 className="animate-spin" /> : <Check />} Guardar {chosen.length > 1 ? chosen.length : ""}</Button>
              : aiEnabled && dests.length > 0 && <Button onClick={() => run()} disabled={busy}><Sparkles /> Ler</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Preview({ result, sel, setSel, ctx }) {
  const { opts, categoria, lista } = result;
  if (lista || opts.length > 1) {
    const all = opts.every((_, i) => sel[i]);
    return (
      <div className="space-y-2">
        <p className="text-sm">Encontrei <b>{opts.length}</b> {CATEGORIES[categoria].label.toLowerCase()}. Escolhe os que queres guardar.</p>
        <div className="max-h-[50svh] overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead className="w-8"><Checkbox checked={all} onCheckedChange={(v) => setSel(Object.fromEntries(opts.map((_, i) => [i, !!v])))} aria-label="Todos" /></TableHead>
                <TableHead>Nome</TableHead><TableHead>Preço</TableHead><TableHead>Nota</TableHead><TableHead>Coment.</TableHead><TableHead>Centro</TableHead><TableHead>Inclui</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opts.map((o, i) => {
                const ex = findExisting(ctx.options, o);
                return (
                  <TableRow key={i} className={cn(!sel[i] && "opacity-50")}>
                    <TableCell><Checkbox checked={!!sel[i]} onCheckedChange={(v) => setSel((s) => ({ ...s, [i]: !!v }))} aria-label={o.nome} /></TableCell>
                    <TableCell className="max-w-56 whitespace-normal font-medium">{o.nome}{ex && <Badge variant="outline" className="ml-1.5">atualiza</Badge>}</TableCell>
                    <TableCell className="tabular">{eur(o.preco)}</TableCell>
                    <TableCell className="tabular">{num(o.nota)}</TableCell>
                    <TableCell className="tabular">{o.comentarios ? Number(o.comentarios).toLocaleString("pt-PT") : "—"}</TableCell>
                    <TableCell className="tabular">{o.distancia != null ? `${num(o.distancia, 2)} km` : "—"}</TableCell>
                    <TableCell className="whitespace-normal text-xs text-muted-foreground">{[o.pequenoAlmoco && "peq.-almoço", o.cancelamento && "canc. grátis", o.pagarHotel && "paga lá", o.cama === "twin" && "twin"].filter(Boolean).join(" · ") || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
  const o = opts[0];
  const ex = findExisting(ctx.options, o);
  const facts = categoria === "alojamento"
    ? [["Preço", eur(o.preco)], ["Nota", o.nota != null ? `${num(o.nota)}${o.comentarios ? ` (${Number(o.comentarios).toLocaleString("pt-PT")})` : ""}` : null], ["Centro", o.distancia != null ? `${num(o.distancia, 2)} km` : null], ["Quarto", o.m2 ? `${o.m2} m²` : null], ["Cama", o.cama === "twin" ? "Twin" : "Casal"],
       ["Peq.-almoço", o.pequenoAlmoco ? "Incluído" : "Não"], ["Cancelamento", o.cancelamento ? "Grátis" : "Não / ?"], ["Zona", o.zona || null]]
    : categoria === "voo"
      ? [["Preço", eur(o.preco)], ["Companhia", o.companhia], ["Rota", o.origem && `${o.origem} → ${o.destinoAeroporto}`], ["Escalas", o.escalas === 0 ? "Direto" : o.escalas], ["Chega", o.idaHora], ["Volta", o.voltaHora], ["Bagagem", o.bagagem]]
      : [["Preço", eur(o.preco)], ["Duração", o.duracao], ["Local", o.morada]];
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{CATEGORIES[categoria].one}</Badge>
        <h3 className="text-lg font-semibold">{o.nome}</h3>
        {ex && <Badge variant="outline">já existe: vai ser atualizado</Badge>}
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        {facts.filter(([, v]) => v != null && v !== "").map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium tabular">{v}</dd></div>)}
      </dl>
      {o.notasCategorias && (
        <div className="flex flex-wrap gap-1.5">{Object.entries(o.notasCategorias).map(([k, v]) => <Badge key={k} variant="outline" className="font-normal">{CAT_LABEL[k] || k} <b className="tabular">{num(v)}</b></Badge>)}</div>
      )}
      {(o.prosMeus?.length > 0 || o.contrasMeus?.length > 0) && (
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <ul className="space-y-1">{(o.prosMeus || []).map((t, i) => <li key={i} className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-good" />{t}</li>)}</ul>
          <ul className="space-y-1">{(o.contrasMeus || []).map((t, i) => <li key={i} className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-bad" />{t}</li>)}</ul>
        </div>
      )}
      {o.notas && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{o.notas}</p>}
    </div>
  );
}

export const CAT_LABEL = { limpeza: "Limpeza", conforto: "Conforto", localizacao: "Localização", funcionarios: "Funcionários", instalacoes: "Instalações", qualidadePreco: "Qualidade/preço", wifi: "Wi-Fi" };
