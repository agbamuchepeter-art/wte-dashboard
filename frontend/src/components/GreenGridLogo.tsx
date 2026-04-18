/**
 * GreenGrid Urban Solutions logo.
 * Renders the SVG version inline; also attempts to load an actual PNG placed
 * at /greengrid-logo.png in the public folder (if the user adds the file).
 */
import { useState } from "react";

interface LogoProps {
  /** Height of the logo in px */
  height?: number;
  /** Show text label alongside the icon */
  showText?: boolean;
}

export function GreenGridLogo({ height = 40, showText = true }: LogoProps) {
  const [useImage, setUseImage] = useState(true);

  // If /greengrid-logo.png exists in public folder, prefer it
  if (useImage) {
    return (
      <div className="flex items-center gap-3">
        <img
          src="/greengrid-logo.png"
          alt="GreenGrid Urban Solutions"
          height={height}
          style={{ height: `${height}px`, width: "auto" }}
          onError={() => setUseImage(false)}
          draggable={false}
        />
      </div>
    );
  }

  // SVG fallback — captures the hexagonal leaf + lightning bolt visual
  const scale = height / 40;
  const iconSize = Math.round(height * 0.85);

  return (
    <div className="flex items-center gap-3">
      {/* Icon */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 80 88"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Leaf / drop shape */}
        <path
          d="M40 4 C40 4 72 28 72 52 C72 70 57.6 84 40 84 C22.4 84 8 70 8 52 C8 28 40 4 40 4Z"
          fill="url(#leaf_grad)"
        />
        {/* Hexagon cells (decorative) */}
        {[
          [40, 20], [26, 28], [54, 28],
          [19, 40], [40, 40], [61, 40],
          [26, 52], [54, 52], [40, 64],
        ].map(([cx, cy], i) => (
          <path
            key={i}
            d={`M${cx} ${cy - 7} L${cx + 6} ${cy - 3.5} L${cx + 6} ${cy + 3.5} L${cx} ${cy + 7} L${cx - 6} ${cy + 3.5} L${cx - 6} ${cy - 3.5}Z`}
            fill="rgba(255,255,255,0.08)"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
          />
        ))}
        {/* Lightning bolt */}
        <path
          d="M44 26 L34 46 L42 46 L36 62 L50 42 L42 42 L48 26Z"
          fill="white"
          opacity="0.9"
        />
        {/* Gradient def */}
        <defs>
          <linearGradient id="leaf_grad" x1="40" y1="4" x2="40" y2="84" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#166534" />
            <stop offset="60%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
      </svg>

      {/* Text */}
      {showText && (
        <div className="flex flex-col leading-tight" style={{ transform: `scale(${scale})`, transformOrigin: "left center" }}>
          <span className="text-white font-black tracking-widest uppercase" style={{ fontSize: "13px", letterSpacing: "0.15em" }}>
            GREENGRID
          </span>
          <span className="text-slate-400 font-semibold tracking-widest uppercase" style={{ fontSize: "9px", letterSpacing: "0.2em" }}>
            URBAN SOLUTIONS
          </span>
        </div>
      )}
    </div>
  );
}
