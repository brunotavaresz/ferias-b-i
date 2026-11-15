/*
 * Camada de dados com duas implementações e a mesma API:
 *  - Firestore (quando há configuração Firebase): partilhada entre membros, em tempo real.
 *  - Local (localStorage): para experimentar sem Firebase, só neste browser.
 *
 * Coleções de cada viagem: destinations, options (voos, alojamentos, transportes, atividades), items (roteiro).
 */
import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, serverTimestamp, writeBatch, getDocs,
} from "firebase/firestore";
import { db, firebaseEnabled } from "./firebase.js";

export const COLS = ["destinations", "options", "items"];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clean = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v === undefined ? null : v)));

/* ------------------------------ Local ------------------------------ */
let KEY = "ferias-a-dois:v1";
const listeners = new Set();
function loadLocal() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { trips: {} }; } catch { return { trips: {} }; }
}
function saveLocal(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* sem espaço ou bloqueado */ }
  listeners.forEach((fn) => fn(data));
}
function onLocal(fn) {
  listeners.add(fn);
  fn(loadLocal());
  return () => listeners.delete(fn);
}
const local = {
  watchTrips(_user, cb) {
    return onLocal((d) => cb(Object.values(d.trips).map(({ destinations, options, items, ...t }) => t)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))));
  },
  async createTrip(user, data) {
    const d = loadLocal(), id = uid();
    d.trips[id] = { ...clean(data), id, ownerUid: user.uid, members: [user.email], createdAt: Date.now(), updatedAt: Date.now(), destinations: {}, options: {}, items: {} };
    saveLocal(d);
    return id;
  },
  async updateTrip(tripId, patch) {
    const d = loadLocal();
    if (!d.trips[tripId]) return;
    Object.assign(d.trips[tripId], clean(patch), { updatedAt: Date.now() });
    saveLocal(d);
  },
  async deleteTrip(tripId) {
    const d = loadLocal();
    delete d.trips[tripId];
    saveLocal(d);
  },
  watchTrip(tripId, cb) {
    return onLocal((d) => {
      const t = d.trips[tripId];
      if (!t) return cb({ trip: null, destinations: [], options: [], items: [] });
      const { destinations, options, items, ...trip } = t;
      cb({ trip, destinations: Object.values(destinations), options: Object.values(options), items: Object.values(items) });
    });
  },
  async upsert(tripId, col, obj) {
    const d = loadLocal(), t = d.trips[tripId];
    if (!t) return null;
    const id = obj.id || uid();
    t[col][id] = { ...(t[col][id] || {}), ...clean(obj), id, updatedAt: Date.now() };
    if (!t[col][id].createdAt) t[col][id].createdAt = Date.now();
    t.updatedAt = Date.now();
    saveLocal(d);
    return id;
  },
  async remove(tripId, col, id) {
    const d = loadLocal(), t = d.trips[tripId];
    if (!t) return;
    delete t[col][id];
    saveLocal(d);
  },
};

/* ----------------------------- Firestore ----------------------------- */
const tripsCol = () => collection(db, "trips");
const sub = (tripId, col) => collection(db, "trips", tripId, col);
const ts = (v) => (v && typeof v.toMillis === "function" ? v.toMillis() : v || 0);
const withId = (s) => {
  const x = { ...s.data(), id: s.id };
  x.createdAt = ts(x.createdAt);
  x.updatedAt = ts(x.updatedAt);
  return x;
};

const remote = {
  watchTrips(user, cb, onError) {
    const q = query(tripsCol(), where("members", "array-contains", user.email.toLowerCase()));
    return onSnapshot(q, (snap) => cb(snap.docs.map(withId).sort((a, b) => b.updatedAt - a.updatedAt)), onError);
  },
  async createTrip(user, data) {
    const ref = await addDoc(tripsCol(), {
      ...clean(data),
      ownerUid: user.uid,
      members: [user.email.toLowerCase()],
      memberNames: { [user.email.toLowerCase()]: user.name || user.email },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },
  async updateTrip(tripId, patch) {
    await updateDoc(doc(db, "trips", tripId), { ...clean(patch), updatedAt: serverTimestamp() });
  },
  async deleteTrip(tripId) {
    // apaga primeiro as subcoleções (o Firestore não o faz sozinho)
    for (const col of COLS) {
      const snap = await getDocs(sub(tripId, col));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    await deleteDoc(doc(db, "trips", tripId));
  },
  watchTrip(tripId, cb, onError) {
    const state = { trip: undefined, destinations: [], options: [], items: [] };
    const ready = new Set();
    const emit = () => { if (ready.size === 4) cb({ ...state }); };
    const unsubs = [
      onSnapshot(doc(db, "trips", tripId), (s) => { state.trip = s.exists() ? withId(s) : null; ready.add("trip"); emit(); }, onError),
      ...COLS.map((col) => onSnapshot(sub(tripId, col), (snap) => { state[col] = snap.docs.map(withId); ready.add(col); emit(); }, onError)),
    ];
    return () => unsubs.forEach((u) => u());
  },
  async upsert(tripId, col, obj) {
    const { id, ...data } = clean(obj);
    if (id) {
      await setDoc(doc(db, "trips", tripId, col, id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
      return id;
    }
    const ref = await addDoc(sub(tripId, col), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return ref.id;
  },
  async remove(tripId, col, id) {
    await deleteDoc(doc(db, "trips", tripId, col, id));
  },
};

/* ------------------------------ Demonstração ------------------------------ */
// A demo usa o armazenamento local com outra chave, sem login e sem tocar nos dados reais.
export const DEMO_TRIP_ID = "demo";
const DEMO_KEY = "ferias-a-dois:demo";
const DEMO_FLAG = "ferias-a-dois:demo-ativa";
export const demo = { active: false };
export const DEMO_USER = { uid: "demo-bruno", email: "bruno@demo", name: "Bruno", demo: true };

export function isDemoSession() {
  try { return sessionStorage.getItem(DEMO_FLAG) === "1"; } catch { return false; }
}
export function enterDemo(seed) {
  try { sessionStorage.setItem(DEMO_FLAG, "1"); } catch { /* sem armazenamento */ }
  KEY = DEMO_KEY;
  demo.active = true;
  store = local;
  const d = loadLocal();
  if (!d.trips[DEMO_TRIP_ID]) saveLocal(seed());
}
export function resetDemo(seed) {
  KEY = DEMO_KEY;
  saveLocal(seed());
}
export function exitDemo() {
  try { sessionStorage.removeItem(DEMO_FLAG); } catch { /* sem armazenamento */ }
}

// "let" para a demo poder trocar a implementação (os imports veem sempre o valor atual).
export let store = firebaseEnabled ? remote : local;
