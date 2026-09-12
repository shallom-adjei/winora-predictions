// Pure name-matching utilities. No external deps, no side effects.

const NOISE_WORDS = new Set([
  "fc","afc","sc","ac","cf","cd","as","rc","ss","us","sv","vfb","vfl","tsg",
  "club","de","del","la","el","los","le","il","the","of","do","da","dos",
  "futbol","football","calcio","1.","2.","1899","1901","1907","1909","1963",
  "07","65","05","04","98","92","79","73","61","52","49","35","29","25","23",
  // Single letters — remnants of C.F., S.S.C., A.S., etc.
  "a","b","c","d","e","f","g","h","i","j","k","l","m",
  "n","o","p","q","r","s","t","u","v","w","x","y","z",
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

export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;

  if (longer.includes(shorter) && shorter.length >= 4) {
    const pos = longer.indexOf(shorter);
    const ratio = shorter.length / longer.length;
    const posBonus = pos === 0 ? 0.15 : pos <= 5 ? 0.05 : 0;
    return Math.min(0.9, 0.6 + ratio * 0.25 + posBonus);
  }

  // Token overlap (Jaccard)
  const setA = new Set(na.split(" "));
  const setB = new Set(nb.split(" "));
  const intersection = Array.from(setA).filter((t) => setB.has(t)).length;
  const union = new Set([...Array.from(setA), ...Array.from(setB)]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  // Levenshtein similarity on the joined string
  const maxLen = Math.max(na.length, nb.length);
  const lev = 1 - levenshtein(na, nb) / maxLen;

  // Shared-prefix bonus
  const minPfx = Math.min(na.length, nb.length);
  let pfx = 0;
  for (let i = 0; i < minPfx; i++) {
    if (na[i] === nb[i]) pfx++;
    else break;
  }
  const pfxBonus = pfx >= 4 ? Math.min(0.2, pfx * 0.04) : 0;

  return Math.min(1, jaccard * 0.5 + lev * 0.5 + pfxBonus);
}

// Pick the best candidate from a list of {name, ...} objects
export function bestMatch<T extends { name: string }>(
  target: string,
  candidates: T[],
  minScore = 0.55
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