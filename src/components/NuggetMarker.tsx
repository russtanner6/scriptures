import type { ContextNugget } from "@/lib/types";

export default function NuggetMarker({
  nuggets,
  lightMode,
  onClick,
}: {
  nuggets: ContextNugget[];
  lightMode: boolean;
  onClick: () => void;
}) {
  const color = lightMode ? "#B8860B" : "#F5A623";
  const count = nuggets.length;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={count === 1 ? nuggets[0].title : `${count} nuggets`}
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
      {/* Gold nugget icon */}
      <svg width="12" height="11" viewBox="0 0 14 12" fill="currentColor" opacity="0.85">
        <path d="M3 11L0 5L3 1h8l3 4-3 6H3z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M0 5h14M3 1l2 4-2 6M11 1l-2 4 2 6" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
      </svg>
      NUGGET
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
