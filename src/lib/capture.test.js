import { test } from "node:test";
import assert from "node:assert/strict";
import { fromAi, findExisting, mergeOption } from "./capture.js";

test("lista de resultados vira várias opções de alojamento", () => {
  const r = fromAi({ tipo: "lista_alojamentos", itens: [
    { nome: "Hotel de Berne", preco: "375", nota: "8,2", comentarios: 6072, distancia: 0.9, cancelamento: true, pagarHotel: true },
    { nome: "Hotel Khla", preco: 523, nota: 8.5, pequenoAlmoco: true, cama: "casal" },
    { nome: "" },
  ] }, "nice");
  assert.equal(r.categoria, "alojamento");
  assert.equal(r.lista, true);
  assert.equal(r.opts.length, 2);
  assert.equal(r.opts[0].preco, 375);
  assert.equal(r.opts[0].nota, 8.2);
  assert.equal(r.opts[0].destinationId, "nice");
});

test("página de hotel com categorias, comentários e fotos", () => {
  const r = fromAi({ tipo: "alojamento", itens: [{ nome: "Hotel de Berne", preco: 375, notasCategorias: { limpeza: 8.7, localizacao: "9,1", wifi: null }, elogios: ["Staff simpático"], queixas: ["Quarto pequeno"], resumo: "Hotel simples junto à estação.", checkin: "15:00" }],
    fotos: { resumo: "Quarto limpo mas pequeno", positivos: ["Muita luz"], duvidas: ["Casa de banho apertada"] } }, "nice");
  const o = r.opts[0];
  assert.deepEqual(o.notasCategorias, { limpeza: 8.7, localizacao: 9.1 });
  assert.deepEqual(o.prosMeus, ["Staff simpático", "Muita luz"]);
  assert.ok(o.notas.includes("Check-in 15:00"));
  assert.ok(o.notas.includes("A confirmar: Casa de banho apertada"));
});

test("voo e junção com uma opção existente", () => {
  const v = fromAi({ tipo: "voo", itens: [{ nome: "easyJet direto", preco: 240, escalas: 0, bagagem: "cabine", idaHora: "15:40" }] }, "nice").opts[0];
  assert.equal(v.categoria, "voo");
  assert.equal(v.escalas, 0);
  const existing = { id: "x", destinationId: "nice", categoria: "voo", nome: "EasyJet  Direto", preco: 260, prosMeus: ["Chega cedo"], cancelamento: true };
  assert.equal(findExisting([existing], v).id, "x");
  const m = mergeOption(existing, { ...v, prosMeus: ["Barato"] });
  assert.equal(m.id, "x");
  assert.equal(m.preco, 240);
  assert.deepEqual(m.prosMeus, ["Chega cedo", "Barato"]);
});
