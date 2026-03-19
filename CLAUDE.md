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
│   ├── page.tsx      # Main search/explore page (WordFrequencyTool)
│   ├── layout.tsx    # Root layout
│   ├── narrative-arc/ # Dedicated multi-term narrative arc comparison
│   ├── heatmap/       # Theme heatmap with heatmap/arc toggle per volume
│   ├── wordcloud/     # Word cloud visualization per book/chapter
│   ├── read/          # Scripture reader (volume → book → chapter)
│   └── api/          # API routes (books, word-frequency, word-frequency-by-chapter, heatmap, verses, chapter, book-stats, word-cloud)
├── components/
│   ├── WordFrequencyTool.tsx  # Main search interface (42KB)
│   ├── NarrativeArcTool.tsx   # Multi-term narrative arc comparison
│   ├── HeatmapTool.tsx        # Theme heatmap with arc toggle per volume
│   ├── ExportHtmlModal.tsx    # HTML-to-image export (html2canvas)
│   ├── DashboardCard.tsx      # Collapsible section wrapper (supports headerExtra)
│   ├── DataTable.tsx          # Sortable results table
│   ├── StatCard.tsx           # Stat pills
│   ├── ScripturePanel.tsx     # Right-side slider panel for verse viewing
│   ├── ScriptureReader.tsx    # Full scripture reader with light/dark mode, keyboard nav, progress bar
│   ├── WordCloudTool.tsx      # Interactive word cloud per book/chapter
│   ├── HorizontalBarList.tsx  # Bar chart component
│   ├── Header.tsx             # Site header + hamburger menu
│   └── NavMenu.tsx            # Slide-in nav (from RIGHT side)
├── lib/
│   ├── db.ts                  # sql.js initialization
│   ├── queries.ts             # Database queries + displayName() normalization
│   ├── types.ts               # TypeScript interfaces
│   ├── constants.ts           # Volume colors, contrast text helper
│   └── scripture-urls.ts      # Verse reference URL builder
data/                          # scriptures.db + sql-wasm.wasm
scripts/                       # build-db.ts, book-order.ts
```

## Global Design Rules
**These rules apply to ALL pages and components. Changes must be consistent across the entire site.**

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
- **Links:** Blue (`var(--accent)` = `#3B82F6`), underlined, for in-page/module navigation.
- **Legend spacing:** Use `legendMarginPlugin` to add 28px below Chart.js legends (prevents overlap with data labels).
- **Jump-to navigation:** Any page with multiple modules/sections MUST have a sticky jump-to nav bar that stays at the top on scroll. Uses color-coded pills matching the volume colors. No dark background behind it.
- **Search bar glow:** All search bars use `search-bar-glow` CSS class — subtle blue border pulse, 2.5s delay after page load, runs once.
- **View toggles:** Heatmap modules have heatmap/arc toggle buttons (separate rounded pills, no borders, flame + curve icons). Smooth fade transition (0.3s) between views.
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
1. **Home** (`/`) — Landing page with gradient hero, 6 tool cards (Word Search, Narrative Arc, Heatmap, Word Cloud, Read, Bookmarks), random verse ("Discover a Verse"), recent searches from localStorage, stats footer.
2. **Word Search** (`/search`) — Single-word frequency search with bar charts, narrative arc section (D&C plots by section), data table, stat cards. Cross-tool links to Heatmap and Word Cloud in jump-to nav. Sticky jump-to nav.
3. **Narrative Arc** (`/narrative-arc`) — Multi-term comparison (up to 6). All 5 volumes including D&C (by section). Sticky jump-to nav. Deep linking (`?terms=faith,grace`). Export per chart.
4. **Theme Heatmap** (`/heatmap`) — Single-word heatmap across all volumes. Heatmap/arc view toggle per volume. Color-coded cells. Clicking cells opens ScripturePanel. Deep linking (`?word=faith`).
5. **Word Cloud** (`/wordcloud`) — Interactive tag cloud. Volume → Book → Chapter or "Entire Volume". Deep linking (`?bookId=X&chapter=Y`). Adjustable word count (20-120). Click words to search.
6. **Scripture Reader** (`/read`) — Volume picker (with reading progress %) → Book list (with read counts/checkmarks) → Chapter reading view. Features: light/dark mode, font size control (3 sizes), keyboard nav (← →), reading progress bar, volume context header, Chapter Insights panel (key themes via TF-IDF, mini word cloud, verse density strip, quick links), verse interactions (tap → popover with copy/bookmark/key words), in-chapter search with occurrence navigator bar (visual minimap of matches with scroll position indicator), end-of-chapter nav. Deep linking. URL updates. Reading streaks with "Chapter complete!" toast.
7. **Bookmarks** (`/bookmarks`) — Saved verses grouped by volume, links to reader, remove functionality.

## Key Components
- **ScripturePanel** — Right-side slider panel that shows matching verses when clicking any data point.
- **ChapterInsights** — Collapsible panel in reader: stats bar, key themes (TF-IDF), mini word cloud, verse density strip, cross-tool quick links.
- **VersePopover** — Tap verse text → popover/bottom-sheet with reference, word count, key words, copy, bookmark.
- **BookmarksList** — Bookmarks page component with volume grouping and remove functionality.
- **ExportChartModal / ExportButton** — Chart.js export (PNG/JPG/PDF via jsPDF).
- **ExportHtmlModal** — HTML-to-image export (html2canvas).
- **legendMarginPlugin** — Chart.js plugin adding space below legend.
- **DashboardCard** — Section wrapper with `headerExtra` prop.
- **WordCloudTool** — Interactive word cloud with volume/book/chapter/entire-volume selection.
- **useIsMobile(768)** — Hook for responsive layout.
- **search-bar-glow** — CSS class for search bar border glow animation.

## API Routes
- `/api/books` — All volumes with books
- `/api/word-frequency` — Word frequency by book (supports volumeIds, bookIds filters)
- `/api/word-frequency-by-chapter` — Word frequency by chapter/section for a single book (used for D&C)
- `/api/heatmap` — Word frequency by book+chapter for all volumes (used for heatmap grid)
- `/api/word-cloud` — Top N most frequent words in a book/volume (with optional chapter filter), stopword-filtered
- `/api/verses` — Fetch matching verses for a book (supports optional `chapter` filter)
- `/api/chapter` — Fetch all verses for a book+chapter (for scripture reader, no search filter)
- `/api/chapter-stats` — Chapter-level stats: word count, verse count, unique words, top words, key themes (TF-IDF), verse density
- `/api/random-verse` — Single random verse with book/volume context (for landing page)
- `/api/book-stats` — Word/verse counts per book

## Key Patterns
- `displayName()` in queries.ts normalizes all volume and book names (D&C fix)
- Volume data comes from SQLite via sql.js (client-side)
- API routes in `src/app/api/` wrap the query functions
- Charts use Chart.js with datalabels plugin + legendMarginPlugin
- Results clear when volume selection changes
- Deep linking: URL params updated on search, read on mount
- Single-book volume detection: `vol.books.length === 1` triggers chapter-level plotting
