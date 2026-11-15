import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { destinationPackage, compareDestinations } from "../lib/scoring.js";
import { COST_LEVELS, SEASONS } from "../lib/model.js";
import { eur, fmtDate, plural } from "../lib/format.js";
import { Ring, Meter, Stars, WeightDots, Empty, Seg } from "./ui.jsx";
import DestinationForm from "./DestinationForm.jsx";

const COST_PARTS = [
  ["voo", "Voos", "var(--c1)"], ["alojamento", "Alojamento", "var(--c2)"], ["transportes", "Transportes", "var(--c3)"],
  ["atividades", "Atividades", "var(--c4)"], ["diaADia", "Dia a dia", "var(--c5)"],
];
const PART_LABELS = { custo: "Custo", qualidade: "Alojamento", logistica: "Voos e horários", interesse: "Interesse", clima: "Clima" };

export default function Destinations({ ctx }) {
  const { trip, destinations, options, items } = ctx;
  const [form, setForm] = useState(null);
  const [view, setView] = useState("cards");
  const nav = useNavigate();
  const ranked = useMemo(() => compareDestinations(
    destinations.map((d) => destinationPackage(d, options, items, trip)), trip.weights,
  ), [destinations, options, items, trip]);
  const maxTotal = Math.max(1, ...ranked.map((p) => p.porPessoa));
  const setW = (k, v) => ctx.updateTrip({ weights: { ...trip.weights, [k]: v } });

  if (!destinations.length) {
    return (
      <>
        <Empty title="Que destinos estão a pensar?" action={<button className="btn primary" onClick={() => setForm("new")}>+ Adicionar destino</button>}>
          <p>Adiciona cada hipótese (Côte d'Azur, Roma…) com as datas. Depois guarda lá dentro os voos, alojamentos, transportes e atividades que forem encontrando. A app soma tudo e compara os destinos pelo custo real por pessoa, pela qualidade e pelo que vos interessa.</p>
        </Empty>
        {form && <DestinationForm ctx={ctx} onClose={() => setForm(null)} onSaved={(id) => nav(`${ctx.base}/d/${id}`)} />}
      </>
    );
  }

  return (
    <div className="stack">
      <div className="toolbar">
        <div className="weights">
          <span className="t">Na escolha do destino, o que pesa mais?</span>
          {Object.entries(PART_LABELS).map(([k, l]) => <WeightDots key={k} label={l} value={trip.weights[k] ?? 0} onChange={(v) => setW(k, v)} />)}
        </div>
        <div className="row">
          {ranked.length > 1 && <Seg value={view} onChange={setView} label="Vista" options={[["cards", "Cartões"], ["table", "Lado a lado"]]} />}
          <button className="btn primary" onClick={() => setForm("new")}>+ Destino</button>
        </div>
      </div>

      {view === "cards" || ranked.length < 2 ? (
        <div className="grid2">
          {ranked.map((p, i) => <DestCard key={p.dest.id} p={p} rank={i + 1} n={ranked.length} ctx={ctx} maxTotal={maxTotal} onEdit={() => setForm(p.dest)} />)}
        </div>
      ) : <DestTable ranked={ranked} ctx={ctx} />}

      <p className="legend">O custo inclui o voo e o alojamento escolhidos (ou, se ainda não escolheram, os melhor pontuados), os transportes e as atividades marcados como "Incluir", e uma estimativa do dia a dia (comida, entradas, transportes locais) para o nível de preços da cidade e a época. Os destinos são comparados pelo custo por pessoa e por dia, para uma viagem mais longa não sair castigada.</p>
      {form && <DestinationForm ctx={ctx} dest={form === "new" ? null : form} onClose={() => setForm(null)} />}
    </div>
  );
}

function DestCard({ p, rank, n, ctx, maxTotal, onEdit }) {
  const { dest } = p;
  const first = rank === 1 && n > 1;
  const over = ctx.trip.orcamento && p.porPessoa > ctx.trip.orcamento;
  return (
    <article className={"card dest" + (first ? " first" : "") + (dest.escolhido ? " chosen" : "")}>
      <div className="chead">
        <Ring value={p.score} highlight={first} />
        <div className="ctitle">
          <h3><Link to={`${ctx.base}/d/${dest.id}`}>{dest.nome}</Link></h3>
          <div className="meta">{[dest.pais, dest.inicio && `${fmtDate(dest.inicio)} – ${fmtDate(dest.fim)}`, p.nights && plural(p.nights, "noite", "noites")].filter(Boolean).join(" · ") || "Sem datas"}</div>
          <div className="chips">
            <span className="chip">{COST_LEVELS[dest.nivelPreco]?.label || "Médio"}</span>
            <span className="chip">{SEASONS[dest.epoca]?.label || "Época média"}</span>
            {dest.escolhido && <span className="chip lemon">O nosso destino</span>}
          </div>
        </div>
        <span className="pos">{n > 1 ? `${rank}.º` : ""}</span>
      </div>

      <div className="money">
        <div><span className="big num">{eur(p.porPessoa)}</span><span className="muted"> por pessoa</span></div>
        <div className="muted num">{eur(p.total)} no total{p.porPessoaDia ? ` · ${eur(p.porPessoaDia)}/pessoa/dia` : ""}</div>
        {over && <div className="warnline">Acima do orçamento ({eur(ctx.trip.orcamento)}/pessoa) em {eur(p.porPessoa - ctx.trip.orcamento)}</div>}
      </div>
      <CostBar p={p} maxTotal={maxTotal} />

      <div className="meters">
        {Object.entries(PART_LABELS).map(([k, l]) => <Meter key={k} label={l} value={p.parts[k]} />)}
      </div>

      <div className="ratings">
        <span className="muted">Interesse</span>
        {ctx.raters.map((r) => (
          <span key={r.email} className="rater"><span className="rname">{r.name}</span>
            <Stars size="sm" label={`Interesse de ${r.name}`} readOnly={!ctx.canRate(r.email)} value={dest.ratings?.[r.email] ?? null}
              onChange={(v) => ctx.upsert("destinations", { id: dest.id, ratings: { ...(dest.ratings || {}), [r.email]: v } })} /></span>
        ))}
      </div>

      {p.avisos.length > 0 && <ul className="avisos">{p.avisos.map((a) => <li key={a}>{a}</li>)}</ul>}

      <div className="cactions">
        <Link className="btn primary sm" to={`${ctx.base}/d/${dest.id}`}>Ver opções</Link>
        <Link className="btn sm" to={`${ctx.base}/roteiro/${dest.id}`}>Roteiro</Link>
        <button className="btn sm" onClick={onEdit}>Editar</button>
        <button className={"btn sm" + (dest.escolhido ? " on" : "")} onClick={() => ctx.upsert("destinations", { id: dest.id, escolhido: !dest.escolhido })}>{dest.escolhido ? "✓ Escolhido" : "É este!"}</button>
      </div>
    </article>
  );
}

function CostBar({ p, maxTotal }) {
  const total = p.porPessoa || 0;
  return (
    <div className="costbar">
      <div className="cbtrack" style={{ width: `${Math.max(8, (total / maxTotal) * 100)}%` }} aria-hidden="true">
        {COST_PARTS.map(([k, , color]) => {
          const v = (p.custos[k] || 0) / p.pessoas;
          return v > 0 ? <i key={k} style={{ flexGrow: v, background: color }} title={`${k}: ${eur(v)}/pessoa`} /> : null;
        })}
      </div>
      <div className="cblegend">
        {COST_PARTS.map(([k, l, color]) => (p.custos[k] ? <span key={k}><i style={{ background: color }} />{l} <b className="num">{eur(p.custos[k] / p.pessoas)}</b></span> : null))}
      </div>
    </div>
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
    ...Object.entries(PART_LABELS).filter(([k]) => k !== "custo").map(([k, l]) => [l, (p) => (p.parts[k] == null ? null : Math.round(p.parts[k] * 100)), "max", (v) => (v == null ? "—" : `${v}/100`)]),
    ["Voo", (p) => p.voo.opt?.nome || null, null, (v) => v || "—"],
    ["Alojamento escolhido", (p) => p.aloj.opt?.nome || null, null, (v) => v || "—"],
  ];
  return (
    <div className="tablewrap">
      <table>
        <thead><tr><th />{ranked.map((p) => <th key={p.dest.id}><Link to={`${ctx.base}/d/${p.dest.id}`}>{p.dest.nome}</Link></th>)}</tr></thead>
        <tbody>
          {rows.map(([label, get, dir, fmt]) => {
            const vals = ranked.map(get);
            const nums = vals.filter((v) => typeof v === "number");
            const best = dir === "min" ? Math.min(...nums) : Math.max(...nums);
            const worst = dir === "min" ? Math.max(...nums) : Math.min(...nums);
            return (
              <tr key={label}><td className="rh">{label}</td>
                {vals.map((v, i) => <td key={i} className={"num " + (dir && nums.length > 1 && best !== worst && typeof v === "number" ? (v === best ? "best" : v === worst ? "worst" : "") : "")}>{fmt(v)}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
