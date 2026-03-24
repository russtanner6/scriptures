import Header from "@/components/Header";
import HeatmapTool from "@/components/HeatmapTool";

export default function HeatmapPage() {
  return (
    <>
      <Header />
      <div className="page-container">
        <HeatmapTool />
        <div
          style={{
            padding: "24px 0 48px",
            fontSize: "0.82rem",
            color: "var(--text-muted)",
            textAlign: "center",
            borderTop: "1px solid var(--border)",
          }}
        >
          Visualize word frequency across every chapter &bull;
          Click any cell to read verses &bull; Scripture Explorer
        </div>
      </div>
    </>
  );
}
