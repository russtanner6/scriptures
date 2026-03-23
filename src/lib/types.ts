export interface Volume {
  id: number;
  name: string;
  abbrev: string;
  displayOrder: number;
  books: Book[];
}

export interface Book {
  id: number;
  name: string;
  volumeId: number;
  volumeName: string;
  volumeAbbrev: string;
  displayOrder: number;
  chapterCount: number;
}

export interface FrequencyResult {
  bookId: number;
  bookName: string;
  volumeName: string;
  volumeAbbrev: string;
  displayOrder: number;
  count: number;
  verseCount: number;
}

export interface Verse {
  chapter: number;
  verse: number;
  text: string;
}

export interface ScripturePanelState {
  word: string;
  bookId: number;
  bookName: string;
  chapter?: number;
  caseInsensitive: boolean;
  wholeWord: boolean;
  volumeColor?: string;
  /** Optional display label for the header (e.g., category name for sentiment) */
  displayLabel?: string;
}

export interface MatchedWord {
  word: string;
  count: number;
}

export interface WordFrequencyResponse {
  word: string;
  caseInsensitive: boolean;
  wholeWord: boolean;
  totalCount: number;
  totalVerses: number;
  results: FrequencyResult[];
  matchedWords: MatchedWord[];
}

export interface BooksResponse {
  volumes: Volume[];
}

// ── Resource Layer ──
export type ResourceType = "video" | "article" | "pdf";

export interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  description: string;
  url: string;
  thumbnailUrl?: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  tags?: string[];
}

// ── Context Nuggets ──
export type NuggetCategory = "Linguistic" | "Historical" | "Cultural" | "Literary" | "Restoration";

export interface ContextNugget {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  keyword: string;
  category: NuggetCategory;
  title: string;
  insight: string;
  source: string;
}

// ── Speaker Attribution ──
export type SpeakerType = "divine" | "narrator" | "prophet" | "apostle" | "angel" | "other";

export interface SpeakerAttribution {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  speaker: string;
  speakerType: SpeakerType;
}

// ── Character Directory ──
export interface ScriptureCharacter {
  id: string;
  name: string;
  aliases: string[];
  bio: string;
  era: string;
  timePeriod: string;
  roles: string[];
  gender: "male" | "female";
  volumes: string[];
  books: string[];
  family: Record<string, string | string[]>;
  speakerType: SpeakerType;
  tier: 1 | 2 | 3 | 4;
  portraitUrl?: string;
}

// ── Location Directory ──
export type LocationType =
  | "city"
  | "river"
  | "mountain"
  | "sea"
  | "desert"
  | "region"
  | "valley"
  | "well"
  | "plain"
  | "island"
  | "garden"
  | "land"
  | "hill"
  | "wilderness"
  | "waters";

export interface ScriptureLocation {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  lat: number | null;
  lng: number | null;
  region: string;
  locationType: LocationType;
  volumes: string[];
  era: string;
  significance: string;
  tier: 1 | 2 | 3 | 4;
  knownLocation: boolean;
}

export interface BookStat {
  bookId: number;
  bookName: string;
  volumeName: string;
  volumeAbbrev: string;
  displayOrder: number;
  wordCount: number;
  verseCount: number;
  chapterCount: number;
  avgVerseLength: number;
  avgWordLength: number;
}
