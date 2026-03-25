/**
 * Scripture sentiment lexicon — 4-category theological taxonomy.
 * Uses weighted valence scoring with LDS-specific overrides.
 * Categories: Exaltation & Glory, Covenant Peace, Admonition & Justice, Trial & Contrition.
 */

export interface SentimentCategory {
  id: string;
  label: string;
  color: string;
  colorLight: string;
  valence: "positive" | "negative";
}

export const SENTIMENT_CATEGORIES: SentimentCategory[] = [
  {
    id: "exaltation",
    label: "Exaltation & Glory",
    color: "#FFD700",
    colorLight: "rgba(255, 215, 0, 0.15)",
    valence: "positive",
  },
  {
    id: "peace",
    label: "Covenant Peace",
    color: "#20B2AA",
    colorLight: "rgba(32, 178, 170, 0.15)",
    valence: "positive",
  },
  {
    id: "admonition",
    label: "Admonition & Justice",
    color: "#DC143C",
    colorLight: "rgba(220, 20, 60, 0.15)",
    valence: "negative",
  },
  {
    id: "contrition",
    label: "Trial & Contrition",
    color: "#4B0082",
    colorLight: "rgba(75, 0, 130, 0.15)",
    valence: "negative",
  },
];

// ── Weighted Lexicon ──
// Each word maps to { category, weight } where weight is a float valence score.
// Positive weights = positive sentiment, negative = negative sentiment.

interface LexiconEntry {
  category: string;
  weight: number;
}

const LEXICON: Record<string, LexiconEntry> = {
  // ── EXALTATION & GLORY (gold) ──
  // Visionary, doxological, heavenly joy, praise, worship
  praise: { category: "exaltation", weight: 3.0 },
  praised: { category: "exaltation", weight: 3.0 },
  praises: { category: "exaltation", weight: 3.0 },
  worship: { category: "exaltation", weight: 3.2 },
  worshipped: { category: "exaltation", weight: 3.2 },
  glory: { category: "exaltation", weight: 3.5 },
  glorious: { category: "exaltation", weight: 3.5 },
  glorify: { category: "exaltation", weight: 3.5 },
  glorified: { category: "exaltation", weight: 3.5 },
  hosanna: { category: "exaltation", weight: 4.0 },
  hallelujah: { category: "exaltation", weight: 4.0 },
  holy: { category: "exaltation", weight: 3.0 },
  holiness: { category: "exaltation", weight: 3.2 },
  sanctify: { category: "exaltation", weight: 3.0 },
  sanctified: { category: "exaltation", weight: 3.0 },
  consecrate: { category: "exaltation", weight: 3.0 },
  consecrated: { category: "exaltation", weight: 3.0 },
  exalt: { category: "exaltation", weight: 3.5 },
  exalted: { category: "exaltation", weight: 3.5 },
  magnify: { category: "exaltation", weight: 2.8 },
  majesty: { category: "exaltation", weight: 3.2 },
  almighty: { category: "exaltation", weight: 3.0 },
  omnipotent: { category: "exaltation", weight: 3.0 },
  wonderful: { category: "exaltation", weight: 3.0 },
  marvelous: { category: "exaltation", weight: 3.0 },
  excellent: { category: "exaltation", weight: 2.5 },
  thanksgiving: { category: "exaltation", weight: 2.8 },
  thankful: { category: "exaltation", weight: 2.5 },
  thanks: { category: "exaltation", weight: 2.5 },
  sing: { category: "exaltation", weight: 2.5 },
  singing: { category: "exaltation", weight: 2.5 },
  song: { category: "exaltation", weight: 2.5 },
  rejoice: { category: "exaltation", weight: 3.5 },
  rejoicing: { category: "exaltation", weight: 3.5 },
  rejoiced: { category: "exaltation", weight: 3.5 },
  triumph: { category: "exaltation", weight: 3.5 },
  triumphant: { category: "exaltation", weight: 3.5 },
  victory: { category: "exaltation", weight: 3.2 },
  throne: { category: "exaltation", weight: 2.8 },
  crown: { category: "exaltation", weight: 2.8 },
  vision: { category: "exaltation", weight: 2.5 },
  visions: { category: "exaltation", weight: 2.5 },
  revelation: { category: "exaltation", weight: 3.0 },
  revealed: { category: "exaltation", weight: 2.8 },
  transfigured: { category: "exaltation", weight: 3.5 },
  celestial: { category: "exaltation", weight: 3.5 },
  miracle: { category: "exaltation", weight: 3.0 },
  miracles: { category: "exaltation", weight: 3.0 },
  wonder: { category: "exaltation", weight: 2.8 },
  wonders: { category: "exaltation", weight: 2.8 },
  beautiful: { category: "exaltation", weight: 2.5 },
  beauty: { category: "exaltation", weight: 2.5 },
  honor: { category: "exaltation", weight: 2.5 },
  kingdom: { category: "exaltation", weight: 2.5 },
  reign: { category: "exaltation", weight: 2.5 },
  zion: { category: "exaltation", weight: 3.0 },
  paradise: { category: "exaltation", weight: 3.5 },
  resurrection: { category: "exaltation", weight: 3.5 },
  risen: { category: "exaltation", weight: 3.5 },
  ascend: { category: "exaltation", weight: 3.0 },
  ascended: { category: "exaltation", weight: 3.0 },

  // ── COVENANT PEACE (teal) ──
  // Instructional, grace, rest, ordinances, faith, devotion, promise, blessing
  grace: { category: "peace", weight: 3.8 },
  bless: { category: "peace", weight: 3.0 },
  blessed: { category: "peace", weight: 3.0 },
  blessing: { category: "peace", weight: 3.0 },
  blessings: { category: "peace", weight: 3.0 },
  peace: { category: "peace", weight: 3.5 },
  peaceable: { category: "peace", weight: 3.0 },
  rest: { category: "peace", weight: 2.5 },
  promise: { category: "peace", weight: 3.0 },
  promised: { category: "peace", weight: 3.0 },
  covenant: { category: "peace", weight: 3.2 },
  covenants: { category: "peace", weight: 3.2 },
  ordinance: { category: "peace", weight: 2.5 },
  ordinances: { category: "peace", weight: 2.5 },
  mercy: { category: "peace", weight: 3.5 },
  merciful: { category: "peace", weight: 3.5 },
  forgive: { category: "peace", weight: 3.2 },
  forgiven: { category: "peace", weight: 3.2 },
  forgiveness: { category: "peace", weight: 3.2 },
  redeem: { category: "peace", weight: 3.5 },
  redeemed: { category: "peace", weight: 3.5 },
  redemption: { category: "peace", weight: 3.5 },
  salvation: { category: "peace", weight: 3.5 },
  save: { category: "peace", weight: 2.5 },
  saved: { category: "peace", weight: 2.8 },
  deliver: { category: "peace", weight: 2.8 },
  delivered: { category: "peace", weight: 2.8 },
  deliverance: { category: "peace", weight: 3.0 },
  heal: { category: "peace", weight: 2.8 },
  healed: { category: "peace", weight: 2.8 },
  healing: { category: "peace", weight: 2.8 },
  comfort: { category: "peace", weight: 2.8 },
  comforted: { category: "peace", weight: 2.8 },
  hope: { category: "peace", weight: 3.0 },
  joy: { category: "peace", weight: 3.0 },
  faith: { category: "peace", weight: 3.5 },
  faithful: { category: "peace", weight: 3.0 },
  believe: { category: "peace", weight: 2.8 },
  believed: { category: "peace", weight: 2.8 },
  trust: { category: "peace", weight: 2.8 },
  obey: { category: "peace", weight: 2.0 },
  obedience: { category: "peace", weight: 2.0 },
  obedient: { category: "peace", weight: 2.0 },
  prosper: { category: "peace", weight: 3.2 },
  prosperity: { category: "peace", weight: 3.2 },
  eternal: { category: "peace", weight: 3.0 },
  everlasting: { category: "peace", weight: 3.0 },
  inherit: { category: "peace", weight: 2.5 },
  inheritance: { category: "peace", weight: 2.5 },
  endure: { category: "peace", weight: 2.0 },
  steadfast: { category: "peace", weight: 2.5 },
  patience: { category: "peace", weight: 2.0 },
  patient: { category: "peace", weight: 2.0 },
  testimony: { category: "peace", weight: 2.5 },
  testify: { category: "peace", weight: 2.5 },
  witness: { category: "peace", weight: 2.0 },
  conversion: { category: "peace", weight: 2.5 },
  converted: { category: "peace", weight: 2.5 },
  repent: { category: "peace", weight: 2.5 },
  repentance: { category: "peace", weight: 2.5 },
  baptize: { category: "peace", weight: 2.5 },
  baptized: { category: "peace", weight: 2.5 },
  baptism: { category: "peace", weight: 2.5 },
  temple: { category: "peace", weight: 2.5 },
  priesthood: { category: "peace", weight: 2.5 },
  righteous: { category: "peace", weight: 2.8 },
  righteousness: { category: "peace", weight: 2.8 },
  love: { category: "peace", weight: 3.0 },
  loved: { category: "peace", weight: 3.0 },
  lovingkindness: { category: "peace", weight: 3.5 },
  charity: { category: "peace", weight: 3.2 },
  compassion: { category: "peace", weight: 3.0 },
  gentle: { category: "peace", weight: 2.0 },
  meek: { category: "peace", weight: 2.0 },
  meekness: { category: "peace", weight: 2.0 },
  fear: { category: "peace", weight: 0.5 }, // LDS override: "fear of the Lord" = reverence

  // ── ADMONITION & JUSTICE (crimson) ──
  // Prophetic warning, judgment, law, destruction
  wo: { category: "admonition", weight: -3.5 },
  woe: { category: "admonition", weight: -3.5 },
  cursed: { category: "admonition", weight: -3.5 },
  curse: { category: "admonition", weight: -3.2 },
  cursing: { category: "admonition", weight: -3.2 },
  destroy: { category: "admonition", weight: -3.5 },
  destroyed: { category: "admonition", weight: -3.5 },
  destruction: { category: "admonition", weight: -3.9 },
  perish: { category: "admonition", weight: -3.5 },
  punishment: { category: "admonition", weight: -3.0 },
  punish: { category: "admonition", weight: -3.0 },
  judgment: { category: "admonition", weight: -2.5 },
  judgments: { category: "admonition", weight: -2.5 },
  condemn: { category: "admonition", weight: -3.2 },
  condemned: { category: "admonition", weight: -3.2 },
  condemnation: { category: "admonition", weight: -3.5 },
  wrath: { category: "admonition", weight: -3.8 },
  anger: { category: "admonition", weight: -3.0 },
  vengeance: { category: "admonition", weight: -3.5 },
  plague: { category: "admonition", weight: -3.0 },
  plagues: { category: "admonition", weight: -3.0 },
  famine: { category: "admonition", weight: -3.0 },
  sword: { category: "admonition", weight: -2.5 },
  desolation: { category: "admonition", weight: -3.2 },
  desolate: { category: "admonition", weight: -3.0 },
  captivity: { category: "admonition", weight: -3.0 },
  bondage: { category: "admonition", weight: -3.0 },
  damnation: { category: "admonition", weight: -4.0 },
  damned: { category: "admonition", weight: -4.0 },
  hell: { category: "admonition", weight: -3.5 },
  fire: { category: "admonition", weight: -2.0 },
  burn: { category: "admonition", weight: -2.0 },
  burning: { category: "admonition", weight: -2.0 },
  abomination: { category: "admonition", weight: -4.0 },
  abominations: { category: "admonition", weight: -4.0 },
  iniquity: { category: "admonition", weight: -3.5 },
  iniquities: { category: "admonition", weight: -3.5 },
  wickedness: { category: "admonition", weight: -3.5 },
  wicked: { category: "admonition", weight: -3.5 },
  sin: { category: "admonition", weight: -2.5 },
  sins: { category: "admonition", weight: -2.5 },
  sinned: { category: "admonition", weight: -2.5 },
  transgression: { category: "admonition", weight: -3.0 },
  transgress: { category: "admonition", weight: -3.0 },
  rebel: { category: "admonition", weight: -3.0 },
  rebellion: { category: "admonition", weight: -3.2 },
  stiffnecked: { category: "admonition", weight: -3.2 },
  pride: { category: "admonition", weight: -3.8 }, // LDS: central BoM destruction theme
  proud: { category: "admonition", weight: -3.5 },
  harden: { category: "admonition", weight: -2.8 },
  hardened: { category: "admonition", weight: -2.8 },
  smite: { category: "admonition", weight: -2.5 },
  slay: { category: "admonition", weight: -2.8 },
  slain: { category: "admonition", weight: -2.8 },
  kill: { category: "admonition", weight: -2.5 },
  war: { category: "admonition", weight: -2.5 },
  battle: { category: "admonition", weight: -2.0 },
  blood: { category: "admonition", weight: -2.0 },
  enemy: { category: "admonition", weight: -2.0 },
  enemies: { category: "admonition", weight: -2.0 },
  scatter: { category: "admonition", weight: -2.5 },
  scattered: { category: "admonition", weight: -2.5 },
  fury: { category: "admonition", weight: -3.5 },
  rebuke: { category: "admonition", weight: -2.5 },
  rebuked: { category: "admonition", weight: -2.5 },
  chastise: { category: "admonition", weight: -2.5 },
  chastisement: { category: "admonition", weight: -2.5 },
  devour: { category: "admonition", weight: -3.0 },
  devoured: { category: "admonition", weight: -3.0 },

  // ── TRIAL & CONTRITION (indigo) ──
  // Lament, humility, sorrow, broken heart, suffering
  weep: { category: "contrition", weight: -3.0 },
  weeping: { category: "contrition", weight: -3.0 },
  wept: { category: "contrition", weight: -3.0 },
  mourn: { category: "contrition", weight: -3.0 },
  mourning: { category: "contrition", weight: -3.0 },
  sorrow: { category: "contrition", weight: -3.2 },
  sorrowful: { category: "contrition", weight: -3.2 },
  grieve: { category: "contrition", weight: -2.8 },
  grieved: { category: "contrition", weight: -2.8 },
  grief: { category: "contrition", weight: -3.0 },
  anguish: { category: "contrition", weight: -3.5 },
  afflict: { category: "contrition", weight: -2.8 },
  afflicted: { category: "contrition", weight: -2.8 },
  affliction: { category: "contrition", weight: -3.0 },
  suffer: { category: "contrition", weight: -2.8 },
  suffering: { category: "contrition", weight: -2.8 },
  pain: { category: "contrition", weight: -2.5 },
  painful: { category: "contrition", weight: -2.5 },
  cry: { category: "contrition", weight: -2.0 },
  cried: { category: "contrition", weight: -2.0 },
  lamentation: { category: "contrition", weight: -3.0 },
  lament: { category: "contrition", weight: -3.0 },
  tears: { category: "contrition", weight: -2.5 },
  distress: { category: "contrition", weight: -2.8 },
  despair: { category: "contrition", weight: -3.5 },
  broken: { category: "contrition", weight: -2.0 },
  brokenhearted: { category: "contrition", weight: -2.5 },
  forsaken: { category: "contrition", weight: -3.0 },
  lonely: { category: "contrition", weight: -2.5 },
  misery: { category: "contrition", weight: -3.2 },
  miserable: { category: "contrition", weight: -3.2 },
  trouble: { category: "contrition", weight: -2.0 },
  troubled: { category: "contrition", weight: -2.0 },
  torment: { category: "contrition", weight: -3.5 },
  darkness: { category: "contrition", weight: -2.5 },
  humble: { category: "contrition", weight: -1.5 },
  humility: { category: "contrition", weight: -1.5 },
  contrite: { category: "contrition", weight: -2.0 },
  tribulation: { category: "contrition", weight: -3.0 },
  trial: { category: "contrition", weight: -2.0 },
  trials: { category: "contrition", weight: -2.0 },
  temptation: { category: "contrition", weight: -2.0 },
  tempted: { category: "contrition", weight: -2.0 },
  wilderness: { category: "contrition", weight: -1.5 },
  hunger: { category: "contrition", weight: -2.0 },
  thirst: { category: "contrition", weight: -2.0 },
  naked: { category: "contrition", weight: -2.0 },
  poor: { category: "contrition", weight: -1.5 },
  poverty: { category: "contrition", weight: -2.0 },
  captive: { category: "contrition", weight: -2.5 },
  lost: { category: "contrition", weight: -2.0 },
  death: { category: "contrition", weight: -2.5 },
  die: { category: "contrition", weight: -2.0 },
  died: { category: "contrition", weight: -2.0 },
  dying: { category: "contrition", weight: -2.0 },
};

/** Negation words — if one appears within 2 words before a keyword, skip the hit */
const NEGATION_WORDS = new Set([
  "not", "no", "never", "neither", "nor", "none", "without", "cannot",
  "dont", "doesnt", "didnt", "wont", "wouldnt", "shouldnt", "couldnt",
  "hardly", "scarcely", "barely", "lack", "lacking", "absent",
  "nay", "nought", "naught",
]);

/** Quick lookup: word → category ID */
const wordToCategoryCache = new Map<string, string[]>();

export function getWordCategories(word: string): string[] {
  const lower = word.toLowerCase();
  if (wordToCategoryCache.has(lower)) return wordToCategoryCache.get(lower)!;
  const entry = LEXICON[lower];
  const cats = entry ? [entry.category] : [];
  wordToCategoryCache.set(lower, cats);
  return cats;
}

export interface ScoreResult {
  scores: Record<string, number>;   // per-category weighted score
  wordCount: number;
  lowConfidence: boolean;
  compositeScore: number;           // single weighted sentiment value
}

/**
 * Score a block of text against all 4 categories using weighted valence.
 * Score = sum(weights) / sqrt(wordCount) — normalizes for text length.
 */
export function scoreText(text: string): ScoreResult {
  const rawScores: Record<string, number> = {};
  for (const cat of SENTIMENT_CATEGORIES) {
    rawScores[cat.id] = 0;
  }

  const words = text.toLowerCase().replace(/[^a-z'-]/g, " ").split(/\s+/);
  const cleaned: string[] = [];
  for (const w of words) {
    const c = w.replace(/^['-]+|['-]+$/g, "");
    if (c.length >= 2) cleaned.push(c);
  }

  const totalWords = cleaned.length;
  let totalWeightedScore = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const word = cleaned[i];
    // 2-word look-back negation check
    let negated = false;
    if (i >= 1 && NEGATION_WORDS.has(cleaned[i - 1])) negated = true;
    if (!negated && i >= 2 && NEGATION_WORDS.has(cleaned[i - 2])) negated = true;
    if (negated) continue;

    const entry = LEXICON[word];
    if (entry) {
      rawScores[entry.category] += Math.abs(entry.weight);
      totalWeightedScore += entry.weight;
    }
  }

  // Normalize: score / sqrt(wordCount)
  const scores: Record<string, number> = {};
  const lowConfidence = totalWords < 50;
  const dampening = lowConfidence ? 0.5 : 1;
  const sqrtN = totalWords > 0 ? Math.sqrt(totalWords) : 1;

  for (const cat of SENTIMENT_CATEGORIES) {
    if (totalWords === 0) {
      scores[cat.id] = 0;
    } else {
      const normalized = (rawScores[cat.id] / sqrtN) * dampening;
      scores[cat.id] = Math.round(normalized * 10) / 10;
    }
  }

  const compositeScore = totalWords > 0 ? (totalWeightedScore / sqrtN) * dampening : 0;

  return { scores, wordCount: totalWords, lowConfidence, compositeScore: Math.round(compositeScore * 10) / 10 };
}

/**
 * Get the dominant tone category for a single verse.
 * Returns the category with the highest weighted score,
 * or null if no sentiment keywords found.
 */
export function getVerseDominantTone(text: string): SentimentCategory | null {
  const words = text.toLowerCase().replace(/[^a-z'-]/g, " ").split(/\s+/);
  const cleaned: string[] = [];
  for (const w of words) {
    const c = w.replace(/^['-]+|['-]+$/g, "");
    if (c.length >= 2) cleaned.push(c);
  }

  const counts: Record<string, number> = {};
  for (const cat of SENTIMENT_CATEGORIES) {
    counts[cat.id] = 0;
  }

  for (let i = 0; i < cleaned.length; i++) {
    let negated = false;
    if (i >= 1 && NEGATION_WORDS.has(cleaned[i - 1])) negated = true;
    if (!negated && i >= 2 && NEGATION_WORDS.has(cleaned[i - 2])) negated = true;
    if (negated) continue;

    const entry = LEXICON[cleaned[i]];
    if (entry) {
      counts[entry.category] += Math.abs(entry.weight);
    }
  }

  let bestId = "";
  let bestScore = 0;
  for (const cat of SENTIMENT_CATEGORIES) {
    if (counts[cat.id] > bestScore) {
      bestScore = counts[cat.id];
      bestId = cat.id;
    }
  }

  if (bestScore === 0) return null;
  return SENTIMENT_CATEGORIES.find((c) => c.id === bestId) || null;
}

/**
 * Apply 5-verse Simple Moving Average to smooth a series of scores.
 */
export function smoothScores(scores: number[], windowSize = 5): number[] {
  const half = Math.floor(windowSize / 2);
  return scores.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(scores.length, i + half + 1);
    const slice = scores.slice(start, end);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}
