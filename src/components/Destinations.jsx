import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BedDouble, CalendarDays, Check, CloudSun, Heart, LayoutGrid, MapPin, Pencil, Plane, Plus, Rows3, SlidersHorizontal, TriangleAlert, Wallet,
} from "lucide-react";
import { destinationPackage, compareDestinations } from "../lib/scoring.js";
import { COST_LEVELS, SEASONS } from "../lib/model.js";
import { eur, fmtDate, plural } from "../lib/format.js";
import { EmptyState, Meter, ScoreRing, Stars, WeightControl } from "./common.jsx";
import DestinationForm from "./DestinationForm.jsx";
import PendingCard from "./PendingCard.jsx";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const COST_PARTS = [
  ["voo", "Voos", "bg-chart-1"], ["alojamento", "Alojamento", "bg-chart-2"], ["transportes", "Transportes", "bg-chart-3"],
  ["atividades", "Atividades", "bg-chart-4"], ["diaADia", "Dia a dia", "bg-chart-5"],
];
const PARTS = [
  ["custo", "Custo", Wallet], ["qualidade", "Alojamento", BedDouble], ["logistica", "Voos e horários", Plane],
  ["interesse", "Interesse", Heart], ["clima", "Clima", CloudSun],
];

export default function Destinations({ ctx }) {
  const { trip, destinations, options, items } = ctx;
  const [form, setForm] = useState(null);
  const [view, setView] = useState("cards");
  const [showWeights, setShowWeights] = useState(false);
  const nav = useNavigate();
  const ranked = useMemo(() => compareDestinations(
    destinations.map((d) => destinationPackage(d, options, items, trip)), trip.weights,
  ), [destinations, options, items, trip]);
  const maxTotal = Math.max(1, ...ranked.map((p) => p.porPessoa));
  const setW = (k, v) => ctx.updateTrip({ weights: { ...trip.weights, [k]: v } });

  const formEl = form && <DestinationForm ctx={ctx} dest={form === "new" ? null : form} onClose={() => setForm(null)} onSaved={form === "new" ? (id) => nav(`${ctx.base}/d/${id}`) : undefined} />;
  if (!destinations.length) {
    return (
      <>
        <EmptyState icon={MapPin} title="Que destinos estão a pensar?" action={<Button onClick={() => setForm("new")}><Plus /> Adicionar destino</Button>}>
          Adiciona cada hipótese (Côte d'Azur, Roma…) com as datas. Depois guarda lá dentro os voos, alojamentos, transportes e atividades que forem encontrando. A app soma tudo e compara os destinos pelo custo real por pessoa, pela qualidade e pelo que vos interessa.
        </EmptyState>
        {formEl}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Destinos</h2>
          <p className="text-sm text-muted-foreground">{plural(ranked.length, "destino", "destinos")} · ordenados pelo que pesa mais para vocês</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={showWeights ? "secondary" : "outline"} onClick={() => setShowWeights((s) => !s)}><SlidersHorizontal /> Prioridades</Button>
          {ranked.length > 1 && (
            <ToggleGroup type="single" variant="outline" value={view} onValueChange={(v) => v && setView(v)} aria-label="Vista">
              <ToggleGroupItem value="cards" aria-label="Cartões"><LayoutGrid /></ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Lado a lado"><Rows3 /></ToggleGroupItem>
            </ToggleGroup>
          )}
          <Button onClick={() => setForm("new")}><Plus /> Destino</Button>
        </div>
      </div>

      <PendingCard ctx={ctx} limit={5} />

      {showWeights && (
        <Card className="gap-4 py-5">
          <CardHeader className="px-5"><CardTitle className="text-base">Na escolha do destino, o que pesa mais?</CardTitle><CardDescription>Toca nos segmentos. Zero ignora o critério.</CardDescription></CardHeader>
          <CardContent className="grid gap-5 px-5 sm:grid-cols-3 lg:grid-cols-5">
            {PARTS.map(([k, l, I]) => <WeightControl key={k} icon={I} label={l} value={trip.weights[k] ?? 0} onChange={(v) => setW(k, v)} />)}
          </CardContent>
        </Card>
      )}

      {view === "cards" || ranked.length < 2 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {ranked.map((p, i) => <DestCard key={p.dest.id} p={p} rank={i + 1} n={ranked.length} ctx={ctx} maxTotal={maxTotal} onEdit={() => setForm(p.dest)} />)}
        </div>
      ) : <DestTable ranked={ranked} ctx={ctx} />}

      <p className="max-w-3xl text-xs text-muted-foreground">O custo junta o voo e o alojamento escolhidos (ou, enquanto não escolherem, os melhor pontuados), os transportes e atividades marcados como "Incluir" e uma estimativa do dia a dia para o nível de preços e a época. Os destinos comparam-se pelo custo por pessoa e por dia, para uma viagem mais longa não sair castigada.</p>
      {formEl}
    </div>
  );
}

function DestCard({ p, rank, n, ctx, maxTotal, onEdit }) {
  const { dest } = p;
  const first = rank === 1 && n > 1;
  const over = ctx.trip.orcamento && p.porPessoa > ctx.trip.orcamento;
  return (
    <Card className={cn("gap-5", first && "ring-2 ring-amber-400/70", dest.escolhido && "ring-2 ring-good/60")}>
      <CardHeader>
        <div className="flex items-start gap-4">
          <ScoreRing value={p.score} highlight={first} />
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="text-xl"><Link to={`${ctx.base}/d/${dest.id}`} className="hover:underline underline-offset-4">{dest.nome}</Link>{dest.pais && <span className="font-normal text-muted-foreground">, {dest.pais}</span>}</CardTitle>
            <CardDescription className="flex items-center gap-1.5"><CalendarDays className="size-3.5" />{dest.inicio ? `${fmtDate(dest.inicio)} – ${fmtDate(dest.fim)}` : "Sem datas"}{p.nights ? ` · ${plural(p.nights, "noite", "noites")}` : ""}</CardDescription>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <Badge variant="secondary">{COST_LEVELS[dest.nivelPreco]?.label || "Médio"}</Badge>
              <Badge variant="secondary">{SEASONS[dest.epoca]?.label || "Época média"}</Badge>
              {dest.escolhido && <Badge className="bg-good text-white"><Check /> O nosso destino</Badge>}
            </div>
          </div>
        </div>
        {n > 1 && <CardAction><Badge variant={first ? "default" : "outline"} className={first ? "bg-amber-400 text-amber-950" : ""}>{rank}.º</Badge></CardAction>}
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><span className="text-3xl font-semibold tracking-tight tabular">{eur(p.porPessoa)}</span><span className="text-sm text-muted-foreground"> por pessoa</span></div>
          <span className="text-sm text-muted-foreground tabular">{eur(p.total)} total{p.porPessoaDia ? ` · ${eur(p.porPessoaDia)}/dia` : ""}</span>
        </div>
        {over && <p className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-400"><TriangleAlert className="size-4" />{eur(p.porPessoa - ctx.trip.orcamento)} acima do orçamento ({eur(ctx.trip.orcamento)}/pessoa)</p>}

        <div className="space-y-2">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" style={{ width: `${Math.max(10, (p.porPessoa / maxTotal) * 100)}%` }}>
            {COST_PARTS.map(([k, l, color]) => {
              const v = (p.custos[k] || 0) / p.pessoas;
              return v > 0 ? (
                <Tooltip key={k}><TooltipTrigger asChild><div className={cn("h-full", color)} style={{ flexGrow: v }} /></TooltipTrigger><TooltipContent>{l}: {eur(v)}/pessoa</TooltipContent></Tooltip>
              ) : null;
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {COST_PARTS.map(([k, l, color]) => (p.custos[k] ? <span key={k} className="flex items-center gap-1.5"><span className={cn("size-2 rounded-full", color)} />{l} <span className="font-medium text-foreground tabular">{eur(p.custos[k] / p.pessoas)}</span></span> : null))}
          </div>
        </div>

        <Separator />
        <div className="space-y-2.5">{PARTS.map(([k, l]) => <Meter key={k} label={l} value={p.parts[k]} />)}</div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Interesse</span>
          {ctx.raters.map((r) => (
            <span key={r.email} className="flex items-center gap-2"><span className="font-medium">{r.name}</span>
              <Stars size="sm" label={`Interesse de ${r.name}`} readOnly={!ctx.canRate(r.email)} value={dest.ratings?.[r.email] ?? null}
                onChange={(v) => ctx.upsert("destinations", { id: dest.id, ratings: { ...(dest.ratings || {}), [r.email]: v } })} /></span>
          ))}
        </div>

        {p.avisos.length > 0 && (
          <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
            {p.avisos.map((a) => <li key={a} className="flex items-center gap-2"><TriangleAlert className="size-3.5 shrink-0" />{a}</li>)}
          </ul>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 border-t">
        <Button asChild size="sm"><Link to={`${ctx.base}/d/${dest.id}`}>Ver opções</Link></Button>
        <Button asChild size="sm" variant="outline"><Link to={`${ctx.base}/roteiro/${dest.id}`}><CalendarDays /> Roteiro</Link></Button>
        <Button size="sm" variant="ghost" onClick={onEdit}><Pencil /> Editar</Button>
        <Button size="sm" variant={dest.escolhido ? "secondary" : "ghost"} className="ml-auto" onClick={() => ctx.upsert("destinations", { id: dest.id, escolhido: !dest.escolhido })}>
          {dest.escolhido ? <><Check /> Escolhido</> : <><Heart /> É este!</>}
        </Button>
      </CardFooter>
    </Card>
  );
}

function DestTable({ ranked, ctx }) {
  const rows = [
    ["Pontuação", (p) => p.score, "max", (v) => (v == null ? "—" : `${v} pts`)],
    ["Por pessoa", (p) => p.porPessoa, "min", eur],
    ["Por pessoa e dia", (p) => p.porPessoaDia, "min", eur],
    ["Total", (p) => p.total, "min", eur],
    ["Voos", (p) => p.custos.voo, "min", eur],
    ["Alojamento", (p) => p.custos.alojamento, "min", eur],
    ["Transportes", (p) => p.custos.transportes, "min", eur],
    ["Atividades", (p) => p.custos.atividades, "min", eur],
    ["Dia a dia (estimado)", (p) => p.custos.diaADia, "min", eur],
    ["Noites", (p) => p.nights, null, (v) => v ?? "—"],
    ...PARTS.filter(([k]) => k !== "custo").map(([k, l]) => [l, (p) => (p.parts[k] == null ? null : Math.round(p.parts[k] * 100)), "max", (v) => (v == null ? "—" : `${v}/100`)]),
    ["Voo", (p) => p.voo.opt?.nome || null, null, (v) => v || "—"],
    ["Alojamento", (p) => p.aloj.opt?.nome || null, null, (v) => v || "—"],
  ];
  return <CompareTable heads={ranked.map((p) => ({ id: p.dest.id, label: <Link to={`${ctx.base}/d/${p.dest.id}`} className="hover:underline">{p.dest.nome}</Link> }))} rows={rows} items={ranked} />;
}

/* Tabela lado a lado: verde no melhor de cada linha, vermelho no pior. */
export function CompareTable({ heads, rows, items }) {
  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-card" />
            {heads.map((h) => <TableHead key={h.id} className="min-w-36 font-semibold text-foreground">{h.label}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(([label, get, dir, fmt], ri) => {
            const vals = items.map(get);
            const nums = vals.filter((v) => typeof v === "number");
            const best = dir === "min" ? Math.min(...nums) : Math.max(...nums);
            const worst = dir === "min" ? Math.max(...nums) : Math.min(...nums);
            return (
              <TableRow key={label + ri}>
                <TableCell className="sticky left-0 z-10 bg-card text-muted-foreground">{label}</TableCell>
                {vals.map((v, i) => {
                  const mark = dir && nums.length > 1 && best !== worst && typeof v === "number" ? (v === best ? "best" : v === worst ? "worst" : "") : "";
                  return <TableCell key={i} className={cn("tabular", mark === "best" && "font-semibold text-good", mark === "worst" && "text-bad")}>{mark === "best" && <Check className="mr-1 inline size-3.5" />}{fmt(v)}</TableCell>;
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
