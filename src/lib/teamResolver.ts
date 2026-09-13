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

  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na];

  // 1. Token-boundary containment (strongest signal)
  const containScore = tokenContainmentScore(shorter, longer);
  if (containScore > 0) return containScore;

  // 2. No containment — blend the softer metrics
  const ta = na.split(" ");
  const tb = nb.split(" ");
  const [sTokens, lTokens] = ta.length <= tb.length ? [ta, tb] : [tb, ta];

  // Token-prefix: "man" matches "manchester", "inter" matches "internazionale"
let matched = 0;
for (const token of sTokens) {
  if (
    lTokens.some(
      (lt) =>
        lt === token ||
        (token.length >= 3 && lt.startsWith(token)) ||
        (lt.length >= 3 && token.startsWith(lt))   // ← added
    )
  ) {
    matched++;
  }
}
const tokenPrefix = sTokens.length > 0 ? matched / sTokens.length : 0;

  // Jaccard
  const setA = new Set(ta);
  const setB = new Set(tb);
  const intersection = Array.from(setA).filter((t) => setB.has(t)).length;
  const union = new Set([...Array.from(setA), ...Array.from(setB)]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  // Levenshtein
  const maxLen = Math.max(na.length, nb.length);
  const lev = 1 - levenshtein(na, nb) / maxLen;

  return Math.min(1, tokenPrefix * 0.5 + jaccard * 0.2 + lev * 0.3);
}

function tokenContainmentScore(shorter: string, longer: string): number {
  const sTokens = shorter.split(" ");
  const lTokens = longer.split(" ");

  // Multi-token short: contiguous window inside longer
  if (sTokens.length > 1) {
    for (let i = 0; i <= lTokens.length - sTokens.length; i++) {
      let ok = true;
      for (let j = 0; j < sTokens.length; j++) {
        if (lTokens[i + j] !== sTokens[j]) { ok = false; break; }
      }
      if (ok) {
        const posBonus = i === 0 ? 0.1 : 0;
        return Math.min(0.95, 0.7 + (shorter.length / longer.length) * 0.15 + posBonus);
      }
    }
    return 0;
  }

  const st = sTokens[0];

  const idx = lTokens.indexOf(st);
  if (idx >= 0) {
    const posBonus = idx === 0 ? 0.15 : idx === 1 ? -0.10 : -0.15;
    return Math.min(0.95, 0.65 + (st.length / longer.length) * 0.15 + posBonus);
  }

  if (st.length >= 3) {
    for (let i = 0; i < lTokens.length; i++) {
      const lt = lTokens[i];

      // Reserve-team penalty: candidates ending in a single letter (B, II, U21, etc.)
      // are penalised so the senior team wins when scores tie.
      const reservePenalty = lTokens.length > sTokens.length &&
        (lTokens[lTokens.length - 1].length === 1 || lTokens[lTokens.length - 1] === "ii")
        ? 0.05 : 0;

      // 2. Forward prefix: fixture token starts with ClubElo token, or vice versa
      if (lt.startsWith(st) || (lt.length >= 3 && st.startsWith(lt))) {
        const posBonus = i === 0 ? 0.1 : 0;
        return Math.min(0.95, 0.6 + (Math.min(st.length, lt.length) / Math.max(st.length, lt.length)) * 0.15 + posBonus - reservePenalty);
      }

      // 3. Near-token (1-char edit) — catches Espanol ↔ Espanyol, Ath Bilbao ↔ Ath Bilbao
      if (
        Math.abs(lt.length - st.length) <= 1 &&
        st.length >= 5 &&
        lt.length >= 5 &&
        levenshtein(st, lt) <= 1
      ) {
        const posBonus = i === 0 ? 0.1 : 0;
        return Math.min(0.9, 0.7 + (st.length / lt.length) * 0.1 + posBonus - reservePenalty);
      }

      // 4. Common-prefix fallback for short tokens — catches Wolves ↔ Wolverhampton
      let pfx = 0;
      const lim = Math.min(st.length, lt.length);
      while (pfx < lim && st[pfx] === lt[pfx]) pfx++;
      if (pfx >= 4 && lim <= 10) {
        const posBonus = i === 0 ? 0.1 : 0;
        return Math.min(0.85, 0.55 + (pfx / Math.max(st.length, lt.length)) * 0.2 + posBonus - reservePenalty);
      }
    }
  }

  return 0;
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