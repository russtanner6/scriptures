/**
 * Speaker Audit Script v4 — Final
 *
 * Checks every entry in speakers.json against actual verse text.
 * Only flags entries where a SPECIFIC KNOWN PERSON is named as speaking
 * but the entry is tagged with someone else.
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');
const SPEAKERS_PATH = path.join(PROJECT_DIR, 'data', 'speakers.json');
const DB_PATH = path.join(PROJECT_DIR, 'data', 'scriptures.db');

// Name equivalences — bidirectional
const NAME_EQ = {
  'jesus': ['jesus christ'],
  'jesus christ': ['jesus', 'the lord', 'the lord god', 'god', 'christ', 'jehovah', 'the lord god of israel'],
  'the lord': ['jesus christ', 'god', 'jehovah', 'god the father'],
  'the lord god': ['jesus christ', 'god', 'the lord', 'god the father'],
  'god': ['jesus christ', 'the lord', 'god the father', 'the lord god'],
  'god the father': ['god', 'the lord', 'the lord god', 'jesus christ'],
  'jehovah': ['jesus christ', 'the lord', 'god'],
  'simon peter': ['peter'],
  'peter': ['simon peter', 'simon'],
  'simon': ['peter', 'simon peter'],
  'abram': ['abraham'],
  'abraham': ['abram'],
  'sarai': ['sarah'],
  'sarah': ['sarai'],
  'satan': ['the devil', 'lucifer', 'the serpent', 'the adversary'],
  'alma': ['alma the younger'],
  'alma the younger': ['alma'],
  'king benjamin': ['benjamin'],
  'captain moroni': ['moroni'],
  'moroni': ['captain moroni'],
  'samuel the lamanite': ['samuel'],
  'pilate': ['pontius pilate'],
  'pontius pilate': ['pilate'],
  'herod antipas': ['herod'],
  'herod the great': ['herod'],
  'herod': ['herod the great', 'herod antipas'],
  'nathanael': ['bartholomew'],
  'bartholomew': ['nathanael'],
  'brother of jared': ['the brother of jared'],
  'the brother of jared': ['brother of jared'],
  'elias': ['elijah'],
  'esaias': ['isaiah'],
  'holy ghost': ['the spirit', 'spirit', 'the holy ghost', 'the holy spirit'],
  'spirit': ['holy ghost'],
  'the spirit': ['holy ghost'],
  'the holy ghost': ['holy ghost'],
  // Prophet books — the prophet delivers God's words, both tags can be correct
  'isaiah': ['jesus christ'],
  'jeremiah': ['jesus christ'],
  'ezekiel': ['jesus christ'],
  'hosea': ['jesus christ'],
  'joel': ['jesus christ'],
  'amos': ['jesus christ'],
  'obadiah': ['jesus christ'],
  'micah': ['jesus christ'],
  'nahum': ['jesus christ'],
  'habakkuk': ['jesus christ'],
  'zephaniah': ['jesus christ'],
  'haggai': ['jesus christ'],
  'zechariah': ['jesus christ'],
  'malachi': ['jesus christ'],
  'moses': ['jesus christ'], // Moses often relays God's commands
  'samuel': ['jesus christ'], // Samuel relays God's word
  'nathan': ['jesus christ'],
  'elijah': ['jesus christ'],
  'elisha': ['jesus christ'],
  'abinadi': ['jesus christ'], // Prophets deliver God's words
};

function namesMatch(found, expected) {
  const f = found.toLowerCase().trim();
  const e = expected.toLowerCase().trim();
  if (f === e) return true;
  if (f === e.split(' ')[0].toLowerCase()) return true;
  if (e.split(' ')[0].toLowerCase() === f) return true;
  // Last word match
  const fWords = f.split(' ');
  const eWords = e.split(' ');
  if (fWords.length > 1 && eWords.length > 1 && fWords[fWords.length - 1] === eWords[eWords.length - 1]) return true;
  // Equivalences
  const eqF = NAME_EQ[f] || [];
  if (eqF.includes(e)) return true;
  const eqE = NAME_EQ[e] || [];
  if (eqE.includes(f)) return true;
  // Prophet delivering God's words — if tagged speaker is a prophet and found speaker is "the LORD"/"God"
  if (/^(?:the lord(?:\s+god)?|god|jehovah)$/i.test(f) && (NAME_EQ[e] || []).includes('jesus christ')) {
    return true; // Prophet tagged but God actually speaking — prophets deliver God's words
  }
  return false;
}

// Known biblical/scriptural proper names (for filtering)
const KNOWN_NAMES = new Set();
function buildKnownNames(speakers) {
  speakers.forEach(e => KNOWN_NAMES.add(e.speaker));
  // Add common variants
  ['Abram', 'Sarai', 'Balak', 'Balaam', 'Bathsheba', 'Boaz', 'Caleb', 'Caiaphas',
   'Cornelius', 'Cyrus', 'Darius', 'Delilah', 'Eli', 'Esther', 'Felix', 'Festus',
   'Gamaliel', 'Gehazi', 'Goliath', 'Hagar', 'Haman', 'Herod', 'Hiram', 'Hushai',
   'Ishmael', 'Jairus', 'Jethro', 'Jezebel', 'Judas', 'Martha', 'Mephibosheth',
   'Micaiah', 'Michal', 'Miriam', 'Mordecai', 'Naaman', 'Nabal', 'Naboth',
   'Naomi', 'Nicodemus', 'Potiphar', 'Rahab', 'Rebekah', 'Ruth', 'Sapphira',
   'Shimei', 'Simon', 'Stephen', 'Thomas', 'Uriah', 'Zacchaeus', 'Zipporah',
   'Ahimaaz', 'Achish', 'Amnon', 'Abner', 'Hazael', 'Ziba', 'Jehonadab',
   'Cushi', 'Bethuel', 'Leah', 'Rachel', 'Esau', 'Isaac', 'Ornan', 'Jehoiada',
   'Pilate', 'Nathanael', 'Aaron', 'Jethro', 'Pharaoh', 'Joshua', 'Samson',
   'Haman', 'Elisha', 'Elijah', 'Zebul', 'Balak', 'Barak'].forEach(n => KNOWN_NAMES.add(n));
}

function isKnownName(name) {
  if (KNOWN_NAMES.has(name)) return true;
  // Check case-insensitive
  const lower = name.toLowerCase();
  for (const known of KNOWN_NAMES) {
    if (known.toLowerCase() === lower) return true;
  }
  return false;
}

// Words that are NOT person names
const NOT_NAMES = new Set([
  'then', 'thus', 'and', 'but', 'so', 'for', 'now', 'therefore', 'wherefore',
  'again', 'also', 'yet', 'still', 'well', 'what', 'who', 'whom', 'which',
  'where', 'when', 'how', 'why', 'this', 'that', 'these', 'those', 'here',
  'there', 'whosoever', 'he', 'she', 'they', 'it', 'we', 'i', 'ye', 'thou',
  'master', 'king', 'queen', 'sir', 'lord',
  // Gentilics/nationalities
  'egypt', 'syria', 'moab', 'edom', 'tyre', 'succoth', 'ephraim',
  'temanite', 'moabitess', 'ammonite', 'philistine', 'gibeonites',
  'buzite', 'tekoah', 'kareah', 'ahikam',
]);

function extractSpeakerFromText(text) {
  // Pattern 1: Multi-word names first
  const compoundPats = [
    { re: /(?:the\s+)?brother\s+of\s+Jared\s+(?:said|saith|spake|spoke|answered|cried|called|asked|prayed)/i, name: 'Brother of Jared' },
    { re: /(?:the\s+)?LORD\s+God\s+(?:said|saith|spake|spoke|answered|called|commanded)/i, name: 'the LORD God' },
    { re: /(?:the\s+)?LORD\s+(?:said|saith|spake|spoke|answered|called|commanded)/i, name: 'the LORD' },
    { re: /(?:the\s+)?Lord\s+(?:said|saith|spake|spoke|answered|called|commanded)/i, name: 'the Lord' },
    { re: /the\s+angel\s+of\s+the\s+Lord\s+(?:said|saith|spake|spoke|called)/i, name: 'the angel of the Lord' },
    { re: /(?:the\s+|an\s+)?angel\s+(?:said|saith|spake|spoke|called|answered)/i, name: 'the angel' },
    { re: /(?:the\s+)?(?:Spirit|Holy\s+Ghost|Holy\s+Spirit)\s+(?:said|saith|spake|spoke|cried)/i, name: 'the Spirit' },
    { re: /Simon\s+Peter\s+(?:said|saith|spake|spoke|answered)/i, name: 'Simon Peter' },
    { re: /Pontius\s+Pilate\s+(?:said|saith|spake|spoke|answered)/i, name: 'Pontius Pilate' },
    { re: /John\s+the\s+Baptist\s+(?:said|saith|spake|spoke|answered)/i, name: 'John the Baptist' },
    { re: /Judas\s+Iscariot\s+(?:said|saith|spake|spoke|answered)/i, name: 'Judas Iscariot' },
    { re: /Judas\s+Maccabeus\s+(?:said|saith|spake|spoke|answered)/i, name: 'Judas Maccabeus' },
    { re: /King\s+([A-Z][a-z]+)\s+(?:said|saith|spake|spoke|answered|cried|commanded)/i, name: null }, // dynamic
  ];

  for (const cp of compoundPats) {
    if (cp.re.test(text)) {
      if (cp.name) return cp.name;
      const m = text.match(cp.re);
      if (m && m[1]) return 'King ' + m[1];
    }
  }

  // Pattern 2: "NAME said/saith/spake/answered" — single proper noun
  // Must start with uppercase letter
  const pat = /\b([A-Z][a-z]{2,})\s+(?:said|saith|spake|spoke|answered|replied|cried|asked|called|commanded|prayed|warned|besought|told|exclaimed|inquired|entreated|charged|continued|exhorted|prophesied|testified|declared|rebuked)\b/;
  const m = text.match(pat);
  if (m) {
    const name = m[1];
    if (!NOT_NAMES.has(name.toLowerCase())) {
      return name;
    }
  }

  // Pattern 3: "Jesus answering said" / "Jesus saith"
  const jp = text.match(/\b(Jesus(?:\s+Christ)?)\s+(?:answering\s+)?(?:said|saith|spake)\b/i);
  if (jp) return jp[1];

  return null;
}

function extractRecipient(text) {
  const m = text.match(/\b(?:said|saith|spake|spoke|answered)\s+unto\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?)\b/);
  if (m) {
    const name = m[1];
    if (!NOT_NAMES.has(name.toLowerCase())) return name;
  }
  return null;
}

async function main() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buf);

  const speakers = JSON.parse(fs.readFileSync(SPEAKERS_PATH, 'utf8'));
  console.log(`Loaded ${speakers.length} speaker entries`);
  buildKnownNames(speakers);

  const flags = [];
  let checked = 0, skipped = 0;

  for (let idx = 0; idx < speakers.length; idx++) {
    const entry = speakers[idx];
    const { book, chapter, speaker, bookId, verseStart, verseEnd, volumeAbbrev } = entry;
    const effectiveEnd = verseEnd || verseStart;

    // Skip books where speaker attribution is inherently correct
    if (volumeAbbrev === 'D&C') { skipped++; continue; }
    if (['Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Lamentations'].includes(book)) { skipped++; continue; }

    // Fetch start verse
    const result = db.exec(
      `SELECT verse, text FROM verses WHERE book_id = ? AND chapter = ? AND verse = ?`,
      [bookId, chapter, verseStart]
    );

    if (!result || !result[0] || !result[0].values || result[0].values.length === 0) {
      flags.push({ idx, entry, reason: 'VERSE_NOT_FOUND', detail: `bookId=${bookId}, ch=${chapter}, v=${verseStart}`, severity: 'error' });
      continue;
    }

    const verseText = result[0].values[0][1];

    // Extract who the verse says is speaking
    const foundSpeaker = extractSpeakerFromText(verseText);
    if (!foundSpeaker) { checked++; continue; }

    // Does found speaker match tagged speaker?
    if (namesMatch(foundSpeaker, speaker)) { checked++; continue; }

    // Additional: "the LORD" / "God" / "the angel" / "the Spirit" matches
    if (/^(?:the\s+LORD(?:\s+God)?|the\s+Lord(?:\s+God)?|God)$/i.test(foundSpeaker)) {
      if (speaker === 'Jesus Christ' || speaker === 'God the Father') { checked++; continue; }
      // Also OK if the tagged speaker is a prophet delivering God's words
      if (['prophet', 'divine'].includes(entry.speakerType)) { checked++; continue; }
    }
    if (/^(?:the\s+angel(?:\s+of\s+the\s+Lord)?|an\s+angel)$/i.test(foundSpeaker)) {
      if (['Gabriel', 'Angel Raphael', 'Holy Ghost'].includes(speaker)) { checked++; continue; }
    }
    if (/^(?:the\s+Spirit|the\s+Holy\s+Ghost|the\s+Holy\s+Spirit)$/i.test(foundSpeaker)) {
      if (['Holy Ghost', 'Jesus Christ'].includes(speaker)) { checked++; continue; }
    }

    // Filter: only flag if the found speaker is a known name
    if (!isKnownName(foundSpeaker) && !/^(?:the\s+LORD|God|the\s+angel|the\s+Spirit)/i.test(foundSpeaker)) {
      checked++;
      continue;
    }

    // Check if tagged speaker is actually the recipient
    const recipient = extractRecipient(verseText);
    if (recipient && namesMatch(recipient, speaker) && !namesMatch(foundSpeaker, speaker)) {
      flags.push({
        idx, entry,
        reason: 'SPEAKER_IS_RECIPIENT',
        detail: `"${foundSpeaker} said unto ${recipient}" — "${speaker}" is the recipient`,
        verseText,
        suggestedSpeaker: foundSpeaker,
        severity: 'error'
      });
    } else {
      flags.push({
        idx, entry,
        reason: 'DIFFERENT_SPEAKER',
        detail: `Verse says "${foundSpeaker}" is speaking, tagged as "${speaker}"`,
        verseText,
        suggestedSpeaker: foundSpeaker,
        severity: 'error'
      });
    }

    checked++;
  }

  console.log(`\nChecked ${checked} entries (skipped ${skipped})`);
  console.log(`Flagged ${flags.length} potential issues\n`);

  const byReason = {};
  flags.forEach(f => { byReason[f.reason] = (byReason[f.reason] || 0) + 1; });
  console.log('By reason:', byReason);

  // Breakdown by suggestedSpeaker
  const sugMap = {};
  flags.filter(f => f.suggestedSpeaker).forEach(f => { sugMap[f.suggestedSpeaker] = (sugMap[f.suggestedSpeaker]||0) + 1; });
  console.log('\nSuggested speakers:');
  Object.entries(sugMap).sort((a,b) => b[1] - a[1]).forEach(([s,c]) => console.log(`  ${c} ${s}`));

  console.log('\n=== ALL FLAGGED ENTRIES ===\n');
  for (const flag of flags) {
    const e = flag.entry;
    console.log(`#${flag.idx} | ${e.book} ${e.chapter}:${e.verseStart}${e.verseEnd && e.verseEnd !== e.verseStart ? '-' + e.verseEnd : ''} | Tagged: "${e.speaker}" | Found: "${flag.suggestedSpeaker || 'N/A'}" | ${flag.reason}`);
    console.log(`  ${flag.detail}`);
    if (flag.verseText) {
      console.log(`  ${flag.verseText.substring(0, 300)}`);
    }
    console.log('');
  }

  const flagsPath = path.join(PROJECT_DIR, 'data', 'speaker-audit-flags.json');
  fs.writeFileSync(flagsPath, JSON.stringify(flags, null, 2));
  console.log(`Flags written to ${flagsPath}`);

  db.close();
}

main().catch(console.error);
