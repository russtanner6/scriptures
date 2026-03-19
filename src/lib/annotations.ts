export interface Annotation {
  bookId: number;
  chapter: number;
  verse: number;
  note: string;
  updatedAt: string; // ISO date
}

const STORAGE_KEY = "scripture-annotations";

function getAll(): Annotation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(annotations: Annotation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
}

export function getAnnotation(
  bookId: number,
  chapter: number,
  verse: number
): Annotation | null {
  return (
    getAll().find(
      (a) => a.bookId === bookId && a.chapter === chapter && a.verse === verse
    ) || null
  );
}

export function saveAnnotation(
  bookId: number,
  chapter: number,
  verse: number,
  note: string
): void {
  const all = getAll();
  const idx = all.findIndex(
    (a) => a.bookId === bookId && a.chapter === chapter && a.verse === verse
  );
  const entry: Annotation = {
    bookId,
    chapter,
    verse,
    note,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) {
    all[idx] = entry;
  } else {
    all.push(entry);
  }
  saveAll(all);
}

export function deleteAnnotation(
  bookId: number,
  chapter: number,
  verse: number
): void {
  const all = getAll().filter(
    (a) => !(a.bookId === bookId && a.chapter === chapter && a.verse === verse)
  );
  saveAll(all);
}

export function getAnnotationsForChapter(
  bookId: number,
  chapter: number
): Annotation[] {
  return getAll().filter(
    (a) => a.bookId === bookId && a.chapter === chapter
  );
}

export function hasAnnotation(
  bookId: number,
  chapter: number,
  verse: number
): boolean {
  return getAll().some(
    (a) => a.bookId === bookId && a.chapter === chapter && a.verse === verse
  );
}

export function getAnnotationCount(): number {
  return getAll().length;
}
