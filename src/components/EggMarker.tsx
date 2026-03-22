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
        gap: "4px",
        padding: "3px 9px",
        borderRadius: "5px",
        border: `1px solid ${color}35`,
        background: lightMode ? `${color}10` : `${color}15`,
        color,
        fontSize: "0.68rem",
        fontWeight: 600,
        fontFamily: "inherit",
        textTransform: "uppercase",
        letterSpacing: "0.02em",
        cursor: "pointer",
        flexShrink: 0,
        marginLeft: "0",
        lineHeight: 1,
        height: "22px",
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
      {/* Egg on its side icon */}
      <svg width="12" height="10" viewBox="0 0 14 10" fill="currentColor" opacity="0.85">
        <ellipse cx="7" cy="5" rx="7" ry="4.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <ellipse cx="5.5" cy="5" rx="3" ry="3.2" fill="currentColor" opacity="0.15" />
      </svg>
      EGG
      {count > 1 && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "16px",
            height: "16px",
            borderRadius: "8px",
            background: color,
            color: lightMode ? "#fff" : "#1a1a21",
            fontSize: "0.55rem",
            fontWeight: 700,
            lineHeight: 1,
            padding: "0 4px",
            marginLeft: "1px",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
