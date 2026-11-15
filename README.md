# Férias a Dois

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
- **Roteiro.** Dias criados a partir das datas, chegada e partida do voo e check-in/out automáticos, planos com hora, tipo e custo, atividades por encaixar, reordenar, imprimir.

## Correr localmente

```bash
npm install
npm run dev
```

Sem configuração do Firebase, a app corre em **modo local**: guarda tudo no browser, sem login e sem partilha. Serve para experimentar.

```bash
npm test        # testes da lógica de pontuação
npm run build   # build de produção para dist/
```

## Ligar ao Firebase (para usarem os dois)

1. Em <https://console.firebase.google.com> cria um projeto (o Google Analytics pode ficar desligado).
2. **Authentication > Sign-in method:** ativa **Google**.
3. **Firestore Database:** cria a base de dados em modo de produção (região `eur3` ou `europe-west1`).
4. **Regras:** copia o conteúdo de `firestore.rules` para o separador Regras do Firestore e publica (ou `firebase deploy --only firestore:rules` com a Firebase CLI).
5. **Definições do projeto > As tuas apps:** adiciona uma app Web e copia a configuração.
6. Copia `.env.example` para `.env` e preenche os valores `VITE_FIREBASE_*`.
7. `npm run dev`, entra com Google, cria uma viagem e em **Partilhar e definições** adiciona o email Google da tua namorada.

As regras só deixam ler e escrever uma viagem a quem estiver na lista `members` (emails em minúsculas).

## Publicar no Netlify

1. Novo site a partir do repositório (o `netlify.toml` já define `npm run build` e a pasta `dist`).
2. Em **Site configuration > Environment variables**, adiciona as mesmas `VITE_FIREBASE_*` do `.env`.
3. No Firebase, em **Authentication > Settings > Authorized domains**, adiciona o domínio do Netlify (ex.: `ferias-a-dois.netlify.app`).

A app usa rotas com `#`, por isso não precisa de redirects.

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
    ui.jsx              modal, anel de pontuação, barras, estrelas, pesos, toasts
```

Dados no Firestore: `trips/{tripId}` com `destinations`, `options` e `items` como subcoleções.

## Ideias para a próxima versão

- Colar a página do Booking ou da companhia aérea e preencher os campos automaticamente (precisa de uma chave de API de um modelo de linguagem, numa Netlify Function).
- Mapa com os alojamentos e as atividades.
- Histórico de preços de uma opção (para saber se baixou).
- Várias cidades na mesma viagem (ex.: Roma + Florença).
