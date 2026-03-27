"use client";

/**
 * LoadingBar — thin animated progress bar (no wrapper/background).
 * Pin below the header or at top of a container.
 * Usage: {isLoading && <LoadingBar />}
 */
export default function LoadingBar({
  color = "linear-gradient(90deg, var(--accent, #8b5cf6), #00b4d8)",
  height = 3,
  style,
}: {
  color?: string;
  height?: number;
  style?: React.CSSProperties;
}) {
  return (
    <>
      <style>{`
        @keyframes loadingBarSlide {
          0% { width: 0%; margin-left: 0; }
          50% { width: 55%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
      <div
        style={{
          width: "100%",
          maxWidth: "20%",
          height: `${height}px`,
          overflow: "hidden",
          margin: "0 auto",
          ...style,
        }}
        className="loading-bar-track"
      >
        <style>{`
          @media (max-width: 768px) {
            .loading-bar-track { max-width: 50% !important; }
          }
        `}</style>
        <div
          style={{
            height: "100%",
            background: color,
            borderRadius: `${height / 2}px`,
            animation: "loadingBarSlide 2s ease-in-out infinite",
          }}
        />
      </div>
    </>
  );
}
