import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { daysOf, destinationPackage } from "../lib/scoring.js";
import { ITEM_TYPES } from "../lib/model.js";
import { eur, fmtWeekday, plural } from "../lib/format.js";
import { Empty, Modal, ConfirmButton, useToast } from "./ui.jsx";
import DestinationForm from "./DestinationForm.jsx";

const TYPE_ICON = { atividade: "★", transporte: "⇄", comida: "◒", alojamento: "⌂", livre: "☼" };

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

  if (!dests.length) return <Empty title="Primeiro, um destino" action={<Link className="btn primary" to={ctx.base}>Ir para os destinos</Link>}><p>O roteiro monta-se para um destino com datas.</p></Empty>;

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
    <div className="stack">
      <div className="toolbar">
        <div className="row">
          <label className="field inline" htmlFor="it-d">Destino
            <select id="it-d" value={dest.id} onChange={(e) => nav(`${ctx.base}/roteiro/${e.target.value}`)}>
              {dests.map((d) => <option key={d.id} value={d.id}>{d.nome}{d.escolhido ? " (escolhido)" : ""}</option>)}
            </select>
          </label>
          <span className="muted">{days.length ? `${plural(days.length, "dia", "dias")} · ${plural(items.length, "plano", "planos")} · ${eur(totalItems)} em atividades e deslocações` : ""}</span>
        </div>
        <button className="btn" onClick={() => window.print()}>Imprimir</button>
      </div>

      {!days.length ? (
        <Empty title={`${dest.nome} ainda não tem datas`} action={<button className="btn primary" onClick={() => setEditDest(true)}>Pôr datas</button>}><p>Com as datas de chegada e partida, a app cria os dias do roteiro.</p></Empty>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="pending">
              <span className="t">Por encaixar no roteiro</span>
              {pending.map((o) => (
                <span key={o.id} className="pend">
                  {o.nome}
                  <select aria-label={`Dia para ${o.nome}`} defaultValue="" onChange={async (e) => {
                    if (e.target.value === "") return;
                    await add(Number(e.target.value), { titulo: o.nome, optionId: o.id, tipo: o.categoria === "transporte" ? "transporte" : "atividade", custo: o.preco ?? null, link: o.link || "" });
                    toast(`"${o.nome}" adicionado.`);
                  }}>
                    <option value="">Pôr no dia…</option>
                    {days.map((d) => <option key={d.index} value={d.index}>Dia {d.index + 1} · {fmtWeekday(d.date)}</option>)}
                  </select>
                </span>
              ))}
            </div>
          )}
          <div className="days">
            {days.map((d) => {
              const its = items.filter((i) => i.dia === d.index);
              const fx = fixed.filter((f) => f.dia === d.index);
              const cost = its.reduce((s, i) => s + (Number(i.custo) || 0), 0);
              return (
                <section key={d.index} className="day">
                  <header><span className="dn">Dia {d.index + 1}</span><span className="dd">{fmtWeekday(d.date)}</span>{cost > 0 && <span className="dc num">{eur(cost)}</span>}</header>
                  <ol className="items">
                    {[...fx.map((f) => ({ ...f, fixed: true })), ...its].sort((a, b) => (a.hora || "99").localeCompare(b.hora || "99")).map((it) => (
                      <li key={it.id} className={"item t-" + it.tipo + (it.fixed ? " fixed" : "")}>
                        <span className="ih num">{it.hora || "—"}</span>
                        <span className="ii" aria-hidden="true">{TYPE_ICON[it.tipo] || "•"}</span>
                        <span className="ib">
                          <b>{it.titulo}</b>
                          {it.notas && <span className="muted">{it.notas}</span>}
                          {it.link && <a href={it.link} target="_blank" rel="noopener noreferrer">link ↗</a>}
                        </span>
                        {it.custo ? <span className="ic num">{eur(it.custo)}</span> : <span />}
                        {!it.fixed && (
                          <span className="ia">
                            <button className="btn ghost xs" aria-label="Subir" onClick={() => move(it, -1)}>↑</button>
                            <button className="btn ghost xs" aria-label="Descer" onClick={() => move(it, 1)}>↓</button>
                            <button className="btn ghost xs" aria-label="Dia anterior" onClick={() => shiftDay(it, -1)} disabled={it.dia === 0}>◀</button>
                            <button className="btn ghost xs" aria-label="Dia seguinte" onClick={() => shiftDay(it, 1)} disabled={it.dia === days.length - 1}>▶</button>
                            <button className="btn ghost xs" onClick={() => setEdit(it)}>Editar</button>
                          </span>
                        )}
                      </li>
                    ))}
                    {!its.length && !fx.length && <li className="item none muted">Dia livre</li>}
                  </ol>
                  <QuickAdd onAdd={(data) => add(d.index, data)} />
                </section>
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
    out.push({ id: "fx-ida", dia: 0, hora: v.idaHora || "", tipo: "transporte", titulo: `Chegada · ${v.nome}`, notas: pkg.voo.chosen ? "" : "voo ainda por escolher" });
    out.push({ id: "fx-volta", dia: last, hora: v.voltaHora || "", tipo: "transporte", titulo: `Partida · ${v.nome}`, notas: "" });
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
  if (!open) return <button className="btn ghost sm addline" onClick={() => setOpen(true)}>+ Adicionar plano</button>;
  return (
    <form className="quickadd" onSubmit={async (e) => {
      e.preventDefault();
      if (!f.titulo.trim()) return;
      await onAdd({ hora: f.hora, titulo: f.titulo.trim(), tipo: f.tipo, custo: f.custo === "" ? null : Number(f.custo) });
      setF({ hora: "", titulo: "", tipo: f.tipo, custo: "" });
    }}>
      <input aria-label="Hora" type="time" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} />
      <input aria-label="O quê" autoFocus placeholder="O quê?" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
      <select aria-label="Tipo" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
        {Object.entries(ITEM_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <input aria-label="Custo total (€)" type="number" min="0" placeholder="€" value={f.custo} onChange={(e) => setF({ ...f, custo: e.target.value })} />
      <button className="btn primary sm">Juntar</button>
      <button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>Fechar</button>
    </form>
  );
}

function ItemForm({ ctx, item, days, onClose }) {
  const [f, setF] = useState({ ...item, custo: item.custo ?? "" });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal title="Editar plano" onClose={onClose}
      footer={<><ConfirmButton confirmText="Apagar mesmo?" onConfirm={async () => { await ctx.remove("items", item.id); onClose(); }}>Apagar</ConfirmButton><span className="sp" /><button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" form="itf">Guardar</button></>}>
      <form id="itf" className="form" onSubmit={async (e) => {
        e.preventDefault();
        await ctx.upsert("items", { ...f, dia: Number(f.dia), custo: f.custo === "" ? null : Number(f.custo) });
        onClose();
      }}>
        <label className="field full" htmlFor="itf-t">O quê<input id="itf-t" value={f.titulo} onChange={(e) => set("titulo", e.target.value)} /></label>
        <label className="field" htmlFor="itf-d">Dia<select id="itf-d" value={f.dia} onChange={(e) => set("dia", e.target.value)}>{days.map((d) => <option key={d.index} value={d.index}>Dia {d.index + 1} · {fmtWeekday(d.date)}</option>)}</select></label>
        <label className="field" htmlFor="itf-h">Hora<input id="itf-h" type="time" value={f.hora || ""} onChange={(e) => set("hora", e.target.value)} /></label>
        <label className="field" htmlFor="itf-y">Tipo<select id="itf-y" value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>{Object.entries(ITEM_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="field" htmlFor="itf-c">Custo total (€)<input id="itf-c" type="number" min="0" value={f.custo} onChange={(e) => set("custo", e.target.value)} /></label>
        <label className="field full" htmlFor="itf-l">Link<input id="itf-l" type="url" value={f.link || ""} onChange={(e) => set("link", e.target.value)} /></label>
        <label className="field full" htmlFor="itf-n">Notas<textarea id="itf-n" value={f.notas || ""} onChange={(e) => set("notas", e.target.value)} /></label>
      </form>
    </Modal>
  );
}
