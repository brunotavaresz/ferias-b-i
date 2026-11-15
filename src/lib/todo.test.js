import { test } from "node:test";
import assert from "node:assert/strict";
import { pendingItems, bookingSummary, remaining } from "./todo.js";
import { searchLinks } from "./search.js";
import { kmBetween } from "./geo.js";

const trip = { pessoas: 2, members: ["a@x.pt", "b@x.pt"], memberNames: { "a@x.pt": "Bruno M", "b@x.pt": "Inês" } };
const nice = { id: "n", nome: "Nice", inicio: "2027-03-11", fim: "2027-03-16", escolhido: true };

test("pendentes: escolher, reservar, pagar, prazos e avaliações", () => {
  const options = [
    { id: "v", destinationId: "n", categoria: "voo", nome: "easyJet", preco: 240, escolhido: true, ratings: { "a@x.pt": 4 } },
    { id: "h1", destinationId: "n", categoria: "alojamento", nome: "Berne", preco: 375 },
    { id: "h2", destinationId: "n", categoria: "alojamento", nome: "Khla", preco: 523, escolhido: true, reservaEstado: "reservado", valorPago: 100, pagarAte: "2027-03-01", cancelarAte: "2027-02-20", ratings: { "a@x.pt": 5, "b@x.pt": 5 } },
  ];
  const p = pendingItems({ trip, destinations: [nice], options }, new Date("2027-02-18T10:00:00Z"));
  const texts = p.map((x) => x.text);
  assert.ok(texts.includes("Reservar easyJet"));
  assert.ok(texts.some((t) => t.startsWith("Pagar 423 € de Khla")));
  assert.ok(texts.some((t) => t.startsWith("Último dia para cancelar Khla")));
  assert.ok(texts.some((t) => t.startsWith("Guardar opções de transporte")) === false);
  assert.ok(texts.some((t) => t.startsWith("Inês ainda não deu estrelas a 2")));
  assert.equal(p[0].urgent, true); // prazo de cancelamento a 2 dias vem primeiro
});

test("resumo de reservas e pagamentos", () => {
  const options = [
    { id: "v", destinationId: "n", preco: 240, escolhido: true, reservaEstado: "pago", valorPago: 240 },
    { id: "h", destinationId: "n", preco: 500, escolhido: true, reservaEstado: "reservado", valorPago: 100 },
    { id: "x", destinationId: "n", preco: 999 },
  ];
  const s = bookingSummary(options, "n");
  assert.equal(s.total, 740); assert.equal(s.pago, 340); assert.equal(s.falta, 400); assert.equal(s.reservados, 2);
  assert.equal(remaining(options[1]), 400);
});

test("links de pesquisa com datas e viajantes", () => {
  const L = searchLinks(nice, { pessoas: 2 });
  assert.ok(L.alojamento[0].href.includes("checkin=2027-03-11"));
  assert.ok(L.alojamento[0].href.includes("group_adults=2"));
  assert.ok(L.voo.find((x) => x.label === "Skyscanner").href.includes("/opo/nce/270311/270316/"));
});

test("distância entre pontos", () => {
  const d = kmBetween({ lat: 43.7045, lng: 7.2619 }, { lat: 43.6959, lng: 7.2711 });
  assert.ok(d > 1 && d < 1.4, String(d));
});
