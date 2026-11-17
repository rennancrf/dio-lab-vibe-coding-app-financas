## Público-alvo

- Pessoas que querem começar a controlar o dinheiro, mas foram desestimuladas por apps complexos

- Pessoas acostumadas a conversar por WhatsApp/Telegram

- Pessoas que não precisam de relatórios financeiros profissionais, apenas de "saber para onde o dinheiro foi"

## Páginas e componentes principais (3 páginas centrais)

### Página 1: Home do chat (interface principal)

**A primeira página que o usuário vê ao abrir o app.** Layout: no topo, avatar do agente e uma saudação (ex.: "O que você gastou hoje? Me conta"), no meio a lista de mensagens da conversa, na parte inferior o campo de entrada e o botão de enviar.

**Os balões de mensagem são de dois tipos:**

- Mensagem do usuário: à direita, fundo claro, exibindo o texto original digitado (ex.: "táxi 28")

- Resposta do agente: à esquerda, exibindo a confirmação (ex.: "✅ Transporte · Táxi · 28,00 reais, registrado. Este mês você já gastou 312,00 reais em transporte, 15% menos que no mesmo período do mês passado")

**Estado vazio:** se ainda não houver nenhum registro, exibir uma mensagem de boas-vindas do agente: "Olá 👋 Sou seu assistente financeiro. Tente me contar um gasto de hoje, como 'almoço 30 reais', e eu registro para você."

**Ação central:** o usuário digita uma frase → o agente interpreta e confirma → registro concluído.

### Página 2: Visão geral financeira

**Exibe o resumo dos gastos do mês.** No topo, um cartão grande mostra "Gasto este mês RX, orç​amento restante RY" (se o usuário tiver definido um orçamento). Abaixo, um gráfico de barras horizontais por categoria: alimentação, transporte, compras, lazer, outros, cada categoria com valor e percentual. Mais abaixo, uma lista das 5 transações mais recentes, cada uma com ícone de categoria, valor e descrição curta.

**Estado vazio:** se não houver dados, exibir "Depois de registrar o primeiro gasto, seu resumo aparecerá aqui."

**Ação central:** o usuário vê num relance para onde o dinheiro foi, sem precisar analisar.

### Página 3: Metas e sugestões

**Parte superior:** um cartão de "meta de economia". Se o usuário ainda não tiver meta, exibir um botão arredondado "Definir uma pequena meta"; ao clicar, abre um formulário simples: nome da meta (ex.: "guardar 500 reais"), valor da meta, data limite. Com meta existente, exibir barra de progresso e dias restantes.

**Parte inferior:** lista de sugestões de economia do agente. Cada sugestão é um cartão claro, com uma frase concreta e um ícone pequeno. As sugestões são geradas com base nos registros reais do usuário, por exemplo: "Você gastou R 420 reais em delivery este mês. Se pedir duas vezes menos por semana, pode economizar 160 reais até o fim do mês."

**Estado vazio:** "Depois de registrar alguns gastos, vou dar sugestões de economia aqui."

## Direção de design

**Palavras-chave: acolhedor, limpo, sem julgamento.** Use uma paleta quente e suave (fundo bege claro + detalhes em âmbar/verde-claro), cantos bem arredondados, muito espaço em branco, fonte sem serifa como Inter. Não use vermelho para marcar "estouro de orçamento"; use laranja ou cinza para evitar que o usuário se sinta culpado. A sensação geral deve ser de um caderno limpo, não de um app bancário.

## Lógica de interação principal (regras para o Lovable)

- Após o usuário digitar uma frase, o agente precisa **primeiro interpretar e depois confirmar**: extrair do texto o valor e a categoria (alimentação/transporte/compras/lazer/outros) e então responder com uma mensagem de confirmação. Se a interpretação for incerta (por exemplo, "gastei 50" sem dizer com o quê), o agente pergunta: "Esses 50 reais foram gastos com quê?"

- **Regras de classificação:** almoço/jantar/café/delivery → alimentação; táxi/metrô/ônibus/combustível → transporte; roupas/itens de uso diário/compras online → compras; cinema/jogos/baladas → lazer; o restante vai para "outros".

- **Regras de geração de sugestões:** quando o gasto mensal de uma categoria ultrapassar 80% do orçamento daquela categoria, ou quando o gasto de uma categoria crescer mais de 30% em relação ao mesmo período do mês anterior, disparar uma sugestão.

## Restrições técnicas (escopo compreensível pelo Lovable)

- Frontend em React + Tailwind (stack padrão do Lovable)

- Dados armazenados inicialmente no navegador (localStorage), sem sistema de login, para reduzir a complexidade do MVP

- Mobile-first, largura de página adaptada a telas de celular

- Não é necessário backend real de IA; usar um motor de regras para simular "respostas inteligentes" (com base em correspondência de palavras-chave + extração simples de valores)

## Critérios de aceitação

1. O usuário digita "almoço 35" → em até 3 segundos aparece a mensagem de confirmação do agente e a página de visão geral mostra um registro "Alimentação · R$ 35".

2. O usuário registra 3 gastos consecutivos de categorias diferentes → o gráfico de barras da visão geral exibe corretamente a proporção das três categorias.

3. O usuário define a meta "guardar 500 reais" e registra um gasto → a página de metas exibe o valor restante correto.

4. Em telas de celular, todas as páginas podem ser visualizadas por completo sem rolagem horizontal.

5. Ao abrir o app pela primeira vez e sem dados, as três páginas exibem textos de orientação amigáveis, e não telas em branco.
