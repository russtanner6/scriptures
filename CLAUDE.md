# Scripture Explorer — Project Guide

## What is this?
A Next.js web app for searching and exploring scriptures with interactive visualizations, verse modals, and volume-based filtering. Volumes: Old Testament, New Testament, Book of Mormon, D&C, Pearl of Great Price.

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
│   └── api/          # API routes (books, word-frequency, verses, book-stats)
├── components/
│   ├── WordFrequencyTool.tsx  # Main search interface (42KB)
│   ├── NarrativeArcTool.tsx   # Multi-term narrative arc comparison
│   ├── DashboardCard.tsx      # Collapsible section wrapper (supports headerExtra)
│   ├── DataTable.tsx          # Sortable results table
│   ├── StatCard.tsx           # Stat pills
│   ├── VerseModal.tsx         # Full-screen verse viewer
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
- **Volume selectors:** Color-coded checkboxes (compact), not large pills. Multi-select enabled.
- **Search panels:** Two-column layout on desktop (search left, options/volumes right). Stacks vertically on mobile.
- **Chart legends:** Use `pointStyle: "rectRounded"` (not circles/ovals). Adequate spacing from chart top.
- **Nav menu:** Slides in from the RIGHT side of the screen.
- **DashboardCard:** Supports `headerExtra` prop for inline links/actions next to the description.
- **Data table headings:** 0.85rem, bold (700), bright (`var(--text)`). Body text: 75% white opacity.

### Dark Theme
- Background: dark grey palette (not pure black)
- Text: white hierarchy (--text, --text-secondary, --text-muted)
- Surfaces: glass-blur effect with subtle borders
- Accent: purple (#8b5cf6) for interactive elements

## Pages
1. **Word Search** (`/`) — Single-word frequency search with bar charts, narrative arc section, data table, stat cards. Has "Compare multiple terms →" link in narrative arc header.
2. **Narrative Arc** (`/narrative-arc`) — Multi-term comparison tool. Up to 6 terms overlaid on line charts. Multi-volume support with stacked charts.
3. **Future:** Home landing page with tool links.

## Key Patterns
- `displayName()` in queries.ts normalizes all volume and book names (D&C fix)
- Volume data comes from SQLite via sql.js (client-side)
- API routes in `src/app/api/` wrap the query functions
- Charts use Chart.js with datalabels plugin
- Results clear when volume selection changes
