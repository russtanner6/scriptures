# Scripture Explorer — Task Tracker

**This file is the single source of truth for all requested work.**
Updated every session. If Claude's session closes, the next session picks up from here.

Legend: `[ ]` = not started, `[~]` = in progress / partially done, `[x]` = complete

---

## Active / Requested Tasks

### HIGH PRIORITY

- [ ] **Character Relationship Visualizer** — Full-screen interactive relationship web from Characters page. Two modes: Kinship (tree/fan) and Social (force-directed). "View Relationship Web" button on character cards. Glassmorphism bio panel. Breadcrumb trail. Mobile bottom-sheet. `RelationshipWeb.tsx` already exists with basic force graph. *(Requested: Session 12)*

- [~] **"Found in X verses" link in CharacterDetailPanel** — Clicking the verse count should close the character panel and open a scripture verse panel showing all mention verses for that character, with the character name highlighted. Similar to how word search opens a verse slider. *(Requested: Session 14)*

- [ ] **Desktop header revamp for scripture reader** — Remove tree logo from top center when on a chapter. Replace with chapter/section dropdown (currently in footer). Top-left "Book + Chapter" becomes back-navigation: clicking goes up one level (to volume book list). Volume book list screen shows "VOLUMES" in top-left which goes back to volume picker. *(Requested: Session 14)*

- [ ] **Verse selection / multi-select mode** — Clicking a verse number on desktop (or long-press on mobile) activates selection mode. The clicked verse gets a checkbox, all other verse numbers become checkboxes too. User can check any number of verses (non-sequential). Purpose: attach notes, tags, and files to a verse selection. Clicking outside clears all checkboxes back to verse numbers. Ultimately stored in Firebase user profile. **Phase 1:** just the checkbox UI + selection state. **Phase 2:** notes/tags/files UI. **Phase 3:** Firebase persistence. *(Requested: Session 14)*

- [ ] **Chiasmus improvements** — User had notes/specs for chiasmus tool improvements that were lost when a session closed unexpectedly. **NEEDS USER INPUT to re-specify.** *(Lost: ~Session 13)*

- [ ] **More Context Nuggets** — Currently 1,096. Target ~1,500 (2-3 per chapter average). Biggest gaps: Psalms (~50 more of 150 chapters), Isaiah (~15 more of 66), Jeremiah (~15 more of 52). Rules: additive language, domain isolation, scholarly sources. *(Requested: Session 12)*

- [x] **Rename EGG → NUGGET everywhere** — "EGG" pills → "NUGGET" pills with gold nugget icon. Component renames, API route, data file, CSS classes, analytics events, types. *(Session 15)*

### MEDIUM PRIORITY

- [ ] **Audit site for more pre-computation opportunities** — Character mentions and location mentions are already pre-computed (`data/character-mentions.json`, `data/location-mentions.json`). Audit remaining API routes and components for other static data being calculated on-the-fly that could be pre-built. Candidates: chapter stats (TF-IDF key themes), topic similarity vectors, word cloud top-N lists. *(Requested: Session 14)*

- [ ] **ParallelPassagesTool search panel update** — Last tool not updated to new two-column search panel pattern. Needs dark theme CSS variables and consistent layout. *(Noted: ROADMAP.md)*

- [ ] **ROADMAP.md is stale** — Still lists "User Preferences System" as "BUILD NEXT" but it's already done (Session 8). Character count is 302 but actually 757. Priority list needs full refresh.

### LOW PRIORITY / FUTURE

- [ ] **Reader UI polish** — Chapter narrations, resource pill simplification, bottom bar controls, mobile scripture panel, chart horizontal scroll *(ROADMAP.md)*
- [ ] **More character portraits** — Only ~40 of 757 characters have portraits *(ROADMAP.md)*
- [ ] **PWA conversion** — Progressive web app with manifest, service worker, offline support *(ROADMAP.md)*
- [ ] **Modern language for D&C + PoGP** — OT/NT/BoM done, D&C + PoGP not started *(ROADMAP.md)*
- [ ] **Firebase Auth + user accounts** — saved searches, reading progress sync, cross-device *(ROADMAP.md)*

---

## Known Bugs / Issues

- [x] First/Last Mention links in CharacterDetailPanel not clickable on mobile — converted from `<Link>` to `<button>` with `router.push()` + `onClose()` *(Session 14)*
- [ ] 403 overlapping verse ranges in Bible speaker data (different speakers claim same verses) *(Session 9)*
- [ ] verseEnd=200 sentinels still in speaker data file (capped at runtime) *(Session 9)*
- [ ] Mobile hamburger menu links may not work *(reported Session 8, not investigated)*
- [ ] Chart scroll pad / horizontal drag feature not built *(Session 9)*

---

## Completed (Recent)

- [x] EGG → NUGGET rename — all components, API, data file, CSS, analytics, types renamed. Gold gem icon. *(Session 15)*
- [x] Nugget popup → right-side slide-in panel (consistent with Resources/People/Locations) *(Session 15)*
- [x] Pill labels: singular/plural with count in parentheses — VIDEO/VIDEOS (3), NUGGET/NUGGETS (2) *(Session 15)*
- [x] Jesus Christ portrait added + "Jesus" alias added for speaker matching *(Session 15)*
- [x] Mary of Bethany aliases added ("Mary, sister of Martha") to fix wrong Mary matching *(Session 15)*
- [x] Speaker portrait theology-mode fix: divine OT speakers show Jesus portrait, not God the Father *(Session 15)*
- [x] Descriptor split handles parentheses: "Jesus Christ (Jehovah)" → line 1 + line 2 *(Session 15)*
- [x] All slide-out panels widened ~10% with 85vw max cap *(Session 15)*
- [x] Speaker labels: name first, descriptor on line two (not bold). "MARY, SISTER OF MARTHA" → "MARY" (bold) + "sister of Martha" (smaller line 2) *(Session 15)*
- [x] Group speakers hidden — only show individuals with dedicated character profiles. Groups like "Jews who had been with Mary and Martha", "Disciples" no longer show speaker labels *(Session 15)*
- [x] People pill in Chapter Insights → scrolls to first speaking verse instead of opening character panel *(Session 15)*
- [x] First/Last Mention mobile tap fix — `<Link>` → `<button>` + `router.push()` + `onClose()` *(Session 14)*
- [x] Removed role descriptions below character names in CharacterDetailPanel (both portrait + no-portrait variants) *(Session 14)*
- [x] Tone Profile radar hidden in CharacterDetailPanel — needs semantic understanding to be useful (code + API fetch preserved, commented out) *(Session 14)*
- [x] Mobile speaker circle spacing fix — container width 24px→34px, paddingRight 4px→8px (circle was 26px overflowing 24px container) *(Session 14)*
- [x] Character name repositioned in detail panel — bottom 16px→10px, marginBottom 6px→0 to fill gap from removed roles *(Session 14)*
- [x] Speaker circles already open character detail panel (verified working — uses `openCharacterByName`) *(Session 14)*
- [x] Speakers + Context toggles already default to ON (persisted via localStorage, user may have toggled off previously) *(Session 14)*
- [x] Speaker label text on desktop now clickable (was `<span>`, changed to `<button>`) *(Session 14)*
- [x] Speaker → character mapping fixed for theology mode: "God" (divine, OT, LDS) now opens Jesus Christ, not God the Father. SPEAKER_MAP checked before alias exact-match to avoid wrong alias hit. *(Session 14)*
- [x] Context Eggs expanded to 1,096 (OT 427, NT 290, LDS 379) *(Session 13)*
- [x] Domain isolation for LDS Context Eggs *(Session 13)*
- [x] Reader layout unified (desktop + mobile identical) *(Session 13)*
- [x] Entity linking with portraits + map pins *(Session 13)*
- [x] Accent color unified to #2563EB *(Session 13)*
- [x] Resource + Egg pills moved below verse text *(Session 13)*
- [x] Nav menu cleaned up *(Session 13)*
- [x] D&C "Most Mentioned In" aggregates by section *(Session 13)*
- [x] User Preferences System (volume visibility + theology mode) *(Session 8)*
- [x] Location directory (333 places) *(Session 10)*
- [x] Character database expanded to 757 *(Session 10)*
- [x] Sentiment analysis with negation handling *(Session 12)*
- [x] Tone overlay in reader *(Session 12)*
- [x] Character tone profile radar *(Session 12)*
- [x] GA4 event tracking wired into 18 components *(latest commit)*
- [x] SEO heading hierarchy fix *(latest commit)*

---

## How This File Works

1. **User requests something** → Claude adds it here immediately (before starting work)
2. **Claude starts work** → marks `[~]` in progress
3. **Claude finishes** → marks `[x]` complete, moves to Completed section
4. **Session ends** → Claude updates this file as part of end-of-session docs
5. **Session starts** → Claude reads this file to know what's pending
6. **If a session closes unexpectedly** → next session still has the full picture

**This file is committed to git and pushed to GitHub with every session.**
