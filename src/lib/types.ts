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
