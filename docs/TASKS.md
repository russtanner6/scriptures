# Scripture Explorer — Task Tracker

**This file is the single source of truth for all requested work.**
Updated every session. If Claude's session closes, the next session picks up from here.

Legend: `[ ]` = not started, `[~]` = in progress / partially done, `[x]` = complete

---

## Active / Requested Tasks (Priority Order)

### NEXT SESSION — START HERE

- [ ] **Apocrypha as a "Library" collection** — Add KJV Apocrypha (14 books: 1 Esdras, 2 Esdras, Tobit, Judith, Additions to Esther, Wisdom, Sirach, Baruch, Prayer of Azariah, Susanna, Bel and the Dragon, Prayer of Manasses, 1 Maccabees, 2 Maccabees). **Data source:** `https://api.getbible.net/v2/kjva/{book_number}/{chapter}.json` — confirmed available in JSON. **Implementation plan:**
  1. Create `scripts/build-apocrypha.ts` to fetch all 14 books from the API and build verse data
  2. Add to SQLite as a separate "Apocrypha" volume (or parallel table) — NOT mixed with canonical 5 volumes
  3. Add "Apocrypha" as a 6th option in the scripture reader with distinct visual treatment (different accent color, "non-canonical" banner/badge)
  4. Opt-in: doesn't appear in default searches/charts/word frequency unless explicitly selected
  5. Add Apocrypha characters to `data/characters.json` (Judith, Tobit, Mattathias, Judas Maccabeus, etc.)
  6. Rebuild mention stats after adding characters
  7. Add intro/landing for Apocrypha referencing D&C 91 ("many things contained therein that are true")
  *(Requested: Session 15)*

- [ ] **Verse selection / multi-select mode** — **Phase 1 (UI only):** On desktop, verse numbers become clickable on hover. Clicking one activates selection mode: that verse gets a checkbox, all other verse numbers become checkboxes. Can check any number of non-sequential verses. Clicking outside clears all checkboxes back to verse numbers. On mobile: long-press a verse to activate selection mode. **Phase 2:** Attach notes, tags, files to selections. **Phase 3:** Firebase persistence. *(Requested: Session 14)*

### OTHER PENDING

- [ ] **H1/H2 heading hierarchy audit** — Check all pages for proper semantic heading tags for SEO. Scripture pages now use h1 (Session 15), but other tool pages may skip levels. *(Requested: Session 15)*
- [ ] **Character Relationship Visualizer** — Full-screen force-directed graph from Characters page. `RelationshipWeb.tsx` exists with basic graph. *(Requested: Session 12)*
- [~] **"Found in X verses" link** — Inline expand works. Original spec was slide-out panel. *(Session 14)*
- [ ] **Chiasmus improvements** — Specs lost. **NEEDS USER INPUT.** *(Session 13)*
- [ ] **More Context Nuggets** — 1,096 → ~1,500. Gaps: Psalms, Isaiah, Jeremiah. *(Session 12)*
- [ ] **Consistent scripture nav bar styling** — The dark top bar works but the volume picker/book list/chapter grid views don't have the same visual background treatment as the reading view (different bg gradient). Minor polish. *(Noted: Session 15)*

### LOW PRIORITY / FUTURE

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
