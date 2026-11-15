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
