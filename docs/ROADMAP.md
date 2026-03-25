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
- **Sentiment Explorer** (`/sentiment`) — theological sentiment analysis with 4 categories (Exaltation/Glory, Covenant Peace, Admonition/Justice, Trial/Contrition), cascading drill-down, weighted valence scoring, LLM-scored chapter data (in progress)
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

### People & Places
- **Character Directory** (`/characters`) — 757 named individuals with bios, family trees, portraits (~40 with portraits)
- **CharacterDetailPanel** — slide-in panel with bio, aliases, scripture mention heatmap, first/last mention links, volume pills with tooltips, tone radar chart
- **"People in this Chapter"** — Chapter Insights shows characters found via speaker matching + text scanning, wired to detail panel
- **Location Directory** (`/locations`) — 333 named places with descriptions, coordinates (183 known), search, filters
- **LocationDetailPanel** — slide-in panel with OpenStreetMap embed, mention stats, volume heatmap, Google Maps link
- **Entity Linking** — ScriptureReader auto-hyperlinks first mention of each person/place per chapter

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
- **Character Database** — 757 characters with bios, aliases, family relationships, portraits
- **Location Database** — 333 scripture locations with descriptions, coordinates, aliases
- **Context Eggs** — ~930+ scholarly insights across all volumes (5 categories)
- **LLM Chapter Sentiments** — `data/chapter-sentiments.json` (~1,460 of 1,764 scored via Claude Sonnet 4.5, gaps being filled via Gemini)
- **Resource Seed Data** — `data/resources.json`
- **Chiasmus Catalog** — 40 documented chiastic structures with scholar attribution

---

## Up Next — Immediate Priorities

### 1. Wire Sentiment Explorer to LLM Data
`data/chapter-sentiments.json` has ~1,460 of 1,764 chapters scored by Claude Sonnet 4.5. User filling ~264 gaps via Gemini. Once complete, switch Sentiment Explorer from keyword lexicon to LLM-scored data for much higher quality results.

### 2. Mood Match Feature
Use LLM sentiment data to recommend chapters matching user's emotional state. "I'm feeling anxious" → chapters scored high on Covenant Peace. Could integrate with reading streaks to suggest counterbalance chapters.

### 3. Word Explorer Completion
Cascading dropdowns (same drill-down pattern as Sentiment Explorer), redirects from old routes (/search, /narrative-arc, /heatmap), nav/footer/home page updates.

### 4. Speaker Data QA
Gemini processing the full speakers.json. Waiting for corrected file. Key fixes: prophetic book misattributions (God → prophet name), remove generic/anonymous entries.

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

### Kid Mode
A child-friendly scripture reading experience for kids (ages 4-10) or parents reading with young children. The goal: make scripture accessible to children without parents needing to simplify on the fly.

**Core concept:**
- **Simplified narrative text** — Every chapter rewritten in simple, age-appropriate language (narrative/story format, not verse-by-verse). Short sentences, common vocabulary, concrete descriptions.
- **Illustrations** — Pictures for key scenes in each chapter. Could be AI-generated or commissioned artwork. Style should be warm, engaging, and reverent (not cartoonish).
- **Toggle in reader** — Parent or child can switch Kid Mode on/off per session or in Settings. When on, replaces the standard KJV text with the simplified version and shows illustrations inline.
- **Two use cases:** (1) Kids reading independently on a tablet, (2) Parents using it as a bedtime scripture story guide

**Data requirements:**
- Simplified text for every chapter (similar to `text_modern` column but for kids — shorter, story-format)
- Image assets per chapter (or per key scene)
- Probably a `text_kids` column in the verses table, or a separate `chapter_kids_narrative` JSON

**Design considerations:**
- Larger font, more whitespace, warmer colors
- Possibly audio narration (read-aloud) in the future
- Age-appropriate content filtering (some OT content is not suitable for young children — battles, violence, etc. could be softened or summarized)
- Progress tracking could tie into a kid-friendly reward system (stickers, badges)

**Priority:** Future feature — requires significant content generation. Could start with a pilot on a single book (e.g., 1 Nephi or Genesis stories) to validate the approach.

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
1. **Wire Sentiment Explorer to LLM data** — switch from keyword lexicon to chapter-sentiments.json
2. **Mood Match feature** — chapter recommendations by emotional state
3. **Word Explorer completion** — cascading dropdowns, old route redirects, nav updates
4. **Speaker Data QA** — verify BoM/D&C/PoGP accuracy (Gemini audit in progress)
5. **People database audit** — remove generic/anonymous entries
6. **Funny Stories tool** — page UI + in-reader pills (data done)
7. **Reader UI polish** — narrations, resource pills, bottom bar, mobile panels
8. **More character portraits**
9. **PWA conversion**
10. **Firebase Auth + Saved Searches**
11. **Reading Plans**
12. **Cross-Reference Explorer**
13. **Chapter Summaries**
