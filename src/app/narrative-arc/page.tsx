import Header from "@/components/Header";
import NarrativeArcTool from "@/components/NarrativeArcTool";

export default function NarrativeArcPage() {
  return (
    <div className="page-container">
      <Header />
      <NarrativeArcTool />
      <div
        style={{
          padding: "24px 0 48px",
          fontSize: "0.82rem",
          color: "var(--text-muted)",
          textAlign: "center",
          borderTop: "1px solid var(--border)",
        }}
      >
        Compare word frequencies across books in narrative order &bull;
        Overlay up to 6 search terms &bull; Scripture Explorer
      </div>
    </div>
  );
}
