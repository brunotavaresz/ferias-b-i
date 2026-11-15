import { test } from "node:test";
import assert from "node:assert/strict";
import { cityRef, nightsOf, scoreOption, prosCons, destinationPackage, compareDestinations, daysOf, roomNight } from "./scoring.js";

const nice = { id: "n", nome: "Nice", inicio: "2027-03-11", fim: "2027-03-16", nivelPreco: "caro", epoca: "baixa" };
const buda = { id: "b", nome: "Budapeste", inicio: "2027-03-11", fim: "2027-03-16", nivelPreco: "barato", epoca: "baixa" };

test("noites e dias", () => {
  assert.equal(nightsOf(nice), 5);
  assert.equal(daysOf(nice).length, 6);
  assert.equal(daysOf(nice)[5].date, "2027-03-16");
});

test("referência de preço depende da cidade e da época", () => {
  assert.equal(cityRef(nice).noite, Math.round(150 * 0.85));
  assert.equal(cityRef({ ...nice, epoca: "alta" }).noite, 195);
  assert.equal(cityRef({ ...nice, refNoite: 90 }).noite, 90);
});

test("o mesmo preço vale mais numa cidade cara", () => {
  const h = { id: "h", categoria: "alojamento", preco: 500, nota: 8.5, distancia: 0.8, cancelamento: true };
  const sNice = scoreOption(h, nice, 2, [h]).score;
  const sBuda = scoreOption(h, buda, 2, [h]).score;
  assert.ok(sNice > sBuda, `${sNice} > ${sBuda}`);
});

test("pequeno-almoço incluído desconta no preço do quarto", () => {
  const a = { categoria: "alojamento", preco: 500 };
  const b = { categoria: "alojamento", preco: 500, pequenoAlmoco: true };
  assert.ok(roomNight(b, nice, 2) < roomNight(a, nice, 2));
});

test("twin penaliza e prós/contras comparam com os outros", () => {
  const a = { id: "a", categoria: "alojamento", preco: 375, nota: 8.2, distancia: 0.9, cancelamento: true, pagarHotel: true };
  const b = { id: "b", categoria: "alojamento", preco: 523, nota: 8.5, distancia: 0.8, pequenoAlmoco: true, cancelamento: true, cama: "twin" };
  const pa = prosCons(a, nice, 2, [a, b]);
  const pb = prosCons(b, nice, 2, [a, b]);
  assert.ok(pa.pros.some((x) => x.startsWith("O mais barato")));
  assert.ok(pb.cons.some((x) => x.includes("twin")));
  assert.ok(pb.pros.some((x) => x.startsWith("Melhor nota")));
});

test("notas por categoria contam na qualidade e na localização", () => {
  const base = { id: "q", categoria: "alojamento", preco: 400, nota: 8.5 };
  const limpo = { ...base, notasCategorias: { limpeza: 9.5, conforto: 9.2, instalacoes: 9, localizacao: 9.6 } };
  const sujo = { ...base, notasCategorias: { limpeza: 7.2, conforto: 7.4, instalacoes: 7, localizacao: 7.5 } };
  assert.ok(scoreOption(limpo, nice, 2).comp.qualidade > scoreOption(sujo, nice, 2).comp.qualidade);
  assert.ok(scoreOption(limpo, nice, 2).comp.localizacao > 0.8);
  assert.ok(prosCons(sujo, nice, 2, [sujo]).cons.some((x) => x.startsWith("Limpeza fraca")));
});

test("opinião do casal pesa", () => {
  const o = { id: "o", categoria: "alojamento", preco: 400, nota: 8, distancia: 1 };
  const loved = { ...o, ratings: { a: 5, b: 5 } };
  const hated = { ...o, ratings: { a: 1, b: 2 } };
  assert.ok(scoreOption(loved, nice, 2, [], 3).score > scoreOption(hated, nice, 2, [], 3).score);
});

test("pacote e comparação de destinos", () => {
  const opts = [
    { id: "v1", destinationId: "n", categoria: "voo", preco: 240, escalas: 0, duracao: 2.2, bagagem: "cabine", idaHora: "12:00", voltaHora: "18:00" },
    { id: "h1", destinationId: "n", categoria: "alojamento", preco: 375, nota: 8.2, distancia: 0.9, escolhido: true },
    { id: "t1", destinationId: "n", categoria: "transporte", preco: 20, escolhido: true },
    { id: "v2", destinationId: "b", categoria: "voo", preco: 300, escalas: 1, duracao: 5 },
    { id: "h2", destinationId: "b", categoria: "alojamento", preco: 250, nota: 9, distancia: 0.5 },
  ];
  const trip = { pessoas: 2, weights: { custo: 4, qualidade: 3, logistica: 2, interesse: 4, clima: 2, opiniao: 3 } };
  const pn = destinationPackage(nice, opts, [], trip);
  assert.equal(pn.custos.voo, 240);
  assert.equal(pn.custos.alojamento, 375);
  assert.equal(pn.custos.transportes, 20);
  assert.ok(pn.avisos.some((x) => x.startsWith("Voo ainda não escolhido")));
  const pb = destinationPackage(buda, opts, [], trip);
  assert.ok(pb.porPessoaDia < pn.porPessoaDia);
  const cmp = compareDestinations([pn, pb], trip.weights);
  assert.equal(cmp.length, 2);
  assert.ok(cmp.every((x) => x.score >= 0 && x.score <= 100));
  const cheap = cmp.find((x) => x.dest.id === "b"), dear = cmp.find((x) => x.dest.id === "n");
  assert.equal(cheap.parts.custo, 1);
  assert.ok(dear.parts.custo < 1 && dear.parts.custo >= 0);
});
