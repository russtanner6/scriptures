# Scripture Explorer — Project Guide

## What is this?
A Next.js web app for searching and exploring scriptures with interactive visualizations, verse modals, and volume-based filtering. Volumes: Old Testament, New Testament, Book of Mormon, D&C, Pearl of Great Price.

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
│   ├── sentiment/     # Sentiment/tone arc across books (NEW)
│   ├── parallel/      # Side-by-side parallel passage comparison (NEW)
│   ├── chiasmus/      # Chiasmus (ABBA pattern) detector (NEW)
│   ├── topics/        # Topic map — find thematically similar chapters (NEW)
│   ├── timeline/      # Historical timeline (SHELVED — removed from nav, code preserved)
│   ├── settings/      # User preferences (volume visibility, theology mode)
│   ├── read/          # Scripture reader (volume → book → chapter)
│   ├── bookmarks/     # Saved verse bookmarks
│   ├── characters/    # Character directory page (757 people)
│   ├── locations/     # Location directory page (333 places)
│   └── api/          # API routes (books, word-frequency, word-frequency-by-chapter, heatmap, verses, chapter, book-stats, word-cloud, chapter-stats, random-verse, sentiment, parallel-passages, chiasmus, topic-similarity, chapter-characters, characters, character-mentions, character-sentiment, locations, location-mentions, resources)
├── components/
│   ├── WordFrequencyTool.tsx  # Main search interface (wheel zoom desktop, swipe mobile)
│   ├── NarrativeArcTool.tsx   # Multi-term narrative arc (wheel zoom desktop, swipe mobile)
│   ├── HeatmapTool.tsx        # Theme heatmap with arc toggle per volume
│   ├── SentimentArcTool.tsx   # Sentiment/tone arc with 7 categories (NEW)
│   ├── ParallelPassagesTool.tsx # Side-by-side passage comparison with diff (NEW)
│   ├── ChiasmusTool.tsx       # Chiasmus pattern detector with visual display (NEW)
│   ├── TopicMapTool.tsx       # Find thematically similar chapters (NEW)
│   ├── TimelineTool.tsx       # Historical timeline (SHELVED — code preserved)
│   ├── PreferencesProvider.tsx # React context for user preferences (volume visibility, theology mode)
│   ├── SettingsPanel.tsx      # Settings page UI: volume toggles + OT interpretation radio
│   ├── FilterDropdown.tsx     # Reusable collapsible dropdown for filter groups (Volumes, Options, etc.)
│   ├── Footer.tsx             # Site-wide footer (copyright, nav links, resources)
│   ├── VolumeCheckboxes.tsx   # Shared: VolumeCheckboxes, CategoryPills, SectionLabel components
│   ├── MethodologyModal.tsx   # Shared: MethodologyModal, MethodSection, MethodNote, MethodLink
│   ├── ChapterInsights.tsx    # Collapsible chapter insights: People pills, Speaker Timeline, Key Themes
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
│   ├── ScriptureReader.tsx    # Full scripture reader (~2100 lines) with insights, search, progress, annotations, resources, Word Explorer, modern language toggle, per-speaker unique colors, tone overlay
│   ├── CharacterDirectory.tsx # Character directory page with 757 people, filters, search
│   ├── CharacterDetailPanel.tsx # Slide-in character detail with bio, aliases, mentions, family tree, tone radar chart
│   ├── VolumeTooltip.tsx      # Styled hover tooltip for volume abbreviations (OT → "Old Testament")
│   ├── ResourceMarker.tsx     # Inline pill markers for resources (video/article/PDF) + overflow badge
│   ├── ResourcePanel.tsx      # Slide-in side panel for resource details (YouTube embed, tags, navigation)
│   ├── WordExplorerPanel.tsx   # Slide-up panel for in-context word frequency exploration (book/volume/all)
│   ├── WordCloudTool.tsx      # Interactive word cloud per book/chapter/volume
│   ├── HorizontalBarList.tsx  # Bar chart component
│   ├── EggMarker.tsx           # Inline amber/gold pill for Context Eggs (follows ResourceMarker pattern)
│   ├── EggPopover.tsx          # Parchment/slate popover for scholarly insights (bottom sheet on mobile)
│   ├── RelationshipWeb.tsx     # Full-screen force-directed character relationship graph
│   ├── Header.tsx             # Site header with tree logo + hamburger menu (showSubtitle prop)
│   └── NavMenu.tsx            # Slide-in nav with sections (Analyze/Discover/Read)
├── lib/
│   ├── db.ts                  # sql.js initialization
│   ├── queries.ts             # Database queries + displayName() + getChapterStats() + getRandomVerse()
│   ├── types.ts               # TypeScript interfaces
│   ├── constants.ts           # Volume colors, contrast text, compactVolumeName()
│   ├── preferences.ts         # User preferences CRUD (localStorage): volume visibility, theology mode, speaker name mapping
│   ├── bookmarks.ts           # Bookmark CRUD (localStorage)
│   ├── annotations.ts         # Personal verse notes CRUD (localStorage) (NEW)
│   ├── reading-progress.ts    # Reading streaks + chapter completion tracking (localStorage)
│   ├── scripture-urls.ts      # Verse reference URL builder
│   ├── sentiment-lexicon.ts   # 7 tone categories with word lists, negation handling, per-1k-word normalization, verse-level tone detection
│   ├── chiasmus-detector.ts   # Chiasmus (ABBA pattern) detection algorithm
│   ├── useIsMobile.ts         # Shared debounced responsive hook (replaces 15 inline duplicates)
│   ├── relationship-graph.ts   # Build relationship graphs from character family data (nodes, links, subgraph BFS)
│   ├── useBackToClose.ts      # Hook: mobile back-button closes panels instead of navigating away
│   └── modal-styles.ts        # Shared popup/modal styling tokens
data/                          # scriptures.db + sql-wasm.wasm + parallel-passages.json + timeline.json + resources.json + speakers.json + characters.json + locations.json + web-bible.json + context-eggs.json
scripts/                       # build-db.ts, book-order.ts, build-speakers.ts, build-speakers-lds.ts, merge-speakers.ts, add-modern-text.ts
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
- **Audience:** Built for the full LDS canon, but not all users are LDS. Volume visibility settings (future) will let users permanently hide volumes they don't want (e.g., hide BoM/D&C/PoGP for Bible-only users). See `docs/ROADMAP.md` for details.
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
2. **Word Search** (`/search`) — Single-word frequency search with bar charts, narrative arc section, data table, stat cards. Two-column search panel with FilterDropdowns.
3. **Narrative Arc** (`/narrative-arc`) — Multi-term comparison (up to 6). All 5 volumes. Two-column search panel with FilterDropdowns. Deep linking (`?terms=faith,grace`).
4. **Theme Heatmap** (`/heatmap`) — Single-word heatmap across all volumes. Two-column search panel with FilterDropdowns. Heatmap/arc view toggle. Deep linking (`?word=faith`).
5. **Word Cloud** (`/wordcloud`) — Interactive tag cloud. Single-column flow layout (no search bar). Volume → Book → Chapter. Deep linking.
6. **Sentiment Arc** (`/sentiment`) — Emotional tone across books. Two-column search panel with FilterDropdowns. 7 categories.
7. **Parallel Passages** (`/parallel`) — Side-by-side comparison of parallel texts. Word-level diff highlighting. ⚠️ NOT yet updated with new search panel pattern.
8. **Chiasmus Detector** (`/chiasmus`) — Find ABBA mirror patterns. Single-column flow layout (picker-style). Scan entire volume.
9. **Topic Map** (`/topics`) — Chapter similarity finder. Single-column flow layout (picker-style). Cosine similarity.
10. **Timeline** (`/timeline`) — SHELVED. Code preserved but removed from nav/footer/home page.
11. **Scripture Reader** (`/read`) — Full reading experience with light/dark mode, font size, keyboard nav, reading progress, Chapter Insights, verse popover, annotations, Word Explorer panel, modern language toggle (OT/NT only). Reading streaks. Cream light theme (#f8f6f1), lighter dark theme (#1a1a21), gradient progress bar, centered tree logo.
12. **Bookmarks** (`/bookmarks`) — Saved verses grouped by volume.
13. **Locations** (`/locations`) — Location directory: 333 named places across all volumes. Search, filter by volume/type/region. Location cards with type emoji, volume pills, significance. Clicking opens LocationDetailPanel with OpenStreetMap embed (for known locations), mention stats, volume heatmap, top books, Google Maps link.
14. **Settings** (`/settings`) — User preferences: volume visibility toggles (color-coded, descriptions), OT interpretation mode (LDS/Traditional). Changes save immediately to localStorage. Accessible from nav menu.

## Key Components
- **ScripturePanel** — Right-side slider panel showing matching verses when clicking chart data points.
- **ChapterInsights** — Collapsible panel in reader: collapsed bar (verse count + 3 stacked portraits + people count + "INSIGHTS"), expanded (People pills with speaker-colored borders + verse count, Speaker Timeline color-coded bar with trough styling, Key Themes in neutral colors). Click timeline to jump to verse. Key themes trigger WordExplorerPanel.
- **WordExplorerPanel** — Slide-up panel for in-context word frequency exploration. Three scopes (book/volume/all), horizontal bar chart, current chapter highlighted, "go deeper" links. Triggered from ChapterInsights.
- **VersePopover** — Tap verse → popover with reference, word count, key words, copy, bookmark, and personal notes.
- **SentimentArcTool** — Multi-volume sentiment analysis with category toggles and Chart.js line charts.
- **ParallelPassagesTool** — Side-by-side passage comparison with word-level diff highlighting.
- **ChiasmusTool** — Chiasmus pattern detection with visual bracket display and volume scanning.
- **TopicMapTool** — Chapter similarity finder using cosine similarity on word vectors.
- **TimelineTool** — Historical timeline (SHELVED — code preserved, removed from nav).
- **FilterDropdown** — Reusable collapsible dropdown trigger for filter groups (Volumes, Options, Categories). Used by search-bar tools.
- **Footer** — Site-wide footer: brand, nav links (Analyze/Discover), external resources, copyright.
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
- **Two-column (search-bar tools):** Left column = title, description, search bar. Right column = FilterDropdown components (Volumes, Options). Used by: WordFrequencyTool, NarrativeArcTool, HeatmapTool, SentimentArcTool.
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
- `/api/sentiment` — Sentiment scores per chapter for a volume (uses sentiment-lexicon.ts)
- `/api/parallel-passages` — List passage groups or fetch verse pairs with texts for comparison
- `/api/chiasmus` — Detect chiastic patterns in a chapter (uses chiasmus-detector.ts)
- `/api/topic-similarity` — Find thematically similar chapters via cosine similarity
- `/api/resources` — Fetch linked resources (videos, articles, PDFs) for a book+chapter
- `/api/locations` — All 333 scripture locations from locations.json
- `/api/character-sentiment` — Sentiment scores for a character's mention verses (7 categories, averaged per-1k-words)
- `/api/context-eggs` — Scholarly backstory insights for a book+chapter (from context-eggs.json)
- `/api/location-mentions` — Mention stats for a location (reuses getCharacterMentions)

## Key Patterns
- `displayName()` in queries.ts normalizes all volume and book names (D&C fix)
- Volume data comes from SQLite via sql.js (client-side)
- API routes in `src/app/api/` wrap the query functions
- Charts use Chart.js with datalabels plugin + legendMarginPlugin
- Results clear when volume selection changes
- Deep linking: URL params updated on search, read on mount
- Single-book volume detection: `vol.books.length === 1` triggers chapter-level plotting
- **Speaker data:** Bible speakers from Clear-Bible/speaker-quotations (6,913 entries). BoM/D&C/PoGP from `build-speakers-lds.ts` (718 entries, text-pattern analysis + explicit chapter overrides). Merged via `merge-speakers.ts`. 7,631 total across 82 books. QA'd against 26 key chapters. Each "other" speaker gets unique color from 10-color palette (not shared).
- **Character data:** `data/characters.json` — 757 named individuals with bios, aliases, family relationships, portraits (~40 of 71 prominent), volumes, tiers (1-4). Tiers 1-2 are "prominent" (71 people). `/api/chapter-characters` finds characters per chapter via speaker matching + whole-word text scanning with volume-aware deduplication.
- **Location data:** `data/locations.json` — 333 named scripture locations with descriptions, coordinates (183 known), aliases, region, type, era, significance, tiers. BoM locations have `knownLocation: false`. D&C/PoGP real-world sites have GPS coordinates. `/api/locations` serves all, `/api/location-mentions` reuses character mention search for text scanning.
- **Entity linking:** ScriptureReader auto-links first mentions of people and places in each chapter. Builds regex from all character/location names+aliases (longest first), tracks first occurrence per entity per chapter. Subtle blue underline styling. Clicking opens CharacterDetailPanel or LocationDetailPanel.
- **VolumeTooltip:** Reusable component wrapping volume abbreviation pills/badges. Shows full name on hover (600ms delay). Applied to CharacterDetailPanel, CharacterDirectory, home page.
- **useBackToClose:** Shared hook for mobile back-button panel close. Pushes history state, listens for popstate. Used by all slide-in panels and modals.
- **User Preferences System:** `PreferencesProvider` context wraps the app (in layout.tsx). All components use `usePreferencesContext()` to get `isVolumeVisible()`, `displaySpeakerName()`, `theologyMode`. New tools/features MUST call `usePreferencesContext()` and filter volumes accordingly. Preferences stored in localStorage as abbreviation keys. Merge-with-defaults pattern ensures forward compatibility.
- **Theology mode:** When `theologyMode === "lds"` and volume is OT and speaker type is "divine", God/LORD/The LORD → "Jesus Christ (Jehovah)". Applied in ChapterInsights and ScriptureReader speaker maps.
- **Modern language:** `text_modern` column in verses table. OT+NT populated with World English Bible (WEB, public domain) via `add-modern-text.ts`. 31,095/31,102 verses matched (99.98%). BoM/D&C/PoGP not yet available. Toggle shows in Layers section only when modern text exists for the chapter.
