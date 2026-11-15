import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowUpDown, BedDouble, CalendarDays, CalendarPlus, Check, ExternalLink, Info, LayoutGrid, Pencil, Plane, Plus, Rows3, Ticket,
  TrainFront, Undo2, Archive, TriangleAlert,
} from "lucide-react";
import { CATEGORIES, CATEGORY_KEYS, COST_LEVELS, SEASONS, FIELDS } from "../lib/model.js";
import { scoreOption, prosCons, destinationPackage, cityRef, lodgingRealCost, nightsOf, COMPONENT_LABELS, COMPONENT_WEIGHTS, roomNight } from "../lib/scoring.js";
import { eur, num, fmtDate, plural } from "../lib/format.js";
import { EmptyState, Meter, ProsCons, ScoreRing, Stars, useToast } from "./common.jsx";
import { CompareTable } from "./Destinations.jsx";
import OptionForm from "./OptionForm.jsx";
import DestinationForm from "./DestinationForm.jsx";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

const CAT_ICON = { voo: Plane, alojamento: BedDouble, transporte: TrainFront, atividade: Ticket };

export default function DestinationView({ ctx }) {
  const { destId } = useParams();
  const [sp, setSp] = useSearchParams();
  const cat = CATEGORY_KEYS.includes(sp.get("c")) ? sp.get("c") : "alojamento";
  const [view, setView] = useState("cards");
  const [sort, setSort] = useState("score");
  const [form, setForm] = useState(null);
  const [editDest, setEditDest] = useState(false);
  const [showDiscarded, setShowDiscarded] = useState(false);
  const dest = ctx.destinations.find((d) => d.id === destId);
  const pessoas = Math.max(1, Number(ctx.trip.pessoas) || 2);
  const ow = ctx.trip.weights.opiniao;

  const all = useMemo(() => ctx.options.filter((o) => o.destinationId === destId), [ctx.options, destId]);
  const list = useMemo(() => {
    if (!dest) return [];
    const sib = all.filter((o) => o.categoria === cat && !o.descartado);
    const scored = sib.map((o) => ({ o, ...scoreOption(o, dest, pessoas, sib, ow), ...prosCons(o, dest, pessoas, sib) }));
    const price = (x) => (cat === "alojamento" ? lodgingRealCost(x.o, dest, pessoas) : Number(x.o.preco ?? Infinity));
    scored.sort((a, b) => (sort === "preco" ? price(a) - price(b) : b.score - a.score));
    return scored;
  }, [all, cat, dest, pessoas, ow, sort]);
  const discarded = all.filter((o) => o.categoria === cat && o.descartado);

  if (!dest) return <p>Destino não encontrado. <Link className="underline" to={ctx.base}>Voltar</Link></p>;
  const pkg = destinationPackage(dest, ctx.options, ctx.items, ctx.trip);
  const ref = cityRef(dest);
  const topId = list.length > 1 ? [...list].sort((a, b) => b.score - a.score)[0].o.id : null;
  const CatIcon = CAT_ICON[cat];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild><Link to={ctx.base}><ArrowLeft /> Todos os destinos</Link></Button>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-2xl tracking-tight">{dest.nome}{dest.pais && <span className="font-normal text-muted-foreground">, {dest.pais}</span>}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="outline"><CalendarDays />{dest.inicio ? `${fmtDate(dest.inicio)} – ${fmtDate(dest.fim)}` : "Sem datas"}{pkg.nights ? ` · ${plural(pkg.nights, "noite", "noites")}` : ""}</Badge>
            <Badge variant="outline">{COST_LEVELS[dest.nivelPreco]?.label || "Médio"} · {SEASONS[dest.epoca]?.label || "Época média"}</Badge>
            <Tooltip>
              <TooltipTrigger asChild><Badge variant="secondary" className="cursor-help"><Info />Normal: ~{ref.noite} €/noite · {ref.diaPessoa} €/pessoa/dia</Badge></TooltipTrigger>
              <TooltipContent className="max-w-xs">É com isto que a app avalia se um alojamento é caro ou barato para esta cidade e época. Muda em "Editar destino".</TooltipContent>
            </Tooltip>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-semibold tracking-tight tabular">{eur(pkg.porPessoa)}<span className="text-sm font-normal text-muted-foreground"> por pessoa</span></span>
          <span className="text-sm text-muted-foreground tabular">{eur(pkg.total)} total estimado</span>
        </CardContent>
        {pkg.avisos.length > 0 && (
          <CardContent className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-amber-700 dark:text-amber-400">
            {pkg.avisos.map((a) => <span key={a} className="flex items-center gap-1.5"><TriangleAlert className="size-3.5" />{a}</span>)}
          </CardContent>
        )}
        <CardFooter className="gap-2 border-t">
          <Button variant="outline" size="sm" onClick={() => setEditDest(true)}><Pencil /> Editar destino</Button>
          <Button variant="outline" size="sm" asChild><Link to={`${ctx.base}/roteiro/${dest.id}`}><CalendarDays /> Roteiro</Link></Button>
        </CardFooter>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={cat} onValueChange={(v) => setSp({ c: v })} className="-mx-4 max-w-[100vw] overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList>
            {CATEGORY_KEYS.map((k) => {
              const I = CAT_ICON[k];
              const count = all.filter((o) => o.categoria === k && !o.descartado).length;
              const chosen = all.some((o) => o.categoria === k && o.escolhido && !o.descartado);
              return (
                <TabsTrigger key={k} value={k} className="gap-1.5 px-3">
                  <I />{CATEGORIES[k].label}
                  <span className={cn("rounded-full px-1.5 text-[11px] tabular", chosen ? "bg-good text-white" : "bg-muted-foreground/15")}>{count}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup type="single" variant="outline" size="sm" value={sort} onValueChange={(v) => v && setSort(v)} aria-label="Ordenar">
            <ToggleGroupItem value="score" className="px-3">Melhores</ToggleGroupItem>
            <ToggleGroupItem value="preco" className="px-3"><ArrowUpDown /> Preço</ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup type="single" variant="outline" size="sm" value={view} onValueChange={(v) => v && setView(v)} aria-label="Vista">
            <ToggleGroupItem value="cards" aria-label="Cartões"><LayoutGrid /></ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Lado a lado"><Rows3 /></ToggleGroupItem>
          </ToggleGroup>
          <Button size="sm" onClick={() => setForm({ categoria: cat })}><Plus /> {CATEGORIES[cat].one}</Button>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={CatIcon} title={`Ainda não há ${CATEGORIES[cat].label.toLowerCase()} em ${dest.nome}`} action={<Button onClick={() => setForm({ categoria: cat })}><Plus /> Adicionar {CATEGORIES[cat].one.toLowerCase()}</Button>}>
          {EMPTY_TEXT[cat]}
        </EmptyState>
      ) : view === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((x) => <OptionCard key={x.o.id} x={x} ctx={ctx} dest={dest} pessoas={pessoas} top={x.o.id === topId} onEdit={() => setForm({ categoria: cat, option: x.o })} />)}
        </div>
      ) : <OptionTable list={list} cat={cat} dest={dest} pessoas={pessoas} />}

      {discarded.length > 0 && (
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowDiscarded((s) => !s)}><Archive /> Descartados ({discarded.length})</Button>
          {showDiscarded && discarded.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-2 text-sm">
              <span><span className="font-medium">{o.nome}</span> <span className="text-muted-foreground tabular">· {eur(o.preco)}</span></span>
              <Button variant="ghost" size="sm" onClick={() => ctx.upsert("options", { id: o.id, descartado: false })}><Undo2 /> Repor</Button>
            </div>
          ))}
        </div>
      )}
      <p className="max-w-3xl text-xs text-muted-foreground">{LEGEND[cat]}</p>

      {form && <OptionForm ctx={ctx} dest={dest} categoria={form.categoria} option={form.option} onClose={() => setForm(null)} />}
      {editDest && <DestinationForm ctx={ctx} dest={dest} onClose={() => setEditDest(false)} />}
    </div>
  );
}

const EMPTY_TEXT = {
  voo: "Guarda os voos que forem vendo: companhia, horários, escalas, bagagem e preço total. A app prefere voos diretos, com mala e horários que não estraguem o primeiro e o último dia.",
  alojamento: "Guarda hotéis ou apartamentos com o preço total, a nota, a distância ao centro e o que incluem. O preço é comparado com o normal para esta cidade e época.",
  transporte: "Por exemplo: transfer do aeroporto, passe de transportes, comboio para outra cidade. Carrega em \"Incluir\" nos que vão usar para entrarem no custo total.",
  atividade: "Museus, passeios, restaurantes especiais… Deem estrelas de interesse, que é o que mais conta aqui. Carrega em \"Incluir\" para entrar no custo e no roteiro.",
};
const LEGEND = {
  voo: "Pontuação: preço face aos outros voos (45%), duração (20%), escalas (20%) e bagagem (15%), misturado com as vossas estrelas.",
  alojamento: "Pontuação: preço por noite face ao normal na cidade e época (35%), nota (25%), distância ao centro (20%), qualidade (estrelas e m², 10%) e flexibilidade (10%), misturado com as vossas estrelas. Quartos twin perdem 15%. O preço real soma o pequeno-almoço quando não está incluído.",
  transporte: "Pontuação: preço face às outras opções (50%), duração (30%) e comodidade (20%), misturado com as vossas estrelas.",
  atividade: "Pontuação: sobretudo o vosso interesse (70%) e depois o preço por pessoa.",
};

function OptionCard({ x, ctx, dest, pessoas, top, onEdit }) {
  const { o, score, comp, pros, cons } = x;
  const toast = useToast();
  const exclusive = o.categoria === "voo" || o.categoria === "alojamento";
  async function choose() {
    if (exclusive && !o.escolhido) {
      for (const s of ctx.options.filter((s) => s.destinationId === o.destinationId && s.categoria === o.categoria && s.escolhido && s.id !== o.id)) {
        await ctx.upsert("options", { id: s.id, escolhido: false });
      }
    }
    await ctx.upsert("options", { id: o.id, escolhido: !o.escolhido });
  }
  async function toItinerary() {
    await ctx.upsert("items", {
      destinationId: dest.id, optionId: o.id, dia: 0, hora: "", titulo: o.nome,
      tipo: o.categoria === "transporte" ? "transporte" : "atividade", custo: o.preco ?? null, link: o.link || "", notas: "", ordem: Date.now(),
    });
    toast("Foi para o 1.º dia do roteiro. Podes mudar o dia lá.");
  }
  const W = COMPONENT_WEIGHTS[o.categoria] || {};
  return (
    <Card className={cn("gap-4", top && "ring-2 ring-amber-400/70", o.escolhido && "ring-2 ring-good/60")}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <ScoreRing value={score} highlight={top} size={48} />
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base leading-snug">{o.nome}</CardTitle>
            <CardDescription className="text-xs">{metaLine(o)}</CardDescription>
          </div>
        </div>
        <CardAction>
          {o.escolhido ? <Badge className="bg-good text-white"><Check />{exclusive ? "Escolhido" : "Incluído"}</Badge> : top ? <Badge className="bg-amber-400 text-amber-950">Melhor</Badge> : null}
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <span className="text-2xl font-semibold tracking-tight tabular">{eur(o.preco)}</span><span className="text-sm text-muted-foreground"> total</span>
          <p className="text-xs text-muted-foreground tabular">{priceLine(o, dest, pessoas)}</p>
        </div>
        <div className="space-y-2">{Object.keys(W).map((k) => <Meter key={k} label={COMPONENT_LABELS[k]} value={comp[k]} text={meterText(k, o, dest, pessoas)} />)}</div>
        {o.categoria === "alojamento" && (
          <div className="flex flex-wrap gap-1.5">
            {FIELDS.alojamento.filter((f) => f.type === "bool" && o[f.k]).map((f) => <Badge key={f.k} variant="secondary" className="font-normal"><Check className="text-good" />{f.label}</Badge>)}
            <Badge variant={o.cama === "twin" ? "destructive" : "secondary"} className="font-normal">{o.cama === "twin" ? "Twin" : "Cama de casal"}</Badge>
          </div>
        )}
        <Separator />
        <ProsCons stacked pros={pros} cons={cons} minePros={o.prosMeus || []} mineCons={o.contrasMeus || []} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{o.categoria === "atividade" ? "Interesse" : "Gostam?"}</span>
          {ctx.raters.map((r) => (
            <span key={r.email} className="flex items-center gap-1.5"><span className="font-medium">{r.name}</span>
              <Stars size="sm" label={`Avaliação de ${r.name}`} readOnly={!ctx.canRate(r.email)} value={o.ratings?.[r.email] ?? null}
                onChange={(v) => ctx.upsert("options", { id: o.id, ratings: { ...(o.ratings || {}), [r.email]: v } })} /></span>
          ))}
        </div>
        {o.notas && <p className="whitespace-pre-wrap rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">{o.notas}</p>}
      </CardContent>
      <CardFooter className="mt-auto flex flex-wrap gap-2 border-t">
        <Button size="sm" variant={o.escolhido ? "secondary" : "default"} onClick={choose}>
          {o.escolhido ? <><Check /> {exclusive ? "Escolhido" : "Incluído"}</> : exclusive ? "Escolher" : "Incluir"}
        </Button>
        {o.link && <Button size="sm" variant="outline" asChild><a href={o.link} target="_blank" rel="noopener noreferrer"><ExternalLink /> Abrir</a></Button>}
        {(o.categoria === "atividade" || o.categoria === "transporte") && (
          <Tooltip><TooltipTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="Pôr no roteiro" onClick={toItinerary}><CalendarPlus /></Button></TooltipTrigger><TooltipContent>Pôr no roteiro</TooltipContent></Tooltip>
        )}
        <div className="ml-auto flex gap-1">
          <Tooltip><TooltipTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="Editar" onClick={onEdit}><Pencil /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="Descartar" onClick={() => ctx.upsert("options", { id: o.id, descartado: true, escolhido: false })}><Archive /></Button></TooltipTrigger><TooltipContent>Descartar</TooltipContent></Tooltip>
        </div>
      </CardFooter>
    </Card>
  );
}

function metaLine(o) {
  if (o.categoria === "voo") return [o.companhia, o.origem && o.destinoAeroporto ? `${o.origem} → ${o.destinoAeroporto}` : null, o.escalas === 0 ? "Direto" : o.escalas ? plural(o.escalas, "escala", "escalas") : null, o.idaHora && `chega ${o.idaHora}`, o.voltaHora && `volta ${o.voltaHora}`].filter(Boolean).join(" · ");
  if (o.categoria === "alojamento") return [o.zona, o.estrelas ? "★".repeat(Math.min(5, o.estrelas)) : null, o.nota ? `nota ${num(o.nota)}${o.comentarios ? ` (${Number(o.comentarios).toLocaleString("pt-PT")})` : ""}` : null].filter(Boolean).join(" · ");
  const t = FIELDS[o.categoria].find((f) => f.k === "tipo")?.options.find(([v]) => v === o.tipo)?.[1];
  return [t, o.duracao ? `${o.duracao} ${o.categoria === "transporte" ? "min" : "h"}` : null].filter(Boolean).join(" · ");
}
function priceLine(o, dest, pessoas) {
  if (o.preco == null) return "Sem preço";
  if (o.categoria === "alojamento") {
    const nights = o.noites ?? nightsOf(dest) ?? 1;
    return `${eur(o.preco / nights)}/noite · ${eur(lodgingRealCost(o, dest, pessoas))} com pequeno-almoço`;
  }
  return `${eur(o.preco / pessoas)} por pessoa`;
}
function meterText(k, o, dest, pessoas) {
  if (k === "preco" && o.categoria === "alojamento" && o.preco != null) {
    const d = Math.round((roomNight(o, dest, pessoas) / cityRef(dest).noite - 1) * 100);
    return d === 0 ? "normal" : d < 0 ? `${d}%` : `+${d}%`;
  }
  if (k === "nota") return o.nota != null ? num(o.nota) : undefined;
  if (k === "localizacao") return o.distancia != null ? `${num(o.distancia, 2)} km` : undefined;
  if (k === "duracao") return o.duracao != null ? (o.categoria === "voo" ? `${num(o.duracao, 2)} h` : `${o.duracao} min`) : undefined;
  if (k === "escalas") return o.escalas != null ? (o.escalas === 0 ? "direto" : String(o.escalas)) : undefined;
  if (k === "bagagem") return { mochila: "mochila", cabine: "cabine", porao: "porão" }[o.bagagem];
  return undefined;
}

function OptionTable({ list, cat, dest, pessoas }) {
  const rows = [
    ["Pontuação", (x) => x.score, "max", (v) => `${v} pts`],
    ["Preço total", (x) => x.o.preco, "min", eur],
    ["Por pessoa", (x) => (x.o.preco == null ? null : x.o.preco / pessoas), "min", eur],
  ];
  if (cat === "alojamento") {
    rows.push(["Por noite", (x) => (x.o.preco == null ? null : x.o.preco / (x.o.noites ?? nightsOf(dest) ?? 1)), "min", eur]);
    rows.push(["Com pequeno-almoço", (x) => (x.o.preco == null ? null : lodgingRealCost(x.o, dest, pessoas)), "min", eur]);
  }
  const better = { nota: "max", distancia: "min", estrelas: "max", m2: "max", comentarios: "max", duracao: "min", escalas: "min", conforto: "max" };
  FIELDS[cat].forEach((f) => rows.push([f.label, (x) => (f.type === "bool" ? (x.o[f.k] ? 1 : 0) : x.o[f.k] ?? null), f.type === "bool" ? "max" : better[f.k] || null,
    (v) => (f.type === "bool" ? (v ? "Sim" : "Não") : f.type === "select" ? (f.options.find(([k]) => k === v)?.[1] ?? "—") : f.type === "stars" ? (v ? "★".repeat(v) : "—") : v == null || v === "" ? "—" : f.type === "number" ? num(v, 2) : v)]));
  rows.push(["Vossas estrelas (média)", (x) => (x.opinion == null ? null : Math.round(x.opinion * 10) / 10), "max", (v) => (v == null ? "—" : `${num(v)} ★`)]);
  rows.push(["Link", (x) => x.o.link || null, null, (v) => (v ? <a href={v} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4">Abrir <ExternalLink className="size-3" /></a> : "—")]);
  return <CompareTable heads={list.map((x) => ({ id: x.o.id, label: <>{x.o.nome}{x.o.escolhido && <Badge className="ml-2 bg-good text-white">escolhido</Badge>}</> }))} rows={rows} items={list} />;
}
