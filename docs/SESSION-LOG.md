# Scripture Explorer — Session Log

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
