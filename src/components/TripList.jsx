import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { store } from "../lib/store.js";
import { DEFAULT_WEIGHTS } from "../lib/model.js";
import { Modal, Empty, useToast } from "./ui.jsx";
import { eur, plural } from "../lib/format.js";

export default function TripList({ user }) {
  const [trips, setTrips] = useState(null);
  const [creating, setCreating] = useState(false);
  const toast = useToast();
  useEffect(() => store.watchTrips(user, setTrips, () => toast("Não consegui carregar as viagens. Confirma as regras do Firestore.", "err")), [user, toast]);

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <div className="kicker">As vossas viagens</div>
          <h1>Para onde vamos?</h1>
        </div>
        <button className="btn primary" onClick={() => setCreating(true)}>+ Nova viagem</button>
      </div>
      {trips === null ? <div className="muted">A carregar…</div> : trips.length === 0 ? (
        <Empty title="Ainda não há viagens" action={<button className="btn primary" onClick={() => setCreating(true)}>Criar a primeira viagem</button>}>
          <p>Uma viagem é uma ideia de férias, por exemplo "Férias de março 2027". Lá dentro juntam vários destinos possíveis (Côte d'Azur, Roma…) e, em cada um, guardam voos, alojamentos, transportes e atividades. A app compara tudo e ajuda a montar o roteiro.</p>
        </Empty>
      ) : (
        <div className="grid3">
          {trips.map((t) => (
            <Link key={t.id} to={`/t/${t.id}`} className="tripcard">
              <span className="kicker">{plural((t.members || []).length, "pessoa com acesso", "pessoas com acesso")}</span>
              <h3>{t.nome}</h3>
              <span className="muted">{t.pessoas || 2} viajantes{t.orcamento ? ` · orçamento ${eur(t.orcamento)}/pessoa` : ""}</span>
              {t.notas && <span className="muted clamp2">{t.notas}</span>}
            </Link>
          ))}
        </div>
      )}
      {creating && <NewTrip user={user} onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewTrip({ user, onClose }) {
  const [f, setF] = useState({ nome: "", pessoas: 2, orcamento: "", notas: "" });
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const toast = useToast();
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const id = await store.createTrip(user, {
        nome: f.nome.trim() || "Férias", pessoas: Number(f.pessoas) || 2,
        orcamento: f.orcamento === "" ? null : Number(f.orcamento), notas: f.notas.trim(), weights: DEFAULT_WEIGHTS,
      });
      onClose();
      nav(`/t/${id}`);
    } catch {
      toast("Não foi possível criar a viagem.", "err");
      setBusy(false);
    }
  }
  return (
    <Modal title="Nova viagem" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" form="nt" disabled={busy}>Criar</button></>}>
      <form id="nt" className="form" onSubmit={submit}>
        <label className="field full" htmlFor="nt-nome">Nome<input id="nt-nome" autoFocus value={f.nome} placeholder="Férias de março 2027" onChange={(e) => setF({ ...f, nome: e.target.value })} /></label>
        <label className="field" htmlFor="nt-p">Viajantes<input id="nt-p" type="number" min="1" value={f.pessoas} onChange={(e) => setF({ ...f, pessoas: e.target.value })} /></label>
        <label className="field" htmlFor="nt-o">Orçamento por pessoa (€, opcional)<input id="nt-o" type="number" min="0" value={f.orcamento} onChange={(e) => setF({ ...f, orcamento: e.target.value })} /></label>
        <label className="field full" htmlFor="nt-n">Notas<textarea id="nt-n" value={f.notas} placeholder="Quando podemos ir, o que procuramos…" onChange={(e) => setF({ ...f, notas: e.target.value })} /></label>
      </form>
    </Modal>
  );
}
