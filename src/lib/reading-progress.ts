export interface ReadingProgress {
  chaptersRead: Record<string, boolean>; // key: "bookId-chapter"
  lastReadAt: string; // ISO date
  streak: number;
  lastStreakDate: string; // YYYY-MM-DD
}

const STORAGE_KEY = "reading-progress";

function getToday(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function load(): ReadingProgress {
  if (typeof window === "undefined") {
    return { chaptersRead: {}, lastReadAt: "", streak: 0, lastStreakDate: "" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { chaptersRead: {}, lastReadAt: "", streak: 0, lastStreakDate: "" };
}

function save(progress: ReadingProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function makeKey(bookId: number, chapter: number): string {
  return `${bookId}-${chapter}`;
}

export function markChapterRead(bookId: number, chapter: number): void {
  const progress = load();
  const key = makeKey(bookId, chapter);
  if (progress.chaptersRead[key]) return; // Already read

  progress.chaptersRead[key] = true;
  progress.lastReadAt = new Date().toISOString();

  // Update streak
  const today = getToday();
  if (progress.lastStreakDate === today) {
    // Already counted today
  } else if (progress.lastStreakDate === getYesterday()) {
    progress.streak += 1;
    progress.lastStreakDate = today;
  } else {
    // Streak broken or first time
    progress.streak = 1;
    progress.lastStreakDate = today;
  }

  save(progress);
}

export function isChapterRead(bookId: number, chapter: number): boolean {
  return !!load().chaptersRead[makeKey(bookId, chapter)];
}

export function getReadChaptersForBook(bookId: number, totalChapters: number): number {
  const progress = load();
  let count = 0;
  for (let ch = 1; ch <= totalChapters; ch++) {
    if (progress.chaptersRead[makeKey(bookId, ch)]) count++;
  }
  return count;
}

export function getVolumeProgress(books: { id: number; chapterCount: number }[]): {
  read: number;
  total: number;
  percentage: number;
} {
  const progress = load();
  let read = 0;
  let total = 0;
  for (const book of books) {
    total += book.chapterCount;
    for (let ch = 1; ch <= book.chapterCount; ch++) {
      if (progress.chaptersRead[makeKey(book.id, ch)]) read++;
    }
  }
  return { read, total, percentage: total > 0 ? Math.round((read / total) * 100) : 0 };
}

export function getStreak(): { streak: number; isActiveToday: boolean } {
  const progress = load();
  const today = getToday();
  const yesterday = getYesterday();
  const isActiveToday = progress.lastStreakDate === today;
  // If last activity was yesterday or today, streak is current
  const isCurrent = progress.lastStreakDate === today || progress.lastStreakDate === yesterday;
  return {
    streak: isCurrent ? progress.streak : 0,
    isActiveToday,
  };
}

export function getTotalChaptersRead(): number {
  return Object.keys(load().chaptersRead).length;
}
