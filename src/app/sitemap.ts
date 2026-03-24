import type { MetadataRoute } from "next";
import { getDb } from "@/lib/db";
import { execToObjects } from "@/lib/queries";
import { VOLUME_ABBREV_TO_SLUG, bookNameToSlug } from "@/lib/scripture-slugs";

const BASE_URL = "https://scripturexplorer.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // ── Static pages (high priority) ──
  entries.push(
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/narrative-arc`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/heatmap`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/wordcloud`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/sentiment`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/chiasmus`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/topics`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/scriptures`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/characters`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/locations`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/bookmarks`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/settings`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  );

  // ── Scripture pages (dynamic) ──
  try {
    const db = await getDb();

    // Get all volumes with their books and chapter counts
    const books = execToObjects<{
      book_id: number;
      book_name: string;
      volume_abbrev: string;
      chapter_count: number;
    }>(db, `
      SELECT b.id as book_id, b.name as book_name, v.abbrev as volume_abbrev, b.chapter_count
      FROM books b JOIN volumes v ON b.volume_id = v.id
      ORDER BY v.display_order, b.display_order
    `);

    // Volume pages
    const volumeAbbrevs = [...new Set(books.map(b => b.volume_abbrev))];
    for (const abbrev of volumeAbbrevs) {
      const slug = VOLUME_ABBREV_TO_SLUG[abbrev];
      if (slug) {
        entries.push({
          url: `${BASE_URL}/scriptures/${slug}`,
          lastModified: new Date(),
          changeFrequency: "monthly",
          priority: 0.8,
        });
      }
    }

    // Book pages (chapter grid) + individual chapters
    for (const book of books) {
      const volSlug = VOLUME_ABBREV_TO_SLUG[book.volume_abbrev];
      if (!volSlug) continue;
      const bookSlug = bookNameToSlug(book.book_name);

      // Book page (chapter grid)
      entries.push({
        url: `${BASE_URL}/scriptures/${volSlug}/${bookSlug}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.7,
      });

      // Individual chapter pages (highest volume of content)
      for (let ch = 1; ch <= book.chapter_count; ch++) {
        entries.push({
          url: `${BASE_URL}/scriptures/${volSlug}/${bookSlug}/${ch}`,
          lastModified: new Date(),
          changeFrequency: "yearly",
          priority: 0.6,
        });
      }
    }
  } catch (err) {
    console.error("Sitemap: failed to load scripture data:", err);
  }

  return entries;
}
