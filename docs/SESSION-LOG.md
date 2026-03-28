# Scripture Explorer — Session Log

## 2026-03-27 — Session 26: Home Page Redesign, Reader Polish, Darker Backgrounds

### What was done

**Home page complete redesign (5 iterations):**
- Replaced old layout (hero + tool cards + random verse + recent searches) with new design
- New layout: ParticleHero (animated canvas) → gradient title "LDS SCRIPTURE EXPLORER" → colored counter stats (verses/chapters/books/people/locations) → 2-column section (VolumeRow bars left, featured person + context nugget right) → primary tool cards → secondary tool cards → stats with GaugeDial canvas gauges
- New components created: ParticleHero.tsx (canvas particle animation), GaugeDial.tsx (canvas half-arc gauge), VolumeRow.tsx (horizontal volume bars), SectionDivider.tsx
- Removed: RingChart SVG component, RandomVerse section, separate mobile/desktop layout branches
- Added useScrollReveal hook (IntersectionObserver-based scroll-triggered fade-in animations)
- Fixed double footer bug (Footer removed from page.tsx, layout.tsx handles it globally)

**Background color overhaul:**
- Added `.page-darker` CSS class (#141414) for home + all tool pages
- Applied `.page-darker` to ALL tool page layouts: search, narrative-arc, heatmap, wordcloud, sentiment, chiasmus, topics, settings, bookmarks, word-explorer, people, locations
- Scripture reader stays at #212121 (lighter than tool pages)

**Scripture Reader changes:**
- Removed ambilight/bias lighting effect (user decided against it after CORS issues)
- Insights panel: split into sticky collapsed bar + non-sticky expanded content (pushes verses down in normal flow instead of overlapping)
- Insights panel: opaque backgrounds (#292929), rounded bottom corners on collapsed bar
- Progress bar: simplified to 2px solid #3B82F6 (was gradient)
- Text size icon: replaced "A" label with text-size.svg icon
- Loading state: new LoadingBar component with animated progress bar
- Original/Modern/Mommy Mode: segmented toggle with sliding indicator (replaces old simple toggle)
- Verse number squares: 3% transparent white background, softer text color (55% opacity)

**CSS/global changes:**
- Added scroll-reveal, skeleton-shimmer CSS animation utilities to globals.css
- globals.css cleanup

### Bugs fixed
- Double footer on home page (Footer was in both page.tsx and layout.tsx)
- Insights panel overlapping verses (split into sticky bar + non-sticky content)
- Ambilight CORS issue with canvas image sampling (feature removed entirely)

### Current state
- Home page redesign complete and deployed
- All tool pages using darker #141414 background
- Scripture reader using #212121 with polished insights panel
- Mommy Mode toggle visible but content not yet generated

### Remaining work
1. THE LORD → Jesus Christ speaker matching in insights (Genesis 2 issue)
2. Insights bar sticky to top when scrolling
3. Famous Stories tool (curated scripture stories by volume)
4. Midjourney prompts for all book images
5. Home page further refinement based on user feedback
6. Command palette (Cmd+K) — decision pending on approach
7. Horizontal bar charts for Word Explorer
8. Mood Match feature

---

## 2026-03-26 — Session 25: Visual Polish, Animations, Dark Theme Lock

### What was done

**Visual polish (Scripture Reader):**
- Background color updated: #0f0f12 → #32323d → #2f2f3a → #29292b (user-tuned)
- Dark theme locked: light mode toggle hidden (always dark, code preserved)
- Removed header bottom border on all scripture pages (kept on tool pages)
- Crosshatch pattern behind book image on desktop (full-viewport-width, subtle 45° lines)
- Subtle centered top shadow (vignette) on book landscape image
- Chapter dropdown arrow: bigger (12→16px) and brighter (0.7 opacity)

**Insights panel polish:**
- Removed horizontal dividers between sections
- Section headings bigger (0.65→0.72rem) and brighter (0.55 opacity white)
- Expanded area: darker background (rgba black 0.15) + dark border
- Removed left/right borders, thicker bottom border (2px)
- Notable verses: neutral border/text instead of volume-specific color
- Smooth expand/collapse animations (expandDown 0.3s / collapseUp 0.25s)
- Panel slides down pushing verses, slides up pulling them back
- Insights bar: borderRadius 0 on button (straight corners)

**Other fixes:**
- Fixed double scrollbar on desktop (html.reader-active hides body scroll)
- Modern/Original toggle: reduced prominence (opacity 0.65, hover to full)
- Verse number squares: better centering (paddingTop 1px, fontSize 0.7rem)
- Book landscape image: fade-in animation (0.4s)
- Default image (genesis.jpg) applied to ALL books until custom images added

### Current state
- All visual changes pushed and live on Vercel
- App-like animation philosophy noted for site-wide application in future sessions
- Midjourney prompts file exists but not rewritten this session (user deferred)

### Remaining work
1. Apply app-like animations and polish site-wide (tools, nav, slide-outs)
2. Build Famous Stories tool (curated scripture stories by volume)
3. Generate Midjourney prompts for all books (Yongsung Kim style)
4. Audit speaker data for false positives (narration tagged as speech)
5. Wire pipeline data deeper into reader (cross-references, historical context)

---

## 2026-03-26 — Session 24: Speaker/Character Fixes + ChapterInsights Redesign + Reader Polish

### What was done

**Critical bug fixes:**
- Fixed crash: 38 characters with `aliases: null` (wrapped in `|| []` fallback)
- Fixed `speakerType` missing from all 3,862 entries — added type classification to every speaker record
- Fixed field name mismatch: `startVerse`/`endVerse` → `verseStart`/`verseEnd` across speaker data and components
- Fixed OT divine speaker display: now shows "The LORD" instead of "Jesus Christ" via `displaySpeakerName()` volume-aware mapping
- Fixed People page crash: 119 characters missing `roles`/`gender`/`era` fields — backfilled all

**Speaker audit:**
- 14 entries removed (duplicates, unnamed groups)
- 11 entries corrected (wrong speaker attribution)
- 3 verse ranges fixed (off-by-one errors)
- Added Satan speaker tags (Genesis 3, Isaiah 14, Moses 5)
- Final count: 3,851 entries, 313 unique named speakers

**Character merges and cleanup:**
- Merged 8 duplicate characters (Adam/Michael, Sarah/Sarai, Jacob/Israel, Abram/Abraham, etc.)
- Final count: 857 named individuals (down from 863 after merges)

**ChapterInsights redesign:**
- Redesigned panel with 5 sections: At a Glance, People, Speaker Timeline, Key Themes, Notable Verses
- Insights bar polish: darker background, full width, smooth slide-in animation

**Scripture Reader visual polish:**
- Added book landscape picture feature (4:1 ratio, edge-to-edge on mobile)
- Added verse number squares (fixed 24px, themed volume colors)

**D&C Sentiment Explorer fix:**
- Fixed to show 2 dropdowns (Volume → Section) instead of 3 — D&C has no "books"
- Fixed 62 wrong-schema sentiment entries + 136 null bookIds across pipeline data files

### Current state
- **Pipeline:** 100% complete — 1,755 chapters across all 6 volumes scored with 10 data types
- **Characters:** 857 named individuals (after 8 merges)
- **Speakers:** 3,851 entries, 313 unique named speakers (audited, speakerType added)
- **Sentiment Explorer:** Wired to LLM data for volume/book/chapter levels; keyword lexicon fallback for verse-level
- **ChapterInsights:** 5-section layout (At a Glance, People, Speaker Timeline, Key Themes, Notable Verses)
- **Reader:** Book landscape images, verse number squares, entity linking, context nuggets

### Remaining work
1. Wire chapter summaries/themes/notable verses more deeply into ScriptureReader UI
2. Wire cross-references into reader — show linked passages
3. Wire historical context into reader — show era/date/setting
4. Build Mood Match feature using complete sentiment data
5. Start Mom Mode pilot (Genesis stories)
6. Build Funny Stories tool
7. Complete Word Explorer (cascading dropdowns, old route redirects)

---

## 2026-03-26 — Session 23: Documentation Cleanup + Pipeline Verification

### What was done

**Documentation updates:**
- Updated ROADMAP.md: marked Wire Sentiment Explorer, Speaker Data QA, and People audit as DONE
- Updated speaker count from 7,631 to 3,862 (audited, groups removed)
- Updated character count from 757 to 863 across all references
- Updated LLM Chapter Sentiments from "~1,460 of 1,764" to "1,755 of 1,755 (complete)"
- Renamed "Context Eggs" to "Context Nuggets" everywhere
- Moved Chapter Summaries from Tier 4 future to completed features (1,755 entries with API route)
- Fixed character directory route from `/characters` to `/people`
- Added "Kid Mode" feature to Tier 4 (simplified narrative scripture text with pictures for children)
- Updated priority order to reflect completed items

**Session 22 recap (completed 2026-03-25):**
- Completed ALL remaining OT books (18 books generated by Claude Code when Gemini usage expired)
- Final pipeline: 39/39 OT, all volumes complete, 1,755 chapters with 10 data types each
- Books processed from Gemini: 2 Samuel, 2 Chronicles, Isaiah (2 parts), Genesis, Exodus, Leviticus, Psalms, Numbers, Deuteronomy, Daniel, Ecclesiastes, Song of Solomon, Malachi
- Books generated by Claude Code: Joshua, Judges, Ruth, Ezra, Nehemiah, Esther, Jeremiah, Lamentations, Ezekiel, Hosea, Joel, Amos, Obadiah, Jonah, Micah, Nahum, Habakkuk, Zephaniah, Haggai, Zechariah, Job, Proverbs
- Fixed critical crash: 38 characters had `aliases: null`
- Fixed 62 wrong-schema sentiment entries, 136 null bookIds across all pipeline files
- Fixed D&C Sentiment Explorer to show Volume then Sections (2 dropdowns, not 3)
- Wired Sentiment Explorer to use LLM data (`chapter-sentiments.json`)
- Added 5 new API routes: chapter-summary, chapter-themes, notable-verses, historical-context, cross-references
- Speaker audit complete: 3,862 entries, 315 unique named speakers, all groups removed

### Current state
- **Pipeline:** 100% complete — 1,755 chapters across all 6 volumes scored with 10 data types
- **Characters:** 863 named individuals
- **Speakers:** 3,862 entries, 315 unique named speakers
- **Sentiment Explorer:** Wired to LLM data for volume/book/chapter levels; keyword lexicon fallback for verse-level

### Remaining work
1. Implement `displaySpeakerName()` volume-based mapping (Jehovah for OT, Jesus Christ for NT/BoM/D&C)
2. Wire chapter summaries/themes/notable verses into ScriptureReader UI
3. Wire cross-references into reader
4. Wire historical context into reader
5. Build Mood Match feature
6. Start Kid Mode pilot (Genesis stories)

---

## 2026-03-25 — Session 22: ENTIRE PIPELINE COMPLETE — All Scriptures Scored

### What was done

**MILESTONE: Every scripture chapter in every volume now has 10 data types scored.**

**D&C 138/138 sections — ALL COMPLETE (Claude Code generated):**
- All 10 pipeline outputs for every section

**Old Testament 39/39 books — ALL COMPLETE:**
- 21 books from Gemini (cleaned/merged by Claude Code)
- 18 books generated entirely by Claude Code (when Gemini usage expired)
- Total: 929 OT chapters scored

**Final data totals across ALL volumes:**
- `chapter-sentiments.json`: 1,755 entries (every chapter in every volume)
- `speakers.json`: 3,862 entries (audited — group speakers removed, IDs→names fixed)
- `chapter-summaries.json`: 1,755 entries
- `chapter-themes.json`: 1,755 entries
- `cross-references.json`: 711 entries
- `doctrinal-topics.json`: 1,755 entries
- `historical-context.json`: 1,755 entries
- `literary-genres.json`: 1,755 entries
- `notable-verses.json`: 1,756 entries
- `characters.json`: 863 people

**Speaker audit completed:**
- 693 entries fixed (NT IDs like "jesus-christ" → "Jesus Christ")
- 51 group/unnamed speakers removed across all volumes
- 315 unique named speakers remain

**Sentiment Explorer wired to LLM data:**
- `/api/sentiment` now uses `chapter-sentiments.json` for volume/book/chapter levels
- Falls back to keyword lexicon for verse-level detail
- Returns `source: "llm"` or `source: "lexicon"` for transparency

**5 new API routes created:**
- `/api/chapter-summary` — one-sentence summary per chapter
- `/api/chapter-themes` — 3-5 themes per chapter
- `/api/notable-verses` — memorable verses with reasons
- `/api/historical-context` — era, date, setting per chapter
- `/api/cross-references` — inter-scripture connections

**Characters added this session:** Jabez, Amasai, Benaiah, Micaiah, Naboth, Hadad, Shimei, Agag, Eliab, Kish, Abishai, Abner, Nahash, Huram, Shemaiah, Jahaziel, Oded, Sennacherib, Huldah, Queen of Sheba, Gehazi, Hilkiah, Gedaliah, Jehonadab, Athaliah, Eliakim, Ish-bosheth, Mephibosheth, Amnon, Jonadab, Ahimaaz, Cushi, Shiphrah, Puah, Agur, Balaam's Donkey, Phinehas, Eleazar, Arioch, Belshazzar, Abed-nego → 863 total

**Gemini Scoring Guide rewritten** (`~/Desktop/GEMINI-SCORING-GUIDE.md`):
- Added "COMMON MISTAKES TO AVOID" table
- Explicit format enforcement for all 10 outputs

### User decisions logged this session

1. **Speaker display names:** Data files keep "Jesus Christ" internally, but UI must show "Jehovah" for OT divine speech, "Jesus Christ" for NT/BoM/D&C. Added to CLAUDE.md.

2. **Group speaker audit:** All speaker data across ALL volumes audited. Only individual named speakers remain (+ Legion exception).

3. **Mom Mode (Kid-Friendly Scriptures):** Feature idea added to roadmap (Tier 4). Simplified narrative text + illustrations for ages 4-10. Originally "Kid Mode", renamed to "Mom Mode" per user.

### Pipeline completion:
- Book of Mormon: 15/15 COMPLETE
- Pearl of Great Price: 5/5 COMPLETE
- Apocrypha: 14/14 COMPLETE
- New Testament: 27/27 COMPLETE
- D&C: 138/138 COMPLETE
- Old Testament: 39/39 COMPLETE

### PICKUP INSTRUCTIONS FOR NEXT SESSION

**The Gemini 10-Output Pipeline is COMPLETE.** Every chapter in every volume has been scored.

**Remaining work to do:**
1. **Implement `displaySpeakerName()` volume-based mapping** — show "Jehovah" for OT, "Jesus Christ" for NT/BoM/D&C
2. **Wire chapter summaries/themes/notable verses into ScriptureReader UI** — the API routes exist, need frontend integration
3. **Wire cross-references into reader** — show linked passages
4. **Wire historical context into reader** — show era/date/setting
5. **Build API routes for doctrinal-topics and literary-genres** if needed
6. **Verify sentiment explorer** works correctly with LLM data on the live site
7. **Consider building "Mood Match" feature** using the now-complete sentiment data
8. **Start Mom Mode** — pilot with Genesis stories

---

## 2026-03-25 — Session 22 (earlier): D&C Complete (Claude Code) + OT Books Begin (Gemini)

### What was done

**D&C 138/138 sections — ALL COMPLETE (Claude Code generated, no Gemini):**
- All 10 pipeline outputs for every section: sentiment, speakers, summaries, themes, cross-references, doctrinal topics, historical context, literary genres, notable verses
- Merge script created (`scripts/merge-dc-batch.js`) for batch processing
- 7 batch files: dc-batch-1.json through dc-batch-7.json

**OT books started via Gemini pipeline:**
- 1 Chronicles (29 chapters) — merged
- 1 Kings (22 chapters) — in progress
- 1 Samuel (31 chapters) — in progress
- 2 Chronicles (36 chapters) — in progress

**Characters added:** Jabez, Amasai, Benaiah, Micaiah, Naboth, Hadad, Shimei, Agag, Eliab, Kish, Abishai, Abner, Nahash, Huram, Shemaiah, Jahaziel, Oded, Sennacherib, Huldah, Queen of Sheba → 842 total

**Gemini Scoring Guide rewritten** (`~/Desktop/GEMINI-SCORING-GUIDE.md`):
- Added "COMMON MISTAKES TO AVOID" table
- Explicit format enforcement for all 10 outputs
- Fixed all issues from first Gemini attempt (wrong sentiment format, single themes, missing fields)

### User decisions logged this session

1. **Speaker display names:** Data files keep "Jesus Christ" internally, but UI must show "Jehovah" for OT divine speech, "Jesus Christ" for NT/BoM/D&C. Added to CLAUDE.md under "Speaker display names by volume" rule. The `displaySpeakerName()` function needs to implement this volume-based mapping.

2. **Group speaker audit needed:** All speaker data across ALL volumes needs an audit to remove group speakers (e.g., "Servants of Achish", "People of Israel", "Elders"). Only individual named speakers should remain. Exception: "Legion" (demonic entity, kept per user request). This audit should happen after all OT books are processed.

3. **Gemini can batch D&C sections** but struggled with format compliance. Claude Code ended up doing all 138 D&C sections directly — faster and more accurate.

### PICKUP INSTRUCTIONS FOR NEXT SESSION

**Current focus: Gemini 10-Output Pipeline for OT — nothing else until all scriptures are scored.**

**Pipeline completion:**
- Book of Mormon: 15/15 COMPLETE
- Pearl of Great Price: 5/5 COMPLETE
- Apocrypha: 14/14 COMPLETE
- New Testament: 27/27 COMPLETE
- D&C: 138/138 COMPLETE
- Old Testament: 4/39 IN PROGRESS (1 Chr, 1 Kings, 1 Samuel, 2 Chr)

**Remaining OT books (35):** Genesis, Exodus, Leviticus, Numbers, Deuteronomy, Joshua, Judges, Ruth, 2 Samuel, 2 Kings, Ezra, Nehemiah, Esther, Job, Psalms, Proverbs, Ecclesiastes, Song of Solomon, Isaiah, Jeremiah, Lamentations, Ezekiel, Daniel, Hosea, Joel, Amos, Obadiah, Jonah, Micah, Nahum, Habakkuk, Zephaniah, Haggai, Zechariah, Malachi

**After pipeline is complete:**
1. Run full speaker audit — remove all group speakers across all volumes (keep only individual named people + Legion)
2. Wire Sentiment Explorer to use chapter-sentiments.json
3. Build API routes for new data types (summaries, themes, cross-refs, etc.)
4. Build UI in ScriptureReader for summaries/themes/cross-refs/notable verses
5. Implement `displaySpeakerName()` volume-based mapping (Jehovah for OT, Jesus Christ for NT/BoM/D&C)

---

## 2026-03-25 — Session 21: Complete NT via Gemini Pipeline + D&C File Split

### What was done

**Completed ALL remaining NT books (10 books, 136 chapters):**

| Book | Chapters | Speakers | Cross-Refs | Notes |
|------|----------|----------|------------|-------|
| John | 21 | 191 | 5 | 16 unique speakers. All MISSING_CHARACTERS unnamed. |
| Jude | 1 | 3 | 3 | Jude, Michael, Enoch. Added Korah to characters.json. |
| Luke | 24 | 194 | 16 | 14 unique speakers incl. Gabriel, Zacharias, Elisabeth, Cleopas. |
| Mark | 16 | 131 | 7 | Herod Antipas, Jairus among speakers. |
| Matthew | 28 | 174 | 12 | Added Legion as character per user request. Filtered unnamed group speakers. |
| Philemon | 1 | 1 | 3 | Paul only speaker. Added Onesimus to characters.json. |
| Philippians | 4 | 4 | 2 | Paul only speaker. |
| Revelation | 22 | 19 | 10 | John the Apostle, Jesus Christ, God the Father. |
| Romans | 16 | 18 | 7 | Paul + Tertius (16:22). Added Sosipater to characters.json. |
| Titus | 3 | 3 | 3 | Paul only speaker. |

**Characters added:** Korah (OT rebel), Legion (demonic entity per user), Onesimus (Philemon's slave), Sosipater (Paul's kinsman) → 822 total

**Data file totals after this session:**
- `chapter-sentiments.json`: 688 entries (BoM 239, PoGP 16, Apoc 173, NT 260)
- `speakers.json`: 1,374 entries
- `chapter-summaries.json`: 688 entries
- `chapter-themes.json`: 688 entries
- `cross-references.json`: 325 entries
- `doctrinal-topics.json`: 688 entries
- `historical-context.json`: 688 entries
- `literary-genres.json`: 688 entries
- `notable-verses.json`: 688 entries
- `characters.json`: 822 people

**Pipeline completion:**
- Book of Mormon: 15/15 COMPLETE
- Pearl of Great Price: 5/5 COMPLETE
- Apocrypha: 14/14 COMPLETE
- New Testament: 27/27 COMPLETE (260 chapters)
- Old Testament: 0/39 NOT STARTED
- D&C: 0/138 NOT STARTED

**D&C file split:** Split `Doctrine and Covenants.txt` into 138 individual `Section N.txt` files in `/Users/rmt-mac-studio/Desktop/Scripture-Books/D&C/`. Each file contains only verses (no chapter/section headers).

### Commits
- Add John (21ch) + Jude (1ch) — all Gemini outputs, add Korah to characters
- Add Luke (24ch) + Mark (16ch) — all Gemini outputs
- Add Matthew (28ch) + Philemon (1ch) + Philippians (4ch) — all Gemini outputs
- Add Revelation (22ch) + Romans (16ch) + Titus (3ch) — all Gemini outputs, add Sosipater

### PICKUP INSTRUCTIONS FOR NEXT SESSION

**Current focus: Gemini 10-Output Pipeline — nothing else until all scriptures are scored.**

**Volumes remaining:**
1. **OT (39 books, ~929 chapters):** Genesis, Exodus, Leviticus, Numbers, Deuteronomy, Joshua, Judges, Ruth, 1 Samuel, 2 Samuel, 1 Kings, 2 Kings, 1 Chronicles, 2 Chronicles, Ezra, Nehemiah, Esther, Job, Psalms, Proverbs, Ecclesiastes, Song of Solomon, Isaiah, Jeremiah, Lamentations, Ezekiel, Daniel, Hosea, Joel, Amos, Obadiah, Jonah, Micah, Nahum, Habakkuk, Zephaniah, Haggai, Zechariah, Malachi
2. **D&C (138 sections):** Individual section files already split at `/Users/rmt-mac-studio/Desktop/Scripture-Books/D&C/Section N.txt`

**Pipeline process:**
1. User feeds book text to Gemini → Gemini returns 10 JSON arrays
2. User pastes to Claude Code → Claude Code enriches and appends to data files
3. After EVERY book: completeness audit, speaker validation, git commit+push
4. Only named individual speakers — no groups, no unnamed people
5. Characters flagged as MISSING must be genuinely named individuals not already in DB

**After pipeline is complete:** Wire Sentiment Explorer to use chapter-sentiments.json, build API routes for new data types, build UI in ScriptureReader for summaries/themes/cross-refs/notable verses.

---

## 2026-03-25 — Session 20: Gemini 10-Output Pipeline — Fresh Start

### What was done

**Gemini Scoring Guide Rewrite:**
- Expanded from sentiment-only to **10 analysis outputs per book**: Sentiment, Speakers, Missing Characters, Summaries, Themes, Cross-References, Doctrinal Topics, Historical Context, Literary Genres, Notable Verses
- Rewrote guide with **strict completeness requirements** — every chapter MUST have an entry in 7 of 10 outputs (no cherry-picking "important" chapters)
- Added validation checklist: "Count your entries before submitting"
- Added per-book prompt template with explicit chapter count
- Added "no group speakers" rule — speakers must be individual named people only
- Guide location: `~/Desktop/GEMINI-SCORING-GUIDE.md`

**Clean Data Reset:**
- Wiped ALL old data and started fresh (old Claude API sentiment scores + old Bible speaker data discarded)
- Created 7 new data files: `chapter-summaries.json`, `chapter-themes.json`, `cross-references.json`, `doctrinal-topics.json`, `historical-context.json`, `literary-genres.json`, `notable-verses.json`
- Old speaker backups preserved in `data/backups/`

**Books Completed (via Gemini → Claude Code pipeline):**

| Book | Volume | Chapters | All 10 outputs | Notes |
|------|--------|----------|----------------|-------|
| 1 Nephi | BoM | 22 | Yes | All "missing" characters were already in DB |
| 2 Nephi | BoM | 33 | Yes | Skipped Seraphim (group). Elohim mapped to "God the Father". Added 5 missing OT characters (Amoz, Remaliah, Jotham king of Judah, Jeberechiah, Tabeal). |
| 3 Nephi | BoM | 30 | Yes | Jacob (secret comb leader) already in DB. God the Father correctly tagged for 11:3,7. |
| 4 Nephi | BoM | 1 | Yes | No speakers (all narration). Amos (son of Nephi) already in DB. |
| Omni | BoM | 1 | Yes | 5 speakers (5 authors). Sentiment: contrition=8 highest but peace chosen as dominant (concluding tone). |
| Enos | BoM | 1 | Yes | Contrition=10 dominant (prayer wrestle). 4 direct responses from Jesus Christ. |
| Words of Mormon | BoM | 1 | Yes | Mormon narrating. Key cross-ref: D&C 10 (116 lost pages). |
| Jacob | BoM | 7 | Yes | Zenos allegory (ch 5). Sherem anti-Christ pattern (ch 7). All speakers valid. |
| Ether | BoM | 15 | Yes | Pre-mortal Christ vision (ch 3). Gemini sent speaker IDs instead of names — mapped correctly. All flagged missing chars already in DB. |
| Jarom | BoM | 1 | Yes | Admonition=9 dominant. Single speaker (Jarom). |
| Helaman | BoM | 16 | Yes | Samuel the Lamanite (ch 13-15). Sealing power (ch 10). All speakers valid. |
| Mormon | BoM | 9 | Yes | Added Aaron (Lamanite king) to DB. Sorrowing of the damned (ch 2). Cumorah lament (ch 6). |
| Moroni | BoM | 10 | Yes | Sacramental prayers (ch 4-5). Faith/hope/charity (ch 7). Moroni's promise (ch 10). |
| Mosiah | BoM | 29 | Yes | King Benjamin's address (ch 2-5). Abinadi (ch 11-17). Waters of Mormon (ch 18). Alma conversion (ch 27). Skipped 3 group speakers. |
| Alma | BoM | 63 | Yes | Largest book. Ammonihah (ch 8-16), Lamanite mission (ch 17-27), Zoramites (ch 31-35), Alma to sons (ch 36-42), war chapters (ch 43-63). Added Priest of Elkenah to DB. |
| Abraham | PoGP | 5 | Yes | Pre-mortal vision (ch 3), Creation (ch 4-5). Added Priest of Elkenah. |
| Joseph Smith—History | PoGP | 1 | Yes | First Vision, Moroni, Aaronic Priesthood. John the Baptist already in DB. |
| Joseph Smith—Matthew | PoGP | 1 | Yes | Second Coming prophecy. Single speaker (Jesus Christ). |
| Moses | PoGP | 8 | Yes | All 10 outputs in single Gemini block. 59 speaker entries. God the Father (ch 1), Zion (ch 7). |
| Articles of Faith | PoGP | 1 | Yes | No speakers. Declaration of belief format. |
| 1 Esdras | Apoc | 9 | Yes | Added 7 characters (Sisinnes, Sathrabuzanes, Belemus, Rehum, Artaxerxes, Zerubbabel, Darius). |

**Data File Totals After This Session:**
- `chapter-sentiments.json`: 264 entries
- `speakers.json`: 353 entries
- `chapter-summaries.json`: 255 entries
- `chapter-themes.json`: 255 entries
- `cross-references.json`: 121 entries
- `doctrinal-topics.json`: 255 entries
- `historical-context.json`: 255 entries
- `literary-genres.json`: 255 entries
- `notable-verses.json`: 255 entries
- `characters.json`: 763 people (+7 from pipeline: 5 OT figures + Aaron Lamanite king + Priest of Elkenah)
- `characters.json`: 761 people (+5 from Gemini pipeline)

### Pipeline Process
1. User feeds book text + guide to Gemini
2. Gemini returns 10 labeled JSON arrays
3. User pastes each array into Claude Code
4. Claude Code enriches (adds volumeAbbrev/volumeName/bookId for sentiment) and appends to data files
5. **After every book, Claude Code MUST:**
   - Run completeness audit (count entries per output vs expected chapter count)
   - Spot-check sentiment accuracy against known passages
   - Verify all speaker names exist in characters.json (name or alias)
   - Verify MISSING_CHARACTERS are genuinely missing (Gemini frequently flags people who ARE in the DB)
   - Add any truly missing characters to characters.json
   - Update this session log with the book's completion status
   - Update CLAUDE.md data file totals and pipeline progress
6. **Only move to the next book after the audit passes**

### Pending (for next session)
- Continue Gemini pipeline: 2 Nephi → through all remaining books (101 total)
- Wire Sentiment Explorer to use `chapter-sentiments.json` (after enough books scored)
- Build API routes for new data types (summaries, themes, cross-refs, etc.)
- Build UI for new data in ScriptureReader (chapter summary, themes, cross-refs, notable verses)
- Wire historical context and literary genre into reader/insights
- Consider renaming `characters.json` → `people.json` to match site labeling

### Characters Added During Pipeline
| Name | ID | Source Book | Notes |
|------|-----|------------|-------|
| Amoz | amoz | 2 Nephi (Isaiah) | Father of Isaiah |
| Remaliah | remaliah | 2 Nephi (Isaiah) | Father of Pekah |
| Jeberechiah | jeberechiah | 2 Nephi (Isaiah) | Father of Zechariah the witness |
| Tabeal | tabeal | 2 Nephi (Isaiah) | Father of proposed puppet king |
| Jotham (king of Judah) | jotham-king-judah | 2 Nephi (Isaiah) | Son of Uzziah, father of Ahaz |
| Aaron (Lamanite king) | aaron-lamanite-king | Mormon | Led 44,000 against Mormon |

**Total: 762 characters (was 757 at session start)**

### PICKUP INSTRUCTIONS FOR NEXT SESSION
**3 Apocrypha books have Gemini data that was pasted but NOT YET processed into data files:**
1. **2 Esdras** (16 chapters) — Background agent may have completed this. CHECK first: `node -e "const d=JSON.parse(require('fs').readFileSync('data/chapter-sentiments.json','utf8')).filter(x=>x.bookName==='2 Esdras').length;console.log('2 Esdras entries:',d)"`
2. **2 Maccabees** (15 chapters) — Gemini data was pasted in chat but never written to files. The raw data is in the session conversation only. **User will need to re-send from Gemini or re-paste.**
3. **Additions to Esther** (7 chapters) — Same as above. **User will need to re-send.**

**After processing those 3, continue with remaining Apocrypha books, then OT, NT, D&C.**

### Books Remaining
**OT (39):** Genesis, Exodus, Leviticus, Numbers, Deuteronomy, Joshua, Judges, Ruth, 1 Samuel, 2 Samuel, 1 Kings, 2 Kings, 1 Chronicles, 2 Chronicles, Ezra, Nehemiah, Esther, Job, Psalms, Proverbs, Ecclesiastes, Song of Solomon, Isaiah, Jeremiah, Lamentations, Ezekiel, Daniel, Hosea, Joel, Amos, Obadiah, Jonah, Micah, Nahum, Habakkuk, Zephaniah, Haggai, Zechariah, Malachi
**NT (27):** Matthew, Mark, Luke, John, Acts, Romans, 1 Corinthians, 2 Corinthians, Galatians, Ephesians, Philippians, Colossians, 1 Thessalonians, 2 Thessalonians, 1 Timothy, 2 Timothy, Titus, Philemon, Hebrews, James, 1 Peter, 2 Peter, 1 John, 2 John, 3 John, Jude, Revelation
**BoM (14 remaining):** 2 Nephi, Jacob, Enos, Jarom, Omni, Words of Mormon, Mosiah, Alma, Helaman, 3 Nephi, 4 Nephi, Mormon, Ether, Moroni
**D&C (1):** Doctrine and Covenants (138 sections)
**PoGP (5):** Moses, Abraham, Joseph Smith—Matthew, Joseph Smith—History, Articles of Faith
**Apocrypha (15):** All books

---

## 2026-03-25 — Session 19: Sentiment Revamp, LLM Scoring, Heading Standardization

### What was done

**Sentiment Analysis Complete Revamp:**
- Rewrote sentiment lexicon from 7 categories to 4 theological categories:
  - Exaltation & Glory (gold #FFD700)
  - Covenant Peace (teal #20B2AA)
  - Admonition & Justice (crimson #DC143C)
  - Trial & Contrition (indigo #4B0082)
- 200+ weighted words with LDS-specific overrides (pride=-3.8, fear=+0.5, wo=-3.5, grace=+3.8)
- Weighted valence scoring: S = Σw / √n (replaces simple keyword counting)
- 5-verse SMA smoothing function added
- Updated sentiment API with 4 drill-down levels: volumes, books, chapters, verses
- Rewrote SentimentArcTool with cascading dropdown navigation (Volume → Book → Chapter)
- Removed verse-level chart (too noisy for keyword matching)
- Replaced "Drill Into" pills with `<select>` dropdowns
- Renamed from "Sentiment Arc" to "Sentiment Explorer"

**LLM-Scored Chapter Sentiments:**
- Built `scripts/score-chapters.ts` to score all 1,764 chapters via Claude API
- Ran through Claude Sonnet 4.5 — scored ~1,460 chapters successfully
- User filling remaining ~264 gaps through Gemini chat using SENTIMENT-SCORING-GUIDE.md
- Data stored in `data/chapter-sentiments.json`
- Calibration validated: Psalm 23=Peace, Psalm 150=Exaltation, Isaiah 1=Admonition, Lamentations 1=Contrition, Helaman 13=Admonition, Job 3=Contrition, John 14=Peace, Revelation 4=Exaltation
- NOTE: Sentiment Explorer not yet wired to use this JSON data — still using keyword lexicon. Wiring needed after gaps filled.

**Word Explorer:**
- Volume-level chart changed from bars to shaded curve (Line chart with fill)
- Book and chapter levels already had curves

**Heading Standardization:**
- All tool page h1 headings now centered, 1.8rem desktop / 1.4rem mobile, fontWeight 800, letterSpacing 0.02em
- Fixed: WordCloud, Chiasmus, TopicMap, CharacterDirectory, LocationDirectory, BookmarksList, SettingsPanel
- Added 24px top padding to `.page-container` globally

**Speakers/Context Always On:**
- Speaker labels and Context Eggs toggles hidden from user — always enabled
- Code preserved for future re-enable if needed

### Commits
- Rewrite sentiment lexicon: 4 categories, weighted valence, 200+ words
- Update sentiment API with 4 drill-down levels
- Rewrite Sentiment Arc as drill-down Sentiment Explorer
- Standardize headings across all tool pages

### Pending (for next session)
- Wire Sentiment Explorer to use `data/chapter-sentiments.json` (after user fills ~264 gaps via Gemini)
- Mood Match feature (find chapters matching emotional state using sentiment data)
- Methodology sidebar for sentiment scoring explanation
- Word Explorer cascading dropdowns (same pattern as Sentiment Explorer)
- Word Explorer redirects from old routes + nav/footer/home updates
- Funny Stories page UI + in-reader pills
- Speaker data audit/cleanup (Gemini processing)
- People database audit (remove generic/anonymous entries)
- API key rotation needed (exposed in chat)

### Creative Ideas Noted for Future
- Emotional Journey Map (flowing river visualization)
- Mood Match Reader (recommend chapters by emotional state)
- Tone Comparison (radar charts per book)
- Chapter Character Sentiment (cross-reference with character data)
- Sentiment Heatmap (color grid of every chapter)
- Emotional Bookends (chapters that arc from lament to praise)
- Reading Streak Integration (suggest counterbalance chapters)
- Verse-of-the-Day by Mood

---

## 2026-03-24 — Session 18: Apocrypha, Verse Select, Scripture Links, UI Fixes

### What was done

**Chapter Insights Fix:**
- Removed all generic/anonymous speaker pills from "People in this Chapter" (e.g., "Father Of Demon-Possessed Boy", "Man, Still Another", "Disciples"). Only named characters from characters.json now appear.

**Scripture Reference Hyperlinking:**
- New `LinkedScriptureText` component + `parseScriptureReferences()` utility
- Scripture references (Genesis 1:1, Alma 32:21, D&C 76) in nugget insights, character bios, and location descriptions are now clickable links to the internal reader

**Hamburger Icon Consistency:**
- Created shared `HamburgerIcon.tsx` component (single source of truth: 14/20/16px staggered lines)
- Replaced all inline hamburger implementations in Header.tsx and ScriptureReader.tsx

**Backdrop Blur:**
- Added `backdropFilter: blur(4px)` to NuggetPopover and VersePopover overlays
- All 8 slide-out panels now consistently blur background content

**Chapter-Level Resources:**
- Made `verseStart`/`verseEnd` optional in Resource interface
- Chapter-level resources (no verse range) display as banner row above verses
- Added 2 sample chapter-level resources (Genesis 1, Matthew 5)

**Verse Multi-Select (Phase 1):**
- Click verse number to enter selection mode (desktop), long-press on mobile
- Checkboxes appear on all verse numbers in selection mode
- Selected verses get subtle highlight background
- Floating toolbar at bottom: Copy, Bookmark, Clear
- Selection clears when chapter changes

**Apocrypha (14 Books, 5717 Verses):**
- Fetched from api.getbible.net/v2/kjva/ — 14 books with full text
- Added as 6th volume "Apocrypha" (abbrev: Apoc, color: #8E7CC3 purple)
- Default visibility: OFF (opt-in via Settings)
- Updated book-order.ts, constants.ts, preferences.ts, queries.ts, scripture-slugs.ts
- Books: 1-2 Esdras, Tobit, Judith, Additions to Esther, Wisdom, Sirach, Baruch, Prayer of Azariah, Susanna, Bel and the Dragon, Prayer of Manasses, 1-2 Maccabees

**Logo Fix:**
- Replaced tree-logo.svg and logo-full.svg with user-provided Tree.svg (tree icon only, no text)
- Standardized logo height to 28px on all pages
- White fill for dark backgrounds, matches favicon

**Portraits:**
- Added Pharaoh portrait (pharaoh_compressed.jpg)
- Updated Joseph Smith portrait (joseph-smith_compressed.jpg)

### Commits
- Remove generic speakers from chapter insights
- Add scripture reference hyperlinking in slide-out panels
- Unify hamburger icon via shared HamburgerIcon component
- Add backdrop blur to NuggetPopover and VersePopover
- Add chapter-level resources support
- Add verse multi-select mode (Phase 1)
- Add Apocrypha (14 books, 5717 verses), fix logo, add portraits
- Replace logo with tree-only icon at 28px everywhere

### Additional commits (continued session)
- Fix 6 nuggets flagged by accuracy audit (50 checked, 42 accurate, 8 issues, 6 fixed)
- Add Apocrypha toggle in Settings page with D&C 91 reference
- Add Apocrypha non-canonical banner in scripture reader
- Use definitive se-logo.svg (user-provided), delete old logos
- Rename logo to se-logo.svg to bust browser/CDN cache
- Fix heading hierarchy in Settings page (h3 → h2)
- Export NUGGET-GUIDE.md + context-nuggets.json to Desktop for Gemini
- Export SPEAKERS-GUIDE.md + speakers.json to Desktop for Gemini audit
- Add Pharaoh + Joseph Smith portraits
- Fix generic speaker LABELS (not just pills) — removed speakerType bypass, all speakers must match character DB
- Remove "Holy City" alias from Jerusalem (too generic)
- Fix verse scroll-to from ?verse=N URL param (useEffect instead of fragile setTimeout)
- Hide Speakers and Context toggles — always on (code preserved)
- Convert reading mode help popup to slide-out panel
- Fix slide-out text alignment (left-justified)
- Add logo to scripture reader bottom bar (links to home)
- Add funny stories data (21 original synopses in data/funny-stories.json)
- Word Explorer: new unified page (/word-explorer) replacing Word Search + Narrative Arc + Heatmap
  - 3-level drill-down: Volumes → Books → Chapters
  - Multi-term comparison (up to 6 terms)
  - Term-colored bars, volume drill-down pills above chart
  - Deep linking, preset buttons, verse references at drill levels
- Updated CLAUDE.md: removed theology mode refs, added Apocrypha, fixed stale docs

### Pending (for next session)
- Word Explorer: redirects from old routes + nav/footer/home updates
- Word Explorer: further polish and testing
- Global styling standardization (centered titles, consistent spacing)
- Real scripture search engine (AJAX, results page, people/places integration)
- Sentiment analysis revamp (Gemini suggestions: vector embeddings, 4-category model)
- Funny stories page UI + in-reader pills (data done)
- Chiasmus data audit (verify BoM claims)
- Speaker data audit (Gemini processing — waiting for corrected speakers.json)
- Apocrypha characters not yet added to characters.json
- Convert remaining modals to slide-outs (MethodologyModal, ExportModal)
- Verse select Phase 2 (notes/tags on selections)
- Character Relationship Visualizer

---

## 2026-03-24 — Session 17: Home Page Redesign, Parallel Removal, Stats Viz, Site Audit

### What was done

**Home Page Redesign:**
- 3-column desktop layout: Tools (left), People spotlight (center), Scripture stats (right)
- SVG ring charts with animated counters (verses, chapters, books)
- Volume word-count bar comparison (OT dominates at 609K words)
- Gender breakdown ring chart (89% men / 11% women of 757 people)
- Featured Nugget card ("Did you know?") with category badge and link to scripture
- People spotlight with auto-sliding carousel (10 characters, advances every 3s)
- Fun facts: longest book (Alma), shortest (3 John), ~5.4M letters, 4000-year span
- D&C excluded from longest/shortest book (it's a collection of sections)
- Curated mobile layout: Scriptures+People → featured people → 4 tools → stats → nugget → remaining tools → verse

**Removed Parallel Passages:**
- Deleted page, component, API route, SVG icon
- Removed from nav menu, footer, sitemap
- Cleaned all documentation references

**New API:**
- `/api/random-nugget` — returns single random scholarly insight

**Scripture Card Styling:**
- Volume cards: straight top color border (not rounded), gradient background
- Book cards: subtle gradient (0.06 → 0.02 opacity)
- Chapter grid cells: matching gradient treatment

**Mobile Chart Scroll Fix:**
- Disabled pan on mobile for all 4 chart tools (NarrativeArc, WordFrequency, Heatmap, SentimentArc)
- Added touch-action: pan-y to chart containers so vertical scroll works when touching charts
- Pinch zoom still available for detailed exploration

**Scripture Navigation — Complete Fix:**
- ROOT CAUSE: Back buttons used `window.history.back()` (browser history = unpredictable) instead of setting React state (deterministic). Caused loops like AoF Ch1 → AoF grid → "PoGP" → back to Ch1.
- ALL back buttons now use explicit state transitions (zero uses of history.back() remain):
  - Reading → Chapter grid: `setSelectedChapter(null)` + push book URL
  - Reading (single-chapter book) → Book list: skip chapter grid entirely
  - Chapter grid → Book list: `setSelectedBookId(null)` + push volume URL
  - Chapter grid (single-book volume like D&C) → Volume picker: skip book list entirely
  - Book list → Volume picker: full state reset + push `/scriptures`
- D&C volume click auto-skips to section grid (no useless 1-item book list)
- Single-chapter book back button shows volume name (not book name)
- All state resets clear ALL downstream state (verses, book, chapter) to prevent stale data
- pushState for forward nav, popstate listener syncs React state from URL on browser back/forward
- **13 single-chapter books fixed**: chapter=0 → chapter=1 in DB (237 verses across OT/NT/BoM/PoGP)
- **Em-dash slug fix**: "Joseph Smith—Matthew" → "joseph-smith-matthew" (was "joseph-smithmatthew")

**Header Improvements:**
- Full-width header on ALL pages (rendered outside page-container)
- White centered h1 headings for volume/book/chapter views
- Removed duplicate logo on scripture volume picker

**Full Site Audit:**
- Page-by-page screenshots on desktop (1440px) and mobile (375px)
- Verified: header consistency, no Parallel Passages anywhere, footer links correct
- All 10+ pages checked: home, search, narrative-arc, heatmap, wordcloud, sentiment, chiasmus, topics, people, locations, scriptures
- Nav menu verified clean

### Pending (from user requests)
- Logo: user says "wrong/old tree logo" — needs clarification on which file to use
- More context nuggets (research agent running)
- YouTube video spreadsheet (research agent running)
- Light/dark toggle for scripture nav cards (picker views always dark currently)
- More creative interactive tools for scriptures

---

## 2026-03-23 — Session 16: Header Standardization + Chiasmus Rework + Preset Buttons + UI Polish

### What was done
- **Header.tsx rewrite** — Replaced old header with dark nav bar matching scripture reader style. Tree logo (no text) centered, links to home. Hamburger menu right side with staggered-width lines. Consistent across all tool pages.
- **Home page** — "SCRIPTURE EXPLORER" h1 in caps with white subtitle, uses new header bar.
- **Scripture nav bar** — Added centered tree logo linking to home for volume picker, book list, and chapter grid views. Reading view keeps chapter selector in center instead.
- **Tool page consistency** — All tool pages now use `<Header />` from the page file, not from within the tool component. Removed internal Header/page-container from SentimentArcTool, ParallelPassagesTool, TopicMapTool. Added Header to sentiment, parallel, topics page files.
- **Preset search buttons** — WordFrequencyTool, NarrativeArcTool, and HeatmapTool empty states now show clickable preset term buttons. Narrative Arc has 6 multi-term presets (Faith vs. Works, Grace & Mercy, etc.). Heatmap and Word Search have 6 single-term presets.
- **Backdrop blur standardization** — All slide-in panels (ScripturePanel, ResourcePanel, WordExplorerPanel) now use consistent blur(4px) backdrop, matching CharacterDetailPanel and LocationDetailPanel.
- **Hamburger menu consistency** — Staggered-width lines (14/20/16px) used everywhere. No MENU text in scripture reader nav. Consistent with Header component.
- **Chiasmus page complete rework** — Replaced algorithmic detector with curated catalog of 40 documented chiastic structures. Three categories: Verified (23), Probable (15), Possible/Incidental (2). Coverage: OT 13, NT 10, BoM 13, D&C 1, PoGP 3. Card grid UI with volume filter pills. Slide-in detail panel showing full A–B–C…C'–B'–A' structure with scholar attribution and source citations.
- **Chiasmus data** — `data/chiasmus-catalog.json` and `public/data/chiasmus-catalog.json` with complete structure data for each pattern. Sources: Welch, Wenham, Lund, Boyd & Edwards, Boys, BYU Studies, ScriptureCentral.

### Key technical details
- Header.tsx: sticky, dark background `rgba(17,17,22,0.95)` with blur, z-index 50
- scriptureNavBar: added `centerContent` parameter, defaults to logo when no center content passed
- Preset buttons use `initialSearchDone.current = true` + `setTerms()`/`setWord()` to trigger the existing auto-search effect
- ChiasmusTool: client-side fetch of `/data/chiasmus-catalog.json`, no API route needed

### 3 commits pushed to GitHub

---

## 2026-03-21 — Session 12: Sentiment + Tone + Radar + Context Eggs (800) + Relationship Web

### What was done
- **Sentiment analysis enhancement** — Normalized scores to per-1,000-words for cross-chapter comparability. Added 25-word negation set with 2-word look-back (not, no, never, without, etc.). Low-volume dampening (0.5x for chapters under 50 words). New `ScoreResult` interface with `wordCount` and `lowConfidence` fields.
- **Sentiment Arc UI updates** — Y-axis label "Frequency per 1,000 words", tooltips show "X per 1k words" with low-confidence warning for short chapters. Updated methodology modal to document negation handling.
- **Tone overlay in reader** — New "Tone" toggle button in reader layer toggles. Per-verse dominant tone scoring via `getVerseDominantTone()`. Subtle colored backgrounds and left borders by sentiment category. Memoized for performance.
- **Character tone profile radar** — New `/api/character-sentiment` endpoint scoring mention verses against 7 sentiment categories. Radar chart in CharacterDetailPanel using Chart.js RadialLinearScale. Color-coded axis labels, purple fill area for RPG-style stat visualization.
- **Context Eggs** — Scholarly backstory system embedded in scripture text. 10 seed entries across all volumes (linguistic, historical, cultural, literary, restoration categories). Sidecar-loaded per chapter. EGG pills inline next to verses. Glint animation shimmers keyword every 30s. Parchment/slate popover with category badge, title, insight, source citation. "Context" layer toggle. Bottom sheet on mobile. Segment priority: entity > highlight > egg.

### Key technical details
- `scoreText()` now returns `{ scores, wordCount, lowConfidence }` instead of just scores
- Negation handling: 2-word look-back before each keyword, skips hit if negated
- `getVerseDominantTone()`: lightweight per-verse scoring for reader overlay
- Character sentiment API scans all 42k verses with regex, averages normalized scores
- Context Eggs use "egg" segment kind in renderVerseText — lowest priority, never conflicts with entity links or search highlights
- Glint animation: 30s CSS cycle, 2s sweep in first 7%, idle remainder. Theme-aware via CSS custom properties
- Context Eggs expanded to 800 entries: OT 288, NT 215, BoM 183, D&C 63, PoGP 51
- **Character Relationship Web** — Full-screen force-directed graph using react-force-graph-2d. Nodes colored by volume, breadcrumb navigation, glassmorphism side panel. Graph data built from characters.json family relationships. Subgraph BFS for focused exploration.

---

## 2026-03-21 — Session 10: Characters Expansion + Locations Feature + Entity Linking

### What was done
- **Character database expanded** from 302 → 757 people across all 5 volumes (OT 265, NT 214, BoM 202, D&C 165, PoGP 50).
- **Portraits needed list** — 41 prominent characters (tier 1-2) need portraits (`docs/PORTRAITS-NEEDED.md`).
- **Locations database** — 333 places (`data/locations.json`): 183 with GPS coordinates, 150 without.
- **Location feature** — LocationDetailPanel (OpenStreetMap embed, Google Maps link, mention stats), LocationDirectory page, API routes, nav/footer/home integration.
- **Entity linking** — ScriptureReader auto-hyperlinks first mention of each person/place per chapter. Subtle blue underline, click opens detail panels.

---

## 2026-03-21 — Session 9: Mobile UX Polish + Speaker Accuracy

### What was done
- **Shared useIsMobile hook** — Extracted debounced hook to `src/lib/useIsMobile.ts`, replaced 15 inline duplicates across all components. 150ms debounce prevents iOS URL-bar-triggered resize jank.
- **Chart gesture tuning** — Added 10px threshold to pinch/pan in all 4 chart components (WordFrequency, NarrativeArc, Heatmap, Sentiment). Increased mobile minRange from 5 to 8. Added `pointHitRadius: isMobile ? 20 : 10` for easier mobile tapping.
- **Swipe-to-dismiss rewrite** — ScripturePanel + CharacterDetailPanel: 15px dead zone, horizontal > vertical * 1.5 discrimination, velocity-based dismissal (>0.5 px/ms OR >120px distance).
- **Panel transitions** — Standardized all slide-in panels to `0.25s cubic-bezier(0.16, 1, 0.3, 1)` for polished native feel. Added `will-change: transform` for GPU compositing.
- **iOS safe areas** — Added `env(safe-area-inset-bottom)` padding to VersePopover mobile sheet, WordExplorerPanel, ScriptureReader bottom bar + search navigator.
- **Touch handling** — Outside-click handlers changed from mousedown to pointerdown (FilterDropdown, MethodologyModal, VersePopover). Close button tap targets enlarged to 44x44px. Added `chart-touch-container` CSS class.
- **Keyboard optimizations** — Added `enterKeyHint="search"`, `autoCapitalize="none"`, `autoCorrect="off"` to all search inputs (5 components).
- **CSS fixes** — Removed `background-attachment: fixed` (iOS perf), added `overscroll-behavior: none`, safe area padding on body, dropdown animation timing 0.22s.
- **Viewport meta** — Set `maximumScale: 1, userScalable: false, viewportFit: "cover"` in layout.tsx.
- **Speaker data audit** — Found 902 exact duplicates in Bible data, verseEnd=200 sentinel inflation, missing theology mode mappings.
- **Speaker fixes** — Deduplicated speakers.json (7,631 → 6,729 entries), capped verseEnd sentinel at runtime in ChapterInsights, expanded theology mode: OT "Jesus" → "Jesus Christ (Jehovah)", D&C "God" → "Jesus Christ".
- **Merge script** — Added deduplication step, fixed var → let scoping.

### Known issues remaining
- 403 overlapping verse ranges in Bible speaker data (different speakers claim same verses)
- verseEnd=200 sentinels still in data file (capped at runtime)
- Mobile hamburger menu links may not work (reported Session 8, not yet investigated)
- Chart scroll pad feature not yet built

---

## 2026-03-21 — Session 8: User Preferences System (Volume Visibility + Theology Mode)

### What was done
- **Preferences storage layer** (`src/lib/preferences.ts`) — localStorage CRUD with SSR-safe guards, merge-with-defaults pattern for forward compatibility, volume visibility helpers, theology mode speaker name mapping.
- **PreferencesProvider** (`src/components/PreferencesProvider.tsx`) — React context wrapping the entire app via layout.tsx. Provides `isVolumeVisible()`, `visibleVolumeAbbrevs`, `displaySpeakerName()`, `theologyMode`, and `hydrated` flag for SSR safety.
- **Settings page** (`/settings`) — Volume Visibility section with 5 color-coded toggle switches (with descriptions and abbreviation badges), Old Testament Interpretation section with LDS/Traditional radio options. At least 1 volume must stay visible. OT Interpretation only visible when OT is enabled.
- **Settings in nav menu** — New "Settings" section with gear icon (`public/settings.svg`).
- **Volume filtering wired into all tool components** — WordFrequencyTool, NarrativeArcTool, HeatmapTool, SentimentArcTool, WordCloudTool, ChiasmusTool, TopicMapTool all filter volumes after fetch using `isVolumeVisible()`.
- **Volume filtering in remaining pages** — Home page (random verse + character spotlight), BookmarksList (hides bookmarks from hidden volumes), CharacterDirectory (filters characters + volume filter pills), CharacterDetailPanel (volume heatmap + legend), ScriptureReader (landing volume cards).
- **Theology mode in speaker labels** — ChapterInsights and ScriptureReader use `displaySpeakerName()` to map "God"/"LORD"/"The LORD" → "Jesus Christ (Jehovah)" for divine speakers in OT when LDS mode is active.

### Architecture decisions
- Preferences stored as abbreviation keys (OT, NT, BoM, D&C, PoGP), not numeric IDs — decoupled from database.
- Merge-with-defaults pattern ensures adding new preference fields in the future requires no migration.
- `displaySpeakerName()` is centralized in the context, so any new component gets theology-aware speaker names automatically.
- Data (bookmarks, notes, annotations) for hidden volumes is preserved — only the UI hides them.
- System designed for extensibility: future content types (blog posts, articles) can check `theologyMode` and volume preferences.

### 1 commit pushed to GitHub

---

## 2026-03-20 — Session 7: Insights Overhaul, Speaker Timeline, Mobile Back-Button, Preferences Planning

### What was done
- **Mobile back-button support** — New `useBackToClose` hook pushes history state; back button/swipe closes panels instead of navigating away. Applied to: ScripturePanel, ResourcePanel, WordExplorerPanel, CharacterDetailPanel, MethodologyModal, NavMenu.
- **"People in this Chapter"** — New `/api/chapter-characters` endpoint finds characters per chapter via speaker matching + text scanning (whole-word regex, deduplication by volume). Portraits displayed in insights panel and wired to CharacterDetailPanel.
- **Verse-level deep linking** — `?verse=N` URL param scrolls to specific verse with blue highlight flash. Applied to: CharacterDetailPanel first/last mention links, BookmarksList, home page random verse.
- **ChapterInsights complete overhaul:**
  - Collapsed bar: verse count + 3 stacked portrait circles + people count + "INSIGHTS" label
  - People section with speaker-colored borders, inline verse count number
  - Speaker Timeline: color-coded horizontal bar showing who speaks where, trough styling, click to scroll
  - Key Themes: neutral colors (not volume color), helper text explains interaction
  - Removed: top words, verse density strip, quick links (Word Cloud/Heatmap/Search)
  - D&C says "Section" instead of "Chapter"
- **Unique speaker colors** — Each "other" speaker gets a distinct color from a 10-color palette instead of all sharing purple. Consistent between ChapterInsights and ScriptureReader.
- **Speaker label redesign** — Horizontal layout: avatar right (closest to scripture), name extends left on desktop. Circle-only on mobile. Portrait images when available.
- **Gray speaker colors replaced** — Narrator: teal (#0E7490/#22D3EE), Other: purple (#9333EA/#A78BFA). No more hard-to-see grays.
- **Subtle verse background tint** — Spoken verses get ~5% opacity speaker color background.
- **VolumeTooltip component** — Styled hover tooltip (600ms delay, arrow) showing full volume name for abbreviations. Applied to CharacterDetailPanel, CharacterDirectory, home page.
- **CharacterDetailPanel polish** — Bolder "Also Known As" and "Scripture Mentions" headings, more spacing between heatmap and first/last mention.
- **Section heading sizes** — Insights panel headings (People, Speaker Timeline, Key Themes) now 0.78rem, bold, white.

### Decisions made
- Speaker colors must be unique per individual speaker, not per type. Multiple "other" speakers each get their own color.
- Volume abbreviation tooltips should appear in key places (pills, badges, filters) to train users on what abbreviations mean.
- "Man of Holiness" is a legitimate alias for God the Father (Moses 6:57, Pearl of Great Price).
- In LDS theology, "LORD"/Jehovah in OT = Jesus Christ (premortal). This requires a theology mode toggle.
- User wants a full preferences system with volume visibility + OT theology interpretation. Approved architecture documented in session_state.md.

### 9 commits pushed to GitHub (all on main)

---

## 2026-03-20 — Session 6: UI Polish Batch (sliding toggle, modal system, always-dark bars)

### What was done
- Three-way sliding reading mode toggle (Original | Modern | Narration)
- Help "?" icon with explanatory popup using shared modal system
- Removed "LAYERS" and "SPEAKERS" headings from toggles area
- Layer toggles restyled to standard blue accent, matching heights
- Verse spacing doubled (14px → 28px)
- Speaker labels bigger + brighter with synced colors
- Always-dark top/bottom bars in both reading modes
- Shared modal-styles system (`src/lib/modal-styles.ts`)
- Person avatar icon above speaker labels (click stubbed for character panel)
- 36px gap between toggles and first verse

### 10 commits pushed to GitHub

---

## 2026-03-19 — Session 5: Book of Mormon Modern Translations

### What was done
- Generated modern translations for ALL 6,604 BoM verses (15 books, 239 chapters)
- Full alignment audit passed
- Imported via existing `import-bom-modern.ts` script

---

## 2026-03-19 — Sessions 3-4: Character Directory, Speaker Data, Home Page

### What was done
- Built CharacterDirectory (`/characters`) with 302 named individuals
- CharacterDetailPanel with bios, family trees, portraits, scripture mention heatmap
- Character data (`data/characters.json`) with portraits for ~40 characters
- Speaker data expansion: BoM/D&C/PoGP speakers via `build-speakers-lds.ts` (718 entries)
- Merged speakers: 7,631 total across 82 books
- Home page redesign with character spotlight, tool grid, random verse
- Reading streaks, annotations, Word Explorer panel

---

## 2026-03-18 — Sessions 1-2: Foundation

### What was done
- ScripturePanel (right-side slider for verse viewing from chart clicks)
- Scripture Reader (`/read`) with full navigation, light/dark mode, font size
- Chapter filter on verses API
- Deep linking on all tools
