import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Luggage, Plus, Users, Wallet } from "lucide-react";
import { store } from "../lib/store.js";
import { DEFAULT_WEIGHTS } from "../lib/model.js";
import { eur } from "../lib/format.js";
import { EmptyState, Field, useToast } from "./common.jsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function TripList({ user }) {
  const [trips, setTrips] = useState(null);
  const [creating, setCreating] = useState(false);
  const toast = useToast();
  useEffect(() => store.watchTrips(user, setTrips, () => toast("Não consegui carregar as viagens. Confirma as regras do Firestore.", "err")), [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Olá, {user.name?.split(" ")[0]}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Para onde vamos?</h1>
        </div>
        <Button onClick={() => setCreating(true)}><Plus /> Nova viagem</Button>
      </div>

      {trips === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
      ) : trips.length === 0 ? (
        <EmptyState icon={Luggage} title="Ainda não há viagens" action={<Button onClick={() => setCreating(true)}><Plus /> Criar a primeira viagem</Button>}>
          Uma viagem é uma ideia de férias, por exemplo "Férias de março 2027". Lá dentro juntam vários destinos possíveis (Côte d'Azur, Roma…) e, em cada um, guardam voos, alojamentos, transportes e atividades. A app compara tudo e ajuda a montar o roteiro.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((t) => (
            <Link key={t.id} to={`/t/${t.id}`} className="group rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
              <Card className="h-full transition-colors group-hover:border-foreground/20">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-lg">{t.nome}<ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></CardTitle>
                  {t.notas && <CardDescription className="line-clamp-2">{t.notas}</CardDescription>}
                </CardHeader>
                <CardContent className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Users className="size-4" />{(t.members || []).length} com acesso · {t.pessoas || 2} viajantes</span>
                  {t.orcamento ? <span className="flex items-center gap-1.5"><Wallet className="size-4" />{eur(t.orcamento)}/pessoa</span> : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <NewTrip user={user} open={creating} onOpenChange={setCreating} />
    </div>
  );
}

function NewTrip({ user, open, onOpenChange }) {
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
      onOpenChange(false);
      nav(`/t/${id}`);
    } catch {
      toast("Não foi possível criar a viagem.", "err");
    } finally { setBusy(false); }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova viagem</DialogTitle>
          <DialogDescription>Depois juntam os destinos possíveis e as opções de cada um.</DialogDescription>
        </DialogHeader>
        <form id="nt" className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <Field label="Nome" htmlFor="nt-nome" className="sm:col-span-2"><Input id="nt-nome" autoFocus value={f.nome} placeholder="Férias de março 2027" onChange={(e) => setF({ ...f, nome: e.target.value })} /></Field>
          <Field label="Viajantes" htmlFor="nt-p"><Input id="nt-p" type="number" min="1" value={f.pessoas} onChange={(e) => setF({ ...f, pessoas: e.target.value })} /></Field>
          <Field label="Orçamento por pessoa (€)" htmlFor="nt-o"><Input id="nt-o" type="number" min="0" placeholder="Opcional" value={f.orcamento} onChange={(e) => setF({ ...f, orcamento: e.target.value })} /></Field>
          <Field label="Notas" htmlFor="nt-n" className="sm:col-span-2"><Textarea id="nt-n" value={f.notas} placeholder="Quando podemos ir, o que procuramos…" onChange={(e) => setF({ ...f, notas: e.target.value })} /></Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="nt" disabled={busy}>Criar viagem</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
