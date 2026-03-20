# Scripture Explorer — Session Log

## 2026-03-20 — Session 7: Insights Overhaul, Speaker Timeline, Mobile Back-Button, Preferences Planning

### What was done
- **Mobile back-button support** — New `useBackToClose` hook pushes history state; back button/swipe closes panels instead of navigating away. Applied to: ScripturePanel, ResourcePanel, WordExplorerPanel, CharacterDetailPanel, MethodologyModal, NavMenu.
- **"People in this Chapter"** — New `/api/chapter-characters` endpoint finds characters per chapter via speaker matching + text scanning (whole-word regex, deduplication by volume). Portraits displayed in insights panel and wired to CharacterDetailPanel.
- **Verse-level deep linking** — `?verse=N` URL param scrolls to specific verse with blue highlight flash. Applied to: CharacterDetailPanel first/last mention links, BookmarksList, home page random verse.
- **ChapterInsights complete overhaul:**
  - Collapsed bar: verse count + 3 stacked portrait circles + people count + "INSIGHTS" label
  - People section with speaker-colored borders, inline verse count number
  - Speaker Timeline: color-coded horizontal bar showing who speaks where, trough styling, click to scroll
  - Key Themes: neutral colors (not volume color), helper text explains interaction
  - Removed: top words, verse density strip, quick links (Word Cloud/Heatmap/Search)
  - D&C says "Section" instead of "Chapter"
- **Unique speaker colors** — Each "other" speaker gets a distinct color from a 10-color palette instead of all sharing purple. Consistent between ChapterInsights and ScriptureReader.
- **Speaker label redesign** — Horizontal layout: avatar right (closest to scripture), name extends left on desktop. Circle-only on mobile. Portrait images when available.
- **Gray speaker colors replaced** — Narrator: teal (#0E7490/#22D3EE), Other: purple (#9333EA/#A78BFA). No more hard-to-see grays.
- **Subtle verse background tint** — Spoken verses get ~5% opacity speaker color background.
- **VolumeTooltip component** — Styled hover tooltip (600ms delay, arrow) showing full volume name for abbreviations. Applied to CharacterDetailPanel, CharacterDirectory, home page.
- **CharacterDetailPanel polish** — Bolder "Also Known As" and "Scripture Mentions" headings, more spacing between heatmap and first/last mention.
- **Section heading sizes** — Insights panel headings (People, Speaker Timeline, Key Themes) now 0.78rem, bold, white.

### Decisions made
- Speaker colors must be unique per individual speaker, not per type. Multiple "other" speakers each get their own color.
- Volume abbreviation tooltips should appear in key places (pills, badges, filters) to train users on what abbreviations mean.
- "Man of Holiness" is a legitimate alias for God the Father (Moses 6:57, Pearl of Great Price).
- In LDS theology, "LORD"/Jehovah in OT = Jesus Christ (premortal). This requires a theology mode toggle.
- User wants a full preferences system with volume visibility + OT theology interpretation. Approved architecture documented in session_state.md.

### 9 commits pushed to GitHub (all on main)

---

## 2026-03-20 — Session 6: UI Polish Batch (sliding toggle, modal system, always-dark bars)

### What was done
- Three-way sliding reading mode toggle (Original | Modern | Narration)
- Help "?" icon with explanatory popup using shared modal system
- Removed "LAYERS" and "SPEAKERS" headings from toggles area
- Layer toggles restyled to standard blue accent, matching heights
- Verse spacing doubled (14px → 28px)
- Speaker labels bigger + brighter with synced colors
- Always-dark top/bottom bars in both reading modes
- Shared modal-styles system (`src/lib/modal-styles.ts`)
- Person avatar icon above speaker labels (click stubbed for character panel)
- 36px gap between toggles and first verse

### 10 commits pushed to GitHub

---

## 2026-03-19 — Session 5: Book of Mormon Modern Translations

### What was done
- Generated modern translations for ALL 6,604 BoM verses (15 books, 239 chapters)
- Full alignment audit passed
- Imported via existing `import-bom-modern.ts` script

---

## 2026-03-19 — Sessions 3-4: Character Directory, Speaker Data, Home Page

### What was done
- Built CharacterDirectory (`/characters`) with 302 named individuals
- CharacterDetailPanel with bios, family trees, portraits, scripture mention heatmap
- Character data (`data/characters.json`) with portraits for ~40 characters
- Speaker data expansion: BoM/D&C/PoGP speakers via `build-speakers-lds.ts` (718 entries)
- Merged speakers: 7,631 total across 82 books
- Home page redesign with character spotlight, tool grid, random verse
- Reading streaks, annotations, Word Explorer panel

---

## 2026-03-18 — Sessions 1-2: Foundation

### What was done
- ScripturePanel (right-side slider for verse viewing from chart clicks)
- Scripture Reader (`/read`) with full navigation, light/dark mode, font size
- Chapter filter on verses API
- Deep linking on all tools
