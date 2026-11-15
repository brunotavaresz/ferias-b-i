import { useEffect, useMemo, useState } from "react";
import { Routes, Route, NavLink, useParams, useNavigate, Link } from "react-router-dom";
import { store } from "../lib/store.js";
import { firebaseEnabled } from "../lib/firebase.js";
import { DEFAULT_WEIGHTS } from "../lib/model.js";
import { Modal, ConfirmButton, useToast } from "./ui.jsx";
import Destinations from "./Destinations.jsx";
import DestinationView from "./DestinationView.jsx";
import Itinerary from "./Itinerary.jsx";

export default function TripView({ user }) {
  const { tripId } = useParams();
  const [data, setData] = useState(undefined);
  const [settings, setSettings] = useState(false);
  const toast = useToast();
  useEffect(() => store.watchTrip(tripId, setData, () => toast("Sem acesso a esta viagem ou erro de ligação.", "err")), [tripId, toast]);

  const ctx = useMemo(() => {
    if (!data?.trip) return null;
    const trip = { ...data.trip, weights: { ...DEFAULT_WEIGHTS, ...(data.trip.weights || {}) } };
    const members = trip.members || [];
    const nameOf = (email) => trip.memberNames?.[email] || (email === user.email ? user.name : email.split("@")[0]);
    return {
      ...data, trip, user,
      raters: members.map((e) => ({ email: e, name: nameOf(e), me: e === user.email })),
      canRate: (email) => !firebaseEnabled || email === user.email,
      upsert: (col, obj) => store.upsert(tripId, col, obj).catch(() => toast("Não foi possível guardar.", "err")),
      remove: (col, id) => store.remove(tripId, col, id).catch(() => toast("Não foi possível apagar.", "err")),
      updateTrip: (patch) => store.updateTrip(tripId, patch).catch(() => toast("Não foi possível guardar.", "err")),
      base: `/t/${tripId}`,
    };
  }, [data, user, tripId, toast]);

  // guarda o nome de quem entra, para os outros verem
  useEffect(() => {
    if (!firebaseEnabled || !ctx) return;
    if (!ctx.trip.memberNames?.[user.email]) ctx.updateTrip({ memberNames: { ...(ctx.trip.memberNames || {}), [user.email]: user.name } });
  }, [ctx, user]);

  if (data === undefined) return <div className="page muted">A carregar…</div>;
  if (!ctx) return <div className="page"><p>Esta viagem não existe ou não tens acesso.</p><Link className="btn" to="/">Voltar às viagens</Link></div>;

  return (
    <div className="page">
      <div className="triphead">
        <div>
          <Link to="/" className="kicker back">← Viagens</Link>
          <h1>{ctx.trip.nome}</h1>
          <div className="members">
            {ctx.raters.map((r) => <span key={r.email} className="pill">{r.name}{r.me ? " (tu)" : ""}</span>)}
            <button className="btn ghost sm" onClick={() => setSettings(true)}>Partilhar e definições</button>
          </div>
        </div>
        <nav className="tabs">
          <NavLink end to={ctx.base}>Destinos</NavLink>
          <NavLink to={`${ctx.base}/roteiro`}>Roteiro</NavLink>
        </nav>
      </div>
      <Routes>
        <Route index element={<Destinations ctx={ctx} />} />
        <Route path="d/:destId" element={<DestinationView ctx={ctx} />} />
        <Route path="roteiro" element={<Itinerary ctx={ctx} />} />
        <Route path="roteiro/:destId" element={<Itinerary ctx={ctx} />} />
      </Routes>
      {settings && <TripSettings ctx={ctx} onClose={() => setSettings(false)} />}
    </div>
  );
}

function TripSettings({ ctx, onClose }) {
  const { trip, user } = ctx;
  const [f, setF] = useState({ nome: trip.nome || "", pessoas: trip.pessoas || 2, orcamento: trip.orcamento ?? "", notas: trip.notas || "" });
  const [email, setEmail] = useState("");
  const nav = useNavigate();
  const toast = useToast();
  const isOwner = trip.ownerUid === user.uid;
  async function save(e) {
    e.preventDefault();
    await ctx.updateTrip({ nome: f.nome.trim() || "Férias", pessoas: Number(f.pessoas) || 2, orcamento: f.orcamento === "" ? null : Number(f.orcamento), notas: f.notas });
    onClose();
  }
  async function addMember(e) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+$/.test(em)) return toast("Escreve um email válido.", "err");
    if ((trip.members || []).includes(em)) return toast("Essa pessoa já tem acesso.");
    await ctx.updateTrip({ members: [...(trip.members || []), em] });
    setEmail("");
    toast(firebaseEnabled ? "Pronto. Quando entrar com esse email Google, vê esta viagem." : "Adicionado (no modo local serve só para as avaliações).");
  }
  async function removeMember(em) {
    await ctx.updateTrip({ members: (trip.members || []).filter((x) => x !== em) });
  }
  return (
    <Modal title="Partilhar e definições" onClose={onClose}
      footer={<>{isOwner && <ConfirmButton confirmText="Apagar mesmo a viagem?" onConfirm={async () => { await store.deleteTrip(trip.id); nav("/"); }}>Apagar viagem</ConfirmButton>}<span className="sp" /><button className="btn" onClick={onClose}>Fechar</button><button className="btn primary" form="ts">Guardar</button></>}>
      <section className="msec">
        <h3>Quem tem acesso</h3>
        <ul className="memberlist">
          {(trip.members || []).map((em) => (
            <li key={em}><span>{trip.memberNames?.[em] ? <><b>{trip.memberNames[em]}</b> · </> : null}{em}</span>
              {em !== user.email && <button className="btn ghost sm" onClick={() => removeMember(em)}>Remover</button>}</li>
          ))}
        </ul>
        <form className="row" onSubmit={addMember}>
          <input aria-label="Email da pessoa a convidar" type="email" placeholder="email Google da tua namorada" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn">Dar acesso</button>
        </form>
        <p className="hint">{firebaseEnabled ? "A pessoa entra na app com essa conta Google e a viagem aparece-lhe logo. Tudo o que um muda, o outro vê na hora." : "Modo local: os dados ficam só neste browser. Configura o Firebase para partilhar (ver README)."}</p>
      </section>
      <form id="ts" className="form" onSubmit={save}>
        <label className="field full" htmlFor="ts-n">Nome<input id="ts-n" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></label>
        <label className="field" htmlFor="ts-p">Viajantes<input id="ts-p" type="number" min="1" value={f.pessoas} onChange={(e) => setF({ ...f, pessoas: e.target.value })} /></label>
        <label className="field" htmlFor="ts-o">Orçamento por pessoa (€)<input id="ts-o" type="number" min="0" value={f.orcamento} onChange={(e) => setF({ ...f, orcamento: e.target.value })} /></label>
        <label className="field full" htmlFor="ts-x">Notas<textarea id="ts-x" value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} /></label>
      </form>
    </Modal>
  );
}
