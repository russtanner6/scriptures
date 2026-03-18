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
│   ├── read/          # Scripture reader (volume → book → chapter)
│   └── api/          # API routes (books, word-frequency, word-frequency-by-chapter, heatmap, verses, chapter, book-stats)
├── components/
│   ├── WordFrequencyTool.tsx  # Main search interface (42KB)
│   ├── NarrativeArcTool.tsx   # Multi-term narrative arc comparison
│   ├── HeatmapTool.tsx        # Theme heatmap with arc toggle per volume
│   ├── ExportHtmlModal.tsx    # HTML-to-image export (html2canvas)
│   ├── DashboardCard.tsx      # Collapsible section wrapper (supports headerExtra)
│   ├── DataTable.tsx          # Sortable results table
│   ├── StatCard.tsx           # Stat pills
│   ├── ScripturePanel.tsx     # Right-side slider panel for verse viewing
│   ├── ScriptureReader.tsx    # Full scripture reader with light/dark mode
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
1. **Word Search** (`/`) — Single-word frequency search with bar charts, narrative arc section, data table, stat cards. Has "Compare multiple terms →" link in narrative arc header. Sticky jump-to nav.
2. **Narrative Arc** (`/narrative-arc`) — Multi-term comparison (up to 6). Multi-volume with stacked charts. D&C plots by section. Sticky jump-to nav. Deep linking (`?terms=faith,grace`). Export per chart.
3. **Theme Heatmap** (`/heatmap`) — Single-word heatmap across all volumes. Each volume module has heatmap/arc view toggle (flame icon / curve icon, smooth fade transition). Color-coded cells by volume. Per-volume color scale legends (centered, under heading). Descriptive subtitle with reference count. Export per module. "Compare multiple keywords →" link to narrative arc with term prepopulated. Sticky jump-to nav. Deep linking (`?word=faith`). Hovering a colored cell shows tooltip above cell (not bottom of page). Clicking a cell opens ScripturePanel with chapter-specific verses. Arc view points also clickable.
4. **Scripture Reader** (`/read`) — Volume picker → Book list → Chapter reading view. Light/dark mode toggle (localStorage). Prev/next chapter nav with cross-book support. Verse numbers link to churchofjesuschrist.org. Deep linking (`?bookId=X&chapter=Y&highlight=word`). Full-screen overlay reading view.
5. **Future:** Home landing page with tool links.

## Key Components
- **ScripturePanel** — Right-side slider panel that shows matching verses when clicking any data point (bar chart, narrative arc point, heatmap cell). Dark theme, slide-in animation, Escape/backdrop to dismiss. Full-width on mobile. Props include optional `chapter` (for heatmap cells) and `volumeColor` (for accent theming). Replaces the old VerseModal.
- **ExportChartModal / ExportButton** — Reusable Chart.js export (PNG/JPG/PDF via jsPDF). Solid dark background modal.
- **ExportHtmlModal** — Reusable HTML-to-image export (uses html2canvas). For non-chart modules like heatmaps.
- **legendMarginPlugin** — Chart.js plugin adding space below legend. Apply to all Line charts.
- **DashboardCard** — Section wrapper with `headerExtra` prop for inline links/actions.
- **useIsMobile(768)** — Hook for responsive layout. Defined in WordFrequencyTool, NarrativeArcTool, HeatmapTool.
- **search-bar-glow** — CSS class for search bar border glow animation (2.5s delay, runs once on load).

## API Routes
- `/api/books` — All volumes with books
- `/api/word-frequency` — Word frequency by book (supports volumeIds, bookIds filters)
- `/api/word-frequency-by-chapter` — Word frequency by chapter/section for a single book (used for D&C)
- `/api/heatmap` — Word frequency by book+chapter for all volumes (used for heatmap grid)
- `/api/verses` — Fetch matching verses for a book (supports optional `chapter` filter)
- `/api/chapter` — Fetch all verses for a book+chapter (for scripture reader, no search filter)
- `/api/book-stats` — Word/verse counts per book

## Key Patterns
- `displayName()` in queries.ts normalizes all volume and book names (D&C fix)
- Volume data comes from SQLite via sql.js (client-side)
- API routes in `src/app/api/` wrap the query functions
- Charts use Chart.js with datalabels plugin + legendMarginPlugin
- Results clear when volume selection changes
- Deep linking: URL params updated on search, read on mount
- Single-book volume detection: `vol.books.length === 1` triggers chapter-level plotting
