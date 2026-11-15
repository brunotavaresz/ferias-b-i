/* O que falta fazer numa viagem: decidir, reservar, pagar, prazos e avaliações. Funções puras. */
import { CATEGORIES } from "./model.js";
import { nightsOf } from "./scoring.js";

const DAY = 864e5;
const n = (v) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

export function remaining(o) {
  const total = n(o.preco) ?? 0;
  return Math.max(0, total - (n(o.valorPago) ?? 0));
}

/** Opções escolhidas (voo/alojamento) ou incluídas (transportes/atividades) de um destino. */
export function chosenOptions(options, destId) {
  return options.filter((o) => o.destinationId === destId && o.escolhido && !o.descartado);
}

export function bookingSummary(options, destId) {
  const list = chosenOptions(options, destId);
  const total = list.reduce((s, o) => s + (n(o.preco) ?? 0), 0);
  const pago = list.reduce((s, o) => s + Math.min(n(o.valorPago) ?? 0, n(o.preco) ?? Infinity), 0);
  const reservados = list.filter((o) => o.reservaEstado === "reservado" || o.reservaEstado === "pago").length;
  return { list, total, pago, falta: Math.max(0, total - pago), reservados, porReservar: list.length - reservados };
}

export function pendingItems({ trip, destinations, options }, today = new Date()) {
  const out = [];
  const t0 = new Date(today.toISOString().slice(0, 10) + "T00:00:00").getTime();
  const daysTo = (d) => Math.round((new Date(d + "T00:00:00").getTime() - t0) / DAY);
  if (!destinations.length) return [{ id: "first", kind: "decidir", text: "Adicionar o primeiro destino" }];

  destinations.filter((d) => !nightsOf(d)).forEach((d) => out.push({ id: `dates-${d.id}`, kind: "decidir", text: `Pôr as datas em ${d.nome}`, destId: d.id }));
  const chosenDest = destinations.find((d) => d.escolhido);
  if (!chosenDest && destinations.length > 1) out.push({ id: "pick-dest", kind: "decidir", text: "Escolher o destino (botão \"É este!\")" });
  const focus = chosenDest ? [chosenDest] : destinations.length === 1 ? destinations : [];

  for (const d of focus) {
    const mine = options.filter((o) => o.destinationId === d.id && !o.descartado);
    for (const cat of ["voo", "alojamento"]) {
      const list = mine.filter((o) => o.categoria === cat);
      const label = CATEGORIES[cat].one.toLowerCase();
      if (!list.length) out.push({ id: `none-${cat}-${d.id}`, kind: "decidir", text: `Guardar opções de ${label} em ${d.nome}`, destId: d.id, cat });
      else if (!list.some((o) => o.escolhido)) out.push({ id: `pick-${cat}-${d.id}`, kind: "decidir", text: `Escolher o ${label} em ${d.nome} (${list.length} opções)`, destId: d.id, cat });
    }
    for (const o of chosenOptions(options, d.id)) {
      // transportes e atividades grátis normalmente não se reservam: só avisa nos voos, alojamentos e atividades pagas
      const needsBooking = o.categoria === "voo" || o.categoria === "alojamento" || (o.categoria === "atividade" && Number(o.preco) > 0);
      if (!needsBooking) continue;
      if (o.reservaEstado !== "reservado" && o.reservaEstado !== "pago") {
        out.push({ id: `book-${o.id}`, kind: "reservar", text: `Reservar ${o.nome}`, destId: d.id, cat: o.categoria });
      } else if (remaining(o) > 0 && o.reservaEstado !== "pago") {
        const dl = o.pagarAte ? daysTo(o.pagarAte) : null;
        out.push({ id: `pay-${o.id}`, kind: "pagar", text: `Pagar ${Math.round(remaining(o))} € de ${o.nome}`, date: o.pagarAte || null, urgent: dl != null && dl <= 7, destId: d.id, cat: o.categoria });
      }
      if (o.cancelarAte && (o.reservaEstado === "reservado" || o.reservaEstado === "pago")) {
        const dl = daysTo(o.cancelarAte);
        if (dl >= 0 && dl <= 14) out.push({ id: `cancel-${o.id}`, kind: "prazo", text: `Último dia para cancelar ${o.nome} sem custos`, date: o.cancelarAte, urgent: dl <= 3, destId: d.id, cat: o.categoria });
      }
    }
  }

  const scope = focus.length ? focus.map((d) => d.id) : destinations.map((d) => d.id);
  const open = options.filter((o) => scope.includes(o.destinationId) && !o.descartado);
  for (const email of trip.members || []) {
    const missing = open.filter((o) => !o.ratings?.[email]).length;
    if (missing > 0) {
      const name = trip.memberNames?.[email]?.split(" ")[0] || email.split("@")[0];
      out.push({ id: `rate-${email}`, kind: "avaliar", text: `${name} ainda não deu estrelas a ${missing} ${missing === 1 ? "opção" : "opções"}`, email });
    }
  }
  const order = { prazo: 0, pagar: 1, reservar: 2, decidir: 3, avaliar: 4 };
  return out.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || order[a.kind] - order[b.kind]);
}
