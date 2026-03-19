export interface Bookmark {
  bookId: number;
  chapter: number;
  verse: number;
  bookName: string;
  volumeAbbrev: string;
  text: string; // first 100 chars
  createdAt: string; // ISO date
}

const STORAGE_KEY = "scripture-bookmarks";

function getAll(): Bookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(bookmarks: Bookmark[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
}

export function getBookmarks(): Bookmark[] {
  return getAll().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function addBookmark(bm: Omit<Bookmark, "createdAt">): void {
  const all = getAll();
  // Don't add duplicates
  if (all.some((b) => b.bookId === bm.bookId && b.chapter === bm.chapter && b.verse === bm.verse)) {
    return;
  }
  all.push({ ...bm, text: bm.text.substring(0, 100), createdAt: new Date().toISOString() });
  saveAll(all);
}

export function removeBookmark(bookId: number, chapter: number, verse: number): void {
  const all = getAll().filter(
    (b) => !(b.bookId === bookId && b.chapter === chapter && b.verse === verse)
  );
  saveAll(all);
}

export function isBookmarked(bookId: number, chapter: number, verse: number): boolean {
  return getAll().some(
    (b) => b.bookId === bookId && b.chapter === chapter && b.verse === verse
  );
}

export function getBookmarkCount(): number {
  return getAll().length;
}
