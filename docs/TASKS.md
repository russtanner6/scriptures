# Scripture Explorer — Task Tracker

**This file is the single source of truth for all requested work.**
Updated every session. If Claude's session closes, the next session picks up from here.

Legend: `[ ]` = not started, `[~]` = in progress / partially done, `[x]` = complete

---

## Active / Requested Tasks (Priority Order)

### NEXT SESSION — START HERE

- [~] **LLM Chapter Scoring (Sentiment + Speakers)** — User is scoring ALL 1,764 chapters through Gemini using a combined guide that produces both sentiment scores AND speaker tags per chapter. Clean scaffold exists at `data/chapter-sentiments.json` (1,764 entries). 358 chapters already scored (Genesis, Exodus, Leviticus 1-5+16, D&C 1-138, 1 Samuel 1, Job 1-2, Psalms 1, plus all Apocrypha scored so far: 1 Esdras, 2 Esdras, 1 Maccabees, 2 Maccabees, Tobit, Wisdom, Sirach, Judith, Baruch, Additions to Esther, Prayer of Azariah). Remaining: all OT beyond Gen/Ex/Lev, all NT, all BoM, Susanna, Bel and the Dragon, Prayer of Manasses. Use `scripts/merge-sentiments.py` to merge incoming data. Once complete, wire Sentiment Explorer to read from JSON instead of keyword lexicon. A new combined SCORING-AND-SPEAKERS-GUIDE.md needs to be created on the Desktop. *(Session 19)*

- [ ] **Mood Match feature** — Use sentiment data to recommend chapters matching user's emotional state. "I'm feeling anxious" → chapters scored high on Covenant Peace. *(Requested: Session 19)*

- [ ] **Sentiment methodology sidebar** — Explain how sentiment scoring works (lexicon approach + LLM scoring, 4 categories, valence weighting). *(Requested: Session 19)*

- [~] **Word Explorer** — Core page built at `/word-explorer` with 3-level drill-down (Volumes → Books → Chapters), multi-term comparison, shaded curves. Still needed:
  - Cascading dropdowns (same pattern as Sentiment Explorer)
  - Redirects from old routes (/search, /narrative-arc, /heatmap)
  - Nav menu, footer, and home page updates to replace old tool links
  - Further polish and testing
  *(Requested: Session 18, core done, volume curves added Session 19)*

- [ ] **Real Scripture Search Engine** — Replace the current search icon behavior. Real-time AJAX results in dropdown, search results page with filters, people/places integration (searching "Adam" surfaces character profile). Completely separate from Word Explorer. *(Requested: Session 18)*

- [ ] **Speaker data audit** — Gemini processing the full speakers.json. Waiting for corrected file. Key fixes: prophetic book misattributions (God → prophet name), remove generic/anonymous entries. SPEAKERS-GUIDE.md exported to Desktop. *(Session 18)*

- [ ] **People database audit** — Remove generic/anonymous entries (e.g., "Father Of Demon-Possessed Boy"). *(Session 19)*

- [ ] **Chiasmus data audit** — Verify the 40 entries, especially BoM ones. Research online. *(Requested: Session 18)*

- [~] **Funny Stories tool** — Data file created (21 synopses). Need page, in-reader pills, nav entry. *(Requested: Session 18)*

- [ ] **Convert remaining modals to slide-outs** — MethodologyModal, ExportChartModal. *(Requested: Session 18)*

- [ ] **Firebase integration** — Auth + Firestore. *(Requested: Session 17)*

- [~] **Apocrypha follow-up** — Mostly done. Need: characters, intro page. *(Session 18)*

- [ ] **Verse selection Phase 2** — Notes/tags on selections. *(Requested: Session 14)*

- [ ] **API key rotation** — Key exposed in chat during Session 19. User needs to rotate. *(Session 19)*

### OTHER PENDING

- [ ] **Character Relationship Visualizer** — Force-directed graph. *(Requested: Session 12)*
- [ ] **More Context Nuggets** — 1,139 → ~1,500. Gaps: Psalms, Isaiah, Jeremiah. *(Session 12)*

### LOW PRIORITY / FUTURE

- [ ] **Emotional Journey Map** — Flowing river visualization of sentiment across scripture. *(Creative idea: Session 19)*
- [ ] **Tone Comparison** — Radar charts comparing sentiment per book. *(Creative idea: Session 19)*
- [ ] **Sentiment Heatmap** — Color grid of every chapter by dominant sentiment. *(Creative idea: Session 19)*
- [ ] **Emotional Bookends** — Find chapters that arc from lament to praise. *(Creative idea: Session 19)*
- [ ] **Verse-of-the-Day by Mood** — Daily verse recommendation based on emotional category. *(Creative idea: Session 19)*

- [ ] **General Conference Talk Archive** — Full archive of LDS General Conference talks. Details TBD — user will specify scope, search features, and integration approach in a future session. Likely uses the same engine (search, heatmap, word frequency) applied to conference talks instead of scripture. *(Requested: Session 15)*

- [ ] **Pre-computation audit** — Chapter stats, topic similarity, word cloud top-N. *(Session 14)*
- [ ] **ParallelPassagesTool update** — Not updated to new search panel pattern. *(ROADMAP.md)*
- [ ] **More character portraits** — 49 prompts ready in `~/Desktop/Character Portrait Prompts.md`. *(Session 15)*
- [ ] **PWA conversion** — Manifest, service worker, offline. *(ROADMAP.md)*
- [ ] **Modern language for D&C + PoGP** — OT/NT/BoM done. *(ROADMAP.md)*
- [ ] **Firebase Auth + user accounts** — Saved searches, reading progress sync. *(ROADMAP.md)*

---

## Known Bugs / Issues

- [ ] 403 overlapping verse ranges in Bible speaker data *(Session 9)*
- [ ] verseEnd=200 sentinels still in speaker data file *(Session 9)*
- [ ] Mobile hamburger menu links may not work *(Session 8)*

---

## Completed (Session 19)

**Sentiment Revamp:**
- [x] Rewrite sentiment lexicon: 7 categories → 4 theological categories with weighted valence
- [x] Update sentiment API with 4 drill-down levels (volumes/books/chapters/verses)
- [x] Rewrite SentimentArcTool with cascading dropdown navigation
- [x] Rename "Sentiment Arc" → "Sentiment Explorer"
- [x] Build `scripts/score-chapters.ts` for LLM-based chapter scoring
- [x] Score ~1,460 chapters via Claude Sonnet 4.5
- [x] Export scoring guide + book files for Gemini gap-filling

**Word Explorer:**
- [x] Volume-level chart: bars → shaded curve (Line with fill)

**UI Standardization:**
- [x] Standardize all tool page h1 headings (centered, 1.8rem, fontWeight 800)
- [x] Add 24px top padding to `.page-container` globally
- [x] Global styling standardization *(was pending from Session 18)*

**Other:**
- [x] Hide Speaker/Context toggles (always on, code preserved)

---

## Completed (Session 16)

**Header & Navigation:**
- [x] Header.tsx rewrite: dark nav bar, tree logo centered linking to home, hamburger right
- [x] Home page: "SCRIPTURE EXPLORER" h1 in caps, white subtitle, new header bar
- [x] Scripture nav pages: centered logo linking to home (volume picker, book list, chapter grid)
- [x] Consistent header bar height/style across ALL pages (tools and scripture nav)
- [x] Hamburger menu: staggered-width lines everywhere, no MENU text in scriptures
- [x] Tool page consistency: Header from page file, removed internal Header from 3 tool components

**Search Experience:**
- [x] Preset search buttons on Word Search, Narrative Arc, and Heatmap empty states
- [x] Narrative Arc: 6 multi-term presets (Faith vs. Works, Grace & Mercy, etc.)
- [x] Heatmap + Word Search: 6 single-term presets (faith, covenant, repent, etc.)

**Chiasmus Page Rework:**
- [x] Complete rewrite from algorithmic detector to curated catalog
- [x] 40 documented chiastic structures (23 verified, 15 probable, 2 possible)
- [x] Coverage: OT 13, NT 10, BoM 13, D&C 1, PoGP 3
- [x] Card grid UI with volume filter pills and category sections
- [x] Slide-in detail panel with full A–B–C…C'–B'–A' structure visualization
- [x] Scholar attribution and source citations (Welch, Wenham, Lund, etc.)

**UI Polish:**
- [x] Backdrop blur standardized to blur(4px) on all slide-in panels
- [x] Consistent scripture nav bar styling (logo in center for nav views)

---

## Completed (Session 15) — 30+ items

**Scripture Reader UI:**
- [x] Consistent dark nav bar across all scripture views (volume/book/chapter picker + reading)
- [x] Desktop header: tree logo → chapter selector in top center, back-nav hierarchy
- [x] Chapter grid view added (Volumes → Books → **Chapters** → Reading)
- [x] Bottom bar: chapter selector removed (moved to top), just prev/next arrows
- [x] Progress bar moved from top of page to top of bottom bar
- [x] Mobile swipe left/right for chapter navigation
- [x] Volume picker: centered h1, clean layout
- [x] Top-right icons: all white, equal spacing, search → site-wide /search
- [x] Footer sticky to bottom (flexbox layout)

**SEO & Discoverability:**
- [x] SEO-friendly URLs: `/scriptures/new-testament/john/11` (was `?bookId=43&chapter=11`)
- [x] Legacy URL auto-redirect to new format
- [x] SSR verse text: hidden server-rendered content for search engine indexing
- [x] Dynamic metadata: page titles + descriptions per chapter
- [x] Dynamic XML sitemap: 1,688 URLs for Google Search Console
- [x] Proper h1 tags on scripture views

**Speaker & People System:**
- [x] Speaker labels: name line 1, descriptor line 2 (commas + parentheses)
- [x] Group speakers hidden (only individuals with character profiles)
- [x] People pill → scroll to first speaking verse
- [x] Speaker portrait: theology-mode aware (divine OT → Jesus portrait)
- [x] 28 characters fixed with scripture-text aliases (Mary of Bethany, Captain Moroni, etc.)
- [x] Theology mode removed — site always LDS
- [x] Portraits added: Jesus Christ, Holy Ghost, Brigham Young, Oliver Cowdery, Satan

**Nugget System (formerly "Eggs"):**
- [x] EGG → NUGGET full rename (components, API, data, CSS, analytics)
- [x] Nugget popup → right-side slide-in panel
- [x] Pill labels: singular/plural with count in parentheses
- [x] Nugget panel: inline source icon + 25% separator line

**Other:**
- [x] Accent blue #2563EB → #2CC1E8
- [x] All slide-out panels widened ~10% (85vw max)
- [x] Midjourney portrait prompts file rebuilt (49 characters)
- [x] docs/TASKS.md persistent task tracker created and maintained

---

## How This File Works

1. **User requests something** → Claude adds it here immediately
2. **Claude starts work** → marks `[~]`
3. **Claude finishes** → marks `[x]`
4. **Session ends** → Claude updates, commits, pushes
5. **Session starts** → Claude reads this to know what's pending
6. **Session closes unexpectedly** → next session has the full picture

**This file is committed to git and pushed to GitHub with every session.**

## Sitemap Maintenance (MANDATORY)

The sitemap at `src/app/sitemap.ts` auto-generates `/sitemap.xml` with all URLs.
**Every session must check:** If any changes were made that affect URLs (new pages, renamed routes, new scripture sections, new tools), verify the sitemap includes them. The sitemap reads from the SQLite database for scripture pages, so adding new books/volumes (e.g., Apocrypha) will auto-include them once in the DB. Static pages must be added manually to the `entries` array in `sitemap.ts`.
