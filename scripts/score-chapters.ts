/**
 * Score every chapter in the scripture database using Claude API.
 * Outputs data/chapter-sentiments.json with 4-category scores (0-10).
 *
 * Usage: ANTHROPIC_API_KEY=sk-... npx tsx scripts/score-chapters.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import initSqlJs from "sql.js";
import * as fs from "fs";
import * as path from "path";

const BATCH_SIZE = 5; // chapters per API call
const MODEL = "claude-sonnet-4-5-20250929";
const MAX_RETRIES = 5;

interface ChapterScore {
  volumeAbbrev: string;
  volumeName: string;
  bookName: string;
  bookId: number;
  chapter: number;
  exaltation: number;
  peace: number;
  admonition: number;
  contrition: number;
  dominant: string;
  rationale: string;
}

const SYSTEM_PROMPT = `You are a biblical scholarship expert scoring scripture chapters for emotional/theological tone.

Score each chapter on 4 independent categories (0-10 scale). Consider the FULL context — not just keywords.

## Categories

**Exaltation & Glory (0-10)**
Doxological praise, visionary revelation, heavenly glory, divine majesty, triumph, resurrection, celestial imagery.
- 10: Pure praise/worship (Psalm 150, Revelation 4)
- 7-9: Strong doxological elements (Psalm 148, Isaiah 6)
- 4-6: Moderate praise mixed with other themes
- 1-3: Minor references to glory/praise
- 0: No praise or glory elements

**Covenant Peace (0-10)**
Grace, faith, blessing, redemption, comfort, mercy, ordinances, baptism, love, hope, prosperity promises, divine rest.
- 10: Pure comfort/grace (Psalm 23, John 14)
- 7-9: Strong covenantal comfort (Romans 8, 2 Nephi 2)
- 4-6: Balanced comfort with instruction
- 1-3: Minor references to peace/grace
- 0: No peace or comfort elements

**Admonition & Justice (0-10)**
Prophetic warning, divine judgment, condemnation of sin, wrath, destruction, calls to repentance from wickedness.
IMPORTANT: "Fear not" and "I will deliver you from destruction" are COMFORTING (Peace), not admonishing. Score based on the INTENT of the passage, not just the presence of negative words.
- 10: Pure prophetic condemnation (Isaiah 1, Alma 5)
- 7-9: Strong warnings/judgment (Ezekiel 16, Helaman 13)
- 4-6: Mixed warning and hope
- 1-3: Minor cautionary notes
- 0: No warning or judgment

**Trial & Contrition (0-10)**
Lament, suffering, sorrow, humility, broken heart, tribulation, exile, poverty, death, wilderness wandering.
- 10: Pure lament (Lamentations 1, Job 3)
- 7-9: Deep suffering/sorrow (Psalm 88, Alma 36:12-16)
- 4-6: Mixed suffering with resolution
- 1-3: Minor references to hardship
- 0: No suffering or lament

## LDS Context
- "Fear of the Lord" usually means reverence (Peace, not Admonition)
- "Pride" in Book of Mormon context is a serious sin leading to destruction (Admonition)
- "Wo unto..." is strong prophetic warning (Admonition 7+)
- Prosperity cycle themes (BoM): prosperity → pride → destruction → humility → prosperity
- D&C sections often blend instruction (Peace) with warning (Admonition)

## Calibration Examples
- Psalm 23: Exaltation=3, Peace=9, Admonition=0, Contrition=1, dominant=peace
- Isaiah 1: Exaltation=1, Peace=2, Admonition=9, Contrition=2, dominant=admonition
- Lamentations 1: Exaltation=0, Peace=1, Admonition=2, Contrition=9, dominant=contrition
- Psalm 150: Exaltation=10, Peace=2, Admonition=0, Contrition=0, dominant=exaltation
- Genesis 1: Exaltation=7, Peace=5, Admonition=0, Contrition=0, dominant=exaltation

## Output Format
Return ONLY a JSON array. No markdown, no explanation. Each element:
{"book":"Book Name","chapter":N,"exaltation":N,"peace":N,"admonition":N,"contrition":N,"dominant":"category_id","rationale":"1 sentence"}

dominant must be one of: exaltation, peace, admonition, contrition
All scores are integers 0-10.`;

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Set ANTHROPIC_API_KEY environment variable");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  // Load database
  const dbPath = path.join(process.cwd(), "data", "scriptures.db");
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(dbPath));

  // Get all volumes
  const volumes = db.exec(
    "SELECT id, name, abbrev FROM volumes ORDER BY display_order"
  )[0].values as [number, string, string][];

  // Get all books
  const books = db.exec(
    "SELECT id, name, volume_id, chapter_count, display_order FROM books ORDER BY display_order"
  )[0].values as [number, string, number, number, number][];

  // Build chapter list
  interface ChapterInfo {
    volumeId: number;
    volumeName: string;
    volumeAbbrev: string;
    bookId: number;
    bookName: string;
    chapter: number;
    text: string;
  }

  const chapters: ChapterInfo[] = [];

  for (const [volId, volName, volAbbrev] of volumes) {
    const volBooks = books.filter(([, , vid]) => vid === volId);
    for (const [bookId, bookName, , chapterCount] of volBooks) {
      for (let ch = 1; ch <= chapterCount; ch++) {
        const result = db.exec(
          "SELECT text FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse",
          [bookId, ch]
        );
        if (result.length > 0) {
          const text = result[0].values.map(([t]) => t as string).join(" ");
          chapters.push({
            volumeId: volId,
            volumeName: volName === "Doctrine and Covenants" ? "D&C" : volName,
            volumeAbbrev: volAbbrev,
            bookId,
            bookName: bookName === "Doctrine and Covenants" ? "D&C" : bookName,
            chapter: ch,
            text,
          });
        }
      }
    }
  }

  console.log(`Total chapters to score: ${chapters.length}`);

  // Check for existing progress
  const outputPath = path.join(process.cwd(), "data", "chapter-sentiments.json");
  let results: ChapterScore[] = [];
  let startIdx = 0;

  if (fs.existsSync(outputPath)) {
    const existing = JSON.parse(fs.readFileSync(outputPath, "utf-8")) as ChapterScore[];
    // Only keep entries that have real scores (not error placeholders)
    results = existing.filter((e) => e.exaltation > 0 || e.peace > 0 || e.admonition > 0 || e.contrition > 0);
    // Find where to resume by matching book+chapter
    const scoredKeys = new Set(results.map((r) => `${r.bookId}:${r.chapter}`));
    startIdx = 0;
    for (let i = 0; i < chapters.length; i++) {
      if (!scoredKeys.has(`${chapters[i].bookId}:${chapters[i].chapter}`)) {
        startIdx = i;
        break;
      }
      if (i === chapters.length - 1) startIdx = chapters.length;
    }
    console.log(`Resuming from chapter ${startIdx} (${results.length} valid scores found)`);
  }

  // Process in batches
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const totalBatches = Math.ceil((chapters.length - startIdx) / BATCH_SIZE);

  for (let i = startIdx; i < chapters.length; i += BATCH_SIZE) {
    const batch = chapters.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor((i - startIdx) / BATCH_SIZE) + 1;

    // Build user message with chapter texts
    const userMsg = batch.map((ch, idx) => {
      // Truncate very long chapters to ~3000 words to control costs
      const words = ch.text.split(/\s+/);
      const truncated = words.length > 3000 ? words.slice(0, 3000).join(" ") + "..." : ch.text;
      return `--- CHAPTER ${idx + 1} ---\nBook: ${ch.bookName}\nChapter: ${ch.chapter}\nVolume: ${ch.volumeName}\n\n${truncated}`;
    }).join("\n\n");

    let attempt = 0;
    let success = false;

    while (attempt < MAX_RETRIES && !success) {
      attempt++;
      try {
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: 1024,
          temperature: 0,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: `Score these ${batch.length} chapters:\n\n${userMsg}` }],
        });

        totalInputTokens += response.usage.input_tokens;
        totalOutputTokens += response.usage.output_tokens;

        // Parse response
        const content = response.content[0];
        if (content.type !== "text") throw new Error("Non-text response");

        // Extract JSON array from response
        let jsonStr = content.text.trim();
        // Handle if wrapped in markdown code block
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }

        const scored = JSON.parse(jsonStr) as {
          book: string;
          chapter: number;
          exaltation: number;
          peace: number;
          admonition: number;
          contrition: number;
          dominant: string;
          rationale: string;
        }[];

        // Map back to our format
        for (let j = 0; j < batch.length; j++) {
          const ch = batch[j];
          const s = scored[j];
          if (!s) {
            console.warn(`Missing score for ${ch.bookName} ${ch.chapter}, using defaults`);
            results.push({
              volumeAbbrev: ch.volumeAbbrev,
              volumeName: ch.volumeName,
              bookName: ch.bookName,
              bookId: ch.bookId,
              chapter: ch.chapter,
              exaltation: 0, peace: 0, admonition: 0, contrition: 0,
              dominant: "peace",
              rationale: "Score missing",
            });
            continue;
          }

          results.push({
            volumeAbbrev: ch.volumeAbbrev,
            volumeName: ch.volumeName,
            bookName: ch.bookName,
            bookId: ch.bookId,
            chapter: ch.chapter,
            exaltation: Math.min(10, Math.max(0, Math.round(s.exaltation))),
            peace: Math.min(10, Math.max(0, Math.round(s.peace))),
            admonition: Math.min(10, Math.max(0, Math.round(s.admonition))),
            contrition: Math.min(10, Math.max(0, Math.round(s.contrition))),
            dominant: s.dominant,
            rationale: s.rationale || "",
          });
        }

        success = true;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`Batch ${batchNum} attempt ${attempt} failed: ${errMsg}`);
        if (attempt >= MAX_RETRIES) {
          // Skip this batch — will be retried on next run
          console.error(`❌ SKIPPED batch (chapters ${batch[0].bookName} ${batch[0].chapter} - ${batch[batch.length-1].bookName} ${batch[batch.length-1].chapter}) after ${MAX_RETRIES} failures`);
          // Don't add placeholder entries — leave gaps to retry
          break;
        }
        // Wait before retry (longer for overloaded errors)
        const delay = errMsg.includes("overloaded") ? 10000 * attempt : 3000 * attempt;
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    // Save progress after each batch
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

    // Cost estimate
    const inputCost = (totalInputTokens / 1_000_000) * 3;
    const outputCost = (totalOutputTokens / 1_000_000) * 15;
    const totalCost = inputCost + outputCost;

    console.log(
      `Batch ${batchNum}/${totalBatches} | ` +
      `${results.length}/${chapters.length} chapters | ` +
      `Tokens: ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out | ` +
      `Cost: $${totalCost.toFixed(2)}`
    );

    // Safety: stop if we're approaching $10
    if (totalCost > 9.5) {
      console.warn("⚠️ Approaching $10 budget limit. Stopping.");
      break;
    }

    // Rate limit: 50ms between batches
    await new Promise((r) => setTimeout(r, 50));
  }

  console.log(`\n✅ Done! ${results.length} chapters scored.`);
  console.log(`Total tokens: ${totalInputTokens.toLocaleString()} input, ${totalOutputTokens.toLocaleString()} output`);
  const finalCost = (totalInputTokens / 1_000_000) * 3 + (totalOutputTokens / 1_000_000) * 15;
  console.log(`Estimated cost: $${finalCost.toFixed(2)}`);
  console.log(`Output: ${outputPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
