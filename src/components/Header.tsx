export default function Header() {
  return (
    <div className="header-wrapper">
      <div className="header-eyebrow">
        <span
          style={{
            display: "inline-block",
            width: "18px",
            height: "2px",
            background: "var(--accent)",
            borderRadius: "1px",
          }}
        />
        Scripture Analysis Dashboard
      </div>
      <h1 className="header-title">Scripture Explorer</h1>
      <div className="header-subtitle">
        Search and analyze word frequencies across the LDS Standard Works.{" "}
        <strong style={{ color: "var(--text)", fontWeight: 700 }}>
          41,995
        </strong>{" "}
        verses across{" "}
        <strong style={{ color: "var(--text)", fontWeight: 700 }}>87</strong>{" "}
        books.
      </div>
    </div>
  );
}
