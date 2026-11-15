/*
 * Pontuação e comparação. Funções puras (testadas em scoring.test.js).
 *
 * Ideia central: os preços de alojamento e do dia a dia são comparados com o "normal" para aquela
 * cidade e época (nível de preço × época), por isso 150 €/noite em Paris em agosto não é avaliado
 * como 150 €/noite em Budapeste em março.
 */
import { COST_LEVELS, SEASONS } from "./model.js";

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const has = (v) => v !== null && v !== undefined && v !== "" && !Number.isNaN(Number(v));
const n = (v) => (has(v) ? Number(v) : null);

/* ------------------------------ destino ------------------------------ */
export function nightsOf(dest) {
  if (!dest?.inicio || !dest?.fim) return null;
  const d = Math.round((new Date(dest.fim) - new Date(dest.inicio)) / 864e5);
  return d > 0 ? d : null;
}
export function cityRef(dest) {
  const lvl = COST_LEVELS[dest?.nivelPreco] || COST_LEVELS.medio;
  const sea = SEASONS[dest?.epoca] || SEASONS.media;
  return {
    noite: n(dest?.refNoite) ?? Math.round(lvl.hotelNoite * sea.f),
    diaPessoa: n(dest?.refDia) ?? Math.round(lvl.diaPessoa * (0.9 + 0.1 * sea.f)),
    pequenoAlmoco: lvl.pequenoAlmoco,
    nivel: lvl.label,
    epoca: sea.label,
  };
}

/* ------------------------------ opiniões ------------------------------ */
export function avgRating(ratings) {
  const v = Object.values(ratings || {}).map(Number).filter((x) => x >= 1 && x <= 5);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/* ------------------------------ opções ------------------------------ */
/** Preço real de um alojamento para o grupo: soma o pequeno-almoço quando não está incluído. */
export function lodgingRealCost(o, dest, pessoas) {
  const nights = n(o.noites) ?? nightsOf(dest) ?? 1;
  const ref = cityRef(dest);
  const extra = o.pequenoAlmoco ? 0 : ref.pequenoAlmoco * pessoas * nights;
  return (n(o.preco) ?? 0) + extra;
}

/** Preço por noite só do quarto (se o pequeno-almoço vem incluído, desconta o que valeria). */
export function roomNight(o, dest, pessoas) {
  const nights = n(o.noites) ?? nightsOf(dest) ?? 1;
  if (n(o.preco) == null) return null;
  return n(o.preco) / nights - (o.pequenoAlmoco ? cityRef(dest).pequenoAlmoco * (pessoas || 2) : 0);
}

/** Componentes de 0 a 1 por categoria (1 = melhor). Nulos quando falta informação. */
export function components(o, dest, pessoas, siblings = []) {
  const p = Math.max(1, pessoas || 2);
  const c = {};
  if (o.categoria === "alojamento") {
    const nights = n(o.noites) ?? nightsOf(dest) ?? 1;
    const ref = cityRef(dest);
    if (has(o.preco)) {
      const effNight = roomNight(o, dest, p); // só o quarto: o pequeno-almoço incluído desconta
      c.preco = clamp((1.6 - effNight / ref.noite) / 1.0);
    } else c.preco = null;
    c.nota = has(o.nota) ? clamp((Number(o.nota) - 6.5) / 3) : null;
    c.localizacao = has(o.distancia) ? clamp(1 - Number(o.distancia) / 4) : null;
    const st = has(o.estrelas) ? Number(o.estrelas) / 5 : null;
    const sz = has(o.m2) ? clamp((Number(o.m2) - 12) / 20) : null;
    c.qualidade = st == null && sz == null ? null : st != null && sz != null ? st * 0.6 + sz * 0.4 : st ?? sz;
    c.flexibilidade = (o.cancelamento ? 0.5 : 0) + (o.pagarHotel ? 0.2 : 0) + (o.cama === "twin" ? 0 : 0.3);
  } else if (o.categoria === "voo") {
    c.preco = relLow(o, siblings, (x) => n(x.preco));
    c.duracao = has(o.duracao) ? clamp(1 - (Number(o.duracao) - 1.5) / 6) : null;
    c.escalas = has(o.escalas) ? [1, 0.5, 0][Math.min(2, Number(o.escalas))] : null;
    c.bagagem = { mochila: 0, cabine: 0.6, porao: 1 }[o.bagagem] ?? null;
  } else if (o.categoria === "transporte") {
    c.preco = relLow(o, siblings, (x) => n(x.preco));
    c.duracao = has(o.duracao) ? clamp(1 - Number(o.duracao) / 120) : null;
    c.conforto = has(o.conforto) ? (Number(o.conforto) - 1) / 4 : null;
  } else if (o.categoria === "atividade") {
    c.preco = has(o.preco) ? clamp(1 - Number(o.preco) / p / 80) : null;
  }
  return c;
}
/** Preço relativo entre irmãos (mais barato = 1). Com uma só opção, fica neutro (0,6). */
function relLow(o, siblings, get) {
  const v = get(o);
  if (v == null) return null;
  const all = siblings.map(get).filter((x) => x != null);
  if (all.length < 2) return 0.6;
  const min = Math.min(...all), max = Math.max(...all);
  return max === min ? 1 : clamp(1 - (v - min) / (max - min));
}

export const COMPONENT_WEIGHTS = {
  alojamento: { preco: 0.35, nota: 0.25, localizacao: 0.2, qualidade: 0.1, flexibilidade: 0.1 },
  voo: { preco: 0.45, duracao: 0.2, escalas: 0.2, bagagem: 0.15 },
  transporte: { preco: 0.5, duracao: 0.3, conforto: 0.2 },
  atividade: { preco: 1 },
};
export const COMPONENT_LABELS = {
  preco: "Preço", nota: "Nota", localizacao: "Localização", qualidade: "Qualidade", flexibilidade: "Flexibilidade",
  duracao: "Duração", escalas: "Escalas", bagagem: "Bagagem", conforto: "Comodidade",
};

/**
 * Pontuação 0–100 de uma opção. Junta os critérios objetivos e a opinião do casal
 * (média das estrelas de cada um), com o peso de opinião da viagem (0–5).
 */
export function scoreOption(o, dest, pessoas, siblings = [], opinionWeight = 3) {
  const comp = components(o, dest, pessoas, siblings);
  const W = COMPONENT_WEIGHTS[o.categoria] || {};
  let sum = 0, wsum = 0;
  for (const [k, w] of Object.entries(W)) if (comp[k] != null) { sum += comp[k] * w; wsum += w; }
  let objective = wsum ? sum / wsum : 0.5;
  if (o.categoria === "alojamento" && o.cama === "twin") objective *= 0.85;
  const op = avgRating(o.ratings);
  const isActivity = o.categoria === "atividade";
  // nas atividades, o interesse do casal é o critério principal
  const wo = isActivity ? 0.7 : clamp((opinionWeight || 0) / 10, 0, 0.5);
  const score = op == null ? objective : objective * (1 - wo) + ((op - 1) / 4) * wo;
  return { score: Math.round(score * 100), comp, opinion: op };
}

/** Vantagens e desvantagens automáticas, comparando com as outras opções da mesma categoria. */
export function prosCons(o, dest, pessoas, siblings = []) {
  const P = [], C = [];
  const others = siblings.filter((s) => s.id !== o.id && !s.descartado);
  const multi = others.length > 0;
  const eur = (v) => `${Math.round(v).toLocaleString("pt-PT")} €`;
  const priceOf = o.categoria === "alojamento" ? (x) => lodgingRealCost(x, dest, pessoas) : (x) => n(x.preco);
  const myPrice = priceOf(o);
  if (multi && myPrice != null && n(o.preco) != null) {
    const ps = others.map(priceOf).filter((x) => x != null && n(x) != null);
    if (ps.length) {
      if (myPrice < Math.min(...ps)) P.push(`O mais barato (${eur(Math.min(...ps) - myPrice)} a menos que o seguinte)`);
      if (myPrice > Math.max(...ps)) C.push(`O mais caro (${eur(myPrice - Math.min(...ps))} acima do mais barato)`);
    }
  }
  if (o.categoria === "alojamento") {
    const ref = cityRef(dest), nights = n(o.noites) ?? nightsOf(dest);
    if (n(o.preco) != null && nights) {
      const night = roomNight(o, dest, pessoas);
      const diff = Math.round((night / ref.noite - 1) * 100);
      const where = `${dest?.nome || "a cidade"} (${ref.epoca.toLowerCase()})`;
      if (diff <= -15) P.push(`${Math.abs(diff)}% abaixo do normal para ${where}`);
      else if (diff >= 15) C.push(`${diff}% acima do normal para ${where}`);
    }
    if (multi && n(o.nota) != null && others.every((x) => n(x.nota) == null || n(x.nota) < n(o.nota))) P.push(`Melhor nota (${o.nota})`);
    if (n(o.nota) != null && n(o.nota) < 7.8) C.push(`Nota fraca (${o.nota})`);
    if (n(o.nota) != null && n(o.nota) >= 8.8) P.push(`Nota excelente (${o.nota})`);
    if (n(o.distancia) != null) {
      if (n(o.distancia) <= 0.6) P.push("Mesmo no centro");
      else if (n(o.distancia) > 2.5) C.push(`Longe do centro (${o.distancia} km)`);
    }
    const bf = cityRef(dest).pequenoAlmoco * (pessoas || 2) * (nights || 1);
    if (o.pequenoAlmoco) P.push(`Pequeno-almoço incluído (vale ~${eur(bf)})`); else C.push(`Sem pequeno-almoço (+~${eur(bf)})`);
    if (o.cancelamento) P.push("Cancelamento grátis"); else C.push("Sem cancelamento grátis (ou por confirmar)");
    if (o.pagarHotel) P.push("Paga só no alojamento");
    if (o.cozinha) P.push("Cozinha: poupa nas refeições");
    if (o.vistaMar) P.push("Com vista");
    if (o.varanda) P.push("Varanda ou terraço");
    if (o.cama === "twin") C.push("Camas separadas (twin)");
    if (n(o.m2) != null && n(o.m2) < 14) C.push(`Quarto pequeno (${o.m2} m²)`);
    if (n(o.comentarios) != null && n(o.comentarios) < 150) C.push("Poucos comentários: nota pouco fiável");
  }
  if (o.categoria === "voo") {
    if (n(o.escalas) === 0) P.push("Voo direto"); else if (n(o.escalas) > 0) C.push(`${o.escalas} escala${n(o.escalas) > 1 ? "s" : ""}`);
    if (o.bagagem === "porao") P.push("Mala de porão incluída");
    else if (o.bagagem === "mochila") C.push("Só mochila: a mala paga-se à parte");
    if (n(o.duracao) != null && n(o.duracao) > 5) C.push(`Viagem longa (${o.duracao} h por trajeto)`);
    const arr = o.idaHora ? Number(o.idaHora.slice(0, 2)) : null;
    if (arr != null && arr <= 13) P.push("Chega cedo: aproveita o 1.º dia");
    if (arr != null && arr >= 21) C.push("Chega à noite: perde-se o 1.º dia");
    const dep = o.voltaHora ? Number(o.voltaHora.slice(0, 2)) : null;
    if (dep != null && dep >= 17) P.push("Volta ao fim do dia: aproveita o último dia");
    if (dep != null && dep <= 10) C.push("Volta de manhã cedo");
  }
  if (o.categoria === "transporte") {
    if (n(o.duracao) != null && n(o.duracao) > 60) C.push(`Demora ${o.duracao} min`);
    if (n(o.conforto) >= 4) P.push("Muito prático");
  }
  const op = avgRating(o.ratings);
  if (op != null && op >= 4.5) P.push("Os dois adoram");
  if (op != null && op <= 2) C.push("Não vos convence");
  return { pros: P, cons: C };
}

/* ------------------------------ destinos ------------------------------ */
/**
 * Pacote de um destino: melhor ou escolhida opção de voo e alojamento, transportes e atividades
 * marcados como escolhidos, mais o dia a dia estimado. Devolve custos e avisos.
 */
export function destinationPackage(dest, options, items, trip) {
  const pessoas = Math.max(1, Number(trip?.pessoas) || 2);
  const ow = trip?.weights?.opiniao ?? 3;
  const mine = options.filter((o) => o.destinationId === dest.id && !o.descartado);
  const pick = (cat) => {
    const list = mine.filter((o) => o.categoria === cat);
    const chosen = list.find((o) => o.escolhido);
    if (chosen) return { opt: chosen, chosen: true };
    if (!list.length) return { opt: null, chosen: false };
    const best = [...list].sort((a, b) => scoreOption(b, dest, pessoas, list, ow).score - scoreOption(a, dest, pessoas, list, ow).score)[0];
    return { opt: best, chosen: false };
  };
  const voo = pick("voo"), aloj = pick("alojamento");
  const transportes = mine.filter((o) => o.categoria === "transporte" && o.escolhido);
  const atividades = mine.filter((o) => o.categoria === "atividade" && o.escolhido);
  const nights = nightsOf(dest);
  const days = nights ? nights + 1 : null;
  const ref = cityRef(dest);
  const linkedIds = new Set(atividades.concat(transportes).map((o) => o.id));
  const extrasRoteiro = items
    .filter((i) => i.destinationId === dest.id && !(i.optionId && linkedIds.has(i.optionId)))
    .reduce((s, i) => s + (n(i.custo) ?? 0), 0);

  const custos = {
    voo: voo.opt ? n(voo.opt.preco) ?? 0 : null,
    alojamento: aloj.opt ? n(aloj.opt.preco) ?? 0 : null,
    transportes: transportes.reduce((s, o) => s + (n(o.preco) ?? 0), 0),
    atividades: atividades.reduce((s, o) => s + (n(o.preco) ?? 0), 0) + extrasRoteiro,
    diaADia: days ? Math.round(ref.diaPessoa * pessoas * days - (aloj.opt?.pequenoAlmoco ? ref.pequenoAlmoco * pessoas * (nights || 0) : 0)) : null,
  };
  const total = Object.values(custos).reduce((s, v) => s + (v ?? 0), 0);
  const avisos = [];
  if (!nights) avisos.push("Faltam as datas");
  if (!voo.opt) avisos.push("Falta um voo");
  else if (!voo.chosen) avisos.push("Voo ainda não escolhido (a usar o melhor)");
  if (!aloj.opt) avisos.push("Falta alojamento");
  else if (!aloj.chosen) avisos.push("Alojamento ainda não escolhido (a usar o melhor)");

  const alojScore = aloj.opt ? scoreOption(aloj.opt, dest, pessoas, mine.filter((o) => o.categoria === "alojamento"), ow).score / 100 : null;
  const vooComp = voo.opt ? components(voo.opt, dest, pessoas, []) : null;
  const logistica = vooComp
    ? avgNonNull([vooComp.duracao, vooComp.escalas, horaBonus(voo.opt)])
    : null;
  return {
    dest, pessoas, nights, days, ref, voo, aloj, transportes, atividades, custos, total,
    porPessoa: total / pessoas,
    porPessoaDia: days ? total / pessoas / days : null,
    qualidade: alojScore,
    logistica,
    interesse: avgRating(dest.ratings) != null ? (avgRating(dest.ratings) - 1) / 4 : null,
    clima: n(dest.clima) != null ? (n(dest.clima) - 1) / 4 : null,
    avisos,
    completo: Boolean(nights && voo.opt && aloj.opt),
  };
}
function avgNonNull(a) { const v = a.filter((x) => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; }
function horaBonus(o) {
  const a = o?.idaHora ? Number(o.idaHora.slice(0, 2)) : null;
  const d = o?.voltaHora ? Number(o.voltaHora.slice(0, 2)) : null;
  if (a == null && d == null) return null;
  const sa = a == null ? null : a <= 13 ? 1 : a >= 21 ? 0 : 0.5;
  const sd = d == null ? null : d >= 17 ? 1 : d <= 10 ? 0 : 0.5;
  return avgNonNull([sa, sd]);
}

/**
 * Compara destinos. O custo compara-se com o destino mais barato (por pessoa e por dia, para não
 * castigar viagens mais longas); os outros critérios são absolutos.
 */
export function compareDestinations(pkgs, weights) {
  const W = weights || {};
  const costs = pkgs.map((p) => p.porPessoaDia).filter((x) => x != null);
  const min = Math.min(...costs);
  return pkgs.map((p) => {
    // 0% mais caro que o mais barato = 1; 50% ou mais = 0 (diferenças pequenas pesam pouco)
    const custo = p.porPessoaDia == null ? null : clamp(1 - ((p.porPessoaDia - min) / min) * 2);
    const parts = { custo, qualidade: p.qualidade, logistica: p.logistica, interesse: p.interesse, clima: p.clima };
    let s = 0, ws = 0;
    for (const [k, v] of Object.entries(parts)) { const w = Number(W[k] ?? 0); if (v != null && w > 0) { s += v * w; ws += w; } }
    return { ...p, parts, score: ws ? Math.round((s / ws) * 100) : null };
  }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

/* ------------------------------ roteiro ------------------------------ */
export function daysOf(dest) {
  const nights = nightsOf(dest);
  if (!nights) return [];
  const out = [];
  for (let i = 0; i <= nights; i++) {
    const d = new Date(dest.inicio + "T12:00:00");
    d.setDate(d.getDate() + i);
    out.push({ index: i, date: d.toISOString().slice(0, 10) });
  }
  return out;
}
