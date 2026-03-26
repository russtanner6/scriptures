"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { VOLUME_SLUG_TO_ABBREV, VOLUME_ABBREV_TO_SLUG, bookNameToSlug, slugToBookSearch, scriptureUrl } from "@/lib/scripture-slugs";
import type { Volume, Resource, SpeakerAttribution, SpeakerType, ScriptureCharacter, ScriptureLocation } from "@/lib/types";
import { VOLUME_COLORS } from "@/lib/constants";
import { getVerseUrl } from "@/lib/scripture-urls";
import ChapterInsights from "./ChapterInsights";
import CharacterDetailPanel from "./CharacterDetailPanel";
import LocationDetailPanel from "./LocationDetailPanel";
import VersePopover from "./VersePopover";
import ResourceMarker, { getResourceTypeColor } from "./ResourceMarker";
import ResourcePanel from "./ResourcePanel";
import WordExplorerPanel from "./WordExplorerPanel";
import NavMenu from "./NavMenu";
import HamburgerIcon from "./HamburgerIcon";
import { markChapterRead, isChapterRead, getReadChaptersForBook, getVolumeProgress } from "@/lib/reading-progress";
import { usePreferencesContext } from "@/components/PreferencesProvider";
import { modalStyles as mStyles, getModalTheme } from "@/lib/modal-styles";
import { getAnnotationsForChapter } from "@/lib/annotations";
import { useIsMobile } from "@/lib/useIsMobile";
import { getVerseDominantTone, type SentimentCategory } from "@/lib/sentiment-lexicon";
import type { ContextNugget } from "@/lib/types";
import NuggetMarker from "./NuggetMarker";
import NuggetPopover from "./NuggetPopover";
import { analytics } from "@/lib/analytics";

interface ReaderVerse {
  chapter: number;
  verse: number;
  text: string;
  text_modern?: string | null;
}

export default function ScriptureReader() {
  const { isVolumeVisible, displaySpeakerName } = usePreferencesContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [volumes, setVolumes] = useState<Volume[]>([]);
  // Dark theme always — light mode hidden but code preserved
  const lightMode = false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_lightMode, setLightMode] = useState(false);
  const [fontSize, setFontSize] = useState(1); // 0=small, 1=medium, 2=large
  const [ambilightColors, setAmbilightColors] = useState<{ tl: string; tr: string; bl: string; br: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exploredWord, setExploredWord] = useState<string | null>(null);

  // Navigation state
  const [selectedVolume, setSelectedVolume] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [selectedBookName, setSelectedBookName] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterCount, setChapterCount] = useState<number>(0);

  // Verses
  const [verses, setVerses] = useState<ReaderVerse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Reading progress
  const [scrollProgress, setScrollProgress] = useState(0);

  // Current visible verse (for search navigator sync)
  const [currentVisibleVerse, setCurrentVisibleVerse] = useState(1);

  // Reading progress
  const [chapterMarkedRead, setChapterMarkedRead] = useState(false);
  const [showReadToast, setShowReadToast] = useState(false);
  // (streak counter removed)

  // Mobile swipe for chapter navigation
  const swipeRef = useRef<{ startX: number; startY: number } | null>(null);

  // In-chapter search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Verse popover state
  const [activeVerse, setActiveVerse] = useState<{
    verse: number;
    chapter: number;
    text: string;
  } | null>(null);

  // Annotations — track which verses in current chapter have notes
  const [annotatedVerses, setAnnotatedVerses] = useState<Set<number>>(new Set());

  // Verse multi-select
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear selection when chapter changes
  // Hide html scrollbar when reader is active (prevents double scrollbar on desktop)
  useEffect(() => {
    document.documentElement.classList.add("reader-active");
    return () => document.documentElement.classList.remove("reader-active");
  }, []);

  useEffect(() => {
    setSelectedVerses(new Set());
    setSelectionMode(false);
  }, [selectedChapter, selectedBookId]);

  const toggleVerseSelection = useCallback((verseNum: number) => {
    setSelectedVerses((prev) => {
      const next = new Set(prev);
      if (next.has(verseNum)) {
        next.delete(verseNum);
        if (next.size === 0) setSelectionMode(false);
      } else {
        next.add(verseNum);
      }
      return next;
    });
    if (!selectionMode) setSelectionMode(true);
  }, [selectionMode]);

  const clearSelection = useCallback(() => {
    setSelectedVerses(new Set());
    setSelectionMode(false);
  }, []);

  const copySelectedVerses = useCallback(() => {
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    const texts = sorted.map((vn) => {
      const v = verses.find((vv) => vv.verse === vn);
      return v ? `${vn} ${v.text}` : "";
    }).filter(Boolean);
    const header = `${selectedBookName} ${selectedChapter}`;
    const full = `${header}\n${texts.join("\n")}`;
    navigator.clipboard.writeText(full).catch(() => {});
  }, [selectedVerses, verses, selectedBookName, selectedChapter]);

  const bookmarkSelectedVerses = useCallback(() => {
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    for (const vn of sorted) {
      const v = verses.find((vv) => vv.verse === vn);
      if (v && selectedBookId && selectedChapter && selectedBookName && selectedVolume) {
        const { addBookmark } = require("@/lib/bookmarks");
        addBookmark({
          bookId: selectedBookId,
          chapter: selectedChapter,
          verse: vn,
          bookName: selectedBookName,
          volumeAbbrev: selectedVolume,
          text: v.text.slice(0, 100),
          createdAt: new Date().toISOString(),
        });
      }
    }
    clearSelection();
  }, [selectedVerses, verses, selectedBookId, selectedChapter, selectedBookName, selectedVolume, clearSelection]);

  // Resource layer
  const [showResources, setShowResources] = useState(true);
  const [chapterResources, setChapterResources] = useState<Resource[]>([]);
  const [activeResourcePanel, setActiveResourcePanel] = useState<{ resources: Resource[]; index: number } | null>(null);

  // Speaker attribution layer (always on — toggle hidden from user)
  const [showSpeakers] = useState(true);
  const [chapterSpeakers, setChapterSpeakers] = useState<SpeakerAttribution[]>([]);

  // Tone overlay layer
  const [showToneOverlay, setShowToneOverlay] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("reader-show-tone") === "true";
    }
    return false;
  });

  // Context Nuggets layer (always on — toggle hidden from user)
  const [showContextNuggets] = useState(true);
  const [chapterNuggets, setChapterNuggets] = useState<ContextNugget[]>([]);
  const [activeNuggets, setActiveNuggets] = useState<ContextNugget[]>([]);

  // Character panel
  const [allCharacters, setAllCharacters] = useState<ScriptureCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<ScriptureCharacter | null>(null);

  // Location panel
  const [allLocations, setAllLocations] = useState<ScriptureLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<ScriptureLocation | null>(null);

  // Per-verse dominant tone (memoized)
  const verseToneMap = useMemo(() => {
    if (!showToneOverlay) return new Map<number, SentimentCategory>();
    const map = new Map<number, SentimentCategory>();
    for (const v of verses) {
      const tone = getVerseDominantTone(v.text);
      if (tone) map.set(v.verse, tone);
    }
    return map;
  }, [verses, showToneOverlay]);

  // Reading mode: original (default), modern (verse-by-verse modern language), narration (chapter prose)
  type ReadingMode = "original" | "modern" | "narration";
  const [readingMode, setReadingMode] = useState<ReadingMode>("original");
  const [chapterNarration, setChapterNarration] = useState<string | null>(null);
  // Whether the current chapter has modern text or narration available
  const hasModernText = verses.some((v) => v.text_modern);
  const hasNarration = !!chapterNarration;

  // Per-verse nugget keyword positions (memoized — must be after readingMode)
  const nuggetKeywordMap = useMemo(() => {
    if (!showContextNuggets || chapterNuggets.length === 0) return new Map<number, Array<{ start: number; end: number; nugget: ContextNugget }>>();
    const map = new Map<number, Array<{ start: number; end: number; nugget: ContextNugget }>>();
    for (const nug of chapterNuggets) {
      const verse = verses.find((v) => v.verse === nug.verse);
      if (!verse) continue;
      const text = readingMode === "modern" && verse.text_modern ? verse.text_modern : verse.text;
      const escaped = nug.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      const match = regex.exec(text);
      if (match) {
        if (!map.has(nug.verse)) map.set(nug.verse, []);
        map.get(nug.verse)!.push({ start: match.index, end: match.index + match[0].length, nugget: nug });
      }
    }
    return map;
  }, [chapterNuggets, verses, showContextNuggets, readingMode]);

  // Reading mode help popup
  const [showReadingModeHelp, setShowReadingModeHelp] = useState(false);

  // Search term highlight (when arriving from ScripturePanel)
  const highlightWord = searchParams.get("highlight") || null;

  // Scroll to a specific verse when ?verse=N is in the URL (after verses render)
  const pendingVerseScroll = searchParams.get("verse");
  const verseScrollDone = useRef<string | null>(null);
  useEffect(() => {
    if (!pendingVerseScroll || verses.length === 0) return;
    // Don't re-scroll if we already handled this verse+chapter combo
    const key = `${selectedBookId}-${selectedChapter}-${pendingVerseScroll}`;
    if (verseScrollDone.current === key) return;
    // Wait for DOM to render verses
    const timer = setTimeout(() => {
      const el = document.getElementById(`verse-${pendingVerseScroll}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.style.transition = "background 0.3s";
        el.style.background = "rgba(59, 130, 246, 0.15)";
        setTimeout(() => { el.style.background = ""; }, 2500);
        verseScrollDone.current = key;
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [pendingVerseScroll, verses, selectedBookId, selectedChapter]);

  // Font size map
  const fontSizes = [
    { body: isMobile ? "0.92rem" : "0.95rem", label: "A" },
    { body: isMobile ? "1rem" : "1.05rem", label: "A" },
    { body: isMobile ? "1.1rem" : "1.18rem", label: "A" },
  ];

  // Load all characters (for detail panel navigation)
  useEffect(() => {
    fetch("/api/characters")
      .then((r) => r.json())
      .then((data) => setAllCharacters(data.characters || []))
      .catch(() => {});
  }, []);

  // Load all locations (for entity linking + detail panel)
  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((data) => setAllLocations(data.locations || []))
      .catch(() => {});
  }, []);

  // Helper: open character panel by id
  const openCharacterById = useCallback((characterId: string) => {
    const char = allCharacters.find((c) => c.id === characterId);
    if (char) setSelectedCharacter(char);
  }, [allCharacters]);

  // Helper: open character panel by speaker name (fuzzy match with theology-mode awareness)
  const openCharacterByName = useCallback((speakerName: string, speakerType?: string) => {
    const nameLower = speakerName.toLowerCase();
    // For divine speakers in OT with LDS theology, "God"/"LORD" = Jesus Christ — check BEFORE exact match
    const isDivineOT = speakerType === "divine" &&
      (selectedVolume === "OT" || !selectedVolume);
    const SPEAKER_MAP: Record<string, string[]> = {
      "god": isDivineOT ? ["jesus christ"] : ["god the father"],
      "lord": ["jesus christ"],
      "the lord": ["jesus christ"],
      "the lord god": isDivineOT ? ["jesus christ"] : ["god the father"],
      "jesus": ["jesus christ", "jesus of nazareth"],
      "jesus christ (jehovah)": ["jesus christ"],
      "christ": ["jesus christ"],
      "holy ghost": ["holy ghost", "holy spirit"],
      "spirit of the lord": ["holy ghost"],
      "satan": ["satan", "lucifer"],
      "the serpent": ["satan", "lucifer", "serpent"],
      "serpent": ["satan", "lucifer", "serpent"],
    };
    // Try SPEAKER_MAP first for known speaker names (avoids wrong alias matches)
    let char: ScriptureCharacter | undefined;
    const candidates = SPEAKER_MAP[nameLower];
    if (candidates) {
      for (const cand of candidates) {
        char = allCharacters.find(
          (c) => c.name.toLowerCase() === cand ||
                 c.aliases.some((a) => a.toLowerCase() === cand)
        );
        if (char) break;
      }
    }
    if (!char) {
      // Exact match on name or alias
      char = allCharacters.find(
        (c) => c.name.toLowerCase() === nameLower ||
               c.aliases.some((a) => a.toLowerCase() === nameLower)
      );
    }
    if (!char) {
      // Partial match: speaker name starts with or is contained in character name
      char = allCharacters.find(
        (c) => c.name.toLowerCase().startsWith(nameLower) ||
               nameLower.startsWith(c.name.toLowerCase())
      );
    }
    if (char) setSelectedCharacter(char);
  }, [allCharacters, selectedVolume]);

  // Helper: find character portrait URL by speaker name (theology-mode aware)
  const getCharacterPortrait = useCallback((speakerName: string, speakerType?: string): string | null => {
    const nameLower = speakerName.toLowerCase();
    // For divine speakers in OT with LDS theology, "God"/"LORD" = Jesus Christ
    const isDivineOT = speakerType === "divine" &&
      (selectedVolume === "OT" || !selectedVolume);
    if (isDivineOT && (nameLower === "god" || nameLower === "lord" || nameLower === "the lord" || nameLower === "the lord god")) {
      const jesus = allCharacters.find((c) => c.name.toLowerCase() === "jesus christ");
      return jesus?.portraitUrl || null;
    }
    const char = allCharacters.find(
      (c) => c.name.toLowerCase() === nameLower ||
             c.aliases.some((a) => a.toLowerCase() === nameLower)
    );
    return char?.portraitUrl || null;
  }, [allCharacters, selectedVolume]);

  // Helper: check if a speaker has a dedicated character profile.
  // Only show speaker labels for people who exist in characters.json.
  const speakerHasProfile = useCallback((speakerName: string, _speakerType?: string): boolean => {
    const nameLower = speakerName.toLowerCase();
    // Check exact name or alias match against the character database
    const exact = allCharacters.some(
      (c) => c.name.toLowerCase() === nameLower ||
             c.aliases.some((a: string) => a.toLowerCase() === nameLower)
    );
    if (exact) return true;
    // Check base name before comma (e.g., "Mary" from "Mary, sister of Martha")
    if (nameLower.includes(",")) {
      const baseName = nameLower.split(",")[0].trim();
      return allCharacters.some(
        (c) => c.name.toLowerCase() === baseName ||
               c.aliases.some((a: string) => a.toLowerCase() === baseName)
      );
    }
    return false;
  }, [allCharacters]);

  // Load preferences from localStorage
  useEffect(() => {
    const savedLight = localStorage.getItem("reader-light-mode");
    if (savedLight === "true") setLightMode(true);
    const savedFont = localStorage.getItem("reader-font-size");
    if (savedFont) setFontSize(Number(savedFont));
    const savedResources = localStorage.getItem("reader-show-resources");
    if (savedResources === "false") setShowResources(false);
    // Speakers always on — localStorage restore removed
    const savedMode = localStorage.getItem("reader-reading-mode");
    if (savedMode === "modern" || savedMode === "narration") setReadingMode(savedMode);
  }, []);

  // Track scroll progress in reading view
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || selectedChapter === null) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const progress = scrollHeight <= clientHeight ? 1 : scrollTop / (scrollHeight - clientHeight);
      setScrollProgress(Math.min(1, Math.max(0, progress)));
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [selectedChapter, verses]);

  // Track which verse is currently visible (for search navigator)
  useEffect(() => {
    if (!verses.length || selectedChapter === null) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            const verseNum = parseInt(id.replace("verse-", ""), 10);
            if (!isNaN(verseNum)) setCurrentVisibleVerse(verseNum);
          }
        }
      },
      { root: container, rootMargin: "-40% 0px -40% 0px", threshold: 0 }
    );
    // Observe all verse elements
    for (const v of verses) {
      const el = document.getElementById(`verse-${v.verse}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [verses, selectedChapter]);

  // Auto-mark chapter read when scrolled to bottom (DISABLED — may re-enable later)
  // useEffect(() => {
  //   if (scrollProgress >= 0.95 && !chapterMarkedRead && selectedBookId && selectedChapter && verses.length > 0) {
  //     markChapterRead(selectedBookId, selectedChapter);
  //     setChapterMarkedRead(true);
  //     setShowReadToast(true);
  //     setTimeout(() => setShowReadToast(false), 2500);
  //   }
  // }, [scrollProgress, chapterMarkedRead, selectedBookId, selectedChapter, verses]);

  // Reset chapter-read state on chapter change
  useEffect(() => {
    if (selectedBookId && selectedChapter) {
      setChapterMarkedRead(isChapterRead(selectedBookId, selectedChapter));
    }
  }, [selectedBookId, selectedChapter]);

  // Load volumes + handle deep link
  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((data) => {
        const vols: Volume[] = data.volumes.filter((v: Volume) => isVolumeVisible(v.abbrev));
        setVolumes(vols);

        // Parse URL: try new path format first, then fall back to query params
        // Path format: /scriptures/old-testament/genesis/1
        const pathParts = pathname.replace(/^\/scriptures\/?/, "").split("/").filter(Boolean);
        const pathVolSlug = pathParts[0] || null;
        const pathBookSlug = pathParts[1] || null;
        const pathChapter = pathParts[2] ? Number(pathParts[2]) : null;
        const urlVerse = searchParams.get("verse");

        // Resolve from path slugs
        const pathVolAbbrev = pathVolSlug ? VOLUME_SLUG_TO_ABBREV[pathVolSlug] : null;

        // Legacy query param support
        const urlBookId = searchParams.get("bookId");
        const urlChapter = searchParams.get("chapter");
        const urlVolume = searchParams.get("volume");

        // Path-based: /scriptures/old-testament (volume only)
        if (pathVolAbbrev && !pathBookSlug) {
          const vol = vols.find((v) => v.abbrev === pathVolAbbrev);
          if (vol) setSelectedVolume(vol.abbrev);
        }
        // Path-based: /scriptures/old-testament/genesis (book, no chapter)
        if (pathVolAbbrev && pathBookSlug && !pathChapter) {
          const vol = vols.find((v) => v.abbrev === pathVolAbbrev);
          if (vol) {
            const searchName = slugToBookSearch(pathBookSlug);
            const book = vol.books.find((b) => b.name.toLowerCase() === searchName || bookNameToSlug(b.name) === pathBookSlug);
            if (book) {
              setSelectedVolume(vol.abbrev);
              setSelectedBookId(book.id);
              setSelectedBookName(book.name);
              setChapterCount(book.chapterCount);
            }
          }
        }
        // Path-based: /scriptures/old-testament/genesis/1 (full reading)
        // Convert to legacy query params format for consistent loading
        if (pathVolAbbrev && pathBookSlug && pathChapter) {
          const vol = vols.find((v) => v.abbrev === pathVolAbbrev);
          if (vol) {
            const searchName = slugToBookSearch(pathBookSlug);
            const book = vol.books.find((b) => b.name.toLowerCase() === searchName || bookNameToSlug(b.name) === pathBookSlug);
            if (book) {
              // Use the same loading logic as legacy params below
              const bid = book.id;
              const ch = Math.max(1, Math.min(pathChapter, book.chapterCount));
              setSelectedVolume(vol.abbrev);
              setSelectedBookId(bid);
              setSelectedBookName(book.name);
              setSelectedChapter(ch);
              setChapterCount(book.chapterCount);
              const params = new URLSearchParams({ bookId: String(bid), chapter: String(ch) });
              fetch(`/api/chapter?${params}`)
                .then((r) => r.json())
                .then((chData) => {
                  setVerses(chData.verses || []);
                  setChapterNarration(chData.narration || null);
                  const annotations = getAnnotationsForChapter(bid, ch);
                  setAnnotatedVerses(new Set(annotations.map((a: { verse: number }) => a.verse)));
                  const bookNameForApi = chData.bookName || book.name;
                  fetch(`/api/resources?book=${encodeURIComponent(bookNameForApi)}&chapter=${ch}`)
                    .then((r) => r.json())
                    .then((resData) => setChapterResources(resData.resources || []))
                    .catch(() => {});
                  fetch(`/api/context-nuggets?book=${encodeURIComponent(bookNameForApi)}&chapter=${ch}`)
                    .then((r) => r.json())
                    .then((nuggetData) => {
                      const filtered = (nuggetData.nuggets || []) as ContextNugget[];
                      setChapterNuggets(filtered);
                    })
                    .catch(() => {});
                  fetch(`/api/speakers?book=${encodeURIComponent(bookNameForApi)}&chapter=${ch}`)
                    .then((r) => r.json())
                    .then((spkData) => setChapterSpeakers(spkData.speakers || []))
                    .catch(() => {});
                });
              return; // Skip legacy param handling
            }
          }
        }
        // Legacy: ?volume=XX (show book list)
        if (!pathVolSlug && urlVolume && !urlBookId) {
          const vol = vols.find((v) => v.abbrev === urlVolume);
          if (vol) {
            setSelectedVolume(vol.abbrev);
            // Redirect to new URL format
            window.history.replaceState({}, "", scriptureUrl(vol.abbrev));
          }
        }
        // Legacy: ?bookId=X&chapter=Y (full reading) — redirect to new format
        if (urlBookId && urlChapter) {
          const bid = Number(urlBookId);
          let ch = Number(urlChapter);
          for (const vol of vols) {
            const book = vol.books.find((b) => b.id === bid);
            if (book) {
              ch = Math.max(1, Math.min(ch, book.chapterCount));
              setSelectedVolume(vol.abbrev);
              setSelectedBookId(bid);
              setSelectedBookName(book.name);
              setSelectedChapter(ch);
              setChapterCount(book.chapterCount);
              // Redirect old URL to new SEO-friendly format
              window.history.replaceState({}, "", scriptureUrl(vol.abbrev, book.name, ch));
              const params = new URLSearchParams({ bookId: String(bid), chapter: String(ch) });
              fetch(`/api/chapter?${params}`)
                .then((r) => r.json())
                .then((chData) => {
                  setVerses(chData.verses || []);
                  setChapterNarration(chData.narration || null);
                  // Load annotations
                  const annotations = getAnnotationsForChapter(bid, ch);
                  setAnnotatedVerses(new Set(annotations.map((a: { verse: number }) => a.verse)));
                  // Load resources + speakers
                  const bookNameForApi = chData.bookName || book.name;
                  fetch(`/api/resources?book=${encodeURIComponent(bookNameForApi)}&chapter=${ch}`)
                    .then((r) => r.json())
                    .then((resData) => setChapterResources(resData.resources || []))
                    .catch(() => {});
                  fetch(`/api/context-nuggets?book=${encodeURIComponent(bookNameForApi)}&chapter=${ch}`)
                    .then((r) => r.json())
                    .then((nuggetData) => {
                      const filtered = (nuggetData.nuggets || []) as ContextNugget[];
                      setChapterNuggets(filtered);
                    })
                    .catch(() => {});
                  fetch(`/api/speakers?book=${encodeURIComponent(bookNameForApi)}&chapter=${ch}`)
                    .then((r) => r.json())
                    .then((spkData) => setChapterSpeakers(spkData.speakers || []))
                    .catch(() => {});
                  // Verse scroll handled by useEffect watching pendingVerseScroll
                });
              break;
            }
          }
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Handle URL param changes (e.g., navigating from character panel verse links while already on /scriptures)
  const searchParamsBookId = searchParams.get("bookId");
  const searchParamsChapter = searchParams.get("chapter");
  const searchParamsVerse = searchParams.get("verse");
  useEffect(() => {
    if (!searchParamsBookId || !searchParamsChapter || volumes.length === 0) return;
    const bid = Number(searchParamsBookId);
    const ch = Number(searchParamsChapter);
    // Skip if already on this chapter (but handle verse scroll)
    if (bid === selectedBookId && ch === selectedChapter) {
      if (searchParamsVerse) {
        setTimeout(() => {
          const el = document.getElementById(`verse-${searchParamsVerse}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.style.transition = "background 0.3s";
            el.style.background = "rgba(59, 130, 246, 0.15)";
            setTimeout(() => { el.style.background = ""; }, 2500);
          }
        }, 400);
      }
      return;
    }
    // Navigate to the new chapter
    for (const vol of volumes) {
      const book = vol.books.find((b) => b.id === bid);
      if (book) {
        const clampedCh = Math.max(1, Math.min(ch, book.chapterCount));
        setSelectedVolume(vol.abbrev);
        setSelectedBookId(bid);
        setSelectedBookName(book.name);
        setSelectedChapter(clampedCh);
        setChapterCount(book.chapterCount);
        loadChapter(bid, clampedCh);
        // Verse scroll after chapter loads
        if (searchParamsVerse) {
          setTimeout(() => {
            const el = document.getElementById(`verse-${searchParamsVerse}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.style.transition = "background 0.3s";
              el.style.background = "rgba(59, 130, 246, 0.15)";
              setTimeout(() => { el.style.background = ""; }, 2500);
            }
          }, 1200);
        }
        break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsBookId, searchParamsChapter, searchParamsVerse, volumes]);

  // Fetch chapter verses
  const loadChapter = useCallback(async (bookId: number, chapter: number) => {
    setIsLoading(true);
    setScrollProgress(0);
    setSearchTerm("");
    setSearchOpen(false);
    try {
      const params = new URLSearchParams({
        bookId: String(bookId),
        chapter: String(chapter),
      });
      const res = await fetch(`/api/chapter?${params}`);
      const data = await res.json();
      setVerses(data.verses || []);
      setChapterNarration(data.narration || null);
      setSelectedBookName(data.bookName);
      setChapterCount(data.chapterCount);
      // Load annotations for this chapter
      const annotations = getAnnotationsForChapter(bookId, chapter);
      setAnnotatedVerses(new Set(annotations.map((a) => a.verse)));
      // Load resources + nuggets for this chapter
      setChapterResources([]);
      setChapterNuggets([]);
      setActiveResourcePanel(null);
      setActiveNuggets([]);
      // Load speakers for this chapter
      setChapterSpeakers([]);
      const bookNameForApi = data.bookName || "";
      try {
        const resResp = await fetch(`/api/resources?book=${encodeURIComponent(bookNameForApi)}&chapter=${chapter}`);
        const resData = await resResp.json();
        setChapterResources(resData.resources || []);
      } catch {}
      try {
        const nuggetResp = await fetch(`/api/context-nuggets?book=${encodeURIComponent(bookNameForApi)}&chapter=${chapter}`);
        const nuggetData = await nuggetResp.json();
        const filtered = (nuggetData.nuggets || []) as ContextNugget[];
        setChapterNuggets(filtered);
      } catch {}
      try {
        const spkResp = await fetch(`/api/speakers?book=${encodeURIComponent(bookNameForApi)}&chapter=${chapter}`);
        const spkData = await spkResp.json();
        setChapterSpeakers(spkData.speakers || []);
      } catch {
        // Speakers are non-critical
      }
      // Track chapter read
      if (data.bookName && selectedVolume) {
        analytics.scriptureRead(data.bookName, chapter, selectedVolume);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Navigate to a chapter + update URL
  const goToChapter = useCallback(
    (volAbbrev: string, bookId: number, bookName: string, chapter: number, bookChapterCount: number) => {
      setSelectedVolume(volAbbrev);
      setSelectedBookId(bookId);
      setSelectedBookName(bookName);
      setSelectedChapter(chapter);
      setChapterCount(bookChapterCount);
      loadChapter(bookId, chapter);
      // Update URL for bookmarking/sharing — pushState for forward nav, replaceState for chapter changes
      const url = `${scriptureUrl(volAbbrev, bookName, chapter)}${highlightWord ? `?highlight=${encodeURIComponent(highlightWord)}` : ""}`;
      window.history.pushState({}, "", url);
      // Scroll to top of reading container
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo(0, 0);
      }
    },
    [loadChapter, highlightWord]
  );

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const parts = path.replace(/^\/scriptures\/?/, "").split("/").filter(Boolean);
      const volSlug = parts[0] || null;
      const bookSlug = parts[1] || null;
      const chapter = parts[2] ? Number(parts[2]) : null;
      const volAbbrev = volSlug ? VOLUME_SLUG_TO_ABBREV[volSlug] : null;

      if (!volSlug || !path.startsWith("/scriptures")) {
        setSelectedVolume(null);
        setSelectedBookId(null);
        setSelectedBookName(null);
        setSelectedChapter(null);
        setChapterCount(0);
        setVerses([]);
        return;
      }

      if (volAbbrev && !bookSlug) {
        setSelectedVolume(volAbbrev);
        setSelectedBookId(null);
        setSelectedBookName(null);
        setSelectedChapter(null);
        setChapterCount(0);
        setVerses([]);
        return;
      }

      if (volAbbrev && bookSlug && !chapter) {
        const vol = volumes.find((v) => v.abbrev === volAbbrev);
        if (vol) {
          const book = vol.books.find((b) => bookNameToSlug(b.name) === bookSlug || b.name.toLowerCase() === slugToBookSearch(bookSlug));
          if (book) {
            setSelectedVolume(volAbbrev);
            setSelectedBookId(book.id);
            setSelectedBookName(book.name);
            setChapterCount(book.chapterCount);
            setSelectedChapter(null);
            setVerses([]);
          }
        }
        return;
      }

      if (volAbbrev && bookSlug && chapter) {
        const vol = volumes.find((v) => v.abbrev === volAbbrev);
        if (vol) {
          const book = vol.books.find((b) => bookNameToSlug(b.name) === bookSlug || b.name.toLowerCase() === slugToBookSearch(bookSlug));
          if (book) {
            const ch = Math.max(1, Math.min(chapter, book.chapterCount));
            setSelectedVolume(volAbbrev);
            setSelectedBookId(book.id);
            setSelectedBookName(book.name);
            setSelectedChapter(ch);
            setChapterCount(book.chapterCount);
            loadChapter(book.id, ch);
          }
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [volumes, loadChapter]);

  const toggleLightMode = () => {
    setLightMode((prev) => {
      const next = !prev;
      localStorage.setItem("reader-light-mode", String(next));
      analytics.themeToggle(next ? "light" : "dark");
      return next;
    });
  };

  const cycleFontSize = () => {
    setFontSize((prev) => {
      const next = (prev + 1) % 3;
      localStorage.setItem("reader-font-size", String(next));
      analytics.fontSizeChange(next);
      return next;
    });
  };

  // Get prev/next book info for better nav labels
  const getAdjacentBookInfo = useCallback(() => {
    if (!selectedVolume || !selectedBookId) return { prev: null, next: null };
    const vol = volumes.find((v) => v.abbrev === selectedVolume);
    if (!vol) return { prev: null, next: null };
    const bookIdx = vol.books.findIndex((b) => b.id === selectedBookId);
    return {
      prev: bookIdx > 0 ? vol.books[bookIdx - 1] : null,
      next: bookIdx < vol.books.length - 1 ? vol.books[bookIdx + 1] : null,
    };
  }, [selectedVolume, selectedBookId, volumes]);

  // Navigate to prev/next chapter
  const goToPrevChapter = useCallback(() => {
    if (!selectedBookId || !selectedChapter || !selectedVolume) return;
    if (selectedChapter > 1) {
      analytics.chapterNavigate(selectedBookName || "", selectedChapter - 1, "prev");
      goToChapter(selectedVolume, selectedBookId, selectedBookName || "", selectedChapter - 1, chapterCount);
    } else {
      const { prev } = getAdjacentBookInfo();
      if (prev) {
        analytics.chapterNavigate(prev.name, prev.chapterCount, "prev");
        goToChapter(selectedVolume, prev.id, prev.name, prev.chapterCount, prev.chapterCount);
      }
    }
  }, [selectedBookId, selectedChapter, selectedVolume, selectedBookName, chapterCount, goToChapter, getAdjacentBookInfo]);

  const goToNextChapter = useCallback(() => {
    if (!selectedBookId || !selectedChapter || !selectedVolume) return;
    if (selectedChapter < chapterCount) {
      analytics.chapterNavigate(selectedBookName || "", selectedChapter + 1, "next");
      goToChapter(selectedVolume, selectedBookId, selectedBookName || "", selectedChapter + 1, chapterCount);
    } else {
      const { next } = getAdjacentBookInfo();
      if (next) {
        analytics.chapterNavigate(next.name, 1, "next");
        goToChapter(selectedVolume, next.id, next.name, 1, next.chapterCount);
      }
    }
  }, [selectedBookId, selectedChapter, selectedVolume, selectedBookName, chapterCount, goToChapter, getAdjacentBookInfo]);

  // Mobile swipe handlers for chapter navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    swipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeRef.current) return;
    const dx = e.changedTouches[0].clientX - swipeRef.current.startX;
    const dy = e.changedTouches[0].clientY - swipeRef.current.startY;
    swipeRef.current = null;
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 2) {
      if (dx < 0) goToNextChapter();
      else goToPrevChapter();
    }
  }, [goToNextChapter, goToPrevChapter]);

  // Keyboard navigation
  useEffect(() => {
    if (selectedChapter === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); goToPrevChapter(); }
      if (e.key === "ArrowRight") { e.preventDefault(); goToNextChapter(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedChapter, goToPrevChapter, goToNextChapter]);

  // Track in-chapter search (debounced)
  useEffect(() => {
    if (searchTerm.length < 2 || !selectedBookName || !selectedChapter) return;
    const timer = setTimeout(() => {
      analytics.chapterSearch(selectedBookName, selectedChapter, searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedBookName, selectedChapter]);

  // Highlight search term in verse text
  // Active highlight word: either from deep link or from in-chapter search
  const activeHighlight = searchTerm.length >= 2 ? searchTerm : highlightWord;

  // Per-verse match data for search navigator
  const verseMatches = activeHighlight
    ? verses.map((v) => {
        const escaped = activeHighlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "gi");
        const matches = v.text.match(regex);
        return { verse: v.verse, count: matches ? matches.length : 0 };
      })
    : [];

  const searchMatchCount = verseMatches.reduce((sum, v) => sum + v.count, 0);
  const maxVerseMatches = Math.max(...verseMatches.map((v) => v.count), 1);

  // ── Entity linking: first-mention hyperlinks for people and places ──
  type EntityEntry = { type: "person"; entity: ScriptureCharacter } | { type: "place"; entity: ScriptureLocation };

  // Build a map of name → entity, sorted by name length descending (longer names first)
  const entityMap = useMemo(() => {
    const map = new Map<string, EntityEntry>();
    // Characters (people) — name + aliases
    for (const c of allCharacters) {
      if (!map.has(c.name.toLowerCase())) {
        map.set(c.name.toLowerCase(), { type: "person", entity: c });
      }
      for (const alias of c.aliases) {
        if (!map.has(alias.toLowerCase())) {
          map.set(alias.toLowerCase(), { type: "person", entity: c });
        }
      }
    }
    // Locations (places) — name + aliases
    for (const loc of allLocations) {
      if (!map.has(loc.name.toLowerCase())) {
        map.set(loc.name.toLowerCase(), { type: "place", entity: loc });
      }
      for (const alias of loc.aliases) {
        if (!map.has(alias.toLowerCase())) {
          map.set(alias.toLowerCase(), { type: "place", entity: loc });
        }
      }
    }
    return map;
  }, [allCharacters, allLocations]);

  // Build regex from all entity names, sorted by length descending to prevent partial matches
  const entityRegex = useMemo(() => {
    if (entityMap.size === 0) return null;
    const names = Array.from(entityMap.keys())
      .filter((n) => n.length >= 3) // skip very short names to avoid false positives
      .sort((a, b) => b.length - a.length);
    if (names.length === 0) return null;
    const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  }, [entityMap]);

  // Track first mentions per entity per chapter — resets when chapter or verses change
  const firstMentions = useMemo(() => {
    if (!entityRegex || verses.length === 0) return new Map<number, Map<number, EntityEntry>>();
    // Map: verseNumber → Map<startIndex, EntityEntry>
    const result = new Map<number, Map<number, EntityEntry>>();
    const seen = new Set<string>(); // track entity IDs already linked

    for (const v of verses) {
      const text = readingMode === "modern" && v.text_modern ? v.text_modern : v.text;
      let match: RegExpExecArray | null;
      entityRegex.lastIndex = 0;
      while ((match = entityRegex.exec(text)) !== null) {
        const matchedName = match[1].toLowerCase();
        const entry = entityMap.get(matchedName);
        if (!entry) continue;
        const entityId = entry.type === "person"
          ? `person:${(entry.entity as ScriptureCharacter).id}`
          : `place:${(entry.entity as ScriptureLocation).id}`;
        if (seen.has(entityId)) continue;
        seen.add(entityId);
        if (!result.has(v.verse)) result.set(v.verse, new Map());
        result.get(v.verse)!.set(match.index, entry);
      }
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityRegex, entityMap, verses, selectedChapter, readingMode]);

  const renderVerseText = (text: string, verseNumber?: number) => {
    const volHighlightColor = selectedVolume ? VOLUME_COLORS[selectedVolume] || "#3B82F6" : "#3B82F6";
    const verseEntityMap = verseNumber ? firstMentions.get(verseNumber) : undefined;

    // Nugget keywords for this verse
    const verseNuggets = (showContextNuggets && verseNumber) ? nuggetKeywordMap.get(verseNumber) : undefined;

    // If no highlights, entity links, or nugget keywords, return plain text
    if (!activeHighlight && !verseEntityMap?.size && !verseNuggets?.length) return text;

    // Build a list of annotated ranges: entity links + search highlights + nugget keywords
    type Segment = { start: number; end: number; kind: "entity"; entry: EntityEntry }
      | { start: number; end: number; kind: "highlight" }
      | { start: number; end: number; kind: "nugget"; nugget: ContextNugget };
    const segments: Segment[] = [];

    // Entity first-mention segments
    if (verseEntityMap && entityRegex) {
      entityRegex.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = entityRegex.exec(text)) !== null) {
        if (verseEntityMap.has(m.index)) {
          segments.push({ start: m.index, end: m.index + m[0].length, kind: "entity", entry: verseEntityMap.get(m.index)! });
        }
      }
    }

    // Search highlight segments
    if (activeHighlight) {
      const escaped = activeHighlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const hlRegex = new RegExp(`\\b${escaped}\\b`, "gi");
      let m: RegExpExecArray | null;
      while ((m = hlRegex.exec(text)) !== null) {
        segments.push({ start: m.index, end: m.index + m[0].length, kind: "highlight" });
      }
    }

    // Nugget keyword segments (lowest priority)
    if (verseNuggets) {
      for (const e of verseNuggets) {
        segments.push({ start: e.start, end: e.end, kind: "nugget", nugget: e.nugget });
      }
    }

    if (segments.length === 0) return text;

    // Sort: entity > highlight > nugget priority at same position
    const kindPriority = { entity: 0, highlight: 1, nugget: 2 };
    segments.sort((a, b) => a.start - b.start || kindPriority[a.kind] - kindPriority[b.kind]);

    // Remove overlapping segments (earlier/longer wins)
    const merged: Segment[] = [];
    let lastEnd = 0;
    for (const seg of segments) {
      if (seg.start < lastEnd) continue; // skip overlapping
      merged.push(seg);
      lastEnd = seg.end;
    }

    // Build React elements
    const elements: React.ReactNode[] = [];
    let cursor = 0;
    for (let i = 0; i < merged.length; i++) {
      const seg = merged[i];
      // Plain text before this segment
      if (cursor < seg.start) {
        elements.push(<span key={`t${i}`}>{text.slice(cursor, seg.start)}</span>);
      }
      const segText = text.slice(seg.start, seg.end);
      if (seg.kind === "highlight") {
        elements.push(
          <mark
            key={`h${i}`}
            style={{
              background: lightMode ? `${volHighlightColor}30` : `${volHighlightColor}40`,
              color: "inherit",
              padding: "1px 3px",
              borderRadius: "3px",
            }}
          >
            {segText}
          </mark>
        );
      } else if (seg.kind === "nugget") {
        // Context Nugget keyword — clickable but no shimmer animation
        elements.push(
          <span
            key={`nugget${i}`}
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); analytics.nuggetKeywordClick(seg.nugget.id || "", seg.nugget.keyword); setActiveNuggets([seg.nugget]); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); analytics.nuggetKeywordClick(seg.nugget.id || "", seg.nugget.keyword); setActiveNuggets([seg.nugget]); } }}
            style={{
              cursor: "pointer",
              borderRadius: "2px",
              padding: "1px 2px",
            }}
          >
            {segText}
          </span>
        );
      } else {
        // Entity link
        const entry = seg.entry;
        const isPerson = entry.type === "person";
        const personEntity = isPerson ? entry.entity as ScriptureCharacter : null;
        const portrait = personEntity?.portraitUrl;
        elements.push(
          <span
            key={`e${i}`}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              analytics.entityLinkClick(isPerson ? "person" : "location", entry.entity.name, selectedBookName || "", selectedChapter || 0);
              if (isPerson) {
                setSelectedCharacter(entry.entity as ScriptureCharacter);
              } else {
                setSelectedLocation(entry.entity as ScriptureLocation);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                analytics.entityLinkClick(isPerson ? "person" : "location", entry.entity.name, selectedBookName || "", selectedChapter || 0);
                if (isPerson) {
                  setSelectedCharacter(entry.entity as ScriptureCharacter);
                } else {
                  setSelectedLocation(entry.entity as ScriptureLocation);
                }
              }
            }}
            style={{
              color: "inherit",
              textDecoration: "underline",
              textDecorationColor: lightMode ? "rgba(37, 99, 235, 0.5)" : "rgba(37, 99, 235, 0.45)",
              textUnderlineOffset: "3px",
              textDecorationThickness: "2px",
              cursor: "pointer",
              borderRadius: "2px",
              transition: "text-decoration-color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecorationColor = "rgba(37, 99, 235, 0.8)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecorationColor = lightMode ? "rgba(37, 99, 235, 0.5)" : "rgba(37, 99, 235, 0.45)"; }}
          >
            {isPerson && portrait ? (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                overflow: "hidden",
                verticalAlign: "middle",
                marginRight: "3px",
                marginTop: "-2px",
                border: "1.5px solid #2CC1E8",
                flexShrink: 0,
              }}>
                <img src={portrait} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </span>
            ) : isPerson ? (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#2CC1E8",
                verticalAlign: "middle",
                marginRight: "3px",
                marginTop: "-2px",
                flexShrink: 0,
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M20 21a8 8 0 1 0-16 0" />
                </svg>
              </span>
            ) : (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#2CC1E8",
                verticalAlign: "middle",
                marginRight: "3px",
                marginTop: "-2px",
                flexShrink: 0,
              }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
            )}
            {segText}
          </span>
        );
      }
      cursor = seg.end;
    }
    // Remaining plain text
    if (cursor < text.length) {
      elements.push(<span key="tail">{text.slice(cursor)}</span>);
    }

    return <>{elements}</>;
  };

  // Color theme
  // Speaker type colors — darker in light mode for readability
  const SPEAKER_TYPE_COLORS: Record<SpeakerType, string> = lightMode
    ? { divine: "#D97706", prophet: "#3B82F6", apostle: "#10B981", angel: "#8B5CF6", narrator: "#0891B2", other: "" }
    : { divine: "#FBBF24", prophet: "#60A5FA", apostle: "#34D399", angel: "#C4B5FD", narrator: "#22D3EE", other: "" };
  const OTHER_PALETTE = lightMode
    ? ["#9333EA", "#C2410C", "#0369A1", "#15803D", "#A21CAF", "#B45309", "#1D4ED8", "#047857", "#7E22CE", "#BE123C"]
    : ["#A78BFA", "#FB923C", "#38BDF8", "#4ADE80", "#E879F9", "#FCD34D", "#818CF8", "#2DD4BF", "#C084FC", "#FB7185"];
  // Assign unique color per speaker name (shared across the chapter)
  const speakerColorMap = new Map<string, string>();
  let otherIdx = 0;
  for (const s of chapterSpeakers) {
    const name = displaySpeakerName(s.speaker, s.speakerType, selectedVolume || "");
    if (!speakerColorMap.has(name)) {
      speakerColorMap.set(
        name,
        s.speakerType === "other"
          ? OTHER_PALETTE[otherIdx++ % OTHER_PALETTE.length]
          : SPEAKER_TYPE_COLORS[s.speakerType],
      );
    }
  }

  const theme = lightMode
    ? {
        bg: "#f8f6f1",
        text: "#222222",
        textSecondary: "#555555",
        textMuted: "#999999",
        surface: "rgba(0, 0, 0, 0.04)",
        border: "rgba(0, 0, 0, 0.10)",
        verseNum: "#bbbbbb",
        verseText: "#333333",
      }
    : {
        bg: "#29292b",
        text: "#f0f0f0",
        textSecondary: "#b0b0b0",
        textMuted: "#666666",
        surface: "rgba(255, 255, 255, 0.05)",
        border: "rgba(255, 255, 255, 0.08)",
        verseNum: "#555555",
        verseText: "rgba(255, 255, 255, 0.85)",
      };

  const mt = getModalTheme(lightMode);

  // Shared dark nav bar for all scripture views (volume/book/chapter picker + reading)
  const scriptureNavBar = (leftContent: React.ReactNode, centerContent?: React.ReactNode) => (
    <div
      style={{
        background: "rgba(17, 17, 22, 0.95)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: isMobile ? "10px 16px" : "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
        {leftContent}
      </div>
      {/* Center: logo or chapter selector */}
      <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center" }}>
        {centerContent || (
          <a href="/" title="Home" style={{ display: "flex", alignItems: "center" }}>
            <img src="/se-logo.svg" alt="Scripture Explorer" style={{ height: "28px", width: "auto" }} />
          </a>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "6px" : "10px" }}>
        <a href="/search" title="Search scriptures" style={{ color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", textDecoration: "none" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </a>
        {/* Light mode toggle hidden — dark theme always */}
        <button onClick={() => setMenuOpen(true)} title="Menu" style={{ background: "none", border: "none", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", padding: 0 }}>
          <HamburgerIcon />
        </button>
      </div>
    </div>
  );

  // Wrapper for non-reading scripture views (volume/book/chapter picker)
  const scripturePageWrapper = (navLeft: React.ReactNode, content: React.ReactNode) => (
    <div style={{ minHeight: "100vh", background: "var(--bg-gradient)", display: "flex", flexDirection: "column" }}>
      {scriptureNavBar(navLeft)}
      <div style={{ flex: 1, maxWidth: "1200px", width: "100%", margin: "0 auto", padding: isMobile ? "24px 16px" : "32px 32px" }}>
        {content}
      </div>
      {/* NavMenu */}
      <NavMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );

  // ── READING VIEW ──
  if (selectedChapter !== null && selectedBookId !== null && selectedVolume) {
    const volColor = VOLUME_COLORS[selectedVolume] || "#3B82F6";
    // Bar colors — always dark regardless of light/dark theme
    const bar = {
      bg: "rgba(17, 17, 22, 0.95)",
      border: "rgba(255, 255, 255, 0.08)",
      text: "#f0f0f0",
      textSecondary: "#b0b0b0",
      textMuted: "#666666",
      surface: "rgba(255, 255, 255, 0.06)",
      surfaceBorder: "rgba(255, 255, 255, 0.08)",
    };
    const vol = volumes.find((v) => v.abbrev === selectedVolume);
    const isDC = selectedVolume === "D&C";
    const chapterLabel = isDC ? `Section ${selectedChapter}` : `Chapter ${selectedChapter}`;
    const { prev: prevBook, next: nextBook } = getAdjacentBookInfo();
    const isFirstChapterOfVolume = selectedChapter === 1 && (!prevBook);
    const isLastChapterOfVolume = selectedChapter === chapterCount && (!nextBook);

    // Bottom nav labels
    const prevLabel = selectedChapter > 1
      ? (isDC ? `Sec ${selectedChapter - 1}` : `Ch ${selectedChapter - 1}`)
      : prevBook ? prevBook.name : null;
    const nextLabel = selectedChapter < chapterCount
      ? (isDC ? `Sec ${selectedChapter + 1}` : `Ch ${selectedChapter + 1}`)
      : nextBook ? nextBook.name : null;

    return (
      <div
        ref={scrollContainerRef}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        style={{
          position: "fixed",
          inset: 0,
          background: theme.bg,
          zIndex: 60,
          overflowY: "auto",
          transition: "background 0.3s ease, color 0.3s ease",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "rgba(17, 17, 22, 0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            padding: isMobile ? "10px 16px" : "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Center: chapter/section selector (moved from bottom bar) */}
          {!isMobile && (
            <div style={{
              position: "absolute",
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              pointerEvents: "none",
            }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", pointerEvents: "auto" }}>
                <select
                  value={selectedChapter ?? 1}
                  onChange={(e) => {
                    const ch = Number(e.target.value);
                    if (selectedVolume && selectedBookId && selectedBookName) {
                      goToChapter(selectedVolume, selectedBookId, selectedBookName, ch, chapterCount);
                    }
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: bar.text,
                    padding: "6px 26px 6px 6px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    outline: "none",
                    WebkitAppearance: "none",
                    appearance: "none",
                    textAlign: "center",
                  }}
                >
                  {Array.from({ length: chapterCount }, (_, i) => i + 1).map((ch) => (
                    <option key={ch} value={ch} style={{ background: "#1a1a22", color: "#f0f0f0" }}>
                      {isDC ? `Section ${ch}` : `Chapter ${ch}`}
                    </option>
                  ))}
                </select>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: "2px", pointerEvents: "none" }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          )}
          {/* Left: back button + book name (clicking goes back to book list) */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1, overflow: "hidden" }}>
            <button
              onClick={() => {
                // For single-chapter books, skip the chapter grid and go back to book list
                if (chapterCount <= 1) {
                  setSelectedChapter(null);
                  setSelectedBookId(null);
                  setSelectedBookName(null);
                  setChapterCount(0);
                  setVerses([]);
                  if (selectedVolume) {
                    window.history.pushState({}, "", scriptureUrl(selectedVolume));
                  }
                } else {
                  setSelectedChapter(null);
                  setVerses([]);
                  if (selectedVolume && selectedBookName) {
                    window.history.pushState({}, "", scriptureUrl(selectedVolume, selectedBookName));
                  }
                }
              }}
              style={{
                background: "none",
                border: "none",
                color: bar.textSecondary,
                cursor: "pointer",
                padding: "6px 4px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                whiteSpace: "nowrap",
              }}
              title={chapterCount <= 1 ? "Back to book list" : "Back to chapter list"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span style={{
                fontSize: isMobile ? "0.82rem" : "0.88rem",
                fontWeight: 600,
                color: bar.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {chapterCount <= 1 ? (volumes.find(v => v.abbrev === selectedVolume)?.name || selectedBookName) : selectedBookName}
              </span>
            </button>
            {/* Mobile: show chapter label next to book name */}
            {isMobile && (
              <div style={{
                fontSize: "0.65rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: bar.textMuted,
              }}>
                {chapterLabel}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "6px" : "10px" }}>
            {/* Search — navigates to site-wide search */}
            <a
              href="/search"
              title="Search scriptures"
              style={{
                background: "none",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </a>
            {/* Font size */}
            <button
              onClick={cycleFontSize}
              title="Change font size"
              style={{
                background: "none",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: fontSize === 0 ? "0.9rem" : fontSize === 1 ? "1.05rem" : "1.2rem",
                fontWeight: 700,
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {fontSizes[fontSize].label}
            </button>
            {/* Light/dark toggle hidden — dark theme always */}
            {/* Hamburger menu */}
            <button
              onClick={() => setMenuOpen(true)}
              title="Menu"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                padding: 0,
              }}
            >
              <HamburgerIcon />
            </button>
          </div>
        </div>

        {/* Search panel drops down below header (both mobile + desktop) */}
        {searchOpen && (
          <div style={{
            position: "sticky",
            top: isMobile ? "52px" : "56px",
            zIndex: 49,
            background: bar.bg,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: `1px solid ${bar.border}`,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "slideDown 0.2s ease",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={bar.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              enterKeyHint="search"
              autoCapitalize="none"
              autoCorrect="off"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchOpen(false);
                  setSearchTerm("");
                }
              }}
              placeholder="Find in chapter..."
              autoFocus
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "8px",
                border: "none",
                background: bar.surface,
                color: bar.text,
                fontSize: "0.9rem",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            {searchTerm.length >= 2 && (
              <span style={{ fontSize: "0.75rem", color: bar.textMuted, whiteSpace: "nowrap" }}>
                {searchMatchCount} found
              </span>
            )}
            <button
              onClick={() => { setSearchOpen(false); setSearchTerm(""); }}
              style={{
                background: "none",
                border: "none",
                color: bar.textMuted,
                fontSize: "1rem",
                cursor: "pointer",
                padding: "4px 6px",
                fontFamily: "inherit",
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Nav Menu */}
        <NavMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

        {/* Verses */}
        <div
          style={{
            maxWidth: "680px",
            margin: "0 auto",
            padding: isMobile ? "24px 20px 100px" : "40px 32px 120px",
          }}
        >
          {/* Landscape Book Image + Chapter Insights Panel */}
          {!isLoading && verses.length > 0 && (() => {
            // Book landscape images: chapter-specific override first, then book-level, then null
            // Gradient placeholders use CSS gradients; real images use url strings
            // Book-specific images — will be replaced over time with custom art
            const BOOK_LANDSCAPE_IMAGES: Record<string, string | { gradient: string }> = {
              "Genesis": "/book-images/genesis.jpg",
              // Add custom book images here as they're created
            };
            const CHAPTER_LANDSCAPE_IMAGES: Record<string, Record<number, string | { gradient: string }>> = {
              // Add custom chapter-specific images here
            };
            // Default image for all books that don't have a custom one yet
            const DEFAULT_IMAGE = "/book-images/genesis.jpg";
            const bookKey = selectedBookName || "";
            const chapterNum = selectedChapter || 0;
            const chapterOverride = CHAPTER_LANDSCAPE_IMAGES[bookKey]?.[chapterNum];
            const bookImage = BOOK_LANDSCAPE_IMAGES[bookKey];
            const landscapeImage = chapterOverride || bookImage || DEFAULT_IMAGE;

            const hasImage = !!landscapeImage;

            // Extract dominant colors from image edges for ambilight effect
            const extractAmbilightColors = (img: HTMLImageElement) => {
              try {
                const canvas = document.createElement("canvas");
                const size = 60; // sample area size
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                ctx.drawImage(img, 0, 0);
                const sample = (x: number, y: number, sw: number, sh: number) => {
                  const data = ctx.getImageData(x, y, sw, sh).data;
                  let r = 0, g = 0, b = 0, count = 0;
                  for (let i = 0; i < data.length; i += 4) {
                    r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
                  }
                  // Boost brightness: lift dark colors so they produce a visible glow
                  let ar = r / count, ag = g / count, ab = b / count;
                  const brightness = (ar + ag + ab) / 3;
                  if (brightness < 120) {
                    const boost = 120 / Math.max(brightness, 1);
                    ar = Math.min(255, ar * boost);
                    ag = Math.min(255, ag * boost);
                    ab = Math.min(255, ab * boost);
                  }
                  return `${Math.round(ar)}, ${Math.round(ag)}, ${Math.round(ab)}`;
                };
                const w = img.naturalWidth, h = img.naturalHeight;
                // Sample slightly inward (10%) to avoid pure black edges
                const inset = Math.round(w * 0.1);
                const insetY = Math.round(h * 0.15);
                setAmbilightColors({
                  tl: sample(inset, insetY, size, size),
                  tr: sample(w - inset - size, insetY, size, size),
                  bl: sample(inset, h - insetY - size, size, size),
                  br: sample(w - inset - size, h - insetY - size, size, size),
                });
              } catch { /* CORS or other error — silently skip */ }
            };

            return (
              <>
                {hasImage && (
                  <div
                    style={{
                      width: isMobile ? "calc(100% + 40px)" : "calc(100% + 64px)",
                      marginTop: isMobile ? "-24px" : "-40px",
                      marginLeft: isMobile ? "-20px" : "-32px",
                      marginRight: isMobile ? "-20px" : "-32px",
                      position: "relative",
                      paddingBottom: "0",
                    }}
                  >
                  {/* Full-viewport-width dark band behind image on desktop */}
                  {!isMobile && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "100vw",
                        backgroundColor: "rgba(0,0,0,0.2)",
                        backgroundImage: `repeating-linear-gradient(
                          45deg,
                          transparent,
                          transparent 3px,
                          rgba(255,255,255,0.02) 3px,
                          rgba(255,255,255,0.02) 4px
                        ), repeating-linear-gradient(
                          -45deg,
                          transparent,
                          transparent 3px,
                          rgba(255,255,255,0.02) 3px,
                          rgba(255,255,255,0.02) 4px
                        )`,
                        zIndex: 0,
                        pointerEvents: "none",
                      }}
                    />
                  )}
                  {/* Ambilight glow — projects edge colors behind image */}
                  {/* Desktop: glow on left, right, and bottom. Mobile: bottom only (image is edge-to-edge) */}
                  {ambilightColors && (
                    <div
                      style={{
                        position: "absolute",
                        top: isMobile ? "40%" : "-30px",
                        bottom: "-40px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: isMobile ? "100%" : "100vw",
                        zIndex: 0,
                        pointerEvents: "none",
                        background: isMobile
                          ? `radial-gradient(ellipse at 50% 100%, rgba(${ambilightColors.bl}, 0.5) 0%, transparent 70%)`
                          : `
                            radial-gradient(ellipse at 0% 40%, rgba(${ambilightColors.tl}, 0.5) 0%, transparent 60%),
                            radial-gradient(ellipse at 100% 40%, rgba(${ambilightColors.tr}, 0.5) 0%, transparent 60%),
                            radial-gradient(ellipse at 0% 100%, rgba(${ambilightColors.bl}, 0.55) 0%, transparent 60%),
                            radial-gradient(ellipse at 100% 100%, rgba(${ambilightColors.br}, 0.55) 0%, transparent 60%),
                            radial-gradient(ellipse at 50% 100%, rgba(${ambilightColors.bl}, 0.4) 0%, transparent 70%)
                          `,
                        filter: "blur(45px)",
                        animation: "fadeIn 2.5s ease-out 1s both",
                      }}
                    />
                  )}
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "4 / 1",
                      borderRadius: "0",
                      overflow: "hidden",
                      position: "relative",
                      zIndex: 1,
                      border: "none",
                      ...(typeof landscapeImage === "object" && "gradient" in landscapeImage
                        ? { background: landscapeImage.gradient }
                        : {}),
                    }}
                  >
                    {typeof landscapeImage === "string" && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={landscapeImage}
                        alt={`${bookKey} landscape`}
                        onLoad={(e) => extractAmbilightColors(e.currentTarget)}
                        crossOrigin="anonymous"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                          animation: "fadeIn 0.4s ease-out",
                        }}
                      />
                    )}
                    {/* Bottom gradient overlay to blend into insights bar */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: "40%",
                        background: lightMode
                          ? "linear-gradient(to top, rgba(0,0,0,0.06) 0%, transparent 100%)"
                          : "linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 100%)",
                        pointerEvents: "none",
                      }}
                    />
                    {/* Subtle centered top shadow — gentle vignette */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: "20%",
                        right: "20%",
                        height: "50%",
                        background: "radial-gradient(ellipse at center top, rgba(0,0,0,0.18) 0%, transparent 70%)",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                  </div>
                )}
                <ChapterInsights
                  bookId={selectedBookId}
                  chapter={selectedChapter}
                  bookName={selectedBookName || ""}
                  volumeAbbrev={selectedVolume}
                  volColor={volColor}
                  lightMode={lightMode}
                  isMobile={isMobile}
                  flatTopCorners={hasImage}
                  glowColor={ambilightColors ? `rgba(${ambilightColors.tr}, 0.6)` : undefined}
                  onScrollToVerse={(verse) => {
                    const el = document.getElementById(`verse-${verse}`);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                      el.style.transition = "background 0.3s";
                      el.style.background = "rgba(59, 130, 246, 0.15)";
                      setTimeout(() => { el.style.background = ""; }, 2000);
                    }
                  }}
                  onExploreWord={(word) => { analytics.insightsThemeClick(word, selectedBookName || "", selectedChapter || 0); setExploredWord(word); }}
                  onSelectCharacter={openCharacterById}
                  speakers={chapterSpeakers}
                />
              </>
            );
          })()}

          {isLoading && (
            <div style={{ textAlign: "center", padding: "60px", color: theme.textMuted }}>
              Loading...
            </div>
          )}

          {/* Layer toggles — no section headings, centered, uniform height, standard blue accent */}
          {!isLoading && (chapterSpeakers.length > 0 || chapterResources.length > 0 || hasModernText || hasNarration || verses.length > 0) && (() => {
            const toggleAccent = lightMode ? "#4A7FD4" : "#5B8DEF";
            return (
            <div style={{ marginBottom: "20px", marginTop: "4px", textAlign: "center", opacity: 0.65, transition: "opacity 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.65")}
            >
              <div style={{ display: "flex", alignItems: "stretch", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
                {/* Speakers toggle hidden — always on. Preserved for future re-enable. */}
                {chapterResources.length > 0 && (
                  <button
                    onClick={() => {
                      const next = !showResources;
                      setShowResources(next);
                      localStorage.setItem("reader-show-resources", String(next));
                      analytics.layerToggle("resources", next);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "7px 12px",
                      borderRadius: "8px",
                      border: `1px solid ${showResources ? `${toggleAccent}50` : theme.border}`,
                      background: showResources
                        ? `${toggleAccent}18`
                        : lightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
                      color: showResources ? toggleAccent : theme.textMuted,
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.2s",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    Resources
                    <span style={{ fontSize: "0.6rem", opacity: 0.7 }}>
                      ({chapterResources.length})
                    </span>
                  </button>
                )}
                {/* Context Nuggets toggle hidden — always on. Preserved for future re-enable. */}
                {/* Tone overlay toggle — removed (not useful enough to show) */}
                {/* Three-way reading mode sliding toggle */}
                {(hasModernText || hasNarration) && (() => {
                  const modes: ReadingMode[] = ["original", "modern", "narration"].filter((mode) => {
                    if (mode === "modern") return hasModernText;
                    if (mode === "narration") return hasNarration;
                    return true;
                  }) as ReadingMode[];
                  const labels: Record<ReadingMode, string> = { original: "Original", modern: "Modern", narration: "Narration" };
                  const activeIndex = modes.indexOf(readingMode);
                  const effectiveIndex = activeIndex >= 0 ? activeIndex : 0;
                  const pillWidthPercent = 100 / modes.length;
                  return (
                    <div style={{
                      display: "inline-flex",
                      position: "relative",
                      borderRadius: "8px",
                      border: `1px solid ${theme.border}`,
                      background: lightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
                      padding: "3px",
                      overflow: "hidden",
                    }}>
                      {/* Sliding indicator */}
                      <div style={{
                        position: "absolute",
                        top: "3px",
                        bottom: "3px",
                        left: `calc(${effectiveIndex * pillWidthPercent}% + 3px)`,
                        width: `calc(${pillWidthPercent}% - 6px)`,
                        borderRadius: "6px",
                        background: toggleAccent,
                        transition: "left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        zIndex: 0,
                      }} />
                      {modes.map((mode, i) => {
                        const isActive = readingMode === mode;
                        return (
                          <button
                            key={mode}
                            onClick={() => {
                              setReadingMode(mode);
                              localStorage.setItem("reader-reading-mode", mode);
                              analytics.readingModeToggle(mode);
                            }}
                            style={{
                              position: "relative",
                              zIndex: 1,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "4px 12px",
                              borderRadius: "6px",
                              border: "none",
                              background: "transparent",
                              color: isActive ? "#ffffff" : theme.textMuted,
                              fontSize: "0.68rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "inherit",
                              transition: "color 0.2s",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {labels[mode]}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
                {/* Help icon — explains reading modes */}
                {(hasModernText || hasNarration) && (
                  <button
                    onClick={() => setShowReadingModeHelp(true)}
                    title="About reading modes"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      alignSelf: "center",
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      border: "none",
                      background: lightMode ? "#c0c0c0" : "rgba(255,255,255,0.18)",
                      color: lightMode ? "#ffffff" : "#1a1a1a",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                      flexShrink: 0,
                    }}
                  >
                    ?
                  </button>
                )}
              </div>

              {/* Reading mode help — slide-in panel */}
              {showReadingModeHelp && (
                <>
                  <div
                    onClick={() => setShowReadingModeHelp(false)}
                    style={{
                      position: "fixed",
                      inset: 0,
                      background: "rgba(0,0,0,0.6)",
                      backdropFilter: "blur(4px)",
                      WebkitBackdropFilter: "blur(4px)",
                      zIndex: 200,
                    }}
                  />
                  <div
                    style={{
                      position: "fixed",
                      top: 0,
                      right: 0,
                      bottom: 0,
                      width: isMobile ? "85vw" : "420px",
                      maxWidth: "90vw",
                      background: lightMode ? "#faf9f5" : "#29292b",
                      zIndex: 201,
                      overflowY: "auto",
                      boxShadow: "-4px 0 24px rgba(0,0,0,0.3)",
                      padding: isMobile ? "24px 20px" : "32px 28px",
                      textAlign: "left",
                      animation: "slideInRight 0.25s ease",
                    }}
                  >
                    <button
                      onClick={() => setShowReadingModeHelp(false)}
                      style={{
                        position: "absolute",
                        top: "16px",
                        right: "16px",
                        background: "none",
                        border: "none",
                        fontSize: "1.2rem",
                        cursor: "pointer",
                        color: lightMode ? "#888" : "rgba(255,255,255,0.5)",
                        padding: "4px",
                      }}
                    >
                      ✕
                    </button>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: lightMode ? "#1a1a1a" : "var(--text)", marginBottom: "20px" }}>
                      Reading Modes
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: lightMode ? "#333" : "var(--text)", marginBottom: "6px" }}>
                          Original
                        </div>
                        <p style={{ fontSize: "0.85rem", color: lightMode ? "#555" : "rgba(255,255,255,0.7)", lineHeight: 1.6, margin: 0 }}>
                          The standard scripture text as published — King James Version for the Bible, and the original 1981 edition text for the Book of Mormon.
                        </p>
                      </div>
                      {hasModernText && (
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: lightMode ? "#333" : "var(--text)", marginBottom: "6px" }}>
                            Modern
                          </div>
                          <p style={{ fontSize: "0.85rem", color: lightMode ? "#555" : "rgba(255,255,255,0.7)", lineHeight: 1.6, margin: 0 }}>
                            A verse-by-verse modern English translation. OT/NT use the World English Bible (WEB), a public-domain modern translation. BoM modern text was generated using AI with strict 1:1 verse alignment, then audited for accuracy.
                          </p>
                        </div>
                      )}
                      {hasNarration && (
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: lightMode ? "#333" : "var(--text)", marginBottom: "6px" }}>
                            Narration
                          </div>
                          <p style={{ fontSize: "0.85rem", color: lightMode ? "#555" : "rgba(255,255,255,0.7)", lineHeight: 1.6, margin: 0 }}>
                            A chapter-level prose summary that retells events and themes in a flowing narrative. Useful for getting an overview before studying the verses.
                          </p>
                        </div>
                      )}
                    </div>
                    <p style={{ fontSize: "0.78rem", color: lightMode ? "#888" : "rgba(255,255,255,0.4)", lineHeight: 1.5, marginTop: "20px", paddingTop: "16px", borderTop: `1px solid ${lightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}` }}>
                      Modern and Narration modes are supplementary tools. They are not official scripture and should not be used as doctrinal sources.
                    </p>
                  </div>
                </>
              )}

            </div>
          );
          })()}

          {/* Narration mode — chapter prose */}
          {!isLoading && readingMode === "narration" && chapterNarration && (
            <div
              style={{
                fontSize: fontSizes[fontSize].body,
                color: theme.verseText,
                lineHeight: 1.9,
                padding: isMobile ? "0 8px" : "0",
                whiteSpace: "pre-wrap",
                transition: "font-size 0.2s ease",
              }}
            >
              {chapterNarration.split("\n\n").map((paragraph, i) => (
                <p key={i} style={{ marginBottom: "1.2em", textIndent: i > 0 ? "1.5em" : "0" }}>
                  {paragraph}
                </p>
              ))}
            </div>
          )}

          {/* Non-canonical banner for Apocrypha */}
          {!isLoading && selectedVolume === "Apoc" && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              marginBottom: "16px",
              borderRadius: "8px",
              border: `1px solid ${lightMode ? "rgba(142,124,195,0.3)" : "rgba(142,124,195,0.2)"}`,
              background: lightMode ? "rgba(142,124,195,0.08)" : "rgba(142,124,195,0.06)",
            }}>
              <span style={{
                fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                color: "#8E7CC3", background: "rgba(142,124,195,0.2)", padding: "2px 6px", borderRadius: "4px",
                flexShrink: 0,
              }}>
                Apocrypha
              </span>
              <span style={{ fontSize: "0.78rem", color: lightMode ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
                Not part of the standard canon. Included in the original 1611 KJV.
              </span>
            </div>
          )}

          {/* Chapter-level resources banner (resources without verseStart) */}
          {!isLoading && showResources && (() => {
            const chapterLevelRes = chapterResources.filter((r) => r.verseStart == null);
            if (chapterLevelRes.length === 0) return null;
            return (
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                padding: "12px 0",
                marginBottom: "8px",
                borderBottom: `1px solid ${lightMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
              }}>
                {chapterLevelRes.map((r) => {
                  const typeColor = r.type === "video" ? "#8b5cf6" : r.type === "article" ? "#3B82F6" : "#10B981";
                  return (
                    <button
                      key={r.id}
                      onClick={() => setActiveResourcePanel({ resources: chapterLevelRes, index: chapterLevelRes.indexOf(r) })}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: `1px solid ${typeColor}40`,
                        background: `${typeColor}10`,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: typeColor }}>
                        {r.type === "video" ? "▶" : r.type === "article" ? "📄" : "📎"} {r.type}
                      </span>
                      <span style={{ fontSize: "0.78rem", fontWeight: 500, color: lightMode ? "#333" : "rgba(255,255,255,0.85)" }}>
                        {r.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* Verse-by-verse mode (original or modern) */}
          {!isLoading && readingMode !== "narration" &&
            verses.map((v) => {
              // External URL available if needed: getVerseUrl(selectedBookName || "", v.chapter, v.verse)
              // Resource layer: find resources that START at this verse, and resources that COVER this verse
              // Only verse-level resources (those with verseStart defined)
              const verseStartResources = showResources
                ? chapterResources.filter((r) => r.verseStart != null && r.verseStart === v.verse)
                : [];
              const verseCoveredBy = showResources
                ? chapterResources.filter((r) => r.verseStart != null && r.verseEnd != null && v.verse >= r.verseStart && v.verse <= r.verseEnd)
                : [];
              // Tone overlay for this verse
              const verseTone = showToneOverlay ? verseToneMap.get(v.verse) : null;
              // Speaker attribution for this verse
              const verseSpeakerRaw = showSpeakers
                ? chapterSpeakers.find((s) => v.verse >= s.verseStart && v.verse <= s.verseEnd)
                : null;
              // Only show speakers who have a dedicated character profile (no groups)
              const verseSpeaker = verseSpeakerRaw && speakerHasProfile(verseSpeakerRaw.speaker, verseSpeakerRaw.speakerType)
                ? verseSpeakerRaw : null;
              const isFirstOfSpeakerSpan = verseSpeaker && v.verse === verseSpeaker.verseStart;
              const verseSpeakerDisplayName = verseSpeaker ? displaySpeakerName(verseSpeaker.speaker, verseSpeaker.speakerType, selectedVolume || "") : null;
              const speakerColor = verseSpeakerDisplayName ? (speakerColorMap.get(verseSpeakerDisplayName) || "#888") : null;
              // Left border: speaker takes priority, then resource
              const resourceBorderColor = verseCoveredBy.length > 0
                ? getResourceTypeColor(verseCoveredBy[0].type)
                : null;
              const leftBorderColor = speakerColor || resourceBorderColor;
              // Calculate speaker span height (number of verses in this span)
              const speakerSpanLength = verseSpeaker
                ? verseSpeaker.verseEnd - verseSpeaker.verseStart + 1
                : 0;
              const isSelected = selectedVerses.has(v.verse);
              return (
                <div
                  key={v.verse}
                  id={`verse-${v.verse}`}
                  style={{
                    marginBottom: "28px",
                    lineHeight: 2,
                    position: "relative",
                    display: "flex",
                    alignItems: "stretch",
                    background: isSelected ? `${volColor}12` : undefined,
                    borderRadius: isSelected ? "6px" : undefined,
                    transition: "background 0.15s ease",
                  }}
                >
                  {/* Speaker label — horizontal on desktop, circle-only on mobile */}
                  {verseSpeaker && showSpeakers ? (
                    <div
                      style={{
                        width: isMobile ? "34px" : "30px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        paddingTop: isFirstOfSpeakerSpan ? "4px" : "0",
                        paddingRight: isMobile ? "8px" : "6px",
                        position: "relative",
                      }}
                    >
                      {isFirstOfSpeakerSpan && verseSpeaker && (() => {
                        const portrait = getCharacterPortrait(verseSpeaker.speaker, verseSpeaker.speakerType);
                        const avatarSize = isMobile ? 26 : 28;
                        return (
                          <div style={{
                            display: "flex",
                            flexDirection: isMobile ? "column" : "row-reverse",
                            alignItems: "center",
                            gap: isMobile ? "0" : "5px",
                            position: isMobile ? "relative" : "absolute",
                            right: isMobile ? undefined : "6px",
                            top: "2px",
                            whiteSpace: "nowrap",
                          }}>
                            {/* Portrait / avatar circle — closest to scripture (right side on desktop via row-reverse) */}
                            <button
                              onClick={() => openCharacterByName(verseSpeaker.speaker, verseSpeaker.speakerType)}
                              title={verseSpeakerDisplayName || verseSpeaker.speaker}
                              style={{
                                background: portrait ? "none" : `${speakerColor || "#888"}25`,
                                border: portrait ? `2px solid ${speakerColor || "#888"}` : "none",
                                borderRadius: "50%",
                                width: `${avatarSize}px`,
                                height: `${avatarSize}px`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                padding: 0,
                                flexShrink: 0,
                                overflow: "hidden",
                                transition: "all 0.15s",
                              }}
                            >
                              {portrait ? (
                                <img
                                  src={portrait}
                                  alt=""
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    objectPosition: "center 20%",
                                  }}
                                />
                              ) : (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={speakerColor || "#888"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                  <circle cx="12" cy="7" r="4" />
                                </svg>
                              )}
                            </button>
                            {/* Desktop: horizontal name label extending left — also clickable */}
                            {!isMobile && (() => {
                              const fullName = verseSpeakerDisplayName || verseSpeaker.speaker;
                              // Split name from descriptor: comma ("Mary, sister of Martha") or parens ("Jesus Christ (Jehovah)")
                              const commaIdx = fullName.indexOf(",");
                              const parenIdx = fullName.indexOf("(");
                              const splitIdx = commaIdx > 0 ? commaIdx : (parenIdx > 0 ? parenIdx : -1);
                              const primaryName = splitIdx > 0 ? fullName.substring(0, splitIdx).trim() : fullName;
                              const descriptorRaw = splitIdx > 0 ? fullName.substring(splitIdx + (commaIdx > 0 ? 1 : 0)).trim() : null;
                              const descriptor = descriptorRaw?.replace(/[()]/g, "").trim() || null;
                              return (
                                <button
                                  onClick={() => openCharacterByName(verseSpeaker.speaker, verseSpeaker.speakerType)}
                                  style={{
                                    fontSize: "0.58rem",
                                    letterSpacing: "0.06em",
                                    color: speakerColor || undefined,
                                    lineHeight: 1.3,
                                    opacity: 0.9,
                                    background: "none",
                                    border: "none",
                                    padding: 0,
                                    cursor: "pointer",
                                    textAlign: "right",
                                  }}
                                >
                                  <span style={{ fontWeight: 700, textTransform: "uppercase" }}>{primaryName}</span>
                                  {descriptor && (
                                    <>
                                      <br />
                                      <span style={{ fontWeight: 400, fontSize: "0.52rem", opacity: 0.7, textTransform: "uppercase" }}>{descriptor}</span>
                                    </>
                                  )}
                                </button>
                              );
                            })()}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div style={{ width: showSpeakers ? (isMobile ? "24px" : "30px") : "0px", flexShrink: 0 }} />
                  )}
                  {/* Verse content with left border bar */}
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      borderLeft: leftBorderColor
                        ? `3px solid ${leftBorderColor}${speakerColor ? "50" : "25"}`
                        : verseTone
                          ? `3px solid ${verseTone.color}30`
                          : "3px solid transparent",
                      paddingLeft: "10px",
                      paddingTop: speakerColor || verseTone ? "4px" : undefined,
                      paddingBottom: speakerColor || verseTone ? "4px" : undefined,
                      paddingRight: speakerColor || verseTone ? "8px" : undefined,
                      background: speakerColor
                        ? `${speakerColor}08`
                        : verseTone
                          ? (lightMode ? `${verseTone.color}12` : `${verseTone.color}0a`)
                          : undefined,
                      borderRadius: speakerColor || verseTone ? "4px" : undefined,
                      transition: "border-color 0.3s ease, background 0.3s ease",
                    }}
                  >
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVerseSelection(v.verse);
                    }}
                    onTouchStart={() => {
                      if (!selectionMode) {
                        longPressTimerRef.current = setTimeout(() => {
                          toggleVerseSelection(v.verse);
                        }, 500);
                      }
                    }}
                    onTouchEnd={() => {
                      if (longPressTimerRef.current) {
                        clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                      }
                    }}
                    onTouchMove={() => {
                      if (longPressTimerRef.current) {
                        clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                      }
                    }}
                    style={{
                      marginRight: "8px",
                      cursor: "pointer",
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "24px",
                      height: "24px",
                      minWidth: "24px",
                      borderRadius: "4px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      lineHeight: 1,
                      paddingTop: "1px",
                      background: selectedVerses.has(v.verse)
                        ? volColor
                        : lightMode ? "#222" : "rgba(255,255,255,0.88)",
                      color: selectedVerses.has(v.verse)
                        ? "#fff"
                        : lightMode ? "#f8f6f1" : "#29292b",
                      flexShrink: 0,
                      transition: "all 0.15s",
                      verticalAlign: "top",
                      marginTop: "4px",
                    }}
                    title={selectionMode ? "Click to select/deselect" : "Click to select verse"}
                  >
                    {selectionMode ? (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "14px",
                        height: "14px",
                        borderRadius: "3px",
                        border: selectedVerses.has(v.verse) ? `2px solid #fff` : `2px solid ${lightMode ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.25)"}`,
                        background: selectedVerses.has(v.verse) ? "#fff" : "transparent",
                        flexShrink: 0,
                        transition: "all 0.15s",
                      }}>
                        {selectedVerses.has(v.verse) && (
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5L4 7L8 3" stroke={volColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    ) : null}
                    {v.verse}
                  </span>
                  {annotatedVerses.has(v.verse) && (
                    <span
                      title="You have a note on this verse"
                      style={{
                        fontSize: "0.6rem",
                        color: volColor,
                        marginRight: "4px",
                        verticalAlign: "super",
                        opacity: 0.7,
                      }}
                    >
                      ✎
                    </span>
                  )}
                  <span
                    onClick={() => {
                      analytics.verseTap(selectedBookName || "", selectedChapter || 0, v.verse);
                      setActiveVerse({ verse: v.verse, chapter: v.chapter, text: readingMode === "modern" && v.text_modern ? v.text_modern : v.text });
                      setActiveResourcePanel(null); // close resource panel when opening verse popover
                    }}
                    style={{
                      fontSize: fontSizes[fontSize].body,
                      color: theme.verseText,
                      transition: "font-size 0.2s ease",
                      cursor: "pointer",
                    }}
                  >
                    {renderVerseText(readingMode === "modern" && v.text_modern ? v.text_modern : v.text, v.verse)}
                  </span>
                  {/* Pills row — below verse text */}
                  {(verseStartResources.length > 0 || (showContextNuggets && chapterNuggets.some((e) => e.verse === v.verse))) && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "4px", marginLeft: "2px" }}>
                      {/* Resource markers — one pill per resource type */}
                      {verseStartResources.length > 0 && (() => {
                        const byType = verseStartResources.reduce((acc, r) => {
                          acc[r.type] = acc[r.type] || [];
                          acc[r.type].push(r);
                          return acc;
                        }, {} as Record<string, typeof verseStartResources>);
                        return Object.entries(byType).map(([, resources]) => (
                          <ResourceMarker
                            key={resources[0].type + "-" + v.verse}
                            resource={resources[0]}
                            lightMode={lightMode}
                            count={resources.length}
                            onClick={() => {
                              analytics.resourceClick(resources[0].type, resources[0].title, selectedBookName || "", selectedChapter || 0);
                              setActiveVerse(null);
                              setActiveResourcePanel({
                                resources: chapterResources,
                                index: chapterResources.indexOf(resources[0]),
                              });
                            }}
                          />
                        ));
                      })()}
                      {/* Context Nugget marker (single pill per verse with count badge) */}
                      {(() => {
                        if (!showContextNuggets) return null;
                        const verseNuggets = chapterNuggets.filter((e) => e.verse === v.verse);
                        if (verseNuggets.length === 0) return null;
                        return (
                          <NuggetMarker
                            key={`nugget-v${v.verse}`}
                            nuggets={verseNuggets}
                            lightMode={lightMode}
                            onClick={() => { analytics.nuggetPillClick(verseNuggets[0]?.id || "", selectedBookName || "", selectedChapter || 0, v.verse, verseNuggets[0]?.category || ""); setActiveVerse(null); setActiveNuggets(verseNuggets); }}
                          />
                        );
                      })()}
                    </div>
                  )}
                  </div>
                </div>
              );
            })}

          {/* End of chapter - next/prev hint */}
          {!isLoading && verses.length > 0 && (
            <div
              style={{
                marginTop: "48px",
                paddingTop: "24px",
                borderTop: `1px solid ${theme.border}`,
                display: "flex",
                justifyContent: "center",
                gap: "24px",
                flexWrap: "wrap",
              }}
            >
              {!isFirstChapterOfVolume && (
                <button
                  onClick={goToPrevChapter}
                  style={{
                    background: "none",
                    border: `1px solid ${theme.border}`,
                    borderRadius: "8px",
                    padding: "10px 20px",
                    color: theme.textSecondary,
                    fontSize: "0.85rem",
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = volColor; e.currentTarget.style.color = theme.text; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary; }}
                >
                  ← {prevLabel}
                </button>
              )}
              {!isLastChapterOfVolume && (
                <button
                  onClick={goToNextChapter}
                  style={{
                    background: lightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)",
                    border: `1px solid ${lightMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)"}`,
                    borderRadius: "8px",
                    padding: "10px 20px",
                    color: theme.text,
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = lightMode ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.12)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = lightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)"; }}
                >
                  {nextLabel} →
                </button>
              )}
            </div>
          )}

          {/* Keyboard hint (desktop only) */}
          {!isMobile && !isLoading && verses.length > 0 && (
            <div style={{ textAlign: "center", marginTop: "16px", fontSize: "0.72rem", color: theme.textMuted }}>
              Use ← → arrow keys to navigate chapters
            </div>
          )}
        </div>

        {/* Search occurrence navigator — visual minimap of matches */}
        {activeHighlight && searchMatchCount > 0 && (
          <div
            style={{
              position: "fixed",
              bottom: isMobile ? "calc(40px + env(safe-area-inset-bottom, 0px))" : "calc(44px + env(safe-area-inset-bottom, 0px))",
              left: 0,
              right: 0,
              zIndex: 51,
              padding: isMobile ? "4px 12px" : "6px 24px",
              background: lightMode ? "rgba(248, 246, 241, 0.92)" : "rgba(17, 17, 22, 0.92)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              borderTop: `1px solid ${theme.border}`,
              display: "flex",
              alignItems: "center",
              gap: isMobile ? "8px" : "12px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: isMobile ? "40px" : "50px" }}>
              <span style={{ fontSize: "0.68rem", color: volColor, fontWeight: 700 }}>
                {searchMatchCount}
              </span>
              <span style={{ fontSize: "0.55rem", color: theme.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {searchMatchCount !== 1 ? "matches" : "match"}
              </span>
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                gap: "1px",
                height: isMobile ? "16px" : "22px",
                borderRadius: "3px",
                overflow: "hidden",
              }}
            >
              {verseMatches.map((vm) => {
                const hasMatch = vm.count > 0;
                const intensity = hasMatch ? 0.3 + (vm.count / maxVerseMatches) * 0.7 : 0;
                const isCurrent = vm.verse === currentVisibleVerse;
                return (
                  <div
                    key={vm.verse}
                    onClick={() => {
                      const el = document.getElementById(`verse-${vm.verse}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    style={{
                      flex: 1,
                      background: hasMatch ? volColor : (lightMode ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.02)"),
                      opacity: hasMatch ? intensity : 1,
                      cursor: "pointer",
                      transition: "all 0.25s ease",
                      borderRadius: "1px",
                      transform: isCurrent ? "scaleY(1.5)" : "scaleY(1)",
                      transformOrigin: "bottom",
                      boxShadow: isCurrent ? `0 -2px 8px ${volColor}50` : "none",
                      outline: isCurrent ? `1.5px solid ${volColor}` : "none",
                      outlineOffset: "-1px",
                    }}
                    title={hasMatch ? `Verse ${vm.verse}: ${vm.count} match${vm.count !== 1 ? "es" : ""}` : `Verse ${vm.verse}`}
                  />
                );
              })}
            </div>
            {/* Current verse indicator */}
            {!isMobile && (
              <span style={{ fontSize: "0.62rem", color: theme.textMuted, whiteSpace: "nowrap", minWidth: "36px", textAlign: "right" }}>
                v.{currentVisibleVerse}
              </span>
            )}
          </div>
        )}

        {/* Bottom bar — nav + controls */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: bar.bg,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderTop: `1px solid ${bar.border}`,
            zIndex: 50,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {/* Reading progress bar — volume color gradient */}
          <div
            style={{
              height: "3px",
              width: `${scrollProgress * 100}%`,
              background: lightMode
                ? "linear-gradient(90deg, #2A4F8A 0%, #4A7FD4 100%)"
                : "linear-gradient(90deg, #2E4A7A 0%, #5B8DEF 100%)",
              transition: "width 0.1s linear",
            }}
          />
          {/* Main controls row */}
          <div style={{
            padding: isMobile ? "6px 12px" : "8px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            {/* Prev */}
            <button
              onClick={goToPrevChapter}
              disabled={isFirstChapterOfVolume}
              title="Previous chapter"
              style={{
                background: "none",
                border: "none",
                color: bar.textSecondary,
                cursor: isFirstChapterOfVolume ? "default" : "pointer",
                padding: "8px",
                opacity: isFirstChapterOfVolume ? 0.3 : 1,
                display: "flex",
                alignItems: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><polyline points="15 18 9 12 15 6" /></svg>
            </button>

            {/* Center logo — links to home */}
            <a href="/" title="Home" style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <img src="/se-logo.svg" alt="Home" style={{ height: "20px", width: "auto", opacity: 0.4 }} />
            </a>

            {/* Next */}
            <button
              onClick={goToNextChapter}
              disabled={isLastChapterOfVolume}
              title="Next chapter"
              style={{
                background: "none",
                border: "none",
                color: bar.textSecondary,
                cursor: isLastChapterOfVolume ? "default" : "pointer",
                padding: "8px",
                opacity: isLastChapterOfVolume ? 0.3 : 1,
                display: "flex",
                alignItems: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        </div>

        {/* Chapter Complete Toast */}
        {showReadToast && (
          <div
            style={{
              position: "fixed",
              top: "80px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 150,
              background: lightMode ? "#222" : "#f0f0f0",
              color: lightMode ? "#fff" : "#111",
              padding: "10px 24px",
              borderRadius: "24px",
              fontSize: "0.85rem",
              fontWeight: 600,
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              animation: "fadeIn 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            ✓ Chapter complete!
          </div>
        )}

        {/* Word Explorer Panel */}
        {exploredWord && selectedBookId && selectedVolume && (
          <WordExplorerPanel
            word={exploredWord}
            bookId={selectedBookId}
            bookName={selectedBookName || ""}
            chapter={selectedChapter!}
            chapterCount={chapterCount}
            volumeAbbrev={selectedVolume}
            volColor={volColor}
            lightMode={lightMode}
            isMobile={isMobile}
            onClose={() => setExploredWord(null)}
            onNavigateToChapter={(ch) => {
              goToChapter(selectedVolume, selectedBookId, selectedBookName || "", ch, chapterCount);
            }}
          />
        )}

        {/* Resource Panel */}
        {activeResourcePanel && selectedBookId && selectedVolume && (
          <ResourcePanel
            resources={activeResourcePanel.resources}
            initialIndex={activeResourcePanel.index}
            bookName={selectedBookName || ""}
            volColor={volColor}
            lightMode={lightMode}
            isMobile={isMobile}
            onClose={() => setActiveResourcePanel(null)}
          />
        )}

        {/* Verse Popover */}
        {activeVerse && selectedBookId && selectedVolume && (
          <VersePopover
            bookId={selectedBookId}
            chapter={activeVerse.chapter}
            verse={activeVerse.verse}
            text={activeVerse.text}
            bookName={selectedBookName || ""}
            volumeAbbrev={selectedVolume}
            volColor={volColor}
            lightMode={lightMode}
            isMobile={isMobile}
            onClose={() => {
              setActiveVerse(null);
              // Refresh annotation indicators
              if (selectedBookId && selectedChapter) {
                const annotations = getAnnotationsForChapter(selectedBookId, selectedChapter);
                setAnnotatedVerses(new Set(annotations.map((a) => a.verse)));
              }
            }}
          />
        )}

        {/* Verse Selection Toolbar */}
        {selectionMode && selectedVerses.size > 0 && (
          <div
            style={{
              position: "fixed",
              bottom: isMobile ? "60px" : "24px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "12px",
              background: lightMode ? "rgba(255,255,255,0.95)" : "rgba(30,30,38,0.95)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: `1px solid ${lightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.12)"}`,
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              zIndex: 300,
              animation: "fadeIn 0.2s ease",
            }}
          >
            <span style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: volColor,
              marginRight: "4px",
            }}>
              {selectedVerses.size} verse{selectedVerses.size !== 1 ? "s" : ""}
            </span>
            <button
              onClick={copySelectedVerses}
              style={{
                background: `${volColor}15`,
                border: `1px solid ${volColor}40`,
                borderRadius: "8px",
                padding: "6px 12px",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: volColor,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Copy
            </button>
            <button
              onClick={bookmarkSelectedVerses}
              style={{
                background: `${volColor}15`,
                border: `1px solid ${volColor}40`,
                borderRadius: "8px",
                padding: "6px 12px",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: volColor,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Bookmark
            </button>
            <button
              onClick={clearSelection}
              style={{
                background: "none",
                border: "none",
                padding: "6px 8px",
                fontSize: "0.82rem",
                color: lightMode ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
              title="Clear selection"
            >
              ✕
            </button>
          </div>
        )}

        {/* Context Nugget Popover */}
        {activeNuggets.length > 0 && (
          <NuggetPopover
            nuggets={activeNuggets}
            lightMode={lightMode}
            isMobile={isMobile}
            onClose={() => setActiveNuggets([])}
          />
        )}

        {/* Character Detail Panel */}
        {selectedCharacter && (
          <CharacterDetailPanel
            character={selectedCharacter}
            allCharacters={allCharacters}
            onClose={() => setSelectedCharacter(null)}
            onSelectCharacter={(c) => setSelectedCharacter(c)}
          />
        )}

        {/* Location Detail Panel */}
        {selectedLocation && (
          <LocationDetailPanel
            location={selectedLocation}
            onClose={() => setSelectedLocation(null)}
            onSelectLocation={(loc) => setSelectedLocation(loc)}
          />
        )}
      </div>
    );
  }

  // ── CHAPTER GRID VIEW (book selected, no chapter yet) ──
  if (selectedVolume && selectedBookId && selectedBookName && !selectedChapter) {
    const volColor = VOLUME_COLORS[selectedVolume] || "#3B82F6";
    const isDC = selectedVolume === "D&C";
    const chapterWord = isDC ? "Section" : "Chapter";

    return scripturePageWrapper(
      <button
        onClick={() => {
          const vol = volumes.find((v) => v.abbrev === selectedVolume);
          const isSingleBookVolume = vol && vol.books.length === 1;
          if (isSingleBookVolume) {
            // Single-book volume (D&C): go straight back to volume picker (skip useless 1-item book list)
            setSelectedVolume(null);
            setSelectedBookId(null);
            setSelectedBookName(null);
            setSelectedChapter(null);
            setChapterCount(0);
            setVerses([]);
            window.history.pushState({}, "", "/scriptures");
          } else {
            // Multi-book volume: go back to book list
            setSelectedBookId(null);
            setSelectedBookName(null);
            setSelectedChapter(null);
            setChapterCount(0);
            setVerses([]);
            window.history.pushState({}, "", scriptureUrl(selectedVolume));
          }
        }}
        style={{ background: "none", border: "none", color: "#f0f0f0", cursor: "pointer", padding: "6px 4px", display: "flex", alignItems: "center", gap: "4px", fontFamily: "inherit", fontSize: "0.88rem", fontWeight: 600, whiteSpace: "nowrap" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        {(() => {
          const vol = volumes.find((v) => v.abbrev === selectedVolume);
          return vol && vol.books.length === 1 ? "Volumes" : (vol?.name || selectedVolume);
        })()}
      </button>,
      <>
        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <h1
            style={{
              fontSize: "1.6rem",
              fontWeight: 700,
              color: "#fff",
              marginBottom: "10px",
            }}
          >
            {selectedBookName}
          </h1>
          <p style={{ color: "var(--text)", fontSize: "0.95rem", opacity: 0.85 }}>
            {chapterCount} {isDC ? (chapterCount === 1 ? "section" : "sections") : (chapterCount === 1 ? "chapter" : "chapters")}
          </p>
        </div>

        {/* Chapter grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "56px" : "64px"}, 1fr))`,
            gap: "8px",
          }}
        >
          {Array.from({ length: chapterCount }, (_, i) => i + 1).map((ch) => {
            const isRead = typeof window !== "undefined" && localStorage.getItem(`read-${selectedBookId}-${ch}`) === "true";
            return (
              <button
                key={ch}
                onClick={() => {
                  goToChapter(selectedVolume, selectedBookId, selectedBookName, ch, chapterCount);
                }}
                style={{
                  background: isRead ? `${volColor}18` : "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                  border: isRead ? `1.5px solid ${volColor}50` : "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  padding: isMobile ? "12px 0" : "14px 0",
                  textAlign: "center",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  color: isRead ? volColor : "var(--text)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = volColor;
                  e.currentTarget.style.background = `${volColor}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isRead ? `${volColor}50` : "rgba(255, 255, 255, 0.12)";
                  e.currentTarget.style.background = isRead ? `${volColor}18` : "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)";
                }}
              >
                {ch}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  // ── BOOK LIST VIEW (volume selected, no book yet) ──
  if (selectedVolume) {
    const vol = volumes.find((v) => v.abbrev === selectedVolume);
    const volColor = VOLUME_COLORS[selectedVolume] || "#3B82F6";

    return scripturePageWrapper(
      <button
        onClick={() => {
          setSelectedVolume(null);
          setSelectedBookId(null);
          setSelectedBookName(null);
          setSelectedChapter(null);
          setChapterCount(0);
          setVerses([]);
          window.history.pushState({}, "", "/scriptures");
        }}
        style={{ background: "none", border: "none", color: "#f0f0f0", cursor: "pointer", padding: "6px 4px", display: "flex", alignItems: "center", gap: "4px", fontFamily: "inherit", fontSize: "0.88rem", fontWeight: 600, whiteSpace: "nowrap" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Volumes
      </button>,
      <>
        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <h1
            style={{
              fontSize: "1.6rem",
              fontWeight: 700,
              color: "#fff",
              marginBottom: "10px",
            }}
          >
            {vol?.name}
          </h1>
          <p style={{ color: "var(--text)", fontSize: "0.95rem", opacity: 0.85 }}>
            Select a book to start reading.
          </p>
        </div>

        {/* Book list */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "12px",
          }}
        >
          {vol?.books.map((book) => (
            <button
              key={book.id}
              onClick={() => {
                // For single-chapter books, go straight to reading
                if (book.chapterCount === 1) {
                  goToChapter(selectedVolume, book.id, book.name, 1, 1);
                } else {
                  // Show chapter grid for this book
                  setSelectedBookId(book.id);
                  setSelectedBookName(book.name);
                  setChapterCount(book.chapterCount);
                  window.history.pushState({}, "", scriptureUrl(selectedVolume, book.name));
                }
              }}
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "10px",
                padding: "16px 20px",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = volColor;
                e.currentTarget.style.background = `${volColor}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                e.currentTarget.style.background = "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)";
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: "2px",
                  }}
                >
                  {book.name}
                </div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                  }}
                >
                  {(() => {
                    const readCount = getReadChaptersForBook(book.id, book.chapterCount);
                    const label = selectedVolume === "D&C" ? (book.chapterCount === 1 ? "section" : "sections") : (book.chapterCount === 1 ? "chapter" : "chapters");
                    return (
                      <>
                        {book.chapterCount} {label}
                        {readCount > 0 && (
                          <span style={{ color: volColor, marginLeft: "6px" }}>
                            · {readCount === book.chapterCount ? "✓ Complete" : `${readCount} read`}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      </>
    );
  }

  // If URL has deep-link params but data hasn't loaded yet, show nothing (prevents volume picker flash)
  const pathSegments = pathname.replace(/^\/scriptures\/?/, "").split("/").filter(Boolean);
  if ((searchParams.get("bookId") && searchParams.get("chapter")) || pathSegments.length >= 3) {
    return <div style={{ minHeight: "100vh" }} />;
  }

  // ── VOLUME PICKER VIEW ──
  return scripturePageWrapper(
    <span />,
    <>
      <div style={{ marginBottom: "40px", textAlign: "center" }}>
        <h1
          style={{
            fontSize: "1.6rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "10px",
          }}
        >
          Read the Scriptures
        </h1>
        <p style={{ color: "var(--text)", fontSize: isMobile ? "0.88rem" : "0.95rem", opacity: 0.85 }}>
          Choose a volume to begin reading.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "16px",
        }}
      >
        {volumes.map((vol) => {
          const color = VOLUME_COLORS[vol.abbrev] || "#3B82F6";
          return (
            <button
              key={vol.id}
              onClick={() => {
                setSelectedVolume(vol.abbrev);
                // Single-book volumes (D&C): skip book list, go straight to section/chapter grid
                if (vol.books.length === 1) {
                  const book = vol.books[0];
                  setSelectedBookId(book.id);
                  setSelectedBookName(book.name);
                  setChapterCount(book.chapterCount);
                  window.history.pushState({}, "", scriptureUrl(vol.abbrev, book.name));
                } else {
                  window.history.pushState({}, "", scriptureUrl(vol.abbrev));
                }
              }}
              style={{
                background: `linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)`,
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderTop: `3px solid ${color}`,
                borderRadius: "0 0 12px 12px",
                padding: "24px",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = color;
                e.currentTarget.style.borderTopColor = color;
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                e.currentTarget.style.borderTopColor = color;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: "6px",
                }}
              >
                {vol.name}
              </div>
              <div
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                }}
              >
                {(() => {
                  const progress = getVolumeProgress(vol.books.map(b => ({ id: b.id, chapterCount: b.chapterCount })));
                  return (
                    <>
                      {vol.books.length} {vol.books.length === 1 ? "book" : "books"}
                      {progress.read > 0 && (
                        <span style={{ marginLeft: "8px", color }}>
                          · {progress.percentage}% read
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
