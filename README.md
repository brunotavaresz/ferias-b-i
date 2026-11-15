# Férias a Dois

Feito com React, [shadcn/ui](https://ui.shadcn.com) (Tailwind CSS v4 + Radix), ícones Lucide e Firebase.

App para planear férias a dois: guardar destinos possíveis e, em cada um, voos, alojamentos, transportes e atividades; comparar tudo com as vossas prioridades; montar o roteiro dia a dia.

## O que faz

- **Viagens partilhadas.** Cada viagem tem uma lista de emails com acesso. Tu e a tua namorada entram com Google e veem e editam o mesmo em tempo real.
- **Destinos.** Cada destino tem datas, um nível de preços da cidade (barato, médio, caro, muito caro) e uma época (baixa, média, alta, pico). Com isto, a app sabe o que é normal pagar lá por noite e por dia. Há sugestões para ~50 cidades, que podem ser alteradas.
- **Opções por categoria.** Voos, alojamento, transportes e atividades, com pontuação de 0 a 100, vantagens e desvantagens automáticas e as vossas próprias notas. Vistas em cartões e lado a lado.
  - Alojamento: preço por noite comparado com o normal para a cidade e época, nota, distância ao centro, qualidade, flexibilidade. Pequeno-almoço incluído desconta; quartos twin perdem pontos.
  - Voos: preço, duração, escalas, bagagem e horários (chegar cedo e voltar tarde é melhor).
  - Transportes: preço, duração e comodidade. Atividades: sobretudo o vosso interesse.
- **Opinião de cada um.** Cada pessoa dá estrelas a cada opção e a cada destino, e isso entra na pontuação (com o peso "opinião").
- **Comparar destinos.** Custo total por pessoa (voo + alojamento + transportes e atividades incluídos + dia a dia estimado), por pessoa e dia, orçamento, e critérios com pesos ajustáveis: custo, alojamento, voos e horários, interesse e clima.
- **Pesquisar.** Em cada categoria há botões que abrem o Google Flights, Skyscanner, Booking, Airbnb, GetYourGuide e Google Maps já com o destino, as datas e os viajantes (a origem e o aeroporto de partida ficam nas definições da viagem).
- **Mapa.** Alojamentos e atividades no mapa (OpenStreetMap), localizados pela morada; a distância ao centro calcula-se sozinha.
- **Reservas e pagamentos.** Nas opções escolhidas: estado (por reservar, reservado, pago), código, cancelamento grátis até, já pago e prazo para pagar. Separador Reservas com totais e painel "O que falta" (decidir, reservar, pagar, prazos, avaliações em falta).
- **Roteiro.** Dias criados a partir das datas, chegada e partida do voo e check-in/out automáticos, planos com hora, tipo e custo, atividades por encaixar, reordenar, imprimir.

## Onde está

- **App:** <https://brunotavaresz.github.io/ferias-b-i/>. Cada push para `main` faz testes, build e publica (`.github/workflows/deploy.yml`).
- **Firebase:** projeto `ferias-b-i` (plano Spark, gratuito), com login Google e Firestore. A configuração web está em `src/lib/firebase.js`. Não é secreta, porque quem protege os dados são as regras em `firestore.rules`.

## Correr localmente

```bash
npm install
npm run dev     # liga ao Firebase ferias-b-i
npm test        # testes da lógica de pontuação
npm run build   # build de produção para dist/
```

Para experimentar sem Firebase, cria um `.env` com `VITE_LOCAL_MODE=true`. Nesse modo os dados ficam só no browser, sem login.

## Configuração do Firebase (já feita)

1. Authentication → Sign-in method → **Google** ativado.
2. Firestore (`eur3`, modo de produção), com as regras de `firestore.rules` publicadas. Quando mudares as regras, volta a colá-las em Firestore → Regras.
3. Authentication → Settings → **Authorized domains** com `brunotavaresz.github.io` (e `localhost`).
4. Para partilhar, na app vai a **Partilhar e definições** e adiciona o email Google da outra pessoa.

As regras só deixam ler e escrever uma viagem a quem estiver na lista `members` (emails em minúsculas).

## IA: colar páginas (Gemini + Cloudflare Worker)

O botão **Colar página** lê o texto colado de uma página (hotel, lista de resultados do Booking, voo, atividade) e prints das fotos, e transforma tudo em opções: preço, nota, notas por categoria, comentários (elogios e queixas), check-in, caução, avaliação das fotos…

Funciona através de `worker/ferias-ai.js`, um Cloudflare Worker que guarda a chave do Gemini e só aceita pedidos de quem tem sessão iniciada na app e está em `ALLOWED_EMAILS`.

1. Chave grátis em <https://aistudio.google.com/apikey> (plano gratuito do Gemini, sem cartão; tem limites de uso e a Google pode usar os pedidos para melhorar os produtos).
2. Cloudflare → **Workers & Pages → Create → Create Worker**, nome `ferias-ai` → **Deploy** → **Edit code**: cola o conteúdo de `worker/ferias-ai.js` → **Deploy**.
3. No Worker → **Settings → Variables and Secrets**:
   - `GEMINI_API_KEY` (tipo *Secret*): a chave do passo 1.
   - `ALLOWED_EMAILS` (tipo *Text*): os emails Google autorizados, separados por vírgulas.
   - `GEMINI_MODEL` (opcional): por omissão `gemini-flash-latest`.
4. Põe o URL do Worker (`https://ferias-ai.<conta>.workers.dev`) em `DEFAULT_AI_URL`, em `src/lib/ai.js`, e faz push.

Não há "scan" automático do Booking: as condições do Booking proíbem a recolha automática e o site bloqueia robôs. Em vez disso, cola-se a página de resultados (25 hotéis de cada vez).

## Estrutura

```
src/
  lib/
    model.js        categorias, campos, níveis de preço, épocas, cidades sugeridas
    scoring.js      pontuação, vantagens/desvantagens, pacote por destino, comparação, dias
    scoring.test.js testes (node --test)
    store.js        dados: Firestore ou localStorage, mesma API
    firebase.js     inicialização a partir do .env
    auth.js         login Google (ou utilizador local)
  components/
    TripList.jsx        lista e criação de viagens
    TripView.jsx        viagem, partilha e definições
    Destinations.jsx    comparação de destinos (cartões e tabela)
    DestinationView.jsx opções por categoria (cartões e tabela)
    OptionForm.jsx, DestinationForm.jsx
    Itinerary.jsx       roteiro dia a dia
    common.jsx          anel de pontuação, barras, estrelas, pesos, vantagens/desvantagens, toasts
    ui/                 componentes shadcn/ui (Radix + Tailwind v4), copiados do repositório do shadcn
```

Dados no Firestore: `trips/{tripId}` com `destinations`, `options` e `items` como subcoleções.

## Ideias para a próxima versão

- Colar a página do Booking ou da companhia aérea e preencher os campos automaticamente (precisa de uma chave de API de um modelo de linguagem, numa Netlify Function).
- Mapa com os alojamentos e as atividades.
- Histórico de preços de uma opção (para saber se baixou).
- Várias cidades na mesma viagem (ex.: Roma + Florença).
