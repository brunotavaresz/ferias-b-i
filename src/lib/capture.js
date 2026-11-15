/* Converte a resposta da IA em opções da app e junta-as às que já existem. Funções puras. */
const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const x = Number(String(v).replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(x) ? x : null;
};
const bool = (v) => v === true || v === "true";
const strs = (a, n = 5) => (Array.isArray(a) ? a.map(String).map((s) => s.trim()).filter(Boolean).slice(0, n) : []);
const pick = (v, allowed, dflt = null) => (allowed.includes(v) ? v : dflt);

export function categoryOf(tipo) {
  if (tipo === "lista_alojamentos" || tipo === "alojamento") return "alojamento";
  return ["voo", "atividade", "transporte"].includes(tipo) ? tipo : "alojamento";
}

export function toOption(item, categoria, extra = {}) {
  const base = { categoria, nome: String(item.nome || "").trim() || "Sem nome", link: item.link || "", preco: num(item.preco), ...extra };
  if (categoria === "alojamento") {
    const cats = item.notasCategorias && typeof item.notasCategorias === "object"
      ? Object.fromEntries(Object.entries(item.notasCategorias).map(([k, v]) => [k, num(v)]).filter(([, v]) => v != null)) : null;
    const notas = [item.resumo, item.quarto && `Quarto: ${item.quarto}`, (item.checkin || item.checkout) && `Check-in ${item.checkin || "?"} · check-out ${item.checkout || "?"}`, item.caucao && `Caução: ${item.caucao}`, item.distanciaPraia != null && `Praia a ${num(item.distanciaPraia)} km`]
      .filter(Boolean).join("\n");
    return {
      ...base, noites: num(item.noites), nota: num(item.nota), comentarios: num(item.comentarios), estrelas: num(item.estrelas),
      distancia: num(item.distancia), distanciaPraia: num(item.distanciaPraia), zona: item.zona || "", morada: item.morada || "",
      tipo: pick(item.tipo, ["hotel", "apartamento", "bnb", "hostel"], "hotel"), m2: num(item.m2), cama: item.cama === "twin" ? "twin" : "casal",
      pequenoAlmoco: bool(item.pequenoAlmoco), cancelamento: bool(item.cancelamento), pagarHotel: bool(item.pagarHotel),
      cozinha: bool(item.cozinha), vistaMar: bool(item.vistaMar), varanda: bool(item.varanda),
      notasCategorias: cats && Object.keys(cats).length ? cats : null,
      prosMeus: strs(item.elogios), contrasMeus: strs(item.queixas), notas,
    };
  }
  if (categoria === "voo") {
    return {
      ...base, companhia: item.companhia || "", origem: item.origem || "", destinoAeroporto: item.destinoAeroporto || "",
      idaData: item.idaData || "", idaHora: item.idaHora || "", voltaData: item.voltaData || "", voltaHora: item.voltaHora || "",
      duracao: num(item.duracao), escalas: num(item.escalas), bagagem: pick(item.bagagem, ["mochila", "cabine", "porao"], null),
    };
  }
  if (categoria === "atividade") {
    return { ...base, duracao: num(item.duracao), morada: item.morada || "", tipo: pick(item.tipo, ["visita", "passeio", "comida", "praia", "noite", "outro"], "outro"), notas: item.resumo || "", prosMeus: strs(item.elogios), contrasMeus: strs(item.queixas) };
  }
  return { ...base, tipo: pick(item.tipo, ["aeroporto", "comboio", "autocarro", "passe", "carro", "taxi", "barco"], null), duracao: num(item.duracao) };
}

/** Converte a resposta completa. Junta a avaliação das fotos ao 1.º alojamento. */
export function fromAi(res, destinationId) {
  const categoria = categoryOf(res?.tipo);
  const items = Array.isArray(res?.itens) ? res.itens : [];
  const opts = items.filter((i) => i && i.nome).map((i) => toOption(i, categoria, { destinationId }));
  if (res?.fotos && opts.length) {
    const f = res.fotos;
    const txt = [f.resumo && `Fotos: ${f.resumo}`, ...(strs(f.duvidas).map((d) => `A confirmar: ${d}`))].filter(Boolean).join("\n");
    opts[0].notas = [opts[0].notas, txt].filter(Boolean).join("\n");
    opts[0].prosMeus = [...(opts[0].prosMeus || []), ...strs(f.positivos, 3)];
  }
  return { categoria, lista: res?.tipo === "lista_alojamentos", opts };
}

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Procura uma opção igual (mesmo destino, categoria e nome). */
export function findExisting(options, o) {
  return options.find((x) => x.destinationId === o.destinationId && x.categoria === o.categoria && norm(x.nome) === norm(o.nome));
}

/** Junta dados novos a uma opção existente sem apagar o que lá está (só preenche ou atualiza com valores novos). */
export function mergeOption(existing, fresh) {
  const out = { id: existing.id };
  for (const [k, v] of Object.entries(fresh)) {
    if (v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length)) continue;
    if (k === "prosMeus" || k === "contrasMeus") out[k] = Array.from(new Set([...(existing[k] || []), ...v]));
    else if (k === "notas" && existing.notas && !existing.notas.includes(v)) out[k] = `${existing.notas}\n${v}`;
    else if (typeof v === "boolean" && v === false && existing[k] === true) continue;
    else out[k] = v;
  }
  return out;
}
