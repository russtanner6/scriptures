import type { ContextEgg } from "@/lib/types";

export default function EggMarker({
  egg,
  lightMode,
  onClick,
}: {
  egg: ContextEgg;
  lightMode: boolean;
  onClick: () => void;
}) {
  const color = lightMode ? "#B8860B" : "#F5A623";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={egg.title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        padding: "2px 7px",
        borderRadius: "4px",
        border: `1px solid ${color}35`,
        background: lightMode ? `${color}10` : `${color}15`,
        color,
        fontSize: "0.6rem",
        fontWeight: 600,
        fontFamily: "inherit",
        textTransform: "uppercase",
        letterSpacing: "0.02em",
        cursor: "pointer",
        flexShrink: 0,
        marginLeft: "0",
        lineHeight: 1,
        height: "18px",
        transition: "all 0.15s",
        verticalAlign: "middle",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = lightMode ? `${color}20` : `${color}25`;
        e.currentTarget.style.transform = "scale(1.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = lightMode ? `${color}10` : `${color}15`;
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <svg width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2C5 2 3 5 3 9c0 3 2 5 5 5s5-2 5-5c0-4-2-7-5-7z" />
        <path d="M6 8h4M8 6v4" opacity="0.5" />
      </svg>
      EGG
    </button>
  );
}
