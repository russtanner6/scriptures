#!/usr/bin/env node
/**
 * Merge an OT book's Gemini output into existing data files.
 * Usage: node scripts/merge-ot-book.js scripts/ot-bookname.json
 */
const fs = require('fs');
const path = require('path');

const batchFile = process.argv[2];
if (!batchFile) { console.error('Usage: node merge-ot-book.js <batch-file.json>'); process.exit(1); }

const batch = JSON.parse(fs.readFileSync(batchFile, 'utf8'));
const dataDir = path.join(__dirname, '..', 'data');

const VOLUME_ABBREV = 'OT';
const VOLUME_NAME = 'Old Testament';

function enrichSentiment(entry, bookId) {
  return { volumeAbbrev: VOLUME_ABBREV, volumeName: VOLUME_NAME, bookName: entry.book, bookId, ...entry };
}

function enrichEntry(entry, bookId) {
  return { ...entry, volumeAbbrev: VOLUME_ABBREV, volumeName: VOLUME_NAME, bookId };
}

const fileMap = {
  sentiment: 'chapter-sentiments.json',
  speakers: 'speakers.json',
  summaries: 'chapter-summaries.json',
  themes: 'chapter-themes.json',
  crossReferences: 'cross-references.json',
  doctrinalTopics: 'doctrinal-topics.json',
  historicalContext: 'historical-context.json',
  literaryGenres: 'literary-genres.json',
  notableVerses: 'notable-verses.json',
};

const bookName = batch.bookName;
const bookId = batch.bookId;
console.log(`Processing: ${bookName} (bookId: ${bookId})`);

for (const [key, filename] of Object.entries(fileMap)) {
  const filePath = path.join(dataDir, filename);
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const newEntries = (batch[key] || []).map(e => {
    if (key === 'sentiment') return enrichSentiment(e, bookId);
    return enrichEntry(e, bookId);
  });

  // Remove any existing entries for this book (idempotent)
  const chapters = new Set(newEntries.map(e => e.chapter));
  const filtered = existing.filter(e => {
    if (key === 'sentiment') return !(e.bookName === bookName && chapters.has(e.chapter));
    return !(e.book === bookName && chapters.has(e.chapter));
  });

  const merged = [...filtered, ...newEntries];
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n');
  console.log(`  ${filename}: ${existing.length} → ${merged.length} (+${newEntries.length})`);
}

console.log(`\nDone! ${bookName} merged successfully.`);
