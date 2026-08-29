/**
 * Kivvi Logo — kiwi fruit cross-section SVG.
 * SSOT: Use this component everywhere a logo is needed.
 */
export function KivviLogo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer skin */}
      <circle cx="32" cy="32" r="30" fill="#795C34" />
      {/* Green flesh */}
      <circle cx="32" cy="32" r="26" fill="#6DBE45" />
      {/* Light center */}
      <circle cx="32" cy="32" r="8" fill="#C6E377" />
      {/* Seed lines radiating from center */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
        <line
          key={angle}
          x1="32"
          y1="32"
          x2={32 + 22 * Math.cos((angle * Math.PI) / 180)}
          y2={32 + 22 * Math.sin((angle * Math.PI) / 180)}
          stroke="#4A8C2A"
          strokeWidth="0.8"
          opacity="0.5"
        />
      ))}
      {/* Seeds */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
        <ellipse
          key={`seed-${angle}`}
          cx={32 + 16 * Math.cos((angle * Math.PI) / 180)}
          cy={32 + 16 * Math.sin((angle * Math.PI) / 180)}
          rx="1.8"
          ry="1"
          transform={`rotate(${angle}, ${32 + 16 * Math.cos((angle * Math.PI) / 180)}, ${32 + 16 * Math.sin((angle * Math.PI) / 180)})`}
          fill="#1A1A1A"
        />
      ))}
    </svg>
  );
}
