import { prisma } from "../../infra/prisma.js";

const ALIASES: Record<string, string> = {
  chapati: "roti",
  chapatti: "roti",
  phulka: "roti",
  fulka: "roti",
  dahi: "curd",
  yogurt: "curd",
  yoghurt: "curd",
  chawal: "rice",
  daal: "dal",
  dhal: "dal",
  anda: "egg",
  doodh: "milk",
  sabzi: "vegetable",
  sabji: "vegetable",
  subzi: "vegetable",
  bhaji: "vegetable",
  kela: "banana",
  seb: "apple",
  badam: "almonds",
  whey: "whey protein",
  okra: "bhindi",
  brinjal: "baingan",
  eggplant: "baingan",
};

function singular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes") || word.endsWith("shes") || word.endsWith("ches")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export function normalizeFoodQuery(query: string): string {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => ALIASES[w] ?? ALIASES[singular(w)] ?? singular(w))
    .join(" ")
    .trim();
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export interface FoodMatch {
  foodId: string;
  score: number;
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3);

/** True when a query word and a name word share a stem, e.g. "paneer"/"paneer" or "egg"/"eggs". */
function sharesWord(query: string, name: string): boolean {
  const nameWords = words(name).map(singular);
  return words(query).some((q) => nameWords.some((n) => n.startsWith(q) || (n.length >= 4 && q.startsWith(n))));
}

const STRONG_SIMILARITY = 0.45;

/**
 * Ranks the user's visible foods against the query using trigram similarity (served by the GIN
 * index), then keeps only matches that share a real word or are strongly similar overall, so
 * look-alike words ("chai" vs "chana") don't match.
 */
export async function matchFoods(userId: string, rawQuery: string, limit = 4): Promise<FoodMatch[]> {
  const q = normalizeFoodQuery(rawQuery);
  if (q.length < 2) return [];
  const pattern = `%${escapeLike(q)}%`;

  const rows = await prisma.$queryRaw<{ id: string; name: string; sim: number; wsim: number; contains: boolean }[]>`
    SELECT f."id", f."name",
           similarity(f."name", ${q})::float AS sim,
           word_similarity(${q}, f."name")::float AS wsim,
           (f."name" ILIKE ${pattern}) AS contains
    FROM "Food" f
    WHERE f."archivedAt" IS NULL
      AND (f."createdById" IS NULL OR f."createdById" = ${userId})
      AND (f."name" % ${q} OR ${q} <% f."name" OR f."name" ILIKE ${pattern})
    ORDER BY (f."name" ILIKE ${pattern}) DESC, GREATEST(similarity(f."name", ${q}), word_similarity(${q}, f."name")) DESC, length(f."name") ASC
    LIMIT ${limit * 3}`;

  const matches: FoodMatch[] = [];
  for (const r of rows) {
    let score: number;
    if (r.contains) score = Math.max(r.wsim, 0.6);
    else if (sharesWord(q, r.name)) score = Math.max(r.sim, r.wsim);
    else if (r.sim >= STRONG_SIMILARITY) score = r.sim;
    else continue;
    matches.push({ foodId: r.id, score: Math.round(Math.min(1, score) * 100) / 100 });
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}
