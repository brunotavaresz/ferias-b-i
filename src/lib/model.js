/* Modelo de dados: categorias, campos dos formulários, níveis de preço e épocas. */

export const COST_LEVELS = {
  barato: { label: "Barato", hotelNoite: 65, diaPessoa: 35, pequenoAlmoco: 6 },
  medio: { label: "Médio", hotelNoite: 100, diaPessoa: 55, pequenoAlmoco: 10 },
  caro: { label: "Caro", hotelNoite: 150, diaPessoa: 75, pequenoAlmoco: 14 },
  muito_caro: { label: "Muito caro", hotelNoite: 220, diaPessoa: 100, pequenoAlmoco: 20 },
};

export const SEASONS = {
  baixa: { label: "Época baixa", f: 0.85 },
  media: { label: "Época média", f: 1 },
  alta: { label: "Época alta", f: 1.3 },
  pico: { label: "Evento / pico", f: 1.6 },
};

/* Sugestões aproximadas de nível de preço (alojamento e dia a dia para turistas). Editáveis em cada destino. */
export const CITY_PRESETS = {
  "Nice": "caro", "Mónaco": "muito_caro", "Cannes": "caro", "Menton": "caro", "Marselha": "medio",
  "Paris": "muito_caro", "Lyon": "caro", "Bordéus": "caro", "Estrasburgo": "caro",
  "Roma": "caro", "Florença": "caro", "Veneza": "muito_caro", "Milão": "caro", "Nápoles": "medio", "Bolonha": "medio", "Costa Amalfitana": "muito_caro",
  "Barcelona": "caro", "Madrid": "medio", "Sevilha": "medio", "Valência": "medio", "Granada": "medio", "Palma de Maiorca": "caro",
  "Lisboa": "medio", "Porto": "medio", "Madeira": "medio", "Açores": "medio", "Algarve": "medio",
  "Londres": "muito_caro", "Edimburgo": "caro", "Dublin": "muito_caro", "Amesterdão": "muito_caro", "Bruxelas": "caro",
  "Berlim": "medio", "Munique": "caro", "Viena": "caro", "Praga": "medio", "Budapeste": "barato", "Cracóvia": "barato",
  "Copenhaga": "muito_caro", "Estocolmo": "caro", "Zurique": "muito_caro", "Atenas": "medio", "Santorini": "muito_caro",
  "Istambul": "barato", "Dubrovnik": "caro", "Split": "medio", "Malta": "medio", "Marraquexe": "barato", "Tenerife": "medio",
};

/** Época sugerida pelo mês (Europa, regra geral). */
export function suggestSeason(dateStr) {
  if (!dateStr) return "media";
  const m = Number(String(dateStr).slice(5, 7));
  if ([7, 8].includes(m)) return "alta";
  if ([6, 9, 4, 5, 10].includes(m)) return "media";
  if (m === 12) return "media";
  return "baixa";
}

export const CATEGORIES = {
  voo: { label: "Voos", one: "Voo", icon: "✈" },
  alojamento: { label: "Alojamento", one: "Alojamento", icon: "⌂" },
  transporte: { label: "Transportes", one: "Transporte", icon: "⇄" },
  atividade: { label: "Atividades", one: "Atividade", icon: "★" },
};
export const CATEGORY_KEYS = Object.keys(CATEGORIES);

/*
 * Campos por categoria. type: text | number | url | bool | select | date | time | stars | textarea
 * Campos comuns (nome, link, preco, notas, prós/contras) são acrescentados no formulário.
 */
export const FIELDS = {
  voo: [
    { k: "companhia", label: "Companhia", type: "text", ph: "easyJet, TAP, Ryanair…" },
    { k: "origem", label: "Origem", type: "text", ph: "Porto (OPO)" },
    { k: "destinoAeroporto", label: "Destino", type: "text", ph: "Nice (NCE)" },
    { k: "idaData", label: "Ida: dia", type: "date" },
    { k: "idaHora", label: "Ida: chegada", type: "time" },
    { k: "voltaData", label: "Volta: dia", type: "date" },
    { k: "voltaHora", label: "Volta: partida", type: "time" },
    { k: "duracao", label: "Duração por trajeto (h)", type: "number", step: 0.25 },
    { k: "escalas", label: "Escalas", type: "number", step: 1 },
    { k: "bagagem", label: "Bagagem incluída", type: "select", options: [["mochila", "Só mochila"], ["cabine", "Mala de cabine"], ["porao", "Mala de porão"]] },
  ],
  alojamento: [
    { k: "tipo", label: "Tipo", type: "select", options: [["hotel", "Hotel"], ["apartamento", "Apartamento"], ["bnb", "B&B / guesthouse"], ["hostel", "Hostel"]] },
    { k: "zona", label: "Zona / bairro", type: "text" },
    { k: "distancia", label: "Distância ao centro (km)", type: "number", step: 0.1 },
    { k: "nota", label: "Nota (0–10)", type: "number", step: 0.1 },
    { k: "comentarios", label: "N.º de comentários", type: "number", step: 1 },
    { k: "estrelas", label: "Estrelas", type: "number", step: 1 },
    { k: "m2", label: "Tamanho do quarto (m²)", type: "number", step: 1 },
    { k: "cama", label: "Cama", type: "select", options: [["casal", "Cama de casal"], ["twin", "Twin (2 individuais)"]] },
    { k: "pequenoAlmoco", label: "Pequeno-almoço incluído", type: "bool" },
    { k: "cancelamento", label: "Cancelamento grátis", type: "bool" },
    { k: "pagarHotel", label: "Paga no alojamento", type: "bool" },
    { k: "cozinha", label: "Cozinha", type: "bool" },
    { k: "vistaMar", label: "Vista (mar/cidade)", type: "bool" },
    { k: "varanda", label: "Varanda / terraço", type: "bool" },
  ],
  transporte: [
    { k: "tipo", label: "Tipo", type: "select", options: [["aeroporto", "Aeroporto ↔ centro"], ["comboio", "Comboio"], ["autocarro", "Autocarro / tram"], ["passe", "Passe de transportes"], ["carro", "Aluguer de carro"], ["taxi", "Táxi / Uber"], ["barco", "Barco / ferry"]] },
    { k: "duracao", label: "Duração (min)", type: "number", step: 1 },
    { k: "conforto", label: "Comodidade", type: "stars" },
  ],
  atividade: [
    { k: "tipo", label: "Tipo", type: "select", options: [["visita", "Visita / museu"], ["passeio", "Passeio / excursão"], ["comida", "Restaurante / comida"], ["praia", "Praia / natureza"], ["noite", "Noite / espetáculo"], ["outro", "Outro"]] },
    { k: "duracao", label: "Duração (h)", type: "number", step: 0.5 },
  ],
};

export const ITEM_TYPES = {
  atividade: "Atividade", transporte: "Deslocação", comida: "Refeição", alojamento: "Alojamento", livre: "Tempo livre",
};

export const DEFAULT_WEIGHTS = { custo: 4, qualidade: 3, logistica: 2, interesse: 4, clima: 2, opiniao: 3 };
