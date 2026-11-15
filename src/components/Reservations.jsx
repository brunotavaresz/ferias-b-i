import { useState } from "react";
import { Link } from "react-router-dom";
import { BedDouble, Plane, Ticket, TrainFront, Wallet } from "lucide-react";
import { bookingSummary } from "../lib/todo.js";
import { CATEGORIES } from "../lib/model.js";
import { eur, fmtDate } from "../lib/format.js";
import { EmptyState } from "./common.jsx";
import PendingCard from "./PendingCard.jsx";
import BookingDialog from "./BookingDialog.jsx";
import { BookingLine } from "./DestinationView.jsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const CAT_ICON = { voo: Plane, alojamento: BedDouble, transporte: TrainFront, atividade: Ticket };

/* Reservas e pagamentos de cada destino, mais o que falta fazer. */
export default function Reservations({ ctx }) {
  const [open, setOpen] = useState(null);
  const dests = [...ctx.destinations].sort((a, b) => (b.escolhido ? 1 : 0) - (a.escolhido ? 1 : 0));
  const withChoices = dests.map((d) => ({ d, s: bookingSummary(ctx.options, d.id) })).filter((x) => x.s.list.length);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Reservas e pagamentos</h2>
          <p className="text-sm text-muted-foreground">Voos e alojamentos escolhidos, e transportes e atividades incluídos.</p>
        </div>
        {!withChoices.length ? (
          <EmptyState icon={Wallet} title="Ainda não escolheram nada" action={<Button asChild><Link to={ctx.base}>Ir para os destinos</Link></Button>}>
            Quando carregarem em "Escolher" num voo ou alojamento, ou em "Incluir" num transporte ou atividade, aparece aqui para marcarem a reserva, o código, os prazos e o que já pagaram.
          </EmptyState>
        ) : withChoices.map(({ d, s }) => (
          <Card key={d.id} className="gap-4">
            <CardHeader>
              <CardTitle className="text-lg"><Link to={`${ctx.base}/d/${d.id}`} className="hover:underline underline-offset-4">{d.nome}</Link>{d.escolhido && <span className="ml-2 text-sm font-normal text-good">o nosso destino</span>}</CardTitle>
              <CardDescription>{d.inicio ? `${fmtDate(d.inicio)} – ${fmtDate(d.fim)}` : "Sem datas"} · {s.reservados} de {s.list.length} reservados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[["Total", s.total], ["Já pago", s.pago], ["Falta pagar", s.falta]].map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-muted/60 px-3 py-2">
                    <p className="text-xs text-muted-foreground">{l}</p>
                    <p className="text-lg font-semibold tabular">{eur(v)}</p>
                  </div>
                ))}
              </div>
              <Progress value={s.total ? (s.pago / s.total) * 100 : 0} aria-label="Percentagem paga" />
              <ul className="space-y-3">
                {s.list.map((o) => {
                  const I = CAT_ICON[o.categoria];
                  return (
                    <li key={o.id} className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm"><I className="size-4 text-muted-foreground" /><span className="font-medium">{o.nome}</span><span className="text-muted-foreground">· {CATEGORIES[o.categoria].one} · {eur(o.preco)}</span></div>
                      <BookingLine o={o} onOpen={() => setOpen(o)} />
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      <PendingCard ctx={ctx} className="h-fit lg:sticky lg:top-20" />
      {open && <BookingDialog ctx={ctx} option={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
