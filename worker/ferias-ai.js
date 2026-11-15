/**
 * Férias a Dois · intermediário de IA (Cloudflare Worker)
 *
 * Recebe texto colado (página de hotel, lista de resultados, voo, atividade) e imagens,
 * pede ao Gemini para extrair os dados e devolve JSON à app. A chave do Gemini fica
 * guardada aqui como segredo e nunca vai para o site.
 *
 * Variáveis (Settings > Variables and Secrets):
 *   GEMINI_API_KEY   (Secret)  chave criada em https://aistudio.google.com/apikey
 *   ALLOWED_EMAILS   (Text)    emails Google autorizados, separados por vírgulas
 *   GEMINI_MODEL     (Text, opcional) por omissão "gemini-flash-latest"
 */
const PROJECT_ID = "ferias-b-i";
const ALLOWED_ORIGINS = ["https://brunotavaresz.github.io", "http://localhost:5173", "http://localhost:4173"];
const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return json({ ok: true, service: "ferias-ai" });

    // 1) quem está a pedir
    let email;
    try {
      email = await verifyFirebaseToken((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""));
    } catch (e) {
      return json({ error: "Sessão inválida. Volta a entrar na app." }, 401);
    }
    const allowed = (env.ALLOWED_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
    if (!allowed.includes(email)) return json({ error: `O email ${email} não está autorizado no Worker (ALLOWED_EMAILS).` }, 403);
    if (!env.GEMINI_API_KEY) return json({ error: "Falta a variável GEMINI_API_KEY no Worker." }, 500);

    // 2) o pedido
    let body;
    try { body = await req.json(); } catch { return json({ error: "Pedido inválido." }, 400); }
    const text = String(body.text || "").slice(0, 120000);
    const images = Array.isArray(body.images) ? body.images.slice(0, 6) : [];
    if (!text.trim() && !images.length) return json({ error: "Cola texto ou imagens." }, 400);

    const parts = [{ text: buildPrompt(body.context || {}, text, images.length) }];
    for (const img of images) {
      const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(img || "");
      if (m) parts.push({ inline_data: { mime_type: m[1], data: m[2] } });
    }
    const model = env.GEMINI_MODEL || "gemini-flash-latest";
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json", temperature: 0.1 } }),
    });
    if (r.status === 429) return json({ error: "Limite gratuito do Gemini atingido por agora. Tenta daqui a um minuto." }, 429);
    if (!r.ok) return json({ error: `O Gemini respondeu com erro ${r.status}.`, detail: (await r.text()).slice(0, 400) }, 502);
    const data = await r.json();
    const out = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    try {
      return json(JSON.parse(out));
    } catch {
      const m = out.match(/\{[\s\S]*\}/);
      if (m) { try { return json(JSON.parse(m[0])); } catch { /* cai abaixo */ } }
      return json({ error: "Não consegui ler a resposta do Gemini.", detail: out.slice(0, 400) }, 502);
    }
  },
};

function buildPrompt(ctx, text, nImages) {
  return `És um assistente que extrai dados de páginas de reservas de viagens (Booking, Airbnb, companhias aéreas, GetYourGuide…) para uma app de planear férias em português de Portugal.
Contexto da viagem: destino "${ctx.destino || "?"}", de ${ctx.inicio || "?"} a ${ctx.fim || "?"}, ${ctx.pessoas || 2} viajantes.

Responde APENAS com um objeto JSON com esta forma:
{
  "tipo": "alojamento" | "lista_alojamentos" | "voo" | "atividade" | "transporte",
  "itens": [ ... ],
  "fotos": null ou { "resumo": string, "positivos": [string], "duvidas": [string] }
}

Regras:
- "lista_alojamentos" quando o texto é uma página de RESULTADOS de pesquisa com vários alojamentos: devolve um item por alojamento (todos os que aparecem, pela ordem).
- "alojamento" quando é a página de UM alojamento: devolve um único item, o mais completo possível.
- Usa null quando um dado não aparece. Nunca inventes valores. Números sem unidades (vírgula decimal convertida para ponto).
- Preços: o PREÇO TOTAL da estadia/viagem para todos os viajantes, em euros, com taxas, tal como aparece (se houver preço riscado e preço atual, usa o atual).

Campos de cada item de alojamento:
 nome, link, preco, noites, nota (0-10), comentarios (n.º), estrelas, distancia (km ao centro; metros → km), distanciaPraia (km), zona, morada,
 tipo ("hotel"|"apartamento"|"bnb"|"hostel"), m2, cama ("casal"|"twin"; twin só se o quarto mostrado tiver apenas camas individuais),
 pequenoAlmoco (bool), cancelamento (bool: cancelamento gratuito), pagarHotel (bool: sem pré-pagamento / paga no alojamento), cozinha (bool), vistaMar (bool), varanda (bool),
 quarto (nome do tipo de quarto), checkin (ex. "15:00"), checkout, caucao (texto curto),
 notasCategorias: { limpeza, conforto, localizacao, funcionarios, instalacoes, qualidadePreco, wifi } (0-10, null se não houver),
 elogios: até 5 frases curtas com o que os hóspedes mais elogiam (tiradas dos comentários do texto),
 queixas: até 5 frases curtas com as queixas mais repetidas,
 resumo: 1-2 frases neutras sobre o alojamento.
 Numa lista de resultados preenche só o que aparece (normalmente nome, preco, nota, comentarios, distancia, zona, pequenoAlmoco, cancelamento, pagarHotel, cama, tipo, link).
Campos de voo: nome (ex. "easyJet direto"), companhia, origem, destinoAeroporto, idaData (AAAA-MM-DD), idaHora (hora de CHEGADA ao destino), voltaData, voltaHora (hora de PARTIDA do regresso), duracao (horas por trajeto), escalas, bagagem ("mochila"|"cabine"|"porao"), preco, link.
Campos de atividade: nome, preco, duracao (horas), morada, tipo ("visita"|"passeio"|"comida"|"praia"|"noite"|"outro"), link, resumo, elogios, queixas.
Campos de transporte: nome, tipo ("aeroporto"|"comboio"|"autocarro"|"passe"|"carro"|"taxi"|"barco"), preco, duracao (minutos), link.
${nImages ? `\nHá ${nImages} imagem(ns) anexada(s) (fotos do alojamento ou da reserva). Em "fotos" descreve em português de Portugal o aspeto (estado, luz, espaço, casa de banho, vista), o que parece bom e as dúvidas a confirmar. Se as imagens tiverem dados de preço ou reserva, usa-os nos itens.` : `\n"fotos" é null.`}

Texto colado:
"""
${text}
"""`;
}

/* ---------- verificação do token do Firebase (RS256) ---------- */
let jwksCache = { keys: null, exp: 0 };
async function getJwks() {
  if (jwksCache.keys && Date.now() < jwksCache.exp) return jwksCache.keys;
  const r = await fetch(JWKS_URL);
  const { keys } = await r.json();
  jwksCache = { keys, exp: Date.now() + 3600e3 };
  return keys;
}
const b64urlToBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
async function verifyFirebaseToken(token) {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) throw new Error("token");
  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h)));
  const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(p)));
  const jwk = (await getJwks()).find((k) => k.kid === header.kid);
  if (!jwk || header.alg !== "RS256") throw new Error("kid");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToBytes(s), new TextEncoder().encode(`${h}.${p}`));
  const now = Math.floor(Date.now() / 1000);
  if (!ok || payload.aud !== PROJECT_ID || payload.iss !== `https://securetoken.google.com/${PROJECT_ID}` || payload.exp < now || !payload.email || payload.email_verified === false) throw new Error("claims");
  return String(payload.email).toLowerCase();
}
