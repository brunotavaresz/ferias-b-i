import { Link } from "react-router-dom";
import { AlarmClock, CircleDollarSign, ListChecks, Star, Ticket, Compass, CheckCircle2 } from "lucide-react";
import { pendingItems } from "../lib/todo.js";
import { fmtDate } from "../lib/format.js";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const KIND = {
  prazo: { icon: AlarmClock, label: "Prazo" },
  pagar: { icon: CircleDollarSign, label: "Pagar" },
  reservar: { icon: Ticket, label: "Reservar" },
  decidir: { icon: Compass, label: "Decidir" },
  avaliar: { icon: Star, label: "Avaliar" },
};

/* Painel "O que falta". */
export default function PendingCard({ ctx, limit, className }) {
  const items = pendingItems(ctx);
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <Card className={cn("gap-3 py-5", className)}>
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2 text-base"><ListChecks className="size-4" />O que falta</CardTitle>
        {items.length > 0 && <CardAction><Badge variant="secondary">{items.length}</Badge></CardAction>}
      </CardHeader>
      <CardContent className="px-5">
        {items.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-good"><CheckCircle2 className="size-4" />Está tudo tratado. Boas férias!</p>
        ) : (
          <ul className="divide-y">
            {shown.map((it) => {
              const K = KIND[it.kind]; const I = K.icon;
              const to = it.destId ? `${ctx.base}/d/${it.destId}${it.cat ? `?c=${it.cat}` : ""}` : (it.kind === "reservar" || it.kind === "pagar" || it.kind === "prazo") ? `${ctx.base}/reservas` : null;
              const body = (
                <span className="flex items-center gap-3 py-2 text-sm">
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-md bg-muted", it.urgent && "bg-bad/15 text-bad")}><I className="size-3.5" /></span>
                  <span className="flex-1">{it.text}</span>
                  {it.date && <Badge variant={it.urgent ? "destructive" : "outline"} className="tabular">{fmtDate(it.date)}</Badge>}
                </span>
              );
              return <li key={it.id}>{to ? <Link to={to} className="block rounded-md hover:bg-muted/50">{body}</Link> : body}</li>;
            })}
          </ul>
        )}
        {limit && items.length > limit && <Link to={`${ctx.base}/reservas`} className="mt-2 inline-block text-sm text-muted-foreground underline underline-offset-4">Ver mais {items.length - limit}</Link>}
      </CardContent>
    </Card>
  );
}
