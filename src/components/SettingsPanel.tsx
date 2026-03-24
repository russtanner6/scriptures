"use client";

import { usePreferencesContext } from "@/components/PreferencesProvider";
import { VOLUME_COLORS } from "@/lib/constants";
import { canDisableVolume } from "@/lib/preferences";
import { analytics } from "@/lib/analytics";

const VOLUMES = [
  { abbrev: "OT", name: "Old Testament", desc: "39 books — Genesis through Malachi" },
  { abbrev: "NT", name: "New Testament", desc: "27 books — Matthew through Revelation" },
  { abbrev: "BoM", name: "Book of Mormon", desc: "15 books — 1 Nephi through Moroni" },
  { abbrev: "D&C", name: "Doctrine & Covenants", desc: "138 sections + 2 declarations" },
  { abbrev: "PoGP", name: "Pearl of Great Price", desc: "5 books — Moses through JS-History" },
];

const APOCRYPHA = {
  abbrev: "Apoc",
  name: "Apocrypha",
  desc: "14 books — 1 Esdras through 2 Maccabees (KJV)",
};

export default function SettingsPanel() {
  const { prefs, setPrefs, isVolumeVisible } = usePreferencesContext();

  const toggleVolume = (abbrev: string) => {
    const currentlyVisible = isVolumeVisible(abbrev);
    if (currentlyVisible && !canDisableVolume(abbrev)) return;
    const nextVisible = !currentlyVisible;
    analytics.settingsVolumeToggle(abbrev, nextVisible);
    setPrefs({
      ...prefs,
      visibleVolumes: { ...prefs.visibleVolumes, [abbrev]: nextVisible },
    });
  };

  const visibleCount = Object.values(prefs.visibleVolumes).filter(Boolean).length;

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>
          Settings
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem" }}>
          Customize your Scripture Explorer experience.
        </p>
      </div>

      <section style={{ marginBottom: "36px" }}>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
          Volume Visibility
        </h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "16px", lineHeight: 1.5 }}>
          Choose which scripture volumes appear across the site. This only affects your
          view&mdash;you can turn any volume back on anytime. Bookmarks and notes for hidden
          volumes are preserved.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {VOLUMES.map((vol) => {
            const visible = isVolumeVisible(vol.abbrev);
            const color = VOLUME_COLORS[vol.abbrev] || "#888";
            const isLastVisible = visible && visibleCount <= 1;

            return (
              <button
                key={vol.abbrev}
                onClick={() => toggleVolume(vol.abbrev)}
                disabled={isLastVisible}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  border: visible ? `1.5px solid ${color}` : "1.5px solid rgba(255, 255, 255, 0.08)",
                  background: visible ? `${color}12` : "rgba(255, 255, 255, 0.02)",
                  cursor: isLastVisible ? "not-allowed" : "pointer",
                  opacity: isLastVisible ? 0.6 : 1,
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  width: "100%",
                }}
              >
                <div style={{
                  width: "44px", minWidth: "44px", height: "24px", borderRadius: "12px",
                  background: visible ? color : "rgba(255, 255, 255, 0.12)",
                  position: "relative", transition: "background 0.2s ease",
                }}>
                  <div style={{
                    position: "absolute", top: "2px", left: visible ? "22px" : "2px",
                    width: "20px", height: "20px", borderRadius: "50%", background: "#fff",
                    transition: "left 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: visible ? "var(--text)" : "var(--text-muted)", transition: "color 0.2s" }}>
                    {vol.name}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {vol.desc}
                  </div>
                </div>
                <div style={{
                  fontSize: "0.72rem", fontWeight: 700,
                  color: visible ? color : "var(--text-muted)",
                  background: visible ? `${color}20` : "rgba(255, 255, 255, 0.06)",
                  padding: "3px 8px", borderRadius: "6px", transition: "all 0.2s",
                }}>
                  {vol.abbrev}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Apocrypha — separate section */}
      <section style={{ marginBottom: "36px" }}>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
          Apocrypha
        </h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "16px", lineHeight: 1.5 }}>
          The KJV Apocrypha — 14 inter-testamental books included in the original 1611 King James Bible.
          Not part of the standard LDS canon, but referenced in D&amp;C 91: &ldquo;There are many things
          contained therein that are true&hellip; whoso readeth it, let him understand.&rdquo;
        </p>

        {(() => {
          const vol = APOCRYPHA;
          const visible = isVolumeVisible(vol.abbrev);
          const color = VOLUME_COLORS[vol.abbrev] || "#8E7CC3";
          return (
            <button
              onClick={() => toggleVolume(vol.abbrev)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px 16px",
                borderRadius: "12px",
                border: visible ? `1.5px solid ${color}` : "1.5px solid rgba(255, 255, 255, 0.08)",
                background: visible ? `${color}12` : "rgba(255, 255, 255, 0.02)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
                width: "100%",
              }}
            >
              <div style={{
                width: "44px", minWidth: "44px", height: "24px", borderRadius: "12px",
                background: visible ? color : "rgba(255, 255, 255, 0.12)",
                position: "relative", transition: "background 0.2s ease",
              }}>
                <div style={{
                  position: "absolute", top: "2px", left: visible ? "22px" : "2px",
                  width: "20px", height: "20px", borderRadius: "50%", background: "#fff",
                  transition: "left 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.95rem", fontWeight: 600, color: visible ? "var(--text)" : "var(--text-muted)", transition: "color 0.2s" }}>
                    {vol.name}
                  </span>
                  <span style={{
                    fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                    color: color, background: `${color}20`, padding: "2px 6px", borderRadius: "4px",
                  }}>
                    Non-canonical
                  </span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  {vol.desc}
                </div>
              </div>
              <div style={{
                fontSize: "0.72rem", fontWeight: 700,
                color: visible ? color : "var(--text-muted)",
                background: visible ? `${color}20` : "rgba(255, 255, 255, 0.06)",
                padding: "3px 8px", borderRadius: "6px", transition: "all 0.2s",
              }}>
                {vol.abbrev}
              </div>
            </button>
          );
        })()}
      </section>
    </div>
  );
}
