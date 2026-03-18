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

export interface WordFrequencyResponse {
  word: string;
  caseInsensitive: boolean;
  wholeWord: boolean;
  totalCount: number;
  totalVerses: number;
  results: FrequencyResult[];
}

export interface BooksResponse {
  volumes: Volume[];
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
