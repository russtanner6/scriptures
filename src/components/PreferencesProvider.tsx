"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import {
  type UserPreferences,
  type TheologyMode,
  getPreferences,
  setPreferences as savePreferences,
  getDisplaySpeakerName,
} from "@/lib/preferences";

interface PreferencesContextValue {
  prefs: UserPreferences;
  setPrefs: (p: UserPreferences) => void;
  isVolumeVisible: (abbrev: string) => boolean;
  visibleVolumeAbbrevs: string[];
  theologyMode: TheologyMode;
  displaySpeakerName: (speaker: string, speakerType: string, volumeAbbrev: string) => string;
  hydrated: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<UserPreferences>(getPreferences);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount (SSR safety)
  useEffect(() => {
    setPrefsState(getPreferences());
    setHydrated(true);
  }, []);

  const setPrefs = useCallback((p: UserPreferences) => {
    setPrefsState(p);
    savePreferences(p);
  }, []);

  const isVolumeVisible = useCallback(
    (abbrev: string) => prefs.visibleVolumes[abbrev] !== false,
    [prefs.visibleVolumes]
  );

  const visibleVolumeAbbrevs = useMemo(
    () => ["OT", "NT", "BoM", "D&C", "PoGP"].filter((a) => prefs.visibleVolumes[a] !== false),
    [prefs.visibleVolumes]
  );

  const displaySpeakerName = useCallback(
    (speaker: string, speakerType: string, volumeAbbrev: string) =>
      getDisplaySpeakerName(speaker, speakerType, volumeAbbrev, prefs.theologyMode),
    [prefs.theologyMode]
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({
      prefs,
      setPrefs,
      isVolumeVisible,
      visibleVolumeAbbrevs,
      theologyMode: prefs.theologyMode,
      displaySpeakerName,
      hydrated,
    }),
    [prefs, setPrefs, isVolumeVisible, visibleVolumeAbbrevs, displaySpeakerName, hydrated]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferencesContext(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferencesContext must be used within PreferencesProvider");
  return ctx;
}
