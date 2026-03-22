import type { ContextEgg } from "@/lib/types";

export default function EggMarker({
  eggs,
  lightMode,
  onClick,
}: {
  eggs: ContextEgg[];
  lightMode: boolean;
  onClick: () => void;
}) {
  const color = lightMode ? "#B8860B" : "#F5A623";
  const count = eggs.length;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={count === 1 ? eggs[0].title : `${count} context eggs`}
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
      {count > 1 && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "14px",
            height: "14px",
            borderRadius: "7px",
            background: color,
            color: lightMode ? "#fff" : "#1a1a21",
            fontSize: "0.5rem",
            fontWeight: 700,
            lineHeight: 1,
            padding: "0 3px",
            marginLeft: "1px",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
