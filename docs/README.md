# Caderninho 🌤

**Suas contas, sem drama.** Um app de finanças pessoais conversacional, mobile-first, que registra gastos em linguagem natural, mostra para onde o dinheiro foi e ajuda a guardar um pouco por vez — sem planilhas, sem login e sem julgamento.

| Conversa | Resumo | Metas |
| --- | --- | --- |
| ![Tela de conversa](docs/chat.jpeg) | ![Visão geral](docs/resumo.jpeg) | ![Metas e sugestões](docs/metas.jpeg) |

## O que dá para fazer

### 💬 Conversa (home)
- Escreva como numa conversa: `almoço 35`, `táxi 28`, `cinema 40`, `mercado 120`.
- O agente interpreta valor, categoria e descrição, **registra e confirma** com o total da categoria no mês e o orçamento restante.
- Se o valor vier sem contexto (`gastei 50`), ele pergunta: *“Esses 50 reais foram gastos com quê?”* — e completa o registro com a próxima resposta.
- Também entende comandos de apoio:
  - `guardei 100` → soma uma contribuição à meta.
  - `meta de 500 reais até dezembro` → cria/edita a meta.
  - `quanto gastei este mês` / `resumo` / `como estou` → resumo do mês.
  - `orçamento 2.000` e `limite de alimentação 700` → ajusta o orçamento.
  - `desfaz` / `apaguei errado` → remove o último registro.
  - `ajuda` → mostra os comandos disponíveis.
- Mensagens e registros persistem no navegador; o histórico da conversa continua depois de fechar a aba.

### 📊 Resumo
- Cartão principal com **gasto do mês**, **orçamento restante** e ritmo de uso.
- Comparação com o **mesmo período do mês passado**.
- Barras horizontais por categoria (alimentação, transporte, compras, lazer, outros) com valor e proporção.
- As **5 transações mais recentes**, com ícone da categoria, descrição e horário; exclusão com confirmação.
- Navegação entre meses (o mês atual é o padrão).
- Ajuste de orçamento total e limites por categoria em uma folha inferior. Há um atalho que divide o total em 35% / 20% / 20% / 15% / 10%.
- Cartão de privacidade com opção de apagar todos os dados.

### 🎯 Metas e sugestões
- Criação de meta com nome, valor e data limite; se já existir, o botão vira **Editar**.
- Progresso calculado a partir das **contribuições** (“Guardar agora” ou `guardei 100` no chat), com valor restante, dias restantes e quanto guardar por dia/semana.
- A sobra do orçamento do mês aparece como sugestão de contribuição (“Usar sobra”).
- Sugestões gentis e concretas, geradas a partir dos registros reais, com opção de dispensar.
- Estados vazios acolhedores nas três páginas.

## Como rodar

Requisitos: **Node.js 22+** e npm.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # checagem de tipos + build de produção em dist/
npm run preview  # serve o build
npm test         # 58 testes com Vitest
```

## Stack

- **React 19** + **TypeScript** + **Vite 8**
- **Tailwind CSS 4** (tokens de tema em `src/index.css`)
- **lucide-react** para os ícones
- **Vitest** para os testes das regras de negócio
- Sem backend, sem login, sem dependências de IA: os dados ficam em `localStorage`

## Como o “agente” funciona

Não há chamada a modelo externo. O cérebro é um **motor de regras puro e testável**, dividido em:

1. **`src/lib/parse.ts` — interpretação**
   - Normaliza o texto (sem acentos, minúsculas) e extrai valores em formatos como `35`, `35,90`, `R$ 1.200`, `1.2 mil`.
   - Evita confundir anos (`até 2027`) com valores quando o contexto é uma meta.
   - Extrai prazo (`até dezembro`, `31/12`, `2027-01-31`) e nome da meta.
   - Encontra a categoria pelo **casamento mais longo** de palavras-chave, então `café da manhã` vence `café`, e `compras online` vence `online`.

2. **`src/lib/categories.ts` — classificação**
   - `almoço/jantar/café/delivery/mercado…` → **alimentação**
   - `táxi/metrô/ônibus/combustível/uber…` → **transporte**
   - `roupas/itens de uso diário/compras online…` → **compras**
   - `cinema/jogos/baladas/show…` → **lazer**
   - Qualquer outro termo reconhecível → **outros**
   - Valores sem contexto ficam em `pending` até a pessoa responder com o que foi.

3. **`src/lib/agent.ts` — conversa e efeitos**
   - Decide entre registrar gasto, pedir esclarecimento, criar meta, contribuir, ajustar orçamento, resumir ou desfazer.
   - Toda resposta é construída com os dados atuais (total da categoria, comparação com o mês passado, limite, orçamento restante).
   - A interface mostra “digitando” por ~0,5–0,9 s antes da confirmação — bem abaixo do limite de 3 s do desafio.

### Regras de sugestão (`src/lib/suggestions.ts`)

- **Limite da categoria:** dispara a partir de **80%** do limite definido; em 100% o texto muda para um tom neutro, sem culpa.
- **Crescimento:** quando uma categoria com pelo menos R$ 20 cresce **mais de 30%** em relação ao mesmo período do mês anterior.
- Regras extras, sempre com números reais:
  - padrão de delivery (3+ pedidos) com estimativa de economia;
  - ritmo do orçamento (gasto acima do esperado para o dia do mês);
  - fallback com a maior categoria do mês.
- No máximo 4 sugestões por vez; cada uma pode ser dispensada e não volta naquele mês.

## Modelo de dados

Tudo é salvo em **centavos** (inteiros) para evitar erros de arredondamento. O estado vive em `localStorage` sob a chave `caderninho:v1`:

```ts
{
  version: 1,
  transactions: [{ id, amount, category, description, createdAt, source }],
  messages: [{ id, role, text, createdAt, tone?, meta? }],
  goal: { id, name, targetAmount, deadline, createdAt, contributions[] } | null,
  settings: { monthlyBudget, categoryLimits },
  pending: { amount, category, description } | null,
  dismissedSuggestions: string[]
}
```

- **Datas** são ISO; os filtros usam o **mês local** do navegador, e a comparação com o mês passado vai até o mesmo dia do mês.
- **Meta:** o progresso vem da soma de `contributions`. Gastos não mexem na meta — guardar e gastar são coisas diferentes. Isso mantém o valor restante correto independentemente dos gastos do mês.
- **Orçamento:** um total mensal e limites opcionais por categoria. Sem limite definido, o app continua funcionando e sugere apenas com base em padrões de gasto.
- **Validação defensiva:** ao carregar, o estado é sanitizado; dados corrompidos ou de versões antigas não quebram a tela.

## Estrutura

```
src/
├── components/      # Sheet, formulários de meta/contribuição/orçamento, avatar, toast
├── lib/
│   ├── agent.ts     # cérebro conversacional (função pura)
│   ├── parse.ts     # extração de valores, categorias, prazos e nomes
│   ├── categories.ts# metadados e motor de palavras-chave
│   ├── suggestions.ts# regras de sugestão
│   ├── goal.ts      # progresso da meta
│   ├── finance.ts   # agregações por mês/categoria
│   ├── dates.ts     # utilitários de calendário local
│   ├── storage.ts   # persistência + validação
│   └── *.test.ts    # testes das regras
├── pages/           # ChatPage, OverviewPage, GoalsPage
├── store/           # FinanceProvider (estado, persistência, ações)
└── index.css        # tema, tokens e animações
```

## Design

- Paleta quente: creme, bege, âmbar e verde-claro; cartões com cantos bem arredondados e sombras suaves.
- **Inter** como fonte principal.
- **Nada de vermelho para estouro de orçamento** — usamos laranja/âmbar e tons neutros, com textos como “sem drama, dá para reequilibrar”.
- Mobile-first: a interface ocupa a tela do celular e, no desktop, aparece dentro de uma moldura de telefone centralizada.
- Folhas inferiores com foco preso, fechamento por `Esc`, retorno de foco e rodapé de ações fixo.
- Microanimações discretas de entrada e de mensagens; respeito à preferência de movimento reduzido.

## Testes e critérios de aceitação

`npm test` roda 58 testes cobrindo:

- interpretação de valores, categorias, prazos e nomes;
- fluxos do agente (registro, esclarecimento, meta, contribuição, orçamento, resumo, desfazer);
- progresso e arredondamento de metas;
- disparo e conteúdo das sugestões.

Critérios do desafio:

| Critério | Como foi atendido |
| --- | --- |
| `almoço 35` confirma em até 3 s e aparece no Resumo | Resposta em ~0,5–0,9 s; transação criada na hora e agregada no mês |
| 3 gastos de categorias diferentes mostram proporções corretas | Barras calculadas sobre o total do mês, com percentuais arredondados |
| Meta “guardar 500” e um gasto mantêm o restante correto | Progresso baseado em contribuições; gastos não alteram a meta |
| Sem rolagem horizontal no celular | Layout mobile-first testado em 340 px e 440 px; gráficos e cartões fluidos |
| Primeira abertura com textos amigáveis nas 3 páginas | Estados vazios específicos para conversa, resumo e metas |

## Limitações e premissas

- Uma meta ativa por vez, sem categorias de meta nem recorrências.
- Não há integração bancária, importação de extrato ou sincronização entre dispositivos: os dados são **somente deste navegador**.
- O agente é deliberadamente baseado em regras; frases muito fora dos padrões recebem um pedido gentil de reformulação.
- O mês é o calendário local do dispositivo. Valores são sempre positivos (gastos), não há receitas/transferências neste MVP.
- Apagar os dados é definitivo; não há lixeira ou backup.

---

Feito com calma, para lembrar que pequenos passos contam. 🌱
