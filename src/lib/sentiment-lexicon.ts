/**
 * Scripture sentiment/tone lexicon.
 * Each category contains words commonly associated with that tone.
 * Used for Sentiment Arc visualization and keyword highlighting.
 */

export interface SentimentCategory {
  id: string;
  label: string;
  color: string;         // chart line / highlight color
  colorLight: string;    // text highlight background (transparent)
  words: Set<string>;
}

const promise: string[] = [
  "bless", "blessed", "blessing", "blessings", "promise", "promised", "promises",
  "hope", "prosper", "prosperity", "joy", "rejoice", "rejoicing", "comfort",
  "comforted", "eternal", "everlasting", "salvation", "save", "saved", "deliver",
  "delivered", "deliverance", "redeem", "redeemed", "redemption", "inherit",
  "inheritance", "reward", "peace", "rest", "mercy", "merciful", "grace",
  "forgive", "forgiven", "forgiveness", "heal", "healed", "healing",
  "exalt", "exalted", "glory", "glorify", "glorified",
];

const warning: string[] = [
  "woe", "cursed", "curse", "cursing", "destroy", "destroyed", "destruction",
  "perish", "punishment", "punish", "judgment", "judgments", "condemn",
  "condemned", "condemnation", "wrath", "anger", "vengeance", "plague",
  "plagues", "famine", "sword", "desolation", "desolate", "captivity",
  "captive", "bondage", "afflict", "afflicted", "affliction", "tribulation",
  "damnation", "damned", "hell", "fire", "burn", "burning",
  "abomination", "abominations", "iniquity", "iniquities",
];

const praise: string[] = [
  "praise", "praised", "praises", "worship", "worshipped", "sing", "singing",
  "song", "thanks", "thanksgiving", "thankful", "hallelujah", "hosanna",
  "holy", "holiness", "sanctify", "sanctified", "consecrate", "consecrated",
  "glory", "glorious", "glorify", "magnify", "exalt", "honor", "adore",
  "beautiful", "beauty", "majesty", "wonderful", "marvelous", "excellent",
  "almighty", "omnipotent", "great", "greatness",
];

const lament: string[] = [
  "weep", "weeping", "wept", "mourn", "mourning", "sorrow", "sorrowful",
  "grieve", "grieved", "grief", "anguish", "afflict", "affliction", "suffer",
  "suffering", "pain", "painful", "cry", "cried", "lamentation", "lament",
  "tears", "distress", "despair", "broken", "brokenhearted", "forsaken",
  "desolate", "lonely", "misery", "miserable", "trouble", "troubled",
  "torment", "darkness", "lost",
];

const commandment: string[] = [
  "command", "commanded", "commandment", "commandments", "law", "laws",
  "statute", "statutes", "ordinance", "ordinances", "decree", "decrees",
  "covenant", "covenants", "obey", "obedience", "obedient", "keep",
  "observe", "hearken", "heed", "walk", "follow", "duty", "charge",
  "require", "forbidden", "shalt", "must", "ought",
];

const prophetic: string[] = [
  "prophecy", "prophesy", "prophesied", "prophet", "prophets", "vision",
  "visions", "behold", "saith", "thus", "revelation", "revealed", "reveal",
  "dream", "dreams", "sign", "signs", "wonder", "wonders", "miracle",
  "miracles", "fulfilled", "fulfill", "future", "come", "cometh",
  "latter", "last", "days", "end", "second", "coming", "return",
  "zion", "kingdom", "reign", "millennium", "restore", "restoration",
];

const faith: string[] = [
  "faith", "faithful", "believe", "believed", "believing", "trust",
  "trusted", "confidence", "assurance", "hope", "endure", "endurance",
  "steadfast", "firm", "stand", "withstand", "overcome", "patience",
  "patient", "testimony", "testify", "witness", "witnesses", "devotion",
  "devoted", "diligent", "diligence", "persevere", "perseverance",
  "converted", "conversion", "repent", "repentance",
];

export const SENTIMENT_CATEGORIES: SentimentCategory[] = [
  {
    id: "promise",
    label: "Promise & Blessing",
    color: "#10b981",
    colorLight: "rgba(16, 185, 129, 0.15)",
    words: new Set(promise),
  },
  {
    id: "warning",
    label: "Warning & Judgment",
    color: "#ef4444",
    colorLight: "rgba(239, 68, 68, 0.15)",
    words: new Set(warning),
  },
  {
    id: "praise",
    label: "Praise & Worship",
    color: "#8b5cf6",
    colorLight: "rgba(139, 92, 246, 0.15)",
    words: new Set(praise),
  },
  {
    id: "lament",
    label: "Lament & Sorrow",
    color: "#6366f1",
    colorLight: "rgba(99, 102, 241, 0.15)",
    words: new Set(lament),
  },
  {
    id: "commandment",
    label: "Law & Covenant",
    color: "#f59e0b",
    colorLight: "rgba(245, 158, 11, 0.15)",
    words: new Set(commandment),
  },
  {
    id: "prophetic",
    label: "Prophetic & Visionary",
    color: "#06b6d4",
    colorLight: "rgba(6, 182, 212, 0.15)",
    words: new Set(prophetic),
  },
  {
    id: "faith",
    label: "Faith & Devotion",
    color: "#3b82f6",
    colorLight: "rgba(59, 130, 246, 0.15)",
    words: new Set(faith),
  },
];

/** Negation words — if one of these appears within 2 words before a keyword, skip the hit */
const NEGATION_WORDS = new Set([
  "not", "no", "never", "neither", "nor", "none", "without", "cannot",
  "dont", "doesnt", "didnt", "wont", "wouldnt", "shouldnt", "couldnt",
  "hardly", "scarcely", "barely", "lack", "lacking", "absent",
  "nay", "nought", "naught",
]);

/** Quick lookup: word → category IDs */
const wordToCategoryCache = new Map<string, string[]>();

export function getWordCategories(word: string): string[] {
  const lower = word.toLowerCase();
  if (wordToCategoryCache.has(lower)) return wordToCategoryCache.get(lower)!;
  const cats = SENTIMENT_CATEGORIES
    .filter((c) => c.words.has(lower))
    .map((c) => c.id);
  wordToCategoryCache.set(lower, cats);
  return cats;
}

export interface ScoreResult {
  scores: Record<string, number>;   // normalized: per 1,000 words, 1 decimal
  wordCount: number;
  lowConfidence: boolean;            // true when wordCount < 50
}

/**
 * Score a block of text against all categories.
 * Returns normalized scores (per 1,000 words) with negation handling.
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

  for (let i = 0; i < cleaned.length; i++) {
    const word = cleaned[i];
    // 2-word look-back negation check
    let negated = false;
    if (i >= 1 && NEGATION_WORDS.has(cleaned[i - 1])) negated = true;
    if (!negated && i >= 2 && NEGATION_WORDS.has(cleaned[i - 2])) negated = true;
    if (negated) continue;

    for (const cat of SENTIMENT_CATEGORIES) {
      if (cat.words.has(word)) {
        rawScores[cat.id]++;
      }
    }
  }

  // Normalize to per-1,000-words
  const scores: Record<string, number> = {};
  const lowConfidence = totalWords < 50;
  const dampening = lowConfidence ? 0.5 : 1;

  for (const cat of SENTIMENT_CATEGORIES) {
    if (totalWords === 0) {
      scores[cat.id] = 0;
    } else {
      const normalized = (rawScores[cat.id] / totalWords) * 1000 * dampening;
      scores[cat.id] = Math.round(normalized * 10) / 10;
    }
  }

  return { scores, wordCount: totalWords, lowConfidence };
}

/**
 * Get the dominant tone category for a single verse.
 * Returns the category with the most keyword hits (with negation handling),
 * or null if the verse has no sentiment keywords.
 * Used for verse-level tone coloring in the reader.
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

    for (const cat of SENTIMENT_CATEGORIES) {
      if (cat.words.has(cleaned[i])) {
        counts[cat.id]++;
      }
    }
  }

  let bestId = "";
  let bestCount = 0;
  for (const cat of SENTIMENT_CATEGORIES) {
    if (counts[cat.id] > bestCount) {
      bestCount = counts[cat.id];
      bestId = cat.id;
    }
  }

  if (bestCount === 0) return null;
  return SENTIMENT_CATEGORIES.find((c) => c.id === bestId) || null;
}
