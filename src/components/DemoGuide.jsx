import { useState } from "react";
import { Link } from "react-router-dom";
import { BedDouble, CalendarDays, ChevronDown, ChevronUp, ClipboardPaste, Map as MapIcon, MapPinned, Plane, Sparkles, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/* Guia da demonstração: o que experimentar e onde. */
export default function DemoGuide({ ctx }) {
  const [open, setOpen] = useState(() => { try { return sessionStorage.getItem("demo-guia") !== "0"; } catch { return true; } });
  const toggle = () => { setOpen((o) => { try { sessionStorage.setItem("demo-guia", o ? "0" : "1"); } catch { /* */ } return !o; }); };
  const steps = [
    { icon: MapPinned, title: "Comparar destinos", text: "Nice contra Roma: custo por pessoa, barra de custos, pontuação e o painel \"O que falta\". Experimenta mudar as Prioridades.", to: ctx.base },
    { icon: BedDouble, title: "Alojamentos de Nice", text: "Cartões com vantagens e desvantagens, notas dos hóspedes por categoria e estrelas de cada um. Troca para a vista lado a lado.", to: `${ctx.base}/d/nice?c=alojamento` },
    { icon: MapIcon, title: "Mapa", text: "Na página de alojamentos, carrega no ícone do mapa para ver hotéis, atividades e o centro.", to: `${ctx.base}/d/nice?c=alojamento` },
    { icon: Plane, title: "Voos e pesquisas", text: "Os botões easyJet, Ryanair, Skyscanner e Google Flights abrem já com Porto → Nice, as datas e 2 adultos.", to: `${ctx.base}/d/nice?c=voo` },
    { icon: ClipboardPaste, title: "Colar página", text: "Na app a sério, colas a página do Booking e ela preenche o hotel (ou vários de uma vez).", action: () => ctx.openCapture("nice") },
    { icon: Ticket, title: "Reservas e pagamentos", text: "O que está reservado, pago e por pagar, códigos e prazos de cancelamento.", to: `${ctx.base}/reservas` },
    { icon: CalendarDays, title: "Roteiro", text: "Dias criados pelas datas, voo e check-in automáticos, planos por encaixar, mudar de dia e imprimir.", to: `${ctx.base}/roteiro/nice` },
  ];
  return (
    <Card className="no-print gap-3 border-brand/40 bg-brand/5 py-4">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4 text-brand" />Visita guiada</CardTitle>
        <CardDescription>Isto é uma viagem de exemplo. Podes mexer em tudo: nada fica guardado na vossa conta.</CardDescription>
        <CardAction><Button variant="ghost" size="sm" onClick={toggle}>{open ? <><ChevronUp /> Esconder</> : <><ChevronDown /> Mostrar</>}</Button></CardAction>
      </CardHeader>
      {open && (
        <CardContent className="grid gap-2 px-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => {
            const I = s.icon;
            const inner = (
              <span className="flex h-full gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:border-foreground/20">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand/10 text-brand"><I className="size-4" /></span>
                <span className="space-y-0.5"><span className="block text-sm font-medium">{i + 1}. {s.title}</span><span className="block text-xs text-muted-foreground">{s.text}</span></span>
              </span>
            );
            return s.to ? <Link key={i} to={s.to} className="block">{inner}</Link> : <button key={i} type="button" onClick={s.action} className="block">{inner}</button>;
          })}
        </CardContent>
      )}
    </Card>
  );
}
