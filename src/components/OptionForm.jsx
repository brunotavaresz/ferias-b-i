import { useState } from "react";
import { Modal, Stars, ConfirmButton } from "./ui.jsx";
import { CATEGORIES, FIELDS } from "../lib/model.js";
import { nightsOf } from "../lib/scoring.js";

const PRICE_HINT = {
  voo: "Preço total ida e volta para todos os viajantes, com as malas que vão levar.",
  alojamento: "Preço total da estadia para todos, com taxas.",
  transporte: "Preço total para todos (ida e volta, se for o caso).",
  atividade: "Preço total para todos.",
};

export default function OptionForm({ ctx, dest, categoria, option, onClose }) {
  const isNew = !option;
  const [f, setF] = useState(() => ({
    categoria, nome: "", link: "", preco: "", notas: "", prosMeus: [], contrasMeus: [],
    ...(categoria === "alojamento" ? { cama: "casal", tipo: "hotel" } : {}),
    ...(categoria === "voo" ? { bagagem: "cabine", escalas: 0, idaData: dest.inicio || "", voltaData: dest.fim || "" } : {}),
    ...(option || {}),
  }));
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const fields = FIELDS[categoria];
  const nights = nightsOf(dest);

  async function submit(e) {
    e.preventDefault();
    const obj = { ...f, destinationId: dest.id, nome: (f.nome || "").trim() || defaultName(f, categoria) };
    for (const fd of fields) if (fd.type === "number") obj[fd.k] = f[fd.k] === "" || f[fd.k] == null ? null : Number(String(f[fd.k]).replace(",", "."));
    obj.preco = f.preco === "" || f.preco == null ? null : Number(String(f.preco).replace(",", "."));
    obj.noites = f.noites === "" || f.noites == null ? null : Number(f.noites);
    obj.prosMeus = (f.prosMeus || []).map((x) => x.trim()).filter(Boolean);
    obj.contrasMeus = (f.contrasMeus || []).map((x) => x.trim()).filter(Boolean);
    await ctx.upsert("options", obj);
    onClose();
  }
  const lines = (k) => (f[k] || []).join("\n");
  const setLines = (k, v) => set(k, v.split("\n").map((s) => s.trimStart()).filter((s, i, a) => s || i === a.length - 1));

  return (
    <Modal wide title={`${isNew ? "Novo" : "Editar"} ${CATEGORIES[categoria].one.toLowerCase()} · ${dest.nome}`} onClose={onClose}
      footer={<>{!isNew && <ConfirmButton confirmText="Apagar mesmo?" onConfirm={async () => { await ctx.remove("options", option.id); onClose(); }}>Apagar</ConfirmButton>}<span className="sp" /><button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" form="of">Guardar</button></>}>
      <form id="of" className="form three" onSubmit={submit}>
        <label className="field span2" htmlFor="of-nome">Nome<input id="of-nome" autoFocus={isNew} value={f.nome} placeholder={namePh(categoria)} onChange={(e) => set("nome", e.target.value)} /></label>
        <label className="field" htmlFor="of-preco">Preço total (€)<input id="of-preco" type="number" step="any" min="0" value={f.preco ?? ""} onChange={(e) => set("preco", e.target.value)} /></label>
        <p className="hint full">{PRICE_HINT[categoria]}</p>
        <label className="field full" htmlFor="of-link">Link<input id="of-link" type="url" value={f.link || ""} placeholder="https://…" onChange={(e) => set("link", e.target.value)} /></label>
        {categoria === "alojamento" && (
          <label className="field" htmlFor="of-noites">Noites<input id="of-noites" type="number" min="1" placeholder={nights ? String(nights) : ""} value={f.noites ?? ""} onChange={(e) => set("noites", e.target.value)} /></label>
        )}
        {fields.filter((x) => x.type !== "bool").map((fd) => <Field key={fd.k} fd={fd} value={f[fd.k]} onChange={(v) => set(fd.k, v)} />)}
        {fields.some((x) => x.type === "bool") && (
          <div className="toggles full">
            {fields.filter((x) => x.type === "bool").map((fd) => (
              <label key={fd.k} className="tog" htmlFor={`of-${fd.k}`}><input id={`of-${fd.k}`} type="checkbox" checked={!!f[fd.k]} onChange={(e) => set(fd.k, e.target.checked)} />{fd.label}</label>
            ))}
          </div>
        )}
        <label className="field full" htmlFor="of-pros">Vantagens que vocês notaram (uma por linha)<textarea id="of-pros" value={lines("prosMeus")} onChange={(e) => setLines("prosMeus", e.target.value)} /></label>
        <label className="field full" htmlFor="of-cons">Desvantagens que vocês notaram (uma por linha)<textarea id="of-cons" value={lines("contrasMeus")} onChange={(e) => setLines("contrasMeus", e.target.value)} /></label>
        <label className="field full" htmlFor="of-notas">Notas<textarea id="of-notas" value={f.notas || ""} onChange={(e) => set("notas", e.target.value)} /></label>
      </form>
    </Modal>
  );
}

function Field({ fd, value, onChange }) {
  const id = `of-${fd.k}`;
  if (fd.type === "select") {
    return <label className="field" htmlFor={id}>{fd.label}<select id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      {!fd.options.some(([v]) => v === value) && <option value="">—</option>}
      {fd.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>;
  }
  if (fd.type === "stars") return <div className="field"><span>{fd.label}</span><Stars label={fd.label} value={value ?? null} onChange={onChange} /></div>;
  return <label className="field" htmlFor={id}>{fd.label}<input id={id} type={fd.type} step={fd.step ?? undefined} placeholder={fd.ph || ""} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function namePh(c) {
  return { voo: "easyJet direto, sexta à tarde", alojamento: "Hotel de Berne", transporte: "Tram do aeroporto", atividade: "Museu do Vaticano" }[c];
}
function defaultName(f, c) {
  if (c === "voo") return [f.companhia, f.origem && f.destinoAeroporto ? `${f.origem} → ${f.destinoAeroporto}` : ""].filter(Boolean).join(" ") || "Voo";
  return CATEGORIES[c].one;
}
