export interface UserPreferences {
  visibleVolumes: Record<string, boolean>;
}

const STORAGE_KEY = "scripture-preferences";

const VOLUME_ABBREVS = ["OT", "NT", "BoM", "D&C", "PoGP", "Apoc"] as const;

const DEFAULTS: UserPreferences = {
  visibleVolumes: { OT: true, NT: true, BoM: true, "D&C": true, PoGP: true, Apoc: false },
};

export function getPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const stored = JSON.parse(raw) as Partial<UserPreferences>;
    // Merge with defaults so new fields get default values
    const visibleVolumes = { ...DEFAULTS.visibleVolumes };
    if (stored.visibleVolumes) {
      for (const abbrev of VOLUME_ABBREVS) {
        if (typeof stored.visibleVolumes[abbrev] === "boolean") {
          visibleVolumes[abbrev] = stored.visibleVolumes[abbrev];
        }
      }
    }
    return { visibleVolumes };
  } catch {
    return DEFAULTS;
  }
}

export function setPreferences(prefs: UserPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function isVolumeVisible(abbrev: string): boolean {
  return getPreferences().visibleVolumes[abbrev] !== false;
}

export function getVisibleVolumeAbbrevs(): string[] {
  const prefs = getPreferences();
  return VOLUME_ABBREVS.filter((a) => prefs.visibleVolumes[a] !== false);
}

/** At least one volume must remain visible */
export function canDisableVolume(abbrev: string): boolean {
  const prefs = getPreferences();
  const currentlyVisible = VOLUME_ABBREVS.filter((a) => prefs.visibleVolumes[a] !== false);
  if (currentlyVisible.length <= 1 && currentlyVisible[0] === abbrev) return false;
  return true;
}

/**
 * Map speaker names — divine speakers in OT are labeled as Jesus Christ (Jehovah).
 */
export function getDisplaySpeakerName(
  speaker: string,
  speakerType: string,
  volumeAbbrev: string
): string {
  if (speakerType === "divine") {
    // OT: God/LORD/Jesus → Jesus Christ (Jehovah)
    if (volumeAbbrev === "OT") {
      if (speaker === "God" || speaker === "LORD" || speaker === "The LORD" || speaker === "Jesus") {
        return "Jesus Christ (Jehovah)";
      }
    }
    // D&C: "God" in divine speech is also Jesus Christ
    if (volumeAbbrev === "D&C" && speaker === "God") {
      return "Jesus Christ";
    }
  }
  return speaker;
}
