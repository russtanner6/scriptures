# Scripture Explorer — Product Roadmap

## Vision
Scripture Explorer is a scripture research tool first, but evolving into a full scripture study platform with user accounts, personalized reading, and premium features.

## Audience
Built to house the **full LDS canon** (OT, NT, Book of Mormon, D&C, Pearl of Great Price), but **not all users will be LDS**. The tool should be welcoming and useful to anyone studying the Bible.

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
- **Chapter Insights** — collapsible panel: People pills with speaker-colored borders + verse count, Speaker Timeline (color-coded horizontal bar), Key Themes (TF-IDF). Click timeline to jump to verse.
- **Speaker Labels** — horizontal layout with per-speaker unique colors, portrait avatars, subtle verse background tint
- **Mobile Back-Button** — `useBackToClose` hook on all panels/modals so back gesture closes panels instead of navigating away
- **Verse Deep Linking** — `?verse=N` scrolls to specific verse with highlight flash
- **UI Polish** — cream light theme, lighter dark theme, gradient progress bar, centered tree logo, always-dark bars, sliding reading mode toggle, shared modal system

### People
- **Character Directory** (`/characters`) — 302 named individuals with bios, family trees, portraits (~40 with portraits)
- **CharacterDetailPanel** — slide-in panel with bio, aliases, scripture mention heatmap, first/last mention links, volume pills with tooltips
- **"People in this Chapter"** — Chapter Insights shows characters found via speaker matching + text scanning, wired to detail panel

### Infrastructure
- **Scripture Panel** — right-side slider showing matching verses when clicking any chart data point
- **Export** — PNG/JPG/PDF export on all chart modules
- **Deep Linking** — URL params on all tools for sharing
- **Landing Page** (`/`) — hero, tool grid, character spotlight, random verse
- **Nav Menu** — slide-in from right, organized by Analyze/Discover/Read
- **Footer** — site-wide with nav links and resources
- **VolumeTooltip** — reusable component showing full volume name on hover for abbreviations

### Data
- **Speaker Attribution Data** — 7,631 entries across 82 books (Bible + BoM/D&C/PoGP)
- **Modern Translations** — 37,699 verses (OT/NT via WEB, BoM via Claude-generated)
- **Character Database** — 302 characters with bios, aliases, family relationships, portraits
- **Resource Seed Data** — `data/resources.json`
- **Parallel Passages** — `data/parallel-passages.json`

---

## Up Next — Immediate Priorities

### 1. User Preferences System (APPROVED — BUILD NEXT)
**A settings system that lets users customize their scripture experience based on their faith tradition.**

**Two settings:**

**Volume Visibility** — "Which volumes do I want to see?"
- 5 toggle switches (OT, NT, BoM, D&C, PoGP), all on by default
- When a volume is off: disappears from navigation, search results, characters, speakers, charts — everything
- Data is preserved: bookmarks, notes, annotations stay and reappear when toggled back on
- Filter layer, not deletion

**Old Testament Theology** — "Who is the LORD in the Old Testament?"
- Option A: "LDS / Latter-day Saint" — LORD/Jehovah = Jesus Christ (premortal). Default.
- Option B: "Traditional Christian" — LORD/God = God / the Trinity.
- Only affects OT speaker attributions and character associations
- NT/BoM/D&C/PoGP unaffected

**Implementation:**
- Phase 1 (now): `localStorage` preferences with React context (`PreferencesProvider`)
- Phase 2 (with accounts): Migrate to Firebase user profile, sync across devices
- Settings page (`/settings`) accessible from nav menu
- Future: onboarding screen for first-time visitors

**Architecture:**
```
src/lib/preferences.ts
├── getPreferences() / setPreferences()  → localStorage
├── usePreferences()                     → React hook
├── isVolumeVisible(abbrev)              → volume filter check
└── getTheologyMode()                    → "lds" | "traditional"
```

### 2. OT Speaker Theology Mapping
Build the actual data mapping for LORD/God → "Jesus Christ (Jehovah)" in OT contexts for LDS mode. Requires careful analysis of each OT "God"/"LORD" speaker entry to determine correct attribution per LDS doctrine.

### 3. Speaker Data QA
Verify accuracy of BoM/D&C/PoGP speakers in `speakers.json`. Known issues: some auto-generated entries may have incorrect attributions.

### 4. ParallelPassagesTool Search Panel Update
Last tool not updated to the new search panel pattern. Needs dark theme CSS variables and consistent layout.

---

## Near-Term Features

### Reader UI Polish
- **Chapter narrations** — Generate prose summaries for 1 Nephi (22 chapters) to enable "Narration" in sliding toggle
- **Resource pill simplification** — Single "Video"/"Link" pill per verse → carousel in ResourcePanel
- **Bottom bar controls** — Move search/text-size/chapter-selector to bottom bar. Keep dark/light toggle at top.
- **Mobile scripture panel** — Don't take full screen width; show chapter sliver behind
- **Chart horizontal scroll** — Draggable slider when zoomed in

### More Character Portraits
Only ~40 of 302 characters have portraits. Need to source/generate more.

### PWA Conversion
User wants this as a progressive web app. Add manifest, service worker, offline support.

### Verse-as-Module Architecture
- **Favorite verses** — heart icon, saved to localStorage → Firebase
- **Non-sequential multi-verse selection** — select scattered verses for group notes/tags
- **Color-coding by user** — personal verse highlighting with custom colors
- **Personal notes per verse** — expand existing annotations

### Modern Language Toggle
- OT+NT: WEB (done, 31,095 verses)
- BoM: Claude-generated (done, 6,604 verses)
- D&C + PoGP: not started

### Saved/Favorited Queries
- Heart icon on search results to save a query
- Requires Firebase for cross-device persistence

---

## Tier 3 — User Accounts & Personalization (Firebase)

### User Authentication (Firebase Auth)
- Email/password + Google Sign-In
- Required for: saved searches, reading progress sync, favorites across devices
- Onboarding screen asks volume visibility + theology preferences on first visit
- Firebase free tier is generous, easy to set up with Next.js

### Reading Plans & Progress
- Pre-built plans: Come Follow Me, chronological, topical, 90-day challenge
- Custom plans: user picks books/chapters, sets pace
- Progress tracking: checkmarks, streak counter, completion percentage

### Cross-Reference Explorer
- Parse LDS scripture footnotes for cross-reference data
- Visual web/graph showing connections between verses

---

## Tier 4 — Advanced / Premium Features

### Chapter Summaries
- AI-generated one-paragraph summary per chapter
- Generated once and cached

### Speaker Frequency Chart
- "Who's speaking" visualization across volumes/timelines
- Like narrative arc but for speakers instead of words

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
1. **User Preferences System** — volume visibility + OT theology mode (approved, ready to build)
2. **OT Speaker Theology Mapping** — LORD/God → Jesus Christ data for LDS mode
3. **Speaker Data QA** — verify BoM/D&C/PoGP accuracy
4. **Reader UI polish** — narrations, resource pills, bottom bar, mobile panels
5. **More character portraits**
6. **PWA conversion**
7. **ParallelPassagesTool update**
8. **Firebase Auth + Saved Searches**
9. **Reading Plans**
10. **Cross-Reference Explorer**
11. **Chapter Summaries**
