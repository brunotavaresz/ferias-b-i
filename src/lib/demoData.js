/* Dados de exemplo da demonstração (inventados para mostrar as funcionalidades). */
import { DEMO_TRIP_ID } from "./store.js";

const B = "bruno@demo", I = "ines@demo";
const T = Date.now();
const o = (id, destinationId, categoria, x) => ({ id, destinationId, categoria, createdAt: T, updatedAt: T, ratings: {}, prosMeus: [], contrasMeus: [], notas: "", link: "", ...x });

export function demoSeed() {
  const options = [
    // ---------- Nice ----------
    o("n-v1", "nice", "voo", { nome: "easyJet direto", companhia: "easyJet", origem: "Porto (OPO)", destinoAeroporto: "Nice (NCE)", preco: 240, escalas: 0, duracao: 2.2, bagagem: "cabine", idaData: "2027-03-11", idaHora: "12:40", voltaData: "2027-03-16", voltaHora: "19:15", escolhido: true, reservaEstado: "pago", valorPago: 240, reservaCodigo: "EJU8K2Q", ratings: { [B]: 4, [I]: 4 } }),
    o("n-v2", "nice", "voo", { nome: "TAP via Lisboa", companhia: "TAP", origem: "Porto (OPO)", destinoAeroporto: "Nice (NCE)", preco: 330, escalas: 1, duracao: 4.5, bagagem: "porao", idaHora: "21:50", voltaHora: "07:10", ratings: { [B]: 2, [I]: 2 } }),
    o("n-h1", "nice", "alojamento", { nome: "Hotel de Berne", tipo: "hotel", zona: "Junto à estação", morada: "1 Avenue Thiers", preco: 375, nota: 8.2, comentarios: 6072, distancia: 0.9, estrelas: 2, m2: 15, cama: "casal", cancelamento: true, pagarHotel: true,
      notasCategorias: { limpeza: 8.6, conforto: 8.1, localizacao: 9.0, funcionarios: 8.9, instalacoes: 7.9, qualidadePreco: 8.3 },
      prosMeus: ["Funcionários muito simpáticos", "Ao lado da estação: ótimo para ir ao Mónaco"], contrasMeus: ["Quarto pequeno", "Algum barulho da rua"],
      notas: "Check-in 14:00 · check-out 11:00", lat: 43.7048, lng: 7.2617, escolhido: true, reservaEstado: "reservado", reservaCodigo: "4567.123.890", cancelarAte: "2027-03-08", pagarAte: "2027-03-11", valorPago: 0, ratings: { [B]: 4, [I]: 3 } }),
    o("n-h2", "nice", "alojamento", { nome: "Hotel Khla", tipo: "hotel", zona: "Centro", preco: 523, nota: 8.5, comentarios: 4569, distancia: 0.8, cama: "casal", pequenoAlmoco: true, cancelamento: true, pagarHotel: true,
      notasCategorias: { limpeza: 9.1, conforto: 8.8, localizacao: 9.2, funcionarios: 9.0 }, prosMeus: ["Pequeno-almoço muito elogiado"], lat: 43.7031, lng: 7.2668, ratings: { [B]: 4, [I]: 5 } }),
    o("n-h3", "nice", "alojamento", { nome: "Albert 1er", tipo: "hotel", zona: "Cidade velha", preco: 460, nota: 8.5, comentarios: 2899, distancia: 0.25, cama: "twin",
      notasCategorias: { limpeza: 8.7, localizacao: 9.7 }, prosMeus: ["Entre a cidade velha e o mar"], contrasMeus: ["Confirmar se há quarto de casal"], lat: 43.6978, lng: 7.27 }),
    o("n-h4", "nice", "alojamento", { nome: "Residhome Nice Promenade", tipo: "apartamento", zona: "Gambetta", preco: 335, nota: 8.4, comentarios: 2302, distancia: 1.5, m2: 25, cama: "casal", cozinha: true, lat: 43.6985, lng: 7.2551, ratings: { [I]: 4 } }),
    o("n-t1", "nice", "transporte", { nome: "Tram aeroporto ↔ centro", tipo: "aeroporto", preco: 4, duracao: 30, conforto: 4, escolhido: true }),
    o("n-t2", "nice", "transporte", { nome: "Comboios para Mónaco e Menton", tipo: "comboio", preco: 30, duracao: 25, conforto: 4, escolhido: true }),
    o("n-a1", "nice", "atividade", { nome: "Dia no Mónaco", tipo: "passeio", preco: 0, duracao: 6, morada: "Monaco", escolhido: true, ratings: { [B]: 5, [I]: 4 } }),
    o("n-a2", "nice", "atividade", { nome: "Èze village", tipo: "passeio", preco: 0, duracao: 3, morada: "Èze", escolhido: true, ratings: { [B]: 4, [I]: 5 } }),
    o("n-a3", "nice", "atividade", { nome: "Musée Matisse", tipo: "visita", preco: 24, duracao: 2, morada: "Musée Matisse, Nice", lat: 43.7196, lng: 7.2763, ratings: { [B]: 3, [I]: 5 } }),
    o("n-a4", "nice", "atividade", { nome: "Jantar no porto", tipo: "comida", preco: 80, duracao: 2, escolhido: true, ratings: { [B]: 5, [I]: 5 } }),
    // ---------- Roma ----------
    o("r-v1", "roma", "voo", { nome: "Ryanair direto", companhia: "Ryanair", origem: "Porto (OPO)", destinoAeroporto: "Roma (CIA)", preco: 280, escalas: 0, duracao: 2.7, bagagem: "mochila", idaHora: "22:10", voltaHora: "06:30", ratings: { [B]: 3, [I]: 2 } }),
    o("r-v2", "roma", "voo", { nome: "TAP via Lisboa", companhia: "TAP", origem: "Porto (OPO)", destinoAeroporto: "Roma (FCO)", preco: 390, escalas: 1, duracao: 5, bagagem: "porao", idaHora: "12:30", voltaHora: "18:00" }),
    o("r-h1", "roma", "alojamento", { nome: "Apartamento em Monti", tipo: "apartamento", zona: "Monti", preco: 480, nota: 9.1, comentarios: 420, distancia: 0.8, cama: "casal", cozinha: true, varanda: true,
      notasCategorias: { limpeza: 9.4, conforto: 9.2, localizacao: 9.5 }, ratings: { [B]: 5, [I]: 5 } }),
    o("r-h2", "roma", "alojamento", { nome: "Hotel em Trastevere", tipo: "hotel", zona: "Trastevere", preco: 520, nota: 8.7, comentarios: 1800, distancia: 1.5, estrelas: 3, cama: "casal", cancelamento: true }),
    o("r-a1", "roma", "atividade", { nome: "Museus do Vaticano", tipo: "visita", preco: 70, duracao: 3, escolhido: true, ratings: { [B]: 4, [I]: 5 } }),
  ];
  const items = [
    { id: "i1", destinationId: "nice", dia: 0, hora: "16:00", titulo: "Passeio na Promenade des Anglais", tipo: "livre", ordem: 1 },
    { id: "i2", destinationId: "nice", dia: 1, hora: "10:00", titulo: "Cidade velha e mercado Cours Saleya", tipo: "atividade", ordem: 2 },
    { id: "i3", destinationId: "nice", dia: 1, hora: "20:00", titulo: "Jantar no porto", tipo: "comida", custo: 80, optionId: "n-a4", ordem: 3 },
    { id: "i4", destinationId: "nice", dia: 2, hora: "09:30", titulo: "Dia no Mónaco", tipo: "atividade", optionId: "n-a1", ordem: 4 },
  ];
  const trip = {
    id: DEMO_TRIP_ID, nome: "Férias de março 2027 (exemplo)", pessoas: 2, orcamento: 800, origem: "Porto", origemAeroporto: "OPO",
    notas: "Viagem de exemplo para experimentar a app. Mexe à vontade: podes repor tudo no botão do topo.",
    ownerUid: "demo-bruno", members: [B, I], memberNames: { [B]: "Bruno", [I]: "Inês" },
    weights: { custo: 4, qualidade: 3, logistica: 2, interesse: 4, clima: 2, opiniao: 3 }, createdAt: T, updatedAt: T,
    destinations: {
      nice: { id: "nice", nome: "Nice", pais: "França", inicio: "2027-03-11", fim: "2027-03-16", nivelPreco: "caro", epoca: "baixa", aeroporto: "NCE", clima: 4, lat: 43.7009, lng: 7.2683, ratings: { [B]: 5, [I]: 4 }, escolhido: true },
      roma: { id: "roma", nome: "Roma", pais: "Itália", inicio: "2027-03-11", fim: "2027-03-16", nivelPreco: "caro", epoca: "baixa", aeroporto: "ROM", clima: 4, lat: 41.8933, lng: 12.4829, ratings: { [B]: 4, [I]: 5 } },
    },
    options: Object.fromEntries(options.map((x) => [x.id, x])),
    items: Object.fromEntries(items.map((x) => [x.id, x])),
  };
  return { trips: { [DEMO_TRIP_ID]: trip } };
}
