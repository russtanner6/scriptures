# Scripture Explorer — Task Tracker

**This file is the single source of truth for all requested work.**
Updated every session. If Claude's session closes, the next session picks up from here.

Legend: `[ ]` = not started, `[~]` = in progress / partially done, `[x]` = complete

---

## Active / Requested Tasks (Priority Order)

### 1. SCRIPTURE READER UI CONSISTENCY
- [ ] **Consistent top bar across all scripture views** — Volume picker, book list, and chapter grid currently use the default site Header. They should all use the same dark bar as the reading view (with search link, font size, theme toggle, hamburger — no "MENU" text). Same visual language throughout the entire `/scriptures` experience. *(Requested: Session 15)*
- [x] **Desktop header revamp** — Tree logo → chapter selector in top center. Back-navigation hierarchy: Reading → Chapter grid → Book list → Volume picker. URLs reflect each level. Bottom bar cleaned up. Mobile swipe. *(Session 15)*
- [x] **Progress bar moved to bottom bar** — Gradient bar now at top of bottom nav bar instead of top of page. *(Session 15)*
- [ ] **Proper H1/H2 heading hierarchy for SEO** — Audit all pages for correct semantic heading tags. Currently some pages may use h2 where h1 is needed, or skip levels. *(Requested: Session 15)*

### 2. SEO & DISCOVERABILITY
- [ ] **SEO-friendly scripture URLs** — Change from `?bookId=42&chapter=11` to `/scriptures/new-testament/john/11`. Human-readable, search-engine-friendly paths. Next.js dynamic route segments `[volume]/[book]/[chapter]`. Also update volume/book URLs: `/scriptures/new-testament`, `/scriptures/new-testament/john`. *(Requested: Session 15)*
- [ ] **SSR for scripture content** — Server-side render base verse text so search engines can index all 41,995 verses. Interactive features (speakers, nuggets, entity links) hydrate client-side. Won't break any existing functionality — just adds pre-rendered HTML. *(Requested: Session 15)*

### 3. APOCRYPHA LIBRARY
- [ ] **Apocrypha as a "Library" collection** — Add KJV Apocrypha (~14-18 books) as a separate non-canonical collection. NOT a 6th volume. Same engine (reader, search, heatmap, narrative arc) but with distinct visual treatment (different accent color, "non-canonical" banner). Opt-in — doesn't appear in default searches/charts. Intro page referencing D&C 91. KJV Apocrypha text is public domain. Separate SQLite table or DB file, same verse schema. **Includes expanding the people database** with Apocrypha characters (Judith, Tobit, Maccabees, etc.). *(Requested: Session 15)*

### 4. VERSE SELECTION / MULTI-SELECT
- [ ] **Verse selection / multi-select mode** — **Phase 1 (this session):** Clicking a verse number on desktop (hover effect) activates selection mode. Clicked verse gets a checkbox, all other verse numbers become checkboxes too. Can check any number of non-sequential verses. Clicking outside clears all checkboxes. On mobile: long-press a verse to activate. **Phase 2:** notes/tags/files UI for selections. **Phase 3:** Firebase persistence. *(Requested: Session 14)*

### 5. OTHER PENDING
- [ ] **Character Relationship Visualizer** — Full-screen interactive relationship web from Characters page. Two modes: Kinship (tree/fan) and Social (force-directed). `RelationshipWeb.tsx` already exists. *(Requested: Session 12)*
- [~] **"Found in X verses" link** — Inline expand works. Original spec was slide-out panel showing all mention verses. *(Requested: Session 14)*
- [ ] **Chiasmus improvements** — Specs lost when session closed. **NEEDS USER INPUT.** *(Lost: ~Session 13)*
- [ ] **More Context Nuggets** — 1,096 → ~1,500. Gaps: Psalms, Isaiah, Jeremiah. *(Requested: Session 12)*
- [ ] **Accent color #2563EB → #2CC1E8** — Done in src/ files. Need to audit CLAUDE.md, any remaining component files, and constants.ts for stale references. *(Session 15)*

### LOW PRIORITY / FUTURE
- [ ] **Pre-computation audit** — Chapter stats, topic similarity, word cloud top-N could be pre-built. *(Session 14)*
- [ ] **ParallelPassagesTool update** — Not updated to new search panel pattern. *(ROADMAP.md)*
- [ ] **More character portraits** — 49 prompts ready in `~/Desktop/Character Portrait Prompts.md`. *(Session 15)*
- [ ] **PWA conversion** — Manifest, service worker, offline. *(ROADMAP.md)*
- [ ] **Modern language for D&C + PoGP** — OT/NT/BoM done. *(ROADMAP.md)*
- [ ] **Firebase Auth + user accounts** — Saved searches, reading progress sync, cross-device. *(ROADMAP.md)*

---

## Known Bugs / Issues

- [ ] 403 overlapping verse ranges in Bible speaker data (different speakers claim same verses) *(Session 9)*
- [ ] verseEnd=200 sentinels still in speaker data file (capped at runtime) *(Session 9)*
- [ ] Mobile hamburger menu links may not work *(reported Session 8)*

---

## Completed (Session 15)

- [x] Speaker labels: name first, descriptor on line two (commas + parentheses)
- [x] Group speakers hidden (only individuals with character profiles)
- [x] People pill click → scroll to first speaking verse
- [x] EGG → NUGGET rename (all files, components, API, CSS, analytics)
- [x] Nugget popup → right-side slide-in panel
- [x] Pill labels: singular/plural with count in parentheses
- [x] Jesus Christ portrait + "Jesus" alias
- [x] Holy Ghost portrait added
- [x] Speaker portrait theology-mode fix (divine OT → Jesus portrait)
- [x] Mary of Bethany aliases + 28 character mention audit (scripture-text aliases)
- [x] Theology mode removed — site always LDS
- [x] All slide-out panels widened ~10% (85vw max)
- [x] Top-right icons: all white, equal spacing, search → site-wide
- [x] Desktop header: chapter selector top center, back navigation hierarchy
- [x] Chapter grid view added (between book list and reading)
- [x] Bottom bar: removed redundant chapter selector, just prev/next arrows
- [x] Mobile swipe left/right for chapter navigation
- [x] Volume picker: centered text, h1, more spacing
- [x] Footer sticky to bottom (flexbox)
- [x] Accent blue #2563EB → #2CC1E8
- [x] Progress bar moved from top of page to top of bottom bar
- [x] Nugget panel: inline source icon + 25% separator line
- [x] Midjourney portrait prompts file rebuilt (49 characters)
- [x] Pilate, Thomas, Abimelech aliases fixed
- [x] docs/TASKS.md persistent task tracker created

## Completed (Sessions 13-14)

- [x] Context Eggs expanded to 1,096 + domain isolation
- [x] Reader layout unified + entity linking + accent color unified
- [x] First/Last Mention mobile tap fix
- [x] Role descriptions removed, tone radar hidden
- [x] Speaker circles clickable, theology-mode character mapping
- [x] GA4 tracking, SEO heading fix, volume tooltip, useBackToClose
- [x] User Preferences System, Location directory, Character database (757)

---

## How This File Works

1. **User requests something** → Claude adds it here immediately
2. **Claude starts work** → marks `[~]`
3. **Claude finishes** → marks `[x]`
4. **Session ends** → Claude updates, commits, pushes
5. **Session starts** → Claude reads this to know what's pending
6. **Session closes unexpectedly** → next session has the full picture

**This file is committed to git and pushed to GitHub with every session.**
