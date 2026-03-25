#!/usr/bin/env node
/**
 * Merge D&C batch data into existing data files.
 * Usage: node scripts/merge-dc-batch.js scripts/dc-batch-N.json
 */
const fs = require('fs');
const path = require('path');

const batchFile = process.argv[2];
if (!batchFile) { console.error('Usage: node merge-dc-batch.js <batch-file.json>'); process.exit(1); }

const batch = JSON.parse(fs.readFileSync(batchFile, 'utf8'));
const dataDir = path.join(__dirname, '..', 'data');

const VOLUME_ABBREV = 'D&C';
const VOLUME_NAME = 'Doctrine and Covenants';
const BOOK_ID = 82;
const BOOK_NAME = 'Doctrine and Covenants';

function enrich(entry) {
  return { ...entry, volumeAbbrev: VOLUME_ABBREV, volumeName: VOLUME_NAME, bookId: BOOK_ID };
}

function enrichWithBook(entry) {
  return { book: BOOK_NAME, ...entry, volumeAbbrev: VOLUME_ABBREV, volumeName: VOLUME_NAME, bookId: BOOK_ID };
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

for (const [key, filename] of Object.entries(fileMap)) {
  const filePath = path.join(dataDir, filename);
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const newEntries = (batch[key] || []).map(e => {
    if (key === 'sentiment') {
      // Sentiment has bookName instead of book
      return { volumeAbbrev: VOLUME_ABBREV, volumeName: VOLUME_NAME, bookName: BOOK_NAME, bookId: BOOK_ID, ...e };
    }
    return enrichWithBook(e);
  });

  // Remove any existing D&C entries for these chapters (idempotent)
  const chapters = new Set(newEntries.map(e => e.chapter));
  const filtered = existing.filter(e => {
    if (key === 'sentiment') return !(e.bookName === BOOK_NAME && chapters.has(e.chapter));
    return !(e.book === BOOK_NAME && chapters.has(e.chapter));
  });

  const merged = [...filtered, ...newEntries];
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n');
  console.log(`${filename}: ${existing.length} → ${merged.length} (+${newEntries.length})`);
}

console.log('\nDone! D&C batch merged successfully.');
