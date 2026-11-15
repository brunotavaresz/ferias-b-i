import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CATEGORIES, CATEGORY_KEYS, COST_LEVELS, SEASONS, FIELDS } from "../lib/model.js";
import { scoreOption, prosCons, destinationPackage, cityRef, lodgingRealCost, nightsOf, COMPONENT_LABELS, COMPONENT_WEIGHTS, roomNight } from "../lib/scoring.js";
import { eur, num, fmtDate, plural } from "../lib/format.js";
import { Ring, Meter, Stars, Seg, Empty, useToast } from "./ui.jsx";
import OptionForm from "./OptionForm.jsx";
import DestinationForm from "./DestinationForm.jsx";

export default function DestinationView({ ctx }) {
  const { destId } = useParams();
  const [sp, setSp] = useSearchParams();
  const cat = CATEGORY_KEYS.includes(sp.get("c")) ? sp.get("c") : "alojamento";
  const [view, setView] = useState("cards");
  const [sort, setSort] = useState("score");
  const [form, setForm] = useState(null);
  const [editDest, setEditDest] = useState(false);
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

  if (!dest) return <p>Destino não encontrado. <Link to={ctx.base}>Voltar</Link></p>;
  const pkg = destinationPackage(dest, ctx.options, ctx.items, ctx.trip);
  const ref = cityRef(dest);
  const topId = list.length > 1 ? [...list].sort((a, b) => b.score - a.score)[0].o.id : null;

  return (
    <div className="stack">
      <div className="desthead">
        <div>
          <Link to={ctx.base} className="kicker back">← Todos os destinos</Link>
          <h2>{dest.nome}{dest.pais ? <span className="muted">, {dest.pais}</span> : null}</h2>
          <div className="chips">
            <span className="chip">{dest.inicio ? `${fmtDate(dest.inicio)} – ${fmtDate(dest.fim)}` : "Sem datas"}{pkg.nights ? ` · ${plural(pkg.nights, "noite", "noites")}` : ""}</span>
            <span className="chip">{COST_LEVELS[dest.nivelPreco]?.label || "Médio"} · {SEASONS[dest.epoca]?.label || "Época média"}</span>
            <span className="chip" title="Referência usada para avaliar preços">Normal: ~{ref.noite} €/noite · {ref.diaPessoa} €/pessoa/dia</span>
          </div>
        </div>
        <div className="destsum">
          <div><span className="big num">{eur(pkg.porPessoa)}</span><span className="muted"> /pessoa</span></div>
          <div className="muted num">{eur(pkg.total)} total estimado</div>
          <div className="row">
            <button className="btn sm" onClick={() => setEditDest(true)}>Editar destino</button>
            <Link className="btn sm" to={`${ctx.base}/roteiro/${dest.id}`}>Roteiro</Link>
          </div>
        </div>
      </div>

      <nav className="cattabs" aria-label="Categorias">
        {CATEGORY_KEYS.map((k) => {
          const count = all.filter((o) => o.categoria === k && !o.descartado).length;
          const chosen = all.some((o) => o.categoria === k && o.escolhido && !o.descartado);
          return (
            <button key={k} className={k === cat ? "on" : ""} onClick={() => setSp({ c: k })}>
              <span className="ci" aria-hidden="true">{CATEGORIES[k].icon}</span>{CATEGORIES[k].label}
              <span className="count">{count}</span>{chosen && <span className="dot" title="Já tem escolha" />}
            </button>
          );
        })}
      </nav>

      <div className="toolbar">
        <div className="row">
          <Seg label="Vista" value={view} onChange={setView} options={[["cards", "Cartões"], ["table", "Lado a lado"]]} />
          <Seg label="Ordenar" value={sort} onChange={setSort} options={[["score", "Melhor pontuação"], ["preco", "Mais barato"]]} />
        </div>
        <button className="btn primary" onClick={() => setForm({ categoria: cat })}>+ {CATEGORIES[cat].one}</button>
      </div>

      {list.length === 0 ? (
        <Empty title={`Ainda não há ${CATEGORIES[cat].label.toLowerCase()} em ${dest.nome}`} action={<button className="btn primary" onClick={() => setForm({ categoria: cat })}>+ Adicionar {CATEGORIES[cat].one.toLowerCase()}</button>}>
          <p>{EMPTY_TEXT[cat]}</p>
        </Empty>
      ) : view === "cards" ? (
        <div className="grid3">
          {list.map((x) => <OptionCard key={x.o.id} x={x} ctx={ctx} dest={dest} pessoas={pessoas} top={x.o.id === topId} onEdit={() => setForm({ categoria: cat, option: x.o })} siblings={list} />)}
        </div>
      ) : <OptionTable list={list} cat={cat} dest={dest} pessoas={pessoas} ctx={ctx} />}

      {discarded.length > 0 && (
        <details className="out">
          <summary>Descartados ({discarded.length})</summary>
          {discarded.map((o) => (
            <div key={o.id} className="outrow"><span><b>{o.nome}</b> · <span className="num">{eur(o.preco)}</span></span>
              <button className="btn sm" onClick={() => ctx.upsert("options", { id: o.id, descartado: false })}>Repor</button></div>
          ))}
        </details>
      )}
      <p className="legend">{LEGEND[cat]}</p>

      {form && <OptionForm ctx={ctx} dest={dest} categoria={form.categoria} option={form.option} onClose={() => setForm(null)} />}
      {editDest && <DestinationForm ctx={ctx} dest={dest} onClose={() => setEditDest(false)} />}
    </div>
  );
}

const EMPTY_TEXT = {
  voo: "Guarda os voos que forem vendo (companhia, horários, escalas, bagagem e preço total). A app prefere voos diretos, com mala e horários que não estraguem o primeiro e o último dia.",
  alojamento: "Guarda hotéis ou apartamentos com o preço total, a nota, a distância ao centro e o que incluem. O preço é comparado com o normal para esta cidade e época.",
  transporte: "Ex.: transfer do aeroporto, passe de transportes, comboio para outra cidade. Marca \"Incluir\" nos que vão usar para entrarem no custo total.",
  atividade: "Museus, passeios, restaurantes especiais… Deem estrelas de interesse: é isso que mais conta aqui. Marca \"Incluir\" para entrar no custo e no roteiro.",
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
      tipo: o.categoria === "transporte" ? "transporte" : "atividade", custo: o.preco ?? null, link: o.link || "", notas: "",
      ordem: Date.now(),
    });
    toast("Adicionado ao 1.º dia do roteiro. Muda o dia lá.");
  }
  const W = COMPONENT_WEIGHTS[o.categoria] || {};
  return (
    <article className={"card opt" + (top ? " first" : "") + (o.escolhido ? " chosen" : "")}>
      <div className="chead">
        <Ring value={score} highlight={top} />
        <div className="ctitle">
          <h3>{o.nome}</h3>
          <div className="meta">{metaLine(o)}</div>
        </div>
        {o.escolhido ? <span className="pos chosen">{exclusive ? "Escolhido" : "Incluído"}</span> : top ? <span className="pos">Melhor</span> : null}
      </div>
      <div className="money">
        <div><span className="big num">{eur(o.preco)}</span><span className="muted"> total</span></div>
        <div className="muted num">{priceLine(o, dest, pessoas)}</div>
      </div>
      <div className="meters">
        {Object.keys(W).map((k) => <Meter key={k} label={COMPONENT_LABELS[k]} value={comp[k]} text={meterText(k, o, dest, pessoas)} />)}
      </div>
      {o.categoria === "alojamento" && (
        <div className="tags">
          {FIELDS.alojamento.filter((f) => f.type === "bool" && o[f.k]).map((f) => <span key={f.k} className="tag g">✓ {f.label}</span>)}
          <span className={"tag " + (o.cama === "twin" ? "b" : "")}>{o.cama === "twin" ? "Twin" : "Cama de casal"}</span>
        </div>
      )}
      <div className="pc">
        <div className="p"><h4>Vantagens</h4><ul>{pros.concat(o.prosMeus || []).filter(Boolean).map((t, i) => <li key={i} className={i >= pros.length ? "mine" : ""}>{t}</li>)}{!pros.length && !(o.prosMeus || []).length && <li className="none">Nada a apontar</li>}</ul></div>
        <div className="c"><h4>Desvantagens</h4><ul>{cons.concat(o.contrasMeus || []).filter(Boolean).map((t, i) => <li key={i} className={i >= cons.length ? "mine" : ""}>{t}</li>)}{!cons.length && !(o.contrasMeus || []).length && <li className="none">Nada a apontar</li>}</ul></div>
      </div>
      <div className="ratings">
        <span className="muted">{o.categoria === "atividade" ? "Interesse" : "Gostam?"}</span>
        {ctx.raters.map((r) => (
          <span key={r.email} className="rater"><span className="rname">{r.name}</span>
            <Stars size="sm" label={`Avaliação de ${r.name}`} readOnly={!ctx.canRate(r.email)} value={o.ratings?.[r.email] ?? null}
              onChange={(v) => ctx.upsert("options", { id: o.id, ratings: { ...(o.ratings || {}), [r.email]: v } })} /></span>
        ))}
      </div>
      {o.notas && <div className="note">{o.notas}</div>}
      <div className="cactions">
        <button className={"btn sm" + (o.escolhido ? " on" : " primary")} onClick={choose}>{exclusive ? (o.escolhido ? "✓ Escolhido" : "Escolher") : (o.escolhido ? "✓ Incluído" : "Incluir")}</button>
        {o.link && <a className="btn sm" href={o.link} target="_blank" rel="noopener noreferrer">Abrir ↗</a>}
        {(o.categoria === "atividade" || o.categoria === "transporte") && <button className="btn sm" onClick={toItinerary}>+ Roteiro</button>}
        <button className="btn sm" onClick={onEdit}>Editar</button>
        <button className="btn sm ghost" onClick={() => ctx.upsert("options", { id: o.id, descartado: true, escolhido: false })}>Descartar</button>
      </div>
    </article>
  );
}

function metaLine(o) {
  if (o.categoria === "voo") return [o.companhia, o.origem && o.destinoAeroporto ? `${o.origem} → ${o.destinoAeroporto}` : null, o.escalas === 0 ? "Direto" : o.escalas ? plural(o.escalas, "escala", "escalas") : null].filter(Boolean).join(" · ");
  if (o.categoria === "alojamento") return [o.zona, o.estrelas ? "★".repeat(Math.min(5, o.estrelas)) : null, o.nota ? `nota ${num(o.nota)}${o.comentarios ? ` (${Number(o.comentarios).toLocaleString("pt-PT")})` : ""}` : null].filter(Boolean).join(" · ");
  const t = FIELDS[o.categoria].find((f) => f.k === "tipo")?.options.find(([v]) => v === o.tipo)?.[1];
  return [t, o.duracao ? `${o.duracao} ${o.categoria === "transporte" ? "min" : "h"}` : null].filter(Boolean).join(" · ");
}
function priceLine(o, dest, pessoas) {
  if (o.preco == null) return "Sem preço";
  if (o.categoria === "alojamento") {
    const nights = o.noites ?? nightsOf(dest) ?? 1;
    return `${eur(o.preco / nights)}/noite · real com peq.-almoço ${eur(lodgingRealCost(o, dest, pessoas))}`;
  }
  return `${eur(o.preco / pessoas)} por pessoa`;
}
function meterText(k, o, dest, pessoas) {
  if (k === "preco" && o.categoria === "alojamento" && o.preco != null) {
    const r = roomNight(o, dest, pessoas) / cityRef(dest).noite;
    const d = Math.round((r - 1) * 100);
    return d === 0 ? "normal" : d < 0 ? `${d}%` : `+${d}%`;
  }
  if (k === "nota") return o.nota != null ? num(o.nota) : undefined;
  if (k === "localizacao") return o.distancia != null ? `${num(o.distancia, 2)} km` : undefined;
  if (k === "duracao") return o.duracao != null ? (o.categoria === "voo" ? `${num(o.duracao, 2)} h` : `${o.duracao} min`) : undefined;
  if (k === "escalas") return o.escalas != null ? (o.escalas === 0 ? "direto" : String(o.escalas)) : undefined;
  if (k === "bagagem") return { mochila: "mochila", cabine: "cabine", porao: "porão" }[o.bagagem];
  return undefined;
}

function OptionTable({ list, cat, dest, pessoas, ctx }) {
  const base = [
    ["Pontuação", (x) => x.score, "max", (v) => `${v} pts`],
    ["Preço total", (x) => x.o.preco, "min", eur],
    ["Por pessoa", (x) => (x.o.preco == null ? null : x.o.preco / pessoas), "min", eur],
  ];
  if (cat === "alojamento") {
    base.push(["Por noite", (x) => (x.o.preco == null ? null : x.o.preco / (x.o.noites ?? nightsOf(dest) ?? 1)), "min", eur]);
    base.push(["Real c/ peq.-almoço", (x) => (x.o.preco == null ? null : lodgingRealCost(x.o, dest, pessoas)), "min", eur]);
  }
  const better = { nota: "max", distancia: "min", estrelas: "max", m2: "max", comentarios: "max", duracao: "min", escalas: "min", conforto: "max" };
  const fieldRows = FIELDS[cat].map((f) => [f.label, (x) => (f.type === "bool" ? (x.o[f.k] ? 1 : 0) : x.o[f.k] ?? null), f.type === "bool" ? "max" : better[f.k] || null,
    (v) => (f.type === "bool" ? (v ? "Sim" : "Não") : f.type === "select" ? (f.options.find(([k]) => k === v)?.[1] ?? "—") : f.type === "stars" ? (v ? "★".repeat(v) : "—") : v == null || v === "" ? "—" : f.type === "number" ? num(v, 2) : v)]);
  const opinion = [["Média das vossas estrelas", (x) => (x.opinion == null ? null : Math.round(x.opinion * 10) / 10), "max", (v) => (v == null ? "—" : `${num(v)} ★`)]];
  const rows = [...base, ...fieldRows, ...opinion];
  return (
    <div className="tablewrap">
      <table>
        <thead><tr><th />{list.map((x) => <th key={x.o.id}>{x.o.nome}{x.o.escolhido && <span className="s">escolhido</span>}</th>)}</tr></thead>
        <tbody>
          {rows.map(([label, get, dir, fmt]) => {
            const vals = list.map(get);
            const nums = vals.filter((v) => typeof v === "number");
            const b = dir === "min" ? Math.min(...nums) : Math.max(...nums), w = dir === "min" ? Math.max(...nums) : Math.min(...nums);
            return <tr key={label}><td className="rh">{label}</td>{vals.map((v, i) => <td key={i} className={"num " + (dir && nums.length > 1 && b !== w && typeof v === "number" ? (v === b ? "best" : v === w ? "worst" : "") : "")}>{fmt(v)}</td>)}</tr>;
          })}
          <tr><td className="rh">Link</td>{list.map((x) => <td key={x.o.id}>{x.o.link ? <a className="btn sm" href={x.o.link} target="_blank" rel="noopener noreferrer">Abrir ↗</a> : "—"}</td>)}</tr>
        </tbody>
      </table>
    </div>
  );
}
