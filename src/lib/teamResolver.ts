// Pure name-matching utilities. No external deps, no side effects.

const NOISE_WORDS = new Set([
  "fc","afc","sc","ac","cf","cd","as","rc","ss","us","sv","vfb","vfl","tsg",
  "club","de","del","la","el","los","le","il","the","of","do","da","dos",
  "futbol","football","calcio","1.","2.","1899","1901","1907","1909","1963",
  "07","65","05","04","98","92","79","73","61","52","49","35","29","25","23",
]);

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")     // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")         // keep letters, digits, spaces
    .split(/\s+/)
    .filter((w) => w.length > 0 && !NOISE_WORDS.has(w))
    .join(" ")
    .trim();
}

// Levenshtein distance, iterative
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let left = i;
    let diag = i - 1;
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const val = Math.min(up + 1, left + 1, diag + cost);
      curr[j] = val;
      diag = up;
      left = val;
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

// Combined score: token overlap + Levenshtein on the normalized string
export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  // Token overlap (Jaccard)
  const setA = new Set(na.split(" "));
  const setB = new Set(nb.split(" "));
  const intersection = Array.from(setA).filter((t) => setB.has(t)).length;
  const union = new Set([...Array.from(setA), ...Array.from(setB)]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  // Levenshtein similarity on the joined string
  const maxLen = Math.max(na.length, nb.length);
  const lev = 1 - levenshtein(na, nb) / maxLen;

  // Weighted blend
  return jaccard * 0.55 + lev * 0.45;
}

// Pick the best candidate from a list of {name, ...} objects
export function bestMatch<T extends { name: string }>(
  target: string,
  candidates: T[],
  minScore = 0.72
): { candidate: T; score: number } | null {
  let best: T | null = null;
  let bestScore = 0;

  for (const c of candidates) {
    const score = similarity(target, c.name);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  if (!best || bestScore < minScore) return null;
  return { candidate: best, score: bestScore };
}