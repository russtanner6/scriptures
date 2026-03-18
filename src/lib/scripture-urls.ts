// Maps book names to churchofjesuschrist.org URL slugs
// URL format: https://www.churchofjesuschrist.org/study/scriptures/{volume}/{slug}/{chapter}?lang=eng#p{verse}

const BOOK_URL_MAP: Record<string, { volume: string; slug: string }> = {
  // Old Testament
  "Genesis": { volume: "ot", slug: "gen" },
  "Exodus": { volume: "ot", slug: "ex" },
  "Leviticus": { volume: "ot", slug: "lev" },
  "Numbers": { volume: "ot", slug: "num" },
  "Deuteronomy": { volume: "ot", slug: "deut" },
  "Joshua": { volume: "ot", slug: "josh" },
  "Judges": { volume: "ot", slug: "judg" },
  "Ruth": { volume: "ot", slug: "ruth" },
  "1 Samuel": { volume: "ot", slug: "1-sam" },
  "2 Samuel": { volume: "ot", slug: "2-sam" },
  "1 Kings": { volume: "ot", slug: "1-kgs" },
  "2 Kings": { volume: "ot", slug: "2-kgs" },
  "1 Chronicles": { volume: "ot", slug: "1-chr" },
  "2 Chronicles": { volume: "ot", slug: "2-chr" },
  "Ezra": { volume: "ot", slug: "ezra" },
  "Nehemiah": { volume: "ot", slug: "neh" },
  "Esther": { volume: "ot", slug: "esth" },
  "Job": { volume: "ot", slug: "job" },
  "Psalms": { volume: "ot", slug: "ps" },
  "Proverbs": { volume: "ot", slug: "prov" },
  "Ecclesiastes": { volume: "ot", slug: "eccl" },
  "Song of Solomon": { volume: "ot", slug: "song" },
  "Isaiah": { volume: "ot", slug: "isa" },
  "Jeremiah": { volume: "ot", slug: "jer" },
  "Lamentations": { volume: "ot", slug: "lam" },
  "Ezekiel": { volume: "ot", slug: "ezek" },
  "Daniel": { volume: "ot", slug: "dan" },
  "Hosea": { volume: "ot", slug: "hosea" },
  "Joel": { volume: "ot", slug: "joel" },
  "Amos": { volume: "ot", slug: "amos" },
  "Obadiah": { volume: "ot", slug: "obad" },
  "Jonah": { volume: "ot", slug: "jonah" },
  "Micah": { volume: "ot", slug: "micah" },
  "Nahum": { volume: "ot", slug: "nahum" },
  "Habakkuk": { volume: "ot", slug: "hab" },
  "Zephaniah": { volume: "ot", slug: "zeph" },
  "Haggai": { volume: "ot", slug: "hag" },
  "Zechariah": { volume: "ot", slug: "zech" },
  "Malachi": { volume: "ot", slug: "mal" },

  // New Testament
  "Matthew": { volume: "nt", slug: "matt" },
  "Mark": { volume: "nt", slug: "mark" },
  "Luke": { volume: "nt", slug: "luke" },
  "John": { volume: "nt", slug: "john" },
  "Acts": { volume: "nt", slug: "acts" },
  "Romans": { volume: "nt", slug: "rom" },
  "1 Corinthians": { volume: "nt", slug: "1-cor" },
  "2 Corinthians": { volume: "nt", slug: "2-cor" },
  "Galatians": { volume: "nt", slug: "gal" },
  "Ephesians": { volume: "nt", slug: "eph" },
  "Philippians": { volume: "nt", slug: "philip" },
  "Colossians": { volume: "nt", slug: "col" },
  "1 Thessalonians": { volume: "nt", slug: "1-thes" },
  "2 Thessalonians": { volume: "nt", slug: "2-thes" },
  "1 Timothy": { volume: "nt", slug: "1-tim" },
  "2 Timothy": { volume: "nt", slug: "2-tim" },
  "Titus": { volume: "nt", slug: "titus" },
  "Philemon": { volume: "nt", slug: "philem" },
  "Hebrews": { volume: "nt", slug: "heb" },
  "James": { volume: "nt", slug: "james" },
  "1 Peter": { volume: "nt", slug: "1-pet" },
  "2 Peter": { volume: "nt", slug: "2-pet" },
  "1 John": { volume: "nt", slug: "1-jn" },
  "2 John": { volume: "nt", slug: "2-jn" },
  "3 John": { volume: "nt", slug: "3-jn" },
  "Jude": { volume: "nt", slug: "jude" },
  "Revelation": { volume: "nt", slug: "rev" },

  // Book of Mormon
  "1 Nephi": { volume: "bofm", slug: "1-ne" },
  "2 Nephi": { volume: "bofm", slug: "2-ne" },
  "Jacob": { volume: "bofm", slug: "jacob" },
  "Enos": { volume: "bofm", slug: "enos" },
  "Jarom": { volume: "bofm", slug: "jarom" },
  "Omni": { volume: "bofm", slug: "omni" },
  "Words of Mormon": { volume: "bofm", slug: "w-of-m" },
  "Mosiah": { volume: "bofm", slug: "mosiah" },
  "Alma": { volume: "bofm", slug: "alma" },
  "Helaman": { volume: "bofm", slug: "hel" },
  "3 Nephi": { volume: "bofm", slug: "3-ne" },
  "4 Nephi": { volume: "bofm", slug: "4-ne" },
  "Mormon": { volume: "bofm", slug: "morm" },
  "Ether": { volume: "bofm", slug: "ether" },
  "Moroni": { volume: "bofm", slug: "moro" },

  // D&C
  "D&C": { volume: "dc-testament", slug: "dc" },
  "Doctrine and Covenants": { volume: "dc-testament", slug: "dc" },

  // Pearl of Great Price
  "Moses": { volume: "pgp", slug: "moses" },
  "Abraham": { volume: "pgp", slug: "abr" },
  "Joseph Smith\u2014Matthew": { volume: "pgp", slug: "js-m" },
  "Joseph Smith\u2014History": { volume: "pgp", slug: "js-h" },
  "Articles of Faith": { volume: "pgp", slug: "a-of-f" },
};

export function getVerseUrl(
  bookName: string,
  chapter: number,
  verse: number
): string | null {
  const entry = BOOK_URL_MAP[bookName];
  if (!entry) return null;

  // For single-chapter books (chapter 0 in our DB), use chapter 1 in the URL
  const chapterNum = chapter === 0 ? 1 : chapter;

  return `https://www.churchofjesuschrist.org/study/scriptures/${entry.volume}/${entry.slug}/${chapterNum}?lang=eng#p${verse}`;
}
