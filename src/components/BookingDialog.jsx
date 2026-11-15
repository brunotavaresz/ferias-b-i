import { useState } from "react";
import { BOOKING_STATES } from "../lib/model.js";
import { eur } from "../lib/format.js";
import { Field } from "./common.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/* Estado da reserva de uma opção escolhida: reservado/pago, código, prazos e pagamentos. */
export default function BookingDialog({ ctx, option, onClose }) {
  const [f, setF] = useState({
    reservaEstado: option.reservaEstado || "porReservar", reservaCodigo: option.reservaCodigo || "", cancelarAte: option.cancelarAte || "",
    valorPago: option.valorPago ?? "", pagarAte: option.pagarAte || "", reservaNotas: option.reservaNotas || "",
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const total = Number(option.preco) || 0;
  async function save(e) {
    e.preventDefault();
    const valorPago = f.reservaEstado === "pago" && f.valorPago === "" ? total : f.valorPago === "" ? null : Number(f.valorPago);
    await ctx.upsert("options", { id: option.id, ...f, valorPago });
    onClose();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reserva · {option.nome}</DialogTitle>
          <DialogDescription>Total {eur(option.preco)}. Fica tudo aqui para nenhum dos dois se esquecer.</DialogDescription>
        </DialogHeader>
        <form id="bk" className="grid gap-4 sm:grid-cols-2" onSubmit={save}>
          <Field label="Estado" className="sm:col-span-2">
            <ToggleGroup type="single" variant="outline" value={f.reservaEstado} onValueChange={(v) => v && set("reservaEstado", v)} className="w-full">
              {Object.entries(BOOKING_STATES).map(([k, v]) => <ToggleGroupItem key={k} value={k} className="flex-1">{v.label}</ToggleGroupItem>)}
            </ToggleGroup>
          </Field>
          <Field label="Código da reserva" htmlFor="bk-c"><Input id="bk-c" value={f.reservaCodigo} placeholder="Ex.: 4567.123.890" onChange={(e) => set("reservaCodigo", e.target.value)} /></Field>
          <Field label="Cancelamento grátis até" htmlFor="bk-x"><Input id="bk-x" type="date" value={f.cancelarAte} onChange={(e) => set("cancelarAte", e.target.value)} /></Field>
          <Field label="Já pago (€)" htmlFor="bk-p" hint={`Falta ${eur(Math.max(0, total - (Number(f.valorPago) || (f.reservaEstado === "pago" ? total : 0))))}`}>
            <Input id="bk-p" type="number" min="0" step="any" value={f.valorPago} placeholder={f.reservaEstado === "pago" ? String(total) : "0"} onChange={(e) => set("valorPago", e.target.value)} />
          </Field>
          <Field label="Pagar o resto até" htmlFor="bk-d"><Input id="bk-d" type="date" value={f.pagarAte} onChange={(e) => set("pagarAte", e.target.value)} /></Field>
          <Field label="Notas" htmlFor="bk-n" className="sm:col-span-2"><Textarea id="bk-n" value={f.reservaNotas} placeholder="Quem reservou, com que cartão, check-in a partir das 15h…" onChange={(e) => set("reservaNotas", e.target.value)} /></Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="bk">Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
