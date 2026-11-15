import { useEffect, useMemo, useState } from "react";
import { Routes, Route, useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { ArrowLeft, CalendarDays, ClipboardPaste, MapPinned, Settings2, Ticket, Trash2, UserPlus, X } from "lucide-react";
import CaptureDialog from "./CaptureDialog.jsx";
import Reservations from "./Reservations.jsx";
import { store, demo } from "../lib/store.js";
import DemoGuide from "./DemoGuide.jsx";
import { firebaseEnabled } from "../lib/firebase.js";
import { DEFAULT_WEIGHTS } from "../lib/model.js";
import { initials } from "../lib/format.js";
import { ConfirmButton, Field, useToast } from "./common.jsx";
import Destinations from "./Destinations.jsx";
import DestinationView from "./DestinationView.jsx";
import Itinerary from "./Itinerary.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function TripView({ user }) {
  const { tripId } = useParams();
  const [data, setData] = useState(undefined);
  const [settings, setSettings] = useState(false);
  const [capture, setCapture] = useState({ open: false, destId: null });
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => store.watchTrip(tripId, setData, () => toast("Sem acesso a esta viagem ou erro de ligação.", "err")), [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  const ctx = useMemo(() => {
    if (!data?.trip) return null;
    const trip = { ...data.trip, weights: { ...DEFAULT_WEIGHTS, ...(data.trip.weights || {}) } };
    const members = trip.members || [];
    const nameOf = (email) => trip.memberNames?.[email]?.split(" ")[0] || (email === user.email ? user.name?.split(" ")[0] : email.split("@")[0]);
    return {
      ...data, trip, user,
      raters: members.map((e) => ({ email: e, name: nameOf(e), me: e === user.email })),
      canRate: (email) => !firebaseEnabled || demo.active || email === user.email,
      upsert: (col, obj) => store.upsert(tripId, col, obj).catch(() => toast("Não foi possível guardar.", "err")),
      remove: (col, id) => store.remove(tripId, col, id).catch(() => toast("Não foi possível apagar.", "err")),
      updateTrip: (patch) => store.updateTrip(tripId, patch).catch(() => toast("Não foi possível guardar.", "err")),
      base: `/t/${tripId}`,
      openCapture: (destId) => setCapture({ open: true, destId: destId || null }),
    };
  }, [data, user, tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!firebaseEnabled || demo.active || !ctx) return;
    if (!ctx.trip.memberNames?.[user.email]) ctx.updateTrip({ memberNames: { ...(ctx.trip.memberNames || {}), [user.email]: user.name } });
  }, [ctx, user]);

  if (data === undefined) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-64 rounded-xl" /></div>;
  if (!ctx) return <div className="space-y-4"><p>Esta viagem não existe ou não tens acesso.</p><Button variant="outline" asChild><Link to="/">Voltar às viagens</Link></Button></div>;

  const tab = loc.pathname.includes("/roteiro") ? "roteiro" : loc.pathname.includes("/reservas") ? "reservas" : "destinos";
  return (
    <div className="space-y-6">
      <div className="no-print space-y-4">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild><Link to="/"><ArrowLeft /> Viagens</Link></Button>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">{ctx.trip.nome}</h1>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {ctx.raters.map((r) => (
                  <Tooltip key={r.email}>
                    <TooltipTrigger asChild>
                      <Avatar className="size-7 border-2 border-background"><AvatarFallback className="text-[11px]">{initials(r.name)}</AvatarFallback></Avatar>
                    </TooltipTrigger>
                    <TooltipContent>{r.name}{r.me ? " (tu)" : ""} · {r.email}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => setSettings(true)}><UserPlus /> Partilhar</Button>
              <Button variant="ghost" size="icon-sm" aria-label="Definições" onClick={() => setSettings(true)}><Settings2 /></Button>
            </div>
          </div>
          <Tabs value={tab} onValueChange={(v) => nav(v === "destinos" ? ctx.base : `${ctx.base}/${v}`)}>
            <TabsList>
              <TabsTrigger value="destinos"><MapPinned /> Destinos</TabsTrigger>
              <TabsTrigger value="reservas"><Ticket /> Reservas</TabsTrigger>
              <TabsTrigger value="roteiro"><CalendarDays /> Roteiro</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Separator />
      </div>
      {demo.active && <DemoGuide ctx={ctx} />}
      <Routes>
        <Route index element={<Destinations ctx={ctx} />} />
        <Route path="d/:destId" element={<DestinationView ctx={ctx} />} />
        <Route path="reservas" element={<Reservations ctx={ctx} />} />
        <Route path="roteiro" element={<Itinerary ctx={ctx} />} />
        <Route path="roteiro/:destId" element={<Itinerary ctx={ctx} />} />
      </Routes>
      <TripSettings ctx={ctx} open={settings} onOpenChange={setSettings} />
      <CaptureDialog ctx={ctx} open={capture.open} defaultDestId={capture.destId || loc.pathname.match(/\/d\/([^/?]+)/)?.[1]} onOpenChange={(o) => setCapture((c) => ({ ...c, open: o }))} />
      {!loc.pathname.includes("/d/") && (
        <Button size="lg" className="no-print fixed bottom-5 right-5 z-30 rounded-full shadow-lg" onClick={() => setCapture({ open: true, destId: null })}>
          <ClipboardPaste /> Colar página
        </Button>
      )}
    </div>
  );
}

function TripSettings({ ctx, open, onOpenChange }) {
  const { trip, user } = ctx;
  const [f, setF] = useState(null);
  const [email, setEmail] = useState("");
  const nav = useNavigate();
  const toast = useToast();
  useEffect(() => { if (open) setF({ nome: trip.nome || "", pessoas: trip.pessoas || 2, orcamento: trip.orcamento ?? "", notas: trip.notas || "", origem: trip.origem || "Porto", origemAeroporto: trip.origemAeroporto || "OPO" }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const isOwner = trip.ownerUid === user.uid;
  async function save(e) {
    e.preventDefault();
    await ctx.updateTrip({ nome: f.nome.trim() || "Férias", pessoas: Number(f.pessoas) || 2, orcamento: f.orcamento === "" ? null : Number(f.orcamento), notas: f.notas, origem: f.origem.trim() || "Porto", origemAeroporto: f.origemAeroporto.trim().toUpperCase() || "OPO" });
    onOpenChange(false);
    toast("Guardado");
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Partilhar e definições</DialogTitle>
          <DialogDescription>{firebaseEnabled ? "Quem está na lista entra com a conta Google e vê e edita tudo em tempo real." : "Modo local: os dados ficam só neste browser."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm font-medium">Quem tem acesso</p>
          <ul className="divide-y rounded-lg border">
            {(trip.members || []).map((em) => (
              <li key={em} className="flex items-center gap-3 px-3 py-2">
                <Avatar className="size-7"><AvatarFallback className="text-[11px]">{initials(trip.memberNames?.[em] || em)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{trip.memberNames?.[em] || em.split("@")[0]}{em === user.email && <span className="text-muted-foreground"> (tu)</span>}</p><p className="truncate text-xs text-muted-foreground">{em}</p></div>
                {em !== user.email && <Button variant="ghost" size="icon-sm" aria-label={`Remover ${em}`} onClick={() => ctx.updateTrip({ members: trip.members.filter((x) => x !== em) })}><X /></Button>}
              </li>
            ))}
          </ul>
          <form className="flex gap-2" onSubmit={addMember}>
            <Input aria-label="Email Google a convidar" type="email" placeholder="email Google de quem convidas" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" variant="secondary"><UserPlus /> Dar acesso</Button>
          </form>
        </div>
        <Separator />
        {f && (
          <form id="ts" className="grid gap-4 sm:grid-cols-2" onSubmit={save}>
            <Field label="Nome" htmlFor="ts-n" className="sm:col-span-2"><Input id="ts-n" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Field>
            <Field label="Viajantes" htmlFor="ts-p"><Input id="ts-p" type="number" min="1" value={f.pessoas} onChange={(e) => setF({ ...f, pessoas: e.target.value })} /></Field>
            <Field label="Orçamento por pessoa (€)" htmlFor="ts-o"><Input id="ts-o" type="number" min="0" value={f.orcamento} onChange={(e) => setF({ ...f, orcamento: e.target.value })} /></Field>
            <Field label="Partem de" htmlFor="ts-or"><Input id="ts-or" value={f.origem} onChange={(e) => setF({ ...f, origem: e.target.value })} /></Field>
            <Field label="Aeroporto de partida" htmlFor="ts-oa" hint="Para as pesquisas de voos."><Input id="ts-oa" maxLength={3} className="uppercase" value={f.origemAeroporto} onChange={(e) => setF({ ...f, origemAeroporto: e.target.value })} /></Field>
            <Field label="Notas" htmlFor="ts-x" className="sm:col-span-2"><Textarea id="ts-x" value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} /></Field>
          </form>
        )}
        <DialogFooter className="sm:justify-between">
          {isOwner ? <ConfirmButton variant="ghost" size="default" confirmText="Apagar mesmo a viagem?" onConfirm={async () => { await store.deleteTrip(trip.id); nav("/"); }}><Trash2 /> Apagar viagem</ConfirmButton> : <span />}
          <div className="flex gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button><Button type="submit" form="ts">Guardar</Button></div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
