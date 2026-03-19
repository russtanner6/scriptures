/* Inline SVG icon — renders a public SVG with controllable size and color via CSS filter */
export default function SvgIcon({
  src,
  size = 18,
  light = false,
  className,
  style,
}: {
  src: string;
  size?: number;
  light?: boolean; // true = dark icon on light bg (no invert)
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <img
      src={src}
      alt=""
      className={className}
      style={{
        display: "inline-block",
        width: `${size}px`,
        height: `${size}px`,
        filter: light ? "brightness(0.3)" : "invert(1) brightness(0.85)",
        verticalAlign: "middle",
        ...style,
      }}
    />
  );
}
