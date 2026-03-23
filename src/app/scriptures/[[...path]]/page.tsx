import type { Metadata } from "next";
import { Suspense } from "react";
import ScriptureReader from "@/components/ScriptureReader";
import { VOLUME_SLUG_TO_ABBREV, slugToBookSearch, bookNameToSlug } from "@/lib/scripture-slugs";
import { getDb } from "@/lib/db";
import { execToObjects } from "@/lib/queries";

interface PageProps {
  params: Promise<{ path?: string[] }>;
}

/** Generate dynamic metadata for SEO based on the URL path */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { path } = await params;
  if (!path || path.length === 0) {
    return {
      title: "Read the Scriptures — Scripture Explorer",
      description: "Read the Old Testament, New Testament, Book of Mormon, Doctrine & Covenants, and Pearl of Great Price with interactive tools, speaker attribution, and scholarly insights.",
    };
  }

  const volSlug = path[0];
  const bookSlug = path[1];
  const chapter = path[2] ? Number(path[2]) : null;
  const volAbbrev = VOLUME_SLUG_TO_ABBREV[volSlug];

  if (!volAbbrev) {
    return { title: "Read — Scripture Explorer" };
  }

  // Volume-only: /scriptures/new-testament
  const volNames: Record<string, string> = {
    OT: "Old Testament", NT: "New Testament", BoM: "Book of Mormon",
    "D&C": "Doctrine & Covenants", PoGP: "Pearl of Great Price",
  };
  const volName = volNames[volAbbrev] || volAbbrev;

  if (!bookSlug) {
    return {
      title: `${volName} — Scripture Explorer`,
      description: `Read the ${volName} online with interactive tools, speaker attribution, and scholarly insights.`,
    };
  }

  // Book: /scriptures/new-testament/john
  if (!chapter) {
    const bookSearch = slugToBookSearch(bookSlug);
    const displayBook = bookSearch.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return {
      title: `${displayBook} — ${volName} — Scripture Explorer`,
      description: `Read ${displayBook} from the ${volName} with chapter navigation, speaker tags, and scholarly nuggets.`,
    };
  }

  // Chapter: /scriptures/new-testament/john/11
  try {
    const db = await getDb();
    const bookSearch = slugToBookSearch(bookSlug);
    // Find the book
    const books = execToObjects(db, `SELECT b.id, b.name, v.name as volume_name FROM books b JOIN volumes v ON b.volume_id = v.id WHERE LOWER(b.name) = ?`, [bookSearch]) as Array<{ id: number; name: string; volume_name: string }>;

    let book = books[0];
    if (!book) {
      // Try slug match against all books
      const allBooks = execToObjects(db, `SELECT b.id, b.name, v.name as volume_name FROM books b JOIN volumes v ON b.volume_id = v.id`) as Array<{ id: number; name: string; volume_name: string }>;
      book = allBooks.find(b => bookNameToSlug(b.name) === bookSlug) || books[0];
    }

    if (book) {
      const isDC = volAbbrev === "D&C";
      const chLabel = isDC ? `Section ${chapter}` : `Chapter ${chapter}`;
      // Get first few verses for description
      const verses = execToObjects(db, `SELECT verse, text FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse LIMIT 3`, [book.id, chapter]) as Array<{ verse: number; text: string }>;
      const preview = verses.map(v => v.text).join(" ").slice(0, 155) + "...";

      return {
        title: `${book.name} ${chLabel} — Scripture Explorer`,
        description: preview,
      };
    }
  } catch {
    // Fall through to default
  }

  return { title: "Read — Scripture Explorer" };
}

/** Server-rendered verse text for SEO (hidden, for crawlers) */
async function ServerVerseText({ path }: { path?: string[] }) {
  if (!path || path.length < 3) return null;

  const volSlug = path[0];
  const bookSlug = path[1];
  const chapter = Number(path[2]);
  const volAbbrev = VOLUME_SLUG_TO_ABBREV[volSlug];
  if (!volAbbrev || !chapter) return null;

  try {
    const db = await getDb();
    const bookSearch = slugToBookSearch(bookSlug);
    const allBooks = execToObjects(db, `SELECT b.id, b.name FROM books b JOIN volumes v ON b.volume_id = v.id`) as Array<{ id: number; name: string }>;
    const book = allBooks.find(b => b.name.toLowerCase() === bookSearch || bookNameToSlug(b.name) === bookSlug);
    if (!book) return null;

    const verses = execToObjects(db, `SELECT verse, text FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse`, [book.id, chapter]) as Array<{ verse: number; text: string }>;
    if (verses.length === 0) return null;

    const isDC = volAbbrev === "D&C";
    const chLabel = isDC ? `Section ${chapter}` : `Chapter ${chapter}`;

    return (
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}>
        <h1>{book.name} {chLabel}</h1>
        {verses.map(v => (
          <p key={v.verse}><strong>{v.verse}</strong> {v.text}</p>
        ))}
      </div>
    );
  } catch {
    return null;
  }
}

export default async function ReadPage({ params }: PageProps) {
  const { path } = await params;
  return (
    <>
      <ServerVerseText path={path} />
      <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>}>
        <ScriptureReader />
      </Suspense>
    </>
  );
}
