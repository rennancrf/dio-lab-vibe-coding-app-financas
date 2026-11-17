import type { Category, CategoryId } from "../types";

export const CATEGORIES: Category[] = [
  {
    id: "alimentacao",
    label: "Alimentação",
    color: "#d99a4e",
    soft: "#f8e8cd",
    examples: ["almoço", "mercado", "delivery"],
  },
  {
    id: "transporte",
    label: "Transporte",
    color: "#7fa6a0",
    soft: "#e3efec",
    examples: ["táxi", "metrô", "combustível"],
  },
  {
    id: "compras",
    label: "Compras",
    color: "#c98c7a",
    soft: "#f8e5df",
    examples: ["roupas", "presente", "online"],
  },
  {
    id: "lazer",
    label: "Lazer",
    color: "#8ea97f",
    soft: "#e8f0e1",
    examples: ["cinema", "jogos", "show"],
  },
  {
    id: "outros",
    label: "Outros",
    color: "#b9a99a",
    soft: "#f1eae2",
    examples: ["farmácia", "conta de luz", "pet"],
  },
];

const BY_ID = new Map(CATEGORIES.map((category) => [category.id, category]));

export function getCategory(id: CategoryId): Category {
  return BY_ID.get(id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === "string" && BY_ID.has(value as CategoryId);
}

export const CATEGORY_IDS: CategoryId[] = CATEGORIES.map((category) => category.id);

type Keyword = {
  words: string[];
  label: string;
  category: CategoryId;
};

/**
 * Motor de classificação por palavras-chave (sem IA).
 * A ordem é irrelevante: o casamento mais longo vence, então
 * "café da manhã" tem prioridade sobre "café".
 */
export const KEYWORDS: Keyword[] = [
  // Categorias (usadas em frases como "limite de alimentação 600")
  { words: ["alimentacao"], label: "Alimentação", category: "alimentacao" },
  { words: ["lazer"], label: "Lazer", category: "lazer" },
  { words: ["transporte"], label: "Transporte", category: "transporte" },

  // Alimentação
  { words: ["almoco", "almocei", "almocinho"], label: "Almoço", category: "alimentacao" },
  { words: ["jantar", "jantei", "janta"], label: "Jantar", category: "alimentacao" },
  { words: ["cafe da manha"], label: "Café da manhã", category: "alimentacao" },
  { words: ["cafe", "cafezinho"], label: "Café", category: "alimentacao" },
  { words: ["padaria", "pao"], label: "Padaria", category: "alimentacao" },
  { words: ["restaurante"], label: "Restaurante", category: "alimentacao" },
  { words: ["lanche", "lanchei", "lanchonete"], label: "Lanche", category: "alimentacao" },
  { words: ["delivery", "ifood", "i food", "rappi"], label: "Delivery", category: "alimentacao" },
  { words: ["supermercado", "mercado", "mercadinho"], label: "Mercado", category: "alimentacao" },
  { words: ["hortifruti", "feira", "acougue"], label: "Feira", category: "alimentacao" },
  { words: ["pizza", "pizzaria"], label: "Pizza", category: "alimentacao" },
  { words: ["hamburguer", "hamburgueres", "burger"], label: "Hambúrguer", category: "alimentacao" },
  { words: ["marmita", "marmitex"], label: "Marmita", category: "alimentacao" },
  { words: ["sorvete", "doce", "doces", "bolo", "sobremesa"], label: "Doces", category: "alimentacao" },
  { words: ["sushi", "pastel", "salgado", "churrasco", "comida"], label: "Comida", category: "alimentacao" },
  { words: ["agua mineral", "suco", "refrigerante"], label: "Bebida", category: "alimentacao" },

  // Transporte
  { words: ["taxi", "taxista"], label: "Táxi", category: "transporte" },
  { words: ["uber", "99 pop", "99pop"], label: "Uber", category: "transporte" },
  { words: ["metro", "onibus", "bilhete unico", "bilhete"], label: "Transporte público", category: "transporte" },
  { words: ["combustivel", "gasolina", "etanol", "alcool", "diesel", "posto"], label: "Combustível", category: "transporte" },
  { words: ["estacionamento", "pedagio", "passagem", "transporte", "mototaxi", "patinete"], label: "Transporte", category: "transporte" },

  // Compras
  { words: ["roupa", "roupas", "camisa", "camiseta", "blusa", "calca", "vestido", "sapato", "tenis", "shorts", "casaco", "meia"], label: "Roupas", category: "compras" },
  { words: ["compras", "compra"], label: "Compras", category: "compras" },
  { words: ["shopee", "shein", "amazon", "aliexpress", "ali express"], label: "Compra online", category: "compras" },
  { words: ["mercado livre", "mercadolivre"], label: "Mercado Livre", category: "compras" },
  { words: ["eletronico", "eletronicos", "celular", "fone", "carregador", "notebook"], label: "Eletrônicos", category: "compras" },
  { words: ["presente", "presentes"], label: "Presente", category: "compras" },
  { words: ["cosmetico", "cosmeticos", "maquiagem", "shampoo", "perfume"], label: "Cosméticos", category: "compras" },
  { words: ["sabonete", "papel higienico", "detergente", "produto de limpeza", "limpeza", "higiene"], label: "Itens de uso diário", category: "compras" },
  { words: ["movel", "moveis", "decoracao", "utensilio", "cama", "mesa"], label: "Casa", category: "compras" },

  // Lazer
  { words: ["cinema"], label: "Cinema", category: "lazer" },
  { words: ["jogo", "jogos", "joguei", "videogame", "video game"], label: "Jogos", category: "lazer" },
  { words: ["balada", "festa", "show", "ingresso"], label: "Balada", category: "lazer" },
  { words: ["bar", "cerveja", "chopp", "bebida", "drink"], label: "Bar", category: "lazer" },
  { words: ["streaming", "netflix", "spotify", "disney"], label: "Streaming", category: "lazer" },
  { words: ["viagem", "hotel", "pousada", "praia", "parque", "museu", "teatro", "passeio", "excursao", "futebol", "academia", "pilates", "yoga", "natacao", "boliche", "karaoke", "sinuca"], label: "Lazer", category: "lazer" },

  // Outros
  { words: ["farmacia", "remedio", "remedios", "medico", "dentista", "consulta", "exame", "saude"], label: "Saúde", category: "outros" },
  { words: ["conta de luz", "conta de agua", "conta de gas", "luz", "energia", "agua", "internet", "telefone", "conta"], label: "Contas da casa", category: "outros" },
  { words: ["aluguel", "condominio", "gas"], label: "Moradia", category: "outros" },
  { words: ["pet", "cachorro", "gato", "racao", "veterinario"], label: "Pet", category: "outros" },
  { words: ["escola", "faculdade", "curso", "livro"], label: "Educação", category: "outros" },
  { words: ["doacao", "imposto", "seguro", "banco", "tarifa", "emprestimo", "pensao"], label: "Outros", category: "outros" },
  { words: ["outros", "outro", "outras", "diversos"], label: "Outros", category: "outros" },
];

export type KeywordMatch = {
  label: string;
  category: CategoryId;
  keyword: string;
};

/**
 * Procura a palavra-chave mais longa presente no texto já normalizado.
 * O texto deve chegar normalizado (sem acentos, sem pontuação, minúsculo).
 */
export function matchKeyword(normalized: string): KeywordMatch | null {
  const padded = ` ${normalized} `;
  let best: KeywordMatch | null = null;

  for (const keyword of KEYWORDS) {
    for (const word of keyword.words) {
      if (word.length <= (best?.keyword.length ?? 0)) continue;
      if (padded.includes(` ${word} `)) {
        best = { label: keyword.label, category: keyword.category, keyword: word };
      }
    }
  }

  return best;
}
