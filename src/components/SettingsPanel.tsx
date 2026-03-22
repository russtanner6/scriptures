"use client";

import { usePreferencesContext } from "@/components/PreferencesProvider";
import { VOLUME_COLORS } from "@/lib/constants";
import { canDisableVolume, type TheologyMode } from "@/lib/preferences";

const VOLUMES = [
  { abbrev: "OT", name: "Old Testament", desc: "39 books — Genesis through Malachi" },
  { abbrev: "NT", name: "New Testament", desc: "27 books — Matthew through Revelation" },
  { abbrev: "BoM", name: "Book of Mormon", desc: "15 books — 1 Nephi through Moroni" },
  { abbrev: "D&C", name: "Doctrine & Covenants", desc: "138 sections + 2 declarations" },
  { abbrev: "PoGP", name: "Pearl of Great Price", desc: "5 books — Moses through JS-History" },
];

export default function SettingsPanel() {
  const { prefs, setPrefs, isVolumeVisible } = usePreferencesContext();

  const toggleVolume = (abbrev: string) => {
    const currentlyVisible = isVolumeVisible(abbrev);
    if (currentlyVisible && !canDisableVolume(abbrev)) return; // can't hide the last one
    setPrefs({
      ...prefs,
      visibleVolumes: { ...prefs.visibleVolumes, [abbrev]: !currentlyVisible },
    });
  };

  const setTheologyMode = (mode: TheologyMode) => {
    setPrefs({ ...prefs, theologyMode: mode });
  };

  const visibleCount = Object.values(prefs.visibleVolumes).filter(Boolean).length;

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto" }}>
      {/* Page heading */}
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "6px",
          }}
        >
          Settings
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem" }}>
          Customize your Scripture Explorer experience.
        </p>
      </div>

      {/* Volume Visibility */}
      <section style={{ marginBottom: "36px" }}>
        <h3
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "4px",
          }}
        >
          Volume Visibility
        </h3>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.82rem",
            marginBottom: "16px",
            lineHeight: 1.5,
          }}
        >
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
                  border: visible
                    ? `1.5px solid ${color}`
                    : "1.5px solid rgba(255, 255, 255, 0.08)",
                  background: visible
                    ? `${color}12`
                    : "rgba(255, 255, 255, 0.02)",
                  cursor: isLastVisible ? "not-allowed" : "pointer",
                  opacity: isLastVisible ? 0.6 : 1,
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  width: "100%",
                }}
              >
                {/* Toggle pill */}
                <div
                  style={{
                    width: "44px",
                    minWidth: "44px",
                    height: "24px",
                    borderRadius: "12px",
                    background: visible ? color : "rgba(255, 255, 255, 0.12)",
                    position: "relative",
                    transition: "background 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "2px",
                      left: visible ? "22px" : "2px",
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.2s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                    }}
                  />
                </div>

                {/* Text */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: visible ? "var(--text)" : "var(--text-muted)",
                      transition: "color 0.2s",
                    }}
                  >
                    {vol.name}
                  </div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-muted)",
                      marginTop: "2px",
                    }}
                  >
                    {vol.desc}
                  </div>
                </div>

                {/* Abbreviation badge */}
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: visible ? color : "var(--text-muted)",
                    background: visible
                      ? `${color}20`
                      : "rgba(255, 255, 255, 0.06)",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    transition: "all 0.2s",
                  }}
                >
                  {vol.abbrev}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* OT Interpretation */}
      {isVolumeVisible("OT") && (
        <section style={{ marginBottom: "36px" }}>
          <h3
            style={{
              fontSize: "1.05rem",
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: "4px",
            }}
          >
            Old Testament Interpretation
          </h3>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.82rem",
              marginBottom: "16px",
              lineHeight: 1.5,
            }}
          >
            This affects how divine speaker names are displayed in Old Testament chapters.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <TheologyOption
              active={prefs.theologyMode === "lds"}
              onClick={() => setTheologyMode("lds")}
              title="LDS / Latter-day Saint"
              description='The LORD (Jehovah) in the Old Testament is Jesus Christ in His premortal role.'
            />
            <TheologyOption
              active={prefs.theologyMode === "traditional"}
              onClick={() => setTheologyMode("traditional")}
              title="Traditional Christian"
              description="God in the Old Testament is understood as God / the Trinity."
            />
          </div>
        </section>
      )}
    </div>
  );
}

function TheologyOption({
  active,
  onClick,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "14px 16px",
        borderRadius: "12px",
        border: active
          ? "1.5px solid var(--accent)"
          : "1.5px solid rgba(255, 255, 255, 0.08)",
        background: active
          ? "rgba(139, 92, 246, 0.08)"
          : "rgba(255, 255, 255, 0.02)",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "all 0.2s ease",
      }}
    >
      {/* Radio dot */}
      <div
        style={{
          width: "20px",
          minWidth: "20px",
          height: "20px",
          borderRadius: "50%",
          border: active
            ? "2px solid var(--accent)"
            : "2px solid rgba(255, 255, 255, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "1px",
          transition: "border-color 0.2s",
        }}
      >
        {active && (
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "var(--accent)",
            }}
          />
        )}
      </div>

      <div>
        <div
          style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            color: active ? "var(--text)" : "var(--text-secondary)",
            marginBottom: "3px",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: "0.82rem",
            color: "var(--text-muted)",
            lineHeight: 1.45,
          }}
        >
          {description}
        </div>
      </div>
    </button>
  );
}
