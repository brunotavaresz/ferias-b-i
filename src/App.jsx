import { Routes, Route, Link, Navigate } from "react-router-dom";
import { useAuth, login, logout } from "./lib/auth.js";
import { firebaseEnabled } from "./lib/firebase.js";
import { initials } from "./lib/format.js";
import TripList from "./components/TripList.jsx";
import TripView from "./components/TripView.jsx";
import { useToast } from "./components/ui.jsx";

export default function App() {
  const { loading, user } = useAuth();
  const toast = useToast();
  if (loading) return <div className="splash">A carregar…</div>;
  if (!user) {
    return (
      <div className="login">
        <div className="logincard">
          <Logo big />
          <p>Guardem voos, alojamentos e transportes de vários destinos, comparem tudo com as vossas prioridades e montem o roteiro dia a dia.</p>
          <button className="btn primary lg" onClick={() => login().catch((e) => toast(loginError(e), "err"))}>Entrar com Google</button>
        </div>
      </div>
    );
  }
  return (
    <>
      <header className="appbar">
        <Link to="/" className="brand"><Logo /></Link>
        <div className="appbar-r">
          {!firebaseEnabled && <span className="pill warn" title="Sem Firebase configurado: os dados ficam só neste browser">Modo local</span>}
          <span className="avatar" title={user.email}>{user.photo ? <img src={user.photo} alt="" referrerPolicy="no-referrer" /> : initials(user.name)}</span>
          {firebaseEnabled && <button className="btn ghost sm" onClick={logout}>Sair</button>}
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<TripList user={user} />} />
          <Route path="/t/:tripId/*" element={<TripView user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

function loginError(e) {
  if (e?.code === "auth/popup-closed-by-user") return "Janela de login fechada.";
  if (e?.code === "auth/unauthorized-domain") return "Este domínio não está autorizado no Firebase (Authentication > Settings > Authorized domains).";
  return "Não foi possível entrar. Tenta outra vez.";
}

export function Logo({ big }) {
  return (
    <span className={"logo" + (big ? " big" : "")}>
      <svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="var(--accent)" /><circle cx="44" cy="20" r="8" fill="var(--lemon)" /><path d="M8 46c8-6 16-6 24 0s16 6 24 0v10H8z" fill="#fff" /></svg>
      <span>Férias <em>a Dois</em></span>
    </span>
  );
}
