import { useState } from "react";
import { Modal, Stars, ConfirmButton } from "./ui.jsx";
import { COST_LEVELS, SEASONS, CITY_PRESETS, suggestSeason } from "../lib/model.js";
import { cityRef } from "../lib/scoring.js";

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
    const obj = {
      ...f, nome: f.nome.trim() || "Destino",
      refNoite: f.refNoite === "" || f.refNoite == null ? null : Number(f.refNoite),
      refDia: f.refDia === "" || f.refDia == null ? null : Number(f.refDia),
    };
    const id = await ctx.upsert("destinations", obj);
    onClose();
    onSaved?.(id);
  }
  const bad = f.inicio && f.fim && f.fim <= f.inicio;
  return (
    <Modal title={isNew ? "Novo destino" : `Editar ${dest.nome}`} onClose={onClose}
      footer={<>{!isNew && <ConfirmButton confirmText="Apagar destino e opções?" onConfirm={async () => {
        for (const o of ctx.options.filter((o) => o.destinationId === dest.id)) await ctx.remove("options", o.id);
        for (const i of ctx.items.filter((i) => i.destinationId === dest.id)) await ctx.remove("items", i.id);
        await ctx.remove("destinations", dest.id); onClose();
      }}>Apagar</ConfirmButton>}<span className="sp" /><button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" form="df" disabled={bad}>Guardar</button></>}>
      <form id="df" className="form" onSubmit={submit}>
        <label className="field" htmlFor="df-n">Cidade ou região
          <input id="df-n" list="cities" autoFocus={isNew} value={f.nome} placeholder="Nice, Roma…" onChange={(e) => onName(e.target.value)} />
          <datalist id="cities">{Object.keys(CITY_PRESETS).map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <label className="field" htmlFor="df-p">País<input id="df-p" value={f.pais || ""} onChange={(e) => set("pais", e.target.value)} /></label>
        <label className="field" htmlFor="df-i">Chegada<input id="df-i" type="date" value={f.inicio || ""} onChange={(e) => onStart(e.target.value)} /></label>
        <label className="field" htmlFor="df-f">Partida<input id="df-f" type="date" value={f.fim || ""} min={f.inicio || undefined} onChange={(e) => set("fim", e.target.value)} /></label>
        {bad && <p className="err full">A partida tem de ser depois da chegada.</p>}
        <label className="field" htmlFor="df-l">Nível de preços da cidade
          <select id="df-l" value={f.nivelPreco} onChange={(e) => { setTouched((t) => ({ ...t, nivelPreco: true })); set("nivelPreco", e.target.value); }}>
            {Object.entries(COST_LEVELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="df-e">Época
          <select id="df-e" value={f.epoca} onChange={(e) => { setTouched((t) => ({ ...t, epoca: true })); set("epoca", e.target.value); }}>
            {Object.entries(SEASONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <p className="hint full">Com isto, a app sabe o que é normal pagar lá: cerca de <b>{ref.noite} €</b> por noite num quarto duplo médio e <b>{ref.diaPessoa} €</b> por pessoa e por dia em comida, entradas e transportes locais. Se souberes valores melhores, escreve-os abaixo.</p>
        <label className="field" htmlFor="df-rn">Preço normal por noite (€)<input id="df-rn" type="number" min="0" placeholder={String(ref.noite)} value={f.refNoite ?? ""} onChange={(e) => set("refNoite", e.target.value)} /></label>
        <label className="field" htmlFor="df-rd">Gasto diário por pessoa (€)<input id="df-rd" type="number" min="0" placeholder={String(ref.diaPessoa)} value={f.refDia ?? ""} onChange={(e) => set("refDia", e.target.value)} /></label>
        <div className="field full"><span>Clima esperado nessas datas</span><Stars label="Clima" value={f.clima} onChange={(v) => set("clima", v)} /></div>
        <label className="field full" htmlFor="df-x">Notas<textarea id="df-x" value={f.notas || ""} placeholder="Porque nos interessa, o que queremos ver…" onChange={(e) => set("notas", e.target.value)} /></label>
      </form>
    </Modal>
  );
}
