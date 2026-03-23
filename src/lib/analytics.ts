/**
 * Google Analytics 4 Event Tracking for Scripture Explorer
 *
 * Measurement ID: G-BWB94MBP4C
 *
 * Usage:
 *   import { analytics } from "@/lib/analytics";
 *   analytics.search("faith", "word-frequency");
 *   analytics.scriptureRead("Genesis", 1, "OT");
 *
 * All events are typed and documented. Add new events here, not inline.
 * Run the site with ?debug_ga=true to log events to console.
 */

// Extend window for gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function trackEvent(name: string, params?: Record<string, string | number | boolean>) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", name, params);
  }
}

// ── Navigation ──────────────────────────────────────────────

export const analytics = {
  /** Nav menu opened */
  navMenuOpen: () => trackEvent("nav_menu_open"),

  /** Nav menu link clicked */
  navMenuClick: (destination: string) =>
    trackEvent("nav_menu_click", { destination }),

  /** Footer link clicked */
  footerLinkClick: (label: string, href: string) =>
    trackEvent("footer_link_click", { link_label: label, destination: href }),

  // ── Search ──────────────────────────────────────────────

  /** Any search performed across tools */
  search: (term: string, tool: string) =>
    trackEvent("search", { search_term: term, tool }),

  /** Volume filter changed on a tool */
  searchVolumeFilter: (volumes: string[], tool: string) =>
    trackEvent("search_volume_filter", { volumes_selected: volumes.join(","), tool }),

  /** Exact match toggled */
  searchExactMatch: (enabled: boolean, tool: string) =>
    trackEvent("search_exact_match", { enabled, tool }),

  // ── Scripture Reader ────────────────────────────────────

  /** Chapter loaded in reader */
  scriptureRead: (book: string, chapter: number, volume: string) =>
    trackEvent("scripture_read", { book, chapter, volume }),

  /** Chapter navigation (prev/next arrows) */
  chapterNavigate: (book: string, chapter: number, direction: "prev" | "next") =>
    trackEvent("chapter_navigate", { book, chapter, direction }),

  /** Verse tapped to open popover */
  verseTap: (book: string, chapter: number, verse: number) =>
    trackEvent("verse_tap", { book, chapter, verse }),

  /** Verse bookmarked */
  verseBookmark: (book: string, chapter: number, verse: number) =>
    trackEvent("verse_bookmark", { book, chapter, verse }),

  /** Verse text copied */
  verseCopy: (book: string, chapter: number, verse: number) =>
    trackEvent("verse_copy", { book, chapter, verse }),

  /** Personal note added to verse */
  verseNoteAdd: (book: string, chapter: number, verse: number) =>
    trackEvent("verse_note_add", { book, chapter, verse }),

  /** Reading mode toggled (original/modern/narration) */
  readingModeToggle: (mode: string) =>
    trackEvent("reading_mode_toggle", { mode }),

  /** Font size changed */
  fontSizeChange: (size: number) =>
    trackEvent("font_size_change", { size }),

  /** Light/dark theme toggled */
  themeToggle: (theme: "light" | "dark") =>
    trackEvent("theme_toggle", { theme }),

  /** Reader layer toggled (speakers, entities, context-eggs) */
  layerToggle: (layer: string, enabled: boolean) =>
    trackEvent("layer_toggle", { layer, enabled }),

  /** Search within chapter */
  chapterSearch: (book: string, chapter: number, term: string) =>
    trackEvent("chapter_search", { book, chapter, search_term: term }),

  // ── Chapter Insights ────────────────────────────────────

  /** Insights panel opened */
  insightsOpen: (book: string, chapter: number) =>
    trackEvent("insights_open", { book, chapter }),

  /** Person pill clicked in insights */
  insightsPersonClick: (personName: string, book: string, chapter: number) =>
    trackEvent("insights_person_click", { person_name: personName, book, chapter }),

  /** Theme keyword clicked in insights */
  insightsThemeClick: (word: string, book: string, chapter: number) =>
    trackEvent("insights_theme_click", { theme_word: word, book, chapter }),

  /** Speaker timeline bar clicked */
  speakerTimelineClick: (speaker: string, verse: number) =>
    trackEvent("speaker_timeline_click", { speaker, verse }),

  // ── Context Nuggets ────────────────────────────────────────

  /** Nugget pill clicked on a verse */
  nuggetPillClick: (nuggetId: string, book: string, chapter: number, verse: number, category: string) =>
    trackEvent("nugget_pill_click", { nugget_id: nuggetId, book, chapter, verse, category }),

  /** Nugget keyword clicked in verse text */
  nuggetKeywordClick: (nuggetId: string, keyword: string) =>
    trackEvent("nugget_keyword_click", { nugget_id: nuggetId, keyword }),

  /** Nugget source citation link clicked */
  nuggetSourceClick: (nuggetId: string, source: string) =>
    trackEvent("nugget_source_click", { nugget_id: nuggetId, source: source.slice(0, 100) }),

  /** Navigate between nuggets in multi-nugget popover */
  nuggetNavigate: (direction: "prev" | "next") =>
    trackEvent("nugget_navigate", { direction }),

  // ── People & Locations ──────────────────────────────────

  /** People page search */
  peopleSearch: (term: string) =>
    trackEvent("people_search", { search_term: term }),

  /** People page filter applied */
  peopleFilter: (filterType: string, value: string) =>
    trackEvent("people_filter", { filter_type: filterType, value }),

  /** Person card clicked */
  personCardClick: (personId: string, personName: string, tier: number) =>
    trackEvent("person_card_click", { person_id: personId, person_name: personName, tier }),

  /** First/last mention link clicked */
  personMentionClick: (personId: string, mentionType: "first" | "last") =>
    trackEvent("person_mention_click", { person_id: personId, mention_type: mentionType }),

  /** Location search */
  locationSearch: (term: string) =>
    trackEvent("location_search", { search_term: term }),

  /** Location card clicked */
  locationCardClick: (locationId: string, locationName: string) =>
    trackEvent("location_card_click", { location_id: locationId, location_name: locationName }),

  // ── Visualization Tools ─────────────────────────────────

  /** Chart data point clicked (any tool) */
  chartDataClick: (tool: string, book: string, chapter: number | null, term: string) =>
    trackEvent("chart_data_click", { tool, book, chapter: chapter ?? 0, search_term: term }),

  /** Scripture panel opened from chart click */
  scripturePanelOpen: (tool: string, book: string, term: string) =>
    trackEvent("scripture_panel_open", { tool, book, search_term: term }),

  /** Chart exported */
  exportChart: (tool: string, format: string) =>
    trackEvent("export_chart", { tool, format }),

  /** Word cloud word clicked */
  wordCloudClick: (word: string, book: string, volume: string) =>
    trackEvent("word_cloud_click", { word, book, volume }),

  /** Heatmap cell clicked */
  heatmapCellClick: (book: string, chapter: number, term: string) =>
    trackEvent("heatmap_cell_click", { book, chapter, search_term: term }),

  /** Deep link loaded (URL with params) */
  deepLinkLoad: (tool: string, params: string) =>
    trackEvent("deep_link_load", { tool, params: params.slice(0, 200) }),

  // ── Resources ───────────────────────────────────────────

  /** Resource pill clicked (video/article/pdf) */
  resourceClick: (type: string, title: string, book: string, chapter: number) =>
    trackEvent("resource_click", { resource_type: type, title: title.slice(0, 100), book, chapter }),

  // ── Entity Links ────────────────────────────────────────

  /** Inline entity link clicked (person or location in verse text) */
  entityLinkClick: (entityType: "person" | "location", name: string, book: string, chapter: number) =>
    trackEvent("entity_link_click", { entity_type: entityType, name, book, chapter }),

  // ── Word Explorer ───────────────────────────────────────

  /** Word Explorer panel opened from insights */
  wordExplorerOpen: (word: string, book: string) =>
    trackEvent("word_explorer_open", { word, book }),

  /** Word Explorer scope changed (book/volume/all) */
  wordExplorerScope: (scope: string, word: string) =>
    trackEvent("word_explorer_scope", { scope, word }),

  // ── Bookmarks ───────────────────────────────────────────

  /** Bookmark page visited */
  bookmarksView: (count: number) =>
    trackEvent("bookmarks_view", { bookmark_count: count }),

  // ── Settings ────────────────────────────────────────────

  /** Volume visibility toggled */
  settingsVolumeToggle: (volume: string, visible: boolean) =>
    trackEvent("settings_volume_toggle", { volume, visible }),


  // ── Engagement ──────────────────────────────────────────

  /** Random verse clicked on home page */
  randomVerseClick: (book: string, chapter: number, verse: number) =>
    trackEvent("random_verse_click", { book, chapter, verse }),

  /** Recent search clicked on home page */
  recentSearchClick: (term: string, tool: string) =>
    trackEvent("recent_search_click", { search_term: term, tool }),

  /** Tool card clicked on home page */
  homeToolCardClick: (tool: string) =>
    trackEvent("home_tool_card_click", { tool }),

  /** Spotlight character clicked on home page */
  homeSpotlightClick: (personId: string) =>
    trackEvent("home_spotlight_click", { person_id: personId }),
};
