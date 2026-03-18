# Scripture Explorer — Product Roadmap

## Vision
Scripture Explorer is a scripture research tool first, but could evolve into a full-blown scripture study platform with user accounts, full scripture reading, and premium features.

## Audience
Built to house the **full LDS canon** (OT, NT, Book of Mormon, D&C, Pearl of Great Price), but **not all users will be LDS**. The tool should be welcoming and useful to anyone studying the Bible.

### Volume Visibility Settings
- Users should be able to **permanently hide volumes** they don't want to see (e.g., a non-LDS user hides BoM, D&C, PoGP and only sees OT + NT).
- This is a **global user preference**, not a per-search toggle. When a volume is hidden:
  - It doesn't appear in volume selectors on any page
  - It's excluded from all searches, charts, heatmaps, and results
  - It doesn't show in the scripture reader (future)
- Before user accounts exist: store preference in `localStorage`
- After user accounts: store in Firebase user profile
- Default: all volumes visible
- Settings accessible from a gear icon or settings page

## Current State (Live)
- **Word Frequency Search** (`/`) — single word/phrase search with bar charts, narrative arc, data table, stat cards
- **Narrative Arc Explorer** (`/narrative-arc`) — multi-term comparison across volumes, stacked charts, D&C section-level, export, deep linking
- **Domain:** scripturexplorer.com (Vercel)

---

## Tier 1 — Immediate (Next Session)

### ✅ DONE: Export on Narrative Arc + Heatmap
- ExportButton + ExportChartModal on narrative arc charts
- ExportButton + ExportHtmlModal on heatmap modules
- Still needed: ExportButton on word frequency page chart modules

### ✅ DONE: Heatmap Page with Arc Toggle
- Theme Heatmap page with per-volume modules
- Heatmap/Narrative Arc view toggle per module
- "Compare multiple keywords →" link to narrative arc page with term prepopulated

### ✅ DONE: Scripture Panel (Right-Side Slider)
This is the foundation that connects everything. When a user clicks any data point:
1. A **right-side slider panel** slides in from the right edge of the screen
2. Shows all **matching verses** from that book/chapter with the search term **highlighted**
3. Panel has a "Read in context →" link that deep-links to the full scripture reader page
4. Panel can be dismissed by clicking outside or pressing X

**What triggers the panel:**
- Clicking a **narrative arc data point** → shows verses from that book (or section for D&C)
- Clicking a **heatmap cell** → shows verses from that specific chapter
- Clicking a **bar chart row** icon → already opens verse modal (refactor to use the panel instead)
- All modules should have a subtle note: "Click any point to read verses"

**Implementation plan:**
1. Create `ScripturePanel.tsx` — slide-in panel component
   - Takes: bookId, chapter (optional), searchWord, onClose
   - Fetches matching verses via `/api/verses`
   - Highlights search term in verse text using `<mark>` tags
   - Shows book name, chapter:verse references
   - "Read in context →" link (points to future `/read/...` page)
   - Responsive: full-width overlay on mobile, right-side panel on desktop
2. Add panel state to each page (which book/chapter is open)
3. Wire click handlers:
   - Narrative arc: Chart.js `onClick` event → get clicked point's book/section
   - Heatmap: cell `onClick` → already has bookId + chapter
   - Bar charts: refactor existing verse modal to use ScripturePanel
4. Add "Click any point to read verses" hint text to module descriptions

### ✅ DONE: Full Scripture Reader (`/read`)
- After the panel works, build the full reader page
- URL structure: `/read/ot/genesis/1`, `/read/dc/76`, etc.
- Clean reading layout, chapter navigation, search term highlighting
- The panel's "Read in context →" links point here

### Word Cloud
- Could be added to the existing word frequency page as a visualization option
- Shows most-used words in a selected book, chapter, or volume
- Visual and shareable — good for social media / presentations

---

## Tier 2 — Near-Term Features

### Theme Heatmap (`/heatmap`)
- Pick a theme/word → see a heatmap grid: rows = books, columns = chapters
- Color intensity = frequency
- Like a GitHub contribution chart for scripture themes
- Clicking a cell opens the verses
- Could be stunning visually with the warm volume color palette
- **Implementation:** Query word frequency by chapter for all books. Render as CSS grid with color-scaled cells.

### Full Scripture Reader (`/read`)
- Browse all scriptures: Volume → Book → Chapter → Verses
- Clean, readable layout (like a digital scripture book)
- Search term highlighting when arriving from a search
- **Right-side slider panel** instead of full-page modal when clicking data points elsewhere on the site
  - Shows relevant verses with context
  - "Go deeper" link takes you to the full reader page at that location
- This replaces the current verse modal approach with something more integrated
- **Implementation:** New page with URL routing (`/read/bom/alma/32`), verse rendering component, highlight support

### Modern Language Toggle
- Toggle between KJV and modern/natural language translation
- Possibly Hebrew for OT
- Would need a second (or third) text source in the database
- **Data consideration:** Need to source or license modern translations. Could use public domain translations or partner with a publisher.

---

## Tier 3 — User Accounts & Personalization (Firebase)

### User Authentication (Firebase Auth)
- Email/password + Google Sign-In
- Required for: saved searches, reading progress, favorites
- Firebase is the right choice — free tier generous, easy to set up with Next.js

### Saved Searches / Favorites
- Save any search (word, options, volumes) to user profile
- "Favorites" area in user dashboard showing saved charts/searches
- One-click to re-run a saved search
- Could include saved snapshots of charts (stored as image URLs)

### Reading Plans & Progress
- Pre-built plans: Come Follow Me, chronological, topical, 90-day challenge
- Custom plans: user picks books/chapters, sets pace
- Progress tracking: checkmarks per chapter, streak counter, completion percentage
- Daily reading reminder (push notification or email)
- **Implementation:** Firebase Firestore for plan data + progress. React components for plan browser, progress tracker.

### Verse of the Day / Discovery
- Shows on home page and/or user dashboard after login
- Random or curated interesting verses with context
- Could highlight lesser-known passages
- Share button for social media

---

## Tier 4 — Advanced / Premium Features

### Cross-Reference Explorer
- **Challenge:** The current database doesn't have cross-reference data
- **Options:**
  1. Build cross-reference data from LDS scripture footnotes (would need to parse footnote markup from source files)
  2. Use an existing cross-reference dataset (some are available as open data)
  3. AI-generated connections (semantic similarity between verses)
- Visual web/graph showing connections between verses
- Could be a premium feature due to complexity

### Speaker/Author Index
- **Challenge:** Needs speaker attribution data per verse (not in current DB)
- **Options:**
  1. Manual/crowdsourced tagging
  2. AI-assisted speaker detection (quotes are often marked in the text)
- Browse by speaker: see all of Jesus's words, Paul's letters, Nephi's writings
- Filter by volume, topic
- Visual timeline of a speaker's contributions

### Chapter Summaries
- AI-generated one-paragraph summary per chapter
- Could be generated once and cached in the database
- Useful as quick reference while browsing
- Could be a premium feature

### Side-by-Side Comparison
- Compare parallel passages (Isaiah ↔ 2 Nephi, Gospels ↔ 3 Nephi)
- Highlight differences, additions, omissions
- **Implementation:** Would need a mapping of parallel passages (partially available in existing cross-reference data)
- Split-screen view with synced scrolling

---

## Monetization Ideas
- **Free tier:** Word search, narrative arc, heatmap, basic scripture reader
- **Premium ($4.99/mo or $29.99/yr):**
  - Saved searches & favorites
  - Reading plans with progress tracking
  - Cross-reference explorer
  - Chapter summaries
  - Modern language toggle
  - Export to PDF
  - No ads (if ads are ever added to free tier)

---

## Technical Considerations

### Database Evolution
- Current: SQLite (sql.js, client-side, 13MB)
- For user accounts + saved data: Firebase Firestore
- For additional translations: extend SQLite schema with `translations` table
- For cross-references: new `cross_references` table linking verse IDs

### Architecture Evolution
- Current: Static Next.js + client-side SQLite
- With Firebase: Add Firebase SDK, auth middleware, Firestore for user data
- Scripture data stays in SQLite (fast, no server needed)
- User data in Firestore (real-time sync, offline support)

### Scripture Reader URL Structure
```
/read                          → Volume picker
/read/ot                       → Old Testament books
/read/ot/genesis               → Genesis chapters
/read/ot/genesis/1             → Genesis Chapter 1 verses
/read/bom/alma/32              → Alma 32
/read/dc/76                    → D&C Section 76
```

---

## Priority Order (Recommended)
1. Clickable chart points → verse reader (immediate)
2. Export on all charts (immediate)
3. Theme Heatmap (high impact, visually stunning)
4. Full Scripture Reader with right-side slider
5. Word Cloud on frequency page
6. Firebase Auth + Saved Searches
7. Reading Plans
8. Modern Language Toggle
9. Cross-Reference Explorer
10. Speaker/Author Index
