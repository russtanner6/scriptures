# Scripture Explorer — Project Guide

## What is this?
A Next.js web app for searching and exploring scriptures with interactive visualizations, verse modals, and volume-based filtering. Volumes: Old Testament, New Testament, Book of Mormon, D&C, Pearl of Great Price, Apocrypha (opt-in). Built from an LDS perspective — always LDS-centric (no dual theology mode).

**Domain:** scripturexplorer.com (hosted on Vercel)

## Project Locations
- **Mac Studio:** `/Users/rmt-mac-studio/Projects/Scripture Explorer/`
- **External Drive (Samsung 4T):** `/Volumes/Samsung 4T/Projects/Scripture Explorer/`
- **Other devices:** `git clone https://github.com/russtanner6/scriptures.git "Scripture Explorer"` then update this list

## Git Repository
**Repository:** `https://github.com/russtanner6/scriptures.git` (branch: `main`)

**CRITICAL — do this every session:**
1. **BEFORE making ANY changes:** Run `git pull` to get latest from GitHub. If conflicts arise, STOP and ask the user.
2. **After significant changes:** `git add -A && git commit -m "description" && git push`
3. **End of session:** Update all docs, commit, push, verify push succeeded.
4. **New device:** `git clone https://github.com/russtanner6/scriptures.git "Scripture Explorer"`

**Update documentation BEFORE committing.**

## Roadmap
See `docs/ROADMAP.md` for the full product roadmap — feature tiers, monetization, architecture evolution, and priority order.

## Tech Stack
- **Next.js 16** (App Router)
- **React 19 + TypeScript**
- **Tailwind CSS** (styling)
- **Chart.js + react-chartjs-2** (visualizations)
- **sql.js** (client-side SQLite for scripture data)
- **tsx** (script runner for `build-db`)

## Dev Commands
```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run build-db     # Rebuild scripture database
```

## Project Structure
```
src/
├── app/              # Next.js App Router pages
│   ├── page.tsx      # Landing page (hero, tool cards, random verse, recent searches)
│   ├── layout.tsx    # Root layout
│   ├── search/        # Word frequency search (moved from /)
│   ├── narrative-arc/ # Multi-term narrative arc comparison
│   ├── heatmap/       # Theme heatmap with heatmap/arc toggle per volume
│   ├── wordcloud/     # Word cloud visualization per book/chapter/volume
│   ├── sentiment/     # Sentiment/tone arc across books
│   ├── chiasmus/      # Chiasmus catalog — 40 documented chiastic structures with card UI
│   ├── topics/        # Topic map — find thematically similar chapters
│   ├── timeline/      # Historical timeline (SHELVED — removed from nav, code preserved)
│   ├── settings/      # User preferences (volume visibility, Apocrypha toggle)
│   ├── scriptures/    # Scripture reader catch-all route (volume → book → chapter)
│   ├── bookmarks/     # Saved verse bookmarks
│   ├── people/        # Character directory page (857 people)
│   ├── locations/     # Location directory page (333 places)
│   └── api/          # API routes (books, word-frequency, word-frequency-by-chapter, heatmap, verses, chapter, book-stats, word-cloud, chapter-stats, random-verse, sentiment, chiasmus, topic-similarity, chapter-characters, characters, character-mentions, character-sentiment, character-verses, locations, location-mentions, resources, speakers, random-nugget, context-nuggets)
├── components/
│   ├── WordFrequencyTool.tsx  # Main search interface (wheel zoom desktop, swipe mobile)
│   ├── NarrativeArcTool.tsx   # Multi-term narrative arc (wheel zoom desktop, swipe mobile)
│   ├── HeatmapTool.tsx        # Theme heatmap with arc toggle per volume
│   ├── SentimentArcTool.tsx   # Sentiment Explorer: 4 theological categories, cascading dropdowns (Volume → Book → Chapter)
│   ├── ChiasmusTool.tsx       # Chiasmus catalog — 40 curated patterns with card grid + detail panel
│   ├── TopicMapTool.tsx       # Find thematically similar chapters
│   ├── TimelineTool.tsx       # Historical timeline (SHELVED — code preserved)
│   ├── PreferencesProvider.tsx # React context for user preferences (volume visibility)
│   ├── SettingsPanel.tsx      # Settings page UI: volume toggles + Apocrypha section
│   ├── FilterDropdown.tsx     # Reusable collapsible dropdown for filter groups (Volumes, Options, etc.)
│   ├── Footer.tsx             # Site-wide footer (copyright, nav links, resources)
│   ├── VolumeCheckboxes.tsx   # Shared: VolumeCheckboxes, CategoryPills, SectionLabel components
│   ├── MethodologyModal.tsx   # Shared: MethodologyModal, MethodSection, MethodNote, MethodLink
│   ├── ChapterInsights.tsx    # Collapsible chapter insights: 5 sections (At a Glance, People, Speaker Timeline, Key Themes, Notable Verses)
│   ├── VersePopover.tsx       # Verse tap popover (copy, bookmark, key words, notes)
│   ├── LocationDirectory.tsx   # Location directory page with filters, search, detail panel
│   ├── LocationDetailPanel.tsx # Slide-in location detail with map, mentions, volume heatmap
│   ├── BookmarksList.tsx      # Bookmarks page with volume grouping
│   ├── SvgIcon.tsx            # Inline SVG icon helper
│   ├── ExportHtmlModal.tsx    # HTML-to-image export (html2canvas)
│   ├── DashboardCard.tsx      # Collapsible section wrapper (supports headerExtra)
│   ├── DataTable.tsx          # Sortable results table with ▲▼ sort icons
│   ├── StatCard.tsx           # Stat pills
│   ├── ScripturePanel.tsx     # Right-side slider panel for verse viewing
│   ├── ScriptureReader.tsx    # Full scripture reader (~3000 lines) with insights, search, progress, annotations, resources, Word Explorer, modern language toggle, per-speaker unique colors, tone overlay
│   ├── CharacterDirectory.tsx # Character directory page with 857 people, filters, search
│   ├── CharacterDetailPanel.tsx # Slide-in character detail with bio, aliases, mentions, family tree, tone radar chart
│   ├── VolumeTooltip.tsx      # Styled hover tooltip for volume abbreviations (OT → "Old Testament")
│   ├── ResourceMarker.tsx     # Inline pill markers for resources (video/article/PDF) + overflow badge
│   ├── ResourcePanel.tsx      # Slide-in side panel for resource details (YouTube embed, tags, navigation)
│   ├── WordExplorerTool.tsx    # Unified word frequency tool: 3-level drill-down (Volumes → Books → Chapters), multi-term comparison
│   ├── WordExplorerPanel.tsx   # Slide-up panel for in-context word frequency exploration (book/volume/all)
│   ├── WordCloudTool.tsx      # Interactive word cloud per book/chapter/volume
│   ├── HorizontalBarList.tsx  # Bar chart component
│   ├── NuggetMarker.tsx         # Inline amber/gold pill for Context Nuggets (follows ResourceMarker pattern)
│   ├── NuggetPopover.tsx        # Parchment/slate popover for scholarly insights (bottom sheet on mobile)
│   ├── RelationshipWeb.tsx     # Full-screen force-directed character relationship graph
│   ├── Header.tsx             # Dark nav bar: tree logo centered (links to home) + hamburger right. Consistent across all pages.
│   └── NavMenu.tsx            # Slide-in nav with sections (Analyze/Discover/Read)
├── lib/
│   ├── db.ts                  # sql.js initialization
│   ├── queries.ts             # Database queries + displayName() + getChapterStats() + getRandomVerse()
│   ├── types.ts               # TypeScript interfaces
│   ├── constants.ts           # Volume colors, contrast text, compactVolumeName()
│   ├── preferences.ts         # User preferences CRUD (localStorage): volume visibility (6 volumes incl. Apocrypha)
│   ├── bookmarks.ts           # Bookmark CRUD (localStorage)
│   ├── annotations.ts         # Personal verse notes CRUD (localStorage)
│   ├── reading-progress.ts    # Reading streaks + chapter completion tracking (localStorage)
│   ├── scripture-urls.ts      # Verse reference URL builder
│   ├── sentiment-lexicon.ts   # 4 theological categories (Exaltation/Glory, Covenant Peace, Admonition/Justice, Trial/Contrition), 200+ weighted words, LDS overrides, valence scoring S=Σw/√n, 5-verse SMA smoothing
│   ├── chiasmus-detector.ts   # Chiasmus (ABBA pattern) detection algorithm
│   ├── useIsMobile.ts         # Shared debounced responsive hook (replaces 15 inline duplicates)
│   ├── relationship-graph.ts   # Build relationship graphs from character family data (nodes, links, subgraph BFS)
│   ├── useBackToClose.ts      # Hook: mobile back-button closes panels instead of navigating away
│   └── modal-styles.ts        # Shared popup/modal styling tokens
│   ├── HamburgerIcon.tsx        # Shared hamburger menu icon (single source of truth for all pages)
│   ├── LinkedScriptureText.tsx  # Auto-links scripture references in text (used in nuggets, bios, locations)
│   └── ...
data/                          # scriptures.db + sql-wasm.wasm + resources.json + characters.json + locations.json + context-nuggets.json + chiasmus-catalog.json + funny-stories.json
│   ├── chapter-sentiments.json  # Gemini-scored: 4 categories per chapter (complete — 1,755 chapters)
│   ├── speakers.json            # Gemini-scored: verse-level speaker attribution (complete — 3,851 entries, speakerType field added)
│   ├── chapter-summaries.json   # Gemini-scored: one-sentence summary per chapter (complete)
│   ├── chapter-themes.json      # Gemini-scored: 3-5 themes per chapter (complete)
│   ├── cross-references.json    # Gemini-scored: inter-scripture connections (complete)
│   ├── doctrinal-topics.json    # Gemini-scored: LDS doctrinal tags per chapter (complete)
│   ├── historical-context.json  # Gemini-scored: era, date, setting per chapter (complete)
│   ├── literary-genres.json     # Gemini-scored: genre classification per chapter (complete)
│   └── notable-verses.json      # Gemini-scored: 0-3 memorable verses per chapter (complete)
scripts/                       # build-db.ts, book-order.ts, build-speakers.ts, build-speakers-lds.ts, merge-speakers.ts, add-modern-text.ts, build-apocrypha.ts, add-apocrypha.ts, score-chapters.ts (Claude API sentiment scorer)
```

## Global Design Rules
**These rules apply to ALL pages and components. Changes must be consistent across the entire site.**

### Global Consistency Mandate
**When changing any visual element (icon, color, background, font, spacing, pattern), apply it EVERYWHERE it appears across the entire codebase — not just the page or component you're currently working on.** Before committing a visual change:
1. **Search all components** for the element being changed (grep for the icon path, color value, CSS class, inline style pattern, etc.)
2. **Update every instance** — don't leave stale versions on other pages
3. **Verify all pages** that use the element still look correct
This applies to: icons (SVG files, inline SVGs, emoji), colors, card/module backgrounds, borders, blur effects, spacing, font sizes, button styles, toggle styles, and any other visual pattern. If a change makes sense on one page, it almost certainly makes sense on all pages.

### Icons
All tool icons live in `public/` as SVG files. **Always use these canonical files** — never create inline SVG approximations:
| Icon | File | Used for |
|------|------|----------|
| Home | `/home.svg` | Nav menu |
| Search | `/search.svg` | Nav menu, search bars |
| Narrative Arc | `/narrative-arc.svg` | Nav menu, view toggles, jump-to links |
| Heatmap | `/heatmap.svg` | Nav menu, view toggles, jump-to links |
| Word Cloud | `/word-cloud.svg` | Nav menu, jump-to links |
| Scriptures | `/scriptures.svg` | Nav menu |
| Favorite | `/favorite.svg` | Nav menu, bookmarks |

Use `<img src="/icon.svg" style={{ filter: "invert(1) brightness(X)" }} />` with brightness 1.0 for active, 0.5–0.7 for inactive/muted.

### Naming
- Always use "D&C" (never "Doctrine and Covenants"). Handled by `displayName()` in `queries.ts`.
- Volume order is always: OT → NT → BoM → D&C → PoGP (left to right).

### Volume Colors (constants.ts)
| Volume | Color | Hex |
|--------|-------|-----|
| OT | Crimson | #DC2F4B |
| NT | Red-orange | #E8532C |
| BoM | Orange | #F57B20 |
| D&C | Amber | #F5A623 |
| PoGP | Golden yellow | #F5C829 |
| Apoc | Muted purple | #8E7CC3 |

### UI Patterns
- **Buttons:** "Go" (not "Analyze") for all search/action buttons.
- **Volume selectors:** Compact color-coded checkboxes (14px), inline horizontal row. Multi-select enabled.
- **Search panels:** Go button inside the search bar. Volumes + options on a single compact row below.
- **"Exact match"** (not "Whole word") for the whole-word toggle label.
- **Every data point is a doorway to scripture.** Clicking any data point (bar chart icon, narrative arc point, heatmap cell) opens the ScripturePanel — a right-side slider showing matching verses with the search term highlighted. Modules include hint text (e.g., "click any point to read verses"). Heatmap cells pass a `chapter` filter for chapter-specific results.
- **Export:** All chart modules have an EXPORT button (top right) → modal with PNG/JPG/PDF options. Uses `ExportChartModal` component.
- **Links:** Blue (`var(--accent)` = `#2563EB`), underlined, for in-page/module navigation.
- **Legend spacing:** Use `legendMarginPlugin` to add 28px below Chart.js legends (prevents overlap with data labels).
- **Jump-to navigation:** Any page with multiple modules/sections MUST have a sticky jump-to nav bar that stays at the top on scroll. Uses color-coded pills matching the volume colors. No dark background behind it.
- **Search bar glow:** All search bars use `search-bar-glow` CSS class — subtle blue border pulse, 2.5s delay after page load, runs once.
- **View toggles:** Heatmap modules have heatmap/arc toggle buttons (separate rounded pills, no borders, using `/heatmap.svg` and `/narrative-arc.svg` icons). Smooth fade transition (0.3s) between views.
- **Single-book volumes (D&C):** Plot by section/chapter instead of book. Sparse x-axis labels (every 10th). Smaller point radius. Tooltip shows "Section N".
- **Audience:** Built from an LDS perspective. Volume visibility settings let users hide volumes they don't want (e.g., hide BoM/D&C/PoGP for Bible-only users). Apocrypha is opt-in (OFF by default).
- **Chart legends:** Use `pointStyle: "rectRounded"` (not circles/ovals). Adequate spacing from chart top.
- **Nav menu:** Slides in from the RIGHT side of the screen.
- **DashboardCard:** Supports `headerExtra` prop for inline links/actions next to the description.
- **Data table headings:** 0.85rem, bold (700), bright (`var(--text)`). Body text: 75% white opacity.

### Mobile Responsiveness
- **ALL changes must work on mobile.** Test at 375px width minimum.
- Use `useIsMobile(768)` hook for conditional rendering (defined in WordFrequencyTool, duplicated in NarrativeArcTool).
- Charts: 350px height on mobile (vs 540px desktop), 90° x-axis label rotation, smaller fonts.
- Search panels: volumes/options stack vertically on mobile, shorter placeholders.
- Sticky jump-to nav works on mobile (stays at top on scroll).
- Chart legend: `legendMarginPlugin` adds 28px below legend (prevents overlap with data labels).

### Dark Theme
- Background: dark grey palette (not pure black)
- Text: white hierarchy (--text, --text-secondary, --text-muted)
- Surfaces: glass-blur effect with subtle borders
- Accent: purple (#8b5cf6) for interactive elements

## Pages
1. **Home** (`/`) — Landing page with gradient hero, 6 core tool cards + 4 discovery tool cards, random verse, recent searches. Site-wide Footer component.
2. **Word Explorer** (`/word-explorer`) — Unified word frequency tool (replaces old Word Search, Narrative Arc, and Heatmap). 3-level drill-down: Volumes → Books → Chapters. Multi-term comparison (up to 6). Volume-level uses shaded curve (Line chart with fill); book/chapter levels also use curves. Deep linking (`?word=faith` or `?terms=faith,grace`). Verse references at book/chapter levels. Old routes (/search, /narrative-arc, /heatmap) will redirect here.
3. **Word Search** (`/search`) — LEGACY, being replaced by Word Explorer. Redirects pending.
4. **Narrative Arc** (`/narrative-arc`) — LEGACY, being replaced by Word Explorer. Redirects pending.
5. **Theme Heatmap** (`/heatmap`) — LEGACY, being replaced by Word Explorer. Redirects pending.
6. **Word Cloud** (`/wordcloud`) — Interactive tag cloud. Single-column flow layout (no search bar). Volume → Book → Chapter. Deep linking.
7. **Sentiment Explorer** (`/sentiment`) — Theological sentiment analysis with cascading drill-down (Volume → Book → Chapter via `<select>` dropdowns). 4 categories: Exaltation & Glory (gold #FFD700), Covenant Peace (teal #20B2AA), Admonition & Justice (crimson #DC143C), Trial & Contrition (indigo #4B0082). Weighted valence scoring with LDS-specific overrides. 5-verse SMA smoothing. Uses LLM-scored data (`data/chapter-sentiments.json`) for volume/book/chapter levels (1,755 chapters). Falls back to keyword lexicon for verse-level detail only.
8. **Chiasmus Detector** (`/chiasmus`) — Find ABBA mirror patterns. Single-column flow layout (picker-style). Scan entire volume.
9. **Topic Map** (`/topics`) — Chapter similarity finder. Single-column flow layout (picker-style). Cosine similarity.
10. **Timeline** (`/timeline`) — SHELVED. Code preserved but removed from nav/footer/home page.
11. **Scripture Reader** (`/scriptures`) — Full reading experience with light/dark mode, font size, keyboard nav, reading progress, Chapter Insights (5 sections), verse popover, annotations, Word Explorer panel, modern language toggle (OT/NT only). Reading streaks. Cream light theme (#f8f6f1), lighter dark theme (#1a1a21), gradient progress bar, centered tree logo. Book landscape pictures (4:1 ratio, edge-to-edge on mobile). Verse number squares (fixed 24px, themed volume colors). Catch-all route (`/scriptures/[...path]`).
12. **Bookmarks** (`/bookmarks`) — Saved verses grouped by volume.
13. **People** (`/people`) — Character directory: 857 named individuals. Search, filter by volume/tier. Character cards with portraits, bios, volume pills. Clicking opens CharacterDetailPanel.
14. **Locations** (`/locations`) — Location directory: 333 named places across all volumes. Search, filter by volume/type/region. Location cards with type emoji, volume pills, significance. Clicking opens LocationDetailPanel with OpenStreetMap embed (for known locations), mention stats, volume heatmap, top books, Google Maps link.
15. **Settings** (`/settings`) — User preferences: volume visibility toggles (color-coded, 5 canonical + Apocrypha section with D&C 91 reference). Changes save immediately to localStorage. Accessible from nav menu. No theology mode toggle — site is always LDS-centric.

## Key Components
- **WordExplorerTool** — Unified word frequency tool (replaces old Word Search, Narrative Arc, Heatmap). 3-level drill-down: Volumes → Books → Chapters. Multi-term comparison (up to 6). Shaded curve charts. Deep linking. Verse references at book/chapter levels.
- **ScripturePanel** — Right-side slider panel showing matching verses when clicking chart data points.
- **ChapterInsights** — Collapsible panel in reader with 5 sections: (1) At a Glance (verse count, word count, summary), (2) People pills with speaker-colored borders + verse count, (3) Speaker Timeline color-coded bar with trough styling, (4) Key Themes in neutral colors, (5) Notable Verses with citations. Collapsed bar shows verse count + 3 stacked portraits + people count + "INSIGHTS". Darker background, full width, smooth slide-in animation. Click timeline to jump to verse. Key themes trigger WordExplorerPanel.
- **WordExplorerPanel** — Slide-up panel for in-context word frequency exploration. Three scopes (book/volume/all), horizontal bar chart, current chapter highlighted, "go deeper" links. Triggered from ChapterInsights.
- **VersePopover** — Tap verse → popover with reference, word count, key words, copy, bookmark, and personal notes.
- **SentimentArcTool** — Sentiment Explorer with 4 theological categories and cascading dropdown navigation (Volume → Book → Chapter). Shaded area charts. No verse-level chart (too noisy for keyword matching).
- **ChiasmusTool** — Curated catalog of 40 documented chiastic structures. Card grid with volume filters, three categories (Verified/Probable/Possible), slide-in detail panel with full A–B–C structure. Data from `public/data/chiasmus-catalog.json`.
- **TopicMapTool** — Chapter similarity finder using cosine similarity on word vectors.
- **TimelineTool** — Historical timeline (SHELVED — code preserved, removed from nav).
- **FilterDropdown** — Reusable collapsible dropdown trigger for filter groups (Volumes, Options, Categories). Used by search-bar tools.
- **Footer** — Site-wide footer: brand, nav links (Analyze/Discover), external resources, copyright. NOTE: Footer.tsx line 11 still shows "Sentiment Arc" label — should be updated to "Sentiment Explorer".
- **VolumeCheckboxes** — Shared: `VolumeCheckboxes` (14px custom checkboxes), `CategoryPills` (toggle pills), `SectionLabel` (0.65rem uppercase labels).
- **MethodologyModal** — Shared: `MethodologyModal`, `MethodSection`, `MethodNote`, `MethodLink` for "How this works" modals.
- **BookmarksList** — Bookmarks page component with volume grouping.
- **ExportChartModal / ExportButton** — Chart.js export (PNG/JPG/PDF via jsPDF).
- **DashboardCard** — Section wrapper with `headerExtra` prop.
- **ChartHints** — Platform-aware interaction hints (Option/Alt + scroll, pinch, etc.).
- **useIsMobile(768)** — Hook for responsive layout.
- **search-bar-glow** — CSS class for search bar border glow animation.

### Search Panel Patterns
Two layout patterns exist depending on whether the tool has a search bar:
- **Two-column (search-bar tools):** Left column = title, description, search bar. Right column = FilterDropdown components (Volumes, Options). Used by: WordFrequencyTool, NarrativeArcTool, HeatmapTool.
- **Cascading dropdown (drill-down tools):** `<select>` dropdowns for Volume → Book → Chapter navigation. Used by: SentimentArcTool (Sentiment Explorer).
- **Single-column flow (picker tools):** Title/description at top, then horizontal-flow selectors (volume pills → book → chapter). Used by: WordCloudTool, ChiasmusTool, TopicMapTool.
- All search panels use `.search-panel` class: max-width 900px, centered with `margin: auto`, `overflow: visible` (needed for dropdown panels).

## API Routes
- `/api/books` — All volumes with books
- `/api/word-frequency` — Word frequency by book (supports volumeIds, bookIds filters)
- `/api/word-frequency-by-chapter` — Word frequency by chapter/section for a single book (used for D&C)
- `/api/heatmap` — Word frequency by book+chapter for all volumes (used for heatmap grid)
- `/api/word-cloud` — Top N most frequent words in a book/volume (with optional chapter filter), stopword-filtered
- `/api/verses` — Fetch matching verses for a book (supports optional `chapter` filter)
- `/api/chapter` — Fetch all verses for a book+chapter (for scripture reader, no search filter). Includes `text_modern` field (WEB text for OT/NT, null for BoM/D&C/PoGP)
- `/api/chapter-stats` — Chapter-level stats: word count, verse count, unique words, top words, key themes (TF-IDF), verse density
- `/api/random-verse` — Single random verse with book/volume context (for landing page)
- `/api/book-stats` — Word/verse counts per book
- `/api/sentiment` — Sentiment scores with 4 drill-down levels: volumes, books, chapters, verses. Uses LLM-scored `chapter-sentiments.json` for volume/book/chapter levels (1,755 chapters). Falls back to keyword lexicon for verse-level.
- `/api/chapter-summary` — One-sentence summary per chapter (1,755 entries)
- `/api/chapter-themes` — 3-5 themes per chapter (1,755 entries)
- `/api/notable-verses` — Memorable verses with reasons per chapter
- `/api/historical-context` — Era, approximate date, and setting per chapter
- `/api/cross-references` — Inter-scripture connections (711 entries)
- `/api/chiasmus` — Detect chiastic patterns in a chapter (uses chiasmus-detector.ts)
- `/api/topic-similarity` — Find thematically similar chapters via cosine similarity
- `/api/resources` — Fetch linked resources (videos, articles, PDFs) for a book+chapter
- `/api/locations` — All 333 scripture locations from locations.json
- `/api/character-sentiment` — Sentiment scores for a character's mention verses (4 categories, averaged per-1k-words)
- `/api/character-verses` — Verse texts for a character's mentions
- `/api/context-nuggets` — Scholarly backstory insights for a book+chapter (from context-nuggets.json)
- `/api/random-nugget` — Single random context nugget (for landing page or discovery)
- `/api/speakers` — Speaker data for a book+chapter
- `/api/location-mentions` — Mention stats for a location (reuses getCharacterMentions)

## Key Patterns
- `displayName()` in queries.ts normalizes all volume and book names (D&C fix)
- Volume data comes from SQLite via sql.js (client-side)
- API routes in `src/app/api/` wrap the query functions
- Charts use Chart.js with datalabels plugin + legendMarginPlugin
- Results clear when volume selection changes
- Deep linking: URL params updated on search, read on mount
- Single-book volume detection: `vol.books.length === 1` triggers chapter-level plotting
- **Speaker data:** Complete — 3,851 entries across 83 books, 313 unique named speakers. All group/unnamed speakers removed. Only individual named speakers from characters.json — no groups/crowds. Each entry has `speakerType` field (prophet, deity, king, etc.). Field names: `verseStart`/`verseEnd`. Old backups in `data/backups/`. Speakers and Context Nuggets are always on (toggles hidden from user).
- **Gemini 10-Output Pipeline:** All chapter-level data was rebuilt from scratch via Gemini. Guide at `~/Desktop/GEMINI-SCORING-GUIDE.md`. Process: user feeds book text to Gemini → Gemini returns 10 JSON arrays → user pastes to Claude Code → Claude Code enriches and appends.
  **PIPELINE IS COMPLETE.** All volumes, all books, all chapters scored.
  - Book of Mormon: 15/15 (239 chapters)
  - Pearl of Great Price: 5/5 (16 chapters)
  - Apocrypha: 14/14 (173 chapters)
  - New Testament: 27/27 (260 chapters)
  - D&C: 138/138 sections (Claude Code generated)
  - Old Testament: 39/39 (929 chapters — mix of Gemini + Claude Code)
  - **Total: 1,755 chapters with 10 data types each**
- **Character data:** `data/characters.json` — 857 named individuals with bios, aliases, family relationships, portraits (46 of 77 prominent), volumes, tiers (1-4). Tiers 1-2 are "prominent" (77 people). 8 duplicate pairs merged (Adam/Michael, Sarah/Sarai, Jacob/Israel, etc.). `/api/chapter-characters` finds characters per chapter via speaker matching + whole-word text scanning with volume-aware deduplication.
- **Location data:** `data/locations.json` — 333 named scripture locations with descriptions, coordinates (207 known), aliases, region, type, era, significance, tiers. BoM locations have `knownLocation: false`. D&C/PoGP real-world sites have GPS coordinates. `/api/locations` serves all, `/api/location-mentions` reuses character mention search for text scanning.
- **Entity linking:** ScriptureReader auto-links first mentions of people and places in each chapter. Builds regex from all character/location names+aliases (longest first), tracks first occurrence per entity per chapter. Blue underline (2px, #2563EB) with inline icons: circular portrait for people (40 have photos, others get person silhouette in blue circle), map pin in blue circle for locations. Clicking opens CharacterDetailPanel or LocationDetailPanel.
- **Context Nuggets system:** `data/context-nuggets.json` → `/api/context-nuggets` → ScriptureReader. 1,139 scholarly insights with 5 categories (Linguistic, Historical, Cultural, Literary, Restoration). Domain isolation: Restoration-category nuggets hidden when LDS volumes toggled off. NuggetMarker pills (4px borderRadius, amber/gold) display below verse text alongside ResourceMarker pills. NuggetPopover shows parchment/slate card with title, insight, source citation. Keywords get subtle glint animation (7s stagger per nugget). "Context" toggle in reader layers section.
- **D&C section-level mentions:** `getCharacterMentions()` in queries.ts aggregates D&C by section (not whole book) to prevent D&C from dominating "Most Mentioned In" charts.
- **VolumeTooltip:** Reusable component wrapping volume abbreviation pills/badges. Shows full name on hover (600ms delay). Applied to CharacterDetailPanel, CharacterDirectory, home page.
- **useBackToClose:** Shared hook for mobile back-button panel close. Pushes history state, listens for popstate. Used by all slide-in panels and modals.
- **User Preferences System:** `PreferencesProvider` context wraps the app (in layout.tsx). All components use `usePreferencesContext()` to get `isVolumeVisible()`, `displaySpeakerName()`. New tools/features MUST call `usePreferencesContext()` and filter volumes accordingly. Preferences stored in localStorage as abbreviation keys (OT, NT, BoM, D&C, PoGP, Apoc). Merge-with-defaults pattern ensures forward compatibility. Apocrypha defaults to OFF.
- **Always LDS-centric:** Theology mode toggle was removed in Session 15. Site always uses LDS perspective. No dual-mode switching.
- **Speaker display names by volume:** Data files always store "Jesus Christ" for divine speech (consistent internal ID). But the **UI display** must be context-aware:
  - **OT:** Show "Jehovah" (not "Jesus Christ") — the pre-mortal Christ spoke as Jehovah in OT contexts
  - **NT:** Show "Jesus Christ" or "Jesus" as appropriate
  - **BoM:** Show "Jesus Christ" (He identifies Himself by that name in 3 Nephi)
  - **D&C:** Show "Jesus Christ" (standard D&C revelatory voice)
  - **PoGP:** Show "Jehovah" for Moses/Abraham contexts, "Jesus Christ" for JSH
  - The `displaySpeakerName()` function in PreferencesProvider should handle this volume-based mapping
- **Sentiment system:** 4 theological categories: Exaltation & Glory, Covenant Peace, Admonition & Justice, Trial & Contrition. **COMPLETE — all 1,755 chapters scored and wired.** `/api/sentiment` uses `data/chapter-sentiments.json` for volume/book/chapter levels (LLM-scored). Falls back to keyword lexicon (`sentiment-lexicon.ts`) for verse-level detail only. Response includes `source: "llm"` or `source: "lexicon"` field. SentimentArcTool fully wired to LLM data.
- **Heading standardization:** All tool page h1 headings: centered, 1.8rem desktop / 1.4rem mobile, fontWeight 800, letterSpacing 0.02em. Applied to: WordCloud, Chiasmus, TopicMap, CharacterDirectory, LocationDirectory, BookmarksList, SettingsPanel. 24px top padding on `.page-container` globally.
- **Modern language:** `text_modern` column in verses table. OT+NT populated with World English Bible (WEB, public domain) via `add-modern-text.ts`. 31,095/31,102 verses matched (99.98%). BoM/D&C/PoGP not yet available. Toggle shows in Layers section only when modern text exists for the chapter.

## Future Feature Ideas
- **Kid Mode:** Simplify scripture text into narrative format with more pictures, designed for children or parents explaining scriptures to young kids. Would provide age-appropriate retellings of scripture stories with illustrations.
