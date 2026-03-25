# Scripture Explorer — Session Log

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
