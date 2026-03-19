/**
 * Chiasmus (ABBA pattern) detection in scripture chapters.
 * Looks for mirrored keyword patterns across verse sequences.
 */

const STOP_WORDS = new Set([
  "the", "and", "of", "to", "in", "a", "that", "it", "is", "was", "for",
  "i", "he", "his", "with", "they", "be", "not", "them", "their", "shall",
  "him", "but", "all", "which", "had", "were", "upon", "my", "this", "have",
  "from", "or", "by", "as", "ye", "me", "do", "did", "are", "we", "she",
  "her", "an", "who", "so", "if", "will", "no", "on", "thee", "thy", "thou",
  "at", "out", "up", "said", "when", "what", "into", "am", "us", "our",
  "also", "came", "then", "now", "even", "things", "every", "these", "those",
  "may", "might", "has", "hath", "being", "been", "would", "should", "could",
  "more", "there", "one", "two", "three", "after", "before", "over", "about",
  "against", "through", "come", "came", "went", "go", "let", "make", "made",
  "take", "taken", "give", "gave", "say", "saying", "saith",
]);

/** Extract significant words from text */
function extractKeywords(text: string): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z'-]/g, " ").split(/\s+/);
  const result = new Set<string>();
  for (const w of words) {
    const clean = w.replace(/^['-]+|['-]+$/g, "");
    if (clean.length >= 3 && !STOP_WORDS.has(clean)) {
      result.add(clean);
    }
  }
  return result;
}

/** Calculate Jaccard similarity between two keyword sets */
function similarity(a: Set<string>, b: Set<string>): { score: number; shared: string[] } {
  const shared: string[] = [];
  for (const w of a) {
    if (b.has(w)) shared.push(w);
  }
  const union = new Set([...a, ...b]).size;
  return {
    score: union > 0 ? shared.length / union : 0,
    shared,
  };
}

export interface ChiasmElement {
  label: string;       // "A", "B", "C", "C'", "B'", "A'"
  verseStart: number;
  verseEnd: number;
  keywords: string[];  // shared keywords with the mirror
  isPivot: boolean;
}

export interface ChiasmPattern {
  elements: ChiasmElement[];
  confidence: number;  // 0-1
  pivotVerse: number;
  description: string;
}

interface VerseData {
  verse: number;
  text: string;
}

/**
 * Detect chiastic patterns in a chapter's verses.
 * Groups consecutive verses and looks for mirrored keyword patterns.
 */
export function detectChiasms(verses: VerseData[]): ChiasmPattern[] {
  if (verses.length < 5) return []; // Need at least 5 verses for a meaningful chiasm

  // Extract keywords per verse
  const verseKeywords = verses.map((v) => ({
    verse: v.verse,
    keywords: extractKeywords(v.text),
  }));

  const patterns: ChiasmPattern[] = [];

  // Try different window sizes (groups of 1-3 verses)
  for (const groupSize of [1, 2]) {
    // Group verses
    const groups: { verseStart: number; verseEnd: number; keywords: Set<string> }[] = [];
    for (let i = 0; i <= verseKeywords.length - groupSize; i += groupSize) {
      const combined = new Set<string>();
      const slice = verseKeywords.slice(i, i + groupSize);
      for (const vk of slice) {
        for (const w of vk.keywords) combined.add(w);
      }
      groups.push({
        verseStart: slice[0].verse,
        verseEnd: slice[slice.length - 1].verse,
        keywords: combined,
      });
    }

    if (groups.length < 5) continue;

    // Try different center points
    for (let center = 2; center < groups.length - 2; center++) {
      const pairs: { i: number; j: number; score: number; shared: string[] }[] = [];

      // Check mirrors around center
      const maxRadius = Math.min(center, groups.length - 1 - center);
      for (let r = 1; r <= maxRadius && r <= 6; r++) {
        const left = center - r;
        const right = center + r;
        const sim = similarity(groups[left].keywords, groups[right].keywords);
        if (sim.score > 0.08 && sim.shared.length >= 1) {
          pairs.push({ i: left, j: right, score: sim.score, shared: sim.shared });
        }
      }

      // Need at least 2 mirror pairs for a real chiasm
      if (pairs.length < 2) continue;

      // Build the chiasm structure
      const labels = "ABCDEFG";
      const elements: ChiasmElement[] = [];

      // Add ascending elements (A, B, C...)
      for (let p = pairs.length - 1; p >= 0; p--) {
        const pair = pairs[p];
        const labelIdx = pairs.length - 1 - p;
        elements.push({
          label: labels[labelIdx] || `L${labelIdx}`,
          verseStart: groups[pair.i].verseStart,
          verseEnd: groups[pair.i].verseEnd,
          keywords: pair.shared.slice(0, 3),
          isPivot: false,
        });
      }

      // Add pivot
      elements.push({
        label: labels[pairs.length] || "X",
        verseStart: groups[center].verseStart,
        verseEnd: groups[center].verseEnd,
        keywords: Array.from(groups[center].keywords).slice(0, 3),
        isPivot: true,
      });

      // Add descending elements (C', B', A')
      for (let p = 0; p < pairs.length; p++) {
        const pair = pairs[p];
        const labelIdx = pairs.length - 1 - p;
        elements.push({
          label: (labels[labelIdx] || `L${labelIdx}`) + "'",
          verseStart: groups[pair.j].verseStart,
          verseEnd: groups[pair.j].verseEnd,
          keywords: pair.shared.slice(0, 3),
          isPivot: false,
        });
      }

      // Score: based on number of pairs, average similarity, and symmetry
      const avgScore = pairs.reduce((sum, p) => sum + p.score, 0) / pairs.length;
      const pairBonus = Math.min(pairs.length / 4, 1); // More pairs = better
      const confidence = Math.min((avgScore * 0.6 + pairBonus * 0.4) * 1.5, 1);

      if (confidence >= 0.15) {
        patterns.push({
          elements,
          confidence,
          pivotVerse: groups[center].verseStart,
          description: `${pairs.length}-level chiasm centered on verse ${groups[center].verseStart}`,
        });
      }
    }
  }

  // Deduplicate: if two patterns share the same pivot, keep the higher confidence one
  const byPivot = new Map<number, ChiasmPattern>();
  for (const p of patterns) {
    const existing = byPivot.get(p.pivotVerse);
    if (!existing || p.confidence > existing.confidence) {
      byPivot.set(p.pivotVerse, p);
    }
  }

  // Return top patterns sorted by confidence
  return Array.from(byPivot.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}
