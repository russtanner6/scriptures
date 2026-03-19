# Scripture Explorer — Product Roadmap

## Vision
Scripture Explorer is a scripture research tool first, but evolving into a full scripture study platform with user accounts, personalized reading, and premium features.

## Audience
Built to house the **full LDS canon** (OT, NT, Book of Mormon, D&C, Pearl of Great Price), but **not all users will be LDS**. The tool should be welcoming and useful to anyone studying the Bible.

### Volume Visibility Settings (Future)
- Users should be able to **permanently hide volumes** they don't want to see
- Global user preference, not per-search. When hidden: excluded from all selectors, searches, charts, reader
- Before user accounts: `localStorage`. After: Firebase user profile
- Default: all volumes visible

**Domain:** scripturexplorer.com (hosted on Vercel)

---

## Completed Features

### Analysis Tools
- **Word Frequency Search** (`/search`) — single word/phrase search with bar charts, narrative arc, data table, stat cards
- **Narrative Arc Explorer** (`/narrative-arc`) — multi-term comparison (up to 6), all 5 volumes, deep linking
- **Theme Heatmap** (`/heatmap`) — single-word heatmap across all volumes with heatmap/arc toggle per module
- **Word Cloud** (`/wordcloud`) — interactive tag cloud per book/chapter/volume
- **Sentiment Arc** (`/sentiment`) — emotional tone across books, 7 categories
- **Parallel Passages** (`/parallel`) — side-by-side comparison with word-level diff
- **Chiasmus Detector** (`/chiasmus`) — ABBA pattern detection with visual display
- **Topic Map** (`/topics`) — chapter similarity finder via cosine similarity

### Reading Experience
- **Scripture Reader** (`/read`) — full reading with light/dark mode, font size, keyboard nav, reading progress, Chapter Insights, verse popover, annotations
- **Bookmarks** (`/bookmarks`) — saved verse bookmarks grouped by volume
- **Resource Layer** — inline video/article/PDF markers on verses, slide-in panel with YouTube embeds, toggle on/off
- **Reading Streaks** — chapter completion tracking with streak counter
- **Word Explorer Panel** — slide-up in-context panel for exploring word frequency across book/volume/all scopes without leaving the reader
- **Speaker Legend** — color-coded speaker pills in Chapter Insights showing who speaks in each chapter
- **UI Polish** — cream light theme, lighter dark theme, gradient progress bar (5 volume colors), centered tree logo, inverted bottom bar, inline verse numbers

### Infrastructure
- **Scripture Panel** — right-side slider showing matching verses when clicking any chart data point
- **Export** — PNG/JPG/PDF export on all chart modules
- **Deep Linking** — URL params on all tools for sharing
- **Landing Page** (`/`) — hero, 6 core + 4 discovery tool cards, random verse, recent searches
- **Nav Menu** — slide-in from right, organized by Analyze/Discover/Read
- **Footer** — site-wide with nav links and resources
- **Tree Logo** — centered white tree SVG in header

### Data
- **Speaker Attribution Data** — `data/speakers.json` from Clear-Bible dataset (6,913 entries, full Bible, all 66 books)
- **Resource Seed Data** — `data/resources.json` (6 entries: Genesis 1 + Matthew 5)
- **Parallel Passages** — `data/parallel-passages.json`

---

## Up Next — Immediate Priorities

### 1. Speaker Attribution UI
**Data is ready** in `data/speakers.json`. Need to build the visual layer:
- Color-coded verses by speaker type (divine=gold, prophet=blue, apostle=green, angel=silver, narrator=gray, other=default)
- Speaker name displayed vertically along the left side of verse spans
- Toggle on/off in reader toolbar (like the resource toggle)
- API route: `/api/speakers?book=Genesis&chapter=1`
- Start with Bible books (full coverage), BoM/D&C/PoGP data needed later

### 2. ParallelPassagesTool Search Panel Update
Last tool not updated to the new search panel pattern. Needs dark theme CSS variables and consistent layout.

### 3. Mobile UX Refinement
- Test all features at 375px minimum
- "Clean by default, power users can dig in" philosophy
- Resource layer mobile layout
- Speaker layer mobile layout

### 4. Visual QA Pass
- Verify all pages at desktop + mobile widths
- Check logo, hamburger, nav menu consistency across all pages

---

## Near-Term Features

### Verse-as-Module Architecture
User vision: treat each verse as its own interactive module supporting:
- **Favorite verses** — heart icon on each verse, saved to localStorage → Firebase
- **Non-sequential multi-verse selection** — select scattered verses to add notes/tags to as a group
- **Color-coding by user** — personal verse highlighting with custom colors
- **Personal notes per verse** — already have annotations, but expand to support richer content

### Modern Language Toggle
- Toggle between KJV and a modern/natural language paraphrase per verse or chapter
- Need a data source: public domain modern translation or AI-generated paraphrase
- Could start with a single book as proof of concept
- Database schema: `translations` table with verse_id + translation_id + text

### Saved/Favorited Queries
- Heart icon on search results to save a query (word + volumes + options)
- Saved searches visible in user dashboard
- One-click to re-run a saved search
- Requires Firebase for cross-device persistence

---

## Tier 3 — User Accounts & Personalization (Firebase)

### User Authentication (Firebase Auth)
- Email/password + Google Sign-In
- Required for: saved searches, reading progress sync, favorites across devices
- Firebase free tier is generous, easy to set up with Next.js

### Reading Plans & Progress
- Pre-built plans: Come Follow Me, chronological, topical, 90-day challenge
- Custom plans: user picks books/chapters, sets pace
- Progress tracking: checkmarks per chapter, streak counter, completion percentage
- Daily reading reminder (push notification or email)

### Cross-Reference Explorer
- Parse LDS scripture footnotes for cross-reference data (or use open dataset)
- Visual web/graph showing connections between verses
- Could use AI-generated semantic similarity as fallback

---

## Tier 4 — Advanced / Premium Features

### Chapter Summaries
- AI-generated one-paragraph summary per chapter
- Generated once and cached
- Useful as quick reference while browsing

### Volume Visibility Settings
- Per-user volume hiding (see Audience section above)

---

## Monetization Ideas
- **Free tier:** All analysis tools, scripture reader, basic bookmarks
- **Premium ($4.99/mo or $29.99/yr):**
  - Saved searches & favorites (cross-device)
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

---

## Priority Order
1. **Speaker Attribution UI** — data ready, build the visual layer
2. **ParallelPassagesTool update** — last tool needing search panel refresh
3. **Mobile UX refinement** — clean by default
4. **Favorite verses** (heart icon, localStorage first)
5. **Modern Language Toggle** (need data source)
6. **Firebase Auth + Saved Searches**
7. **Reading Plans**
8. **Cross-Reference Explorer**
9. **Chapter Summaries**
10. **Volume Visibility Settings**
