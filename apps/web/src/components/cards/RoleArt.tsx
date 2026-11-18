import { useId } from "react";

export type CardRole = "don" | "mafia" | "sheriff" | "doctor" | "civilian";

/**
 * Noir portrait for a role card: a faceless silhouette under the lamp, rim-lit
 * in gold, on cream paper with a halftone print. Plain SVG, so it costs
 * nothing to render and never fails to load.
 */
export function RoleArt({ role, className }: { role: CardRole; className?: string }) {
  const id = useId().replace(/:/g, "");
  const ink = `url(#ink-${id})`;
  const isMob = role === "don" || role === "mafia";

  return (
    <svg viewBox="0 0 100 130" className={className} aria-hidden preserveAspectRatio="xMidYMax slice">
      <defs>
        <radialGradient id={`glow-${id}`} cx="0.5" cy="0.32" r="0.62">
          <stop offset="0" stopColor={isMob ? "#e9b38a" : "#f3dfb0"} />
          <stop offset="0.55" stopColor="#d6c7a1" />
          <stop offset="1" stopColor="#bba67c" />
        </radialGradient>
        <linearGradient id={`ink-${id}`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#3a2414" />
          <stop offset="0.35" stopColor="#16110f" />
          <stop offset="1" stopColor="#0d0a08" />
        </linearGradient>
        <pattern id={`dots-${id}`} width="3" height="3" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="0.45" fill="#2c180d" opacity="0.16" />
        </pattern>
      </defs>

      <rect width="100" height="130" fill={`url(#glow-${id})`} />
      <rect width="100" height="130" fill={`url(#dots-${id})`} />

      {/* Smoke from the mafioso's cigarette */}
      {role === "mafia" && (
        <path
          className="art-smoke"
          d="M71 70 C 66 60, 76 54, 70 44 S 74 30, 68 20"
          fill="none"
          stroke="#16110f"
          strokeOpacity="0.28"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}

      {/* Shoulders and coat */}
      <path d="M6 130 C 8 104, 26 90, 50 88 C 74 90, 92 104, 94 130 Z" fill={ink} />
      {role === "mafia" && (
        // turned-up trench collar
        <path d="M30 94 L 38 76 L 46 90 Z M70 94 L 62 76 L 54 90 Z" fill="#1d1511" />
      )}

      {/* Shirt, tie, lapels */}
      {role !== "civilian" && (
        <>
          <path d="M42 89 L 50 112 L 58 89 Z" fill={role === "doctor" ? "#f3ead2" : "#d6c7a1"} />
          {(role === "don" || role === "mafia") && <path d="M48.5 92 L 51.5 92 L 52.5 108 L 50 112 L 47.5 108 Z" fill="#781210" />}
          {role === "sheriff" && <path d="M48.6 92 L 51.4 92 L 52 106 L 50 109 L 48 106 Z" fill="#4f2d12" />}
          <path d="M42 89 L 50 112 L 36 98 Z M58 89 L 50 112 L 64 98 Z" fill="#000" opacity="0.35" />
        </>
      )}
      {role === "doctor" && (
        // white coat edges and a stethoscope
        <>
          <path d="M30 96 L 42 89 L 47 124 L 34 130 Z M70 96 L 58 89 L 53 124 L 66 130 Z" fill="#efe6cf" />
          <path d="M43 92 C 36 104, 38 114, 46 116" fill="none" stroke="#c8893f" strokeWidth="1.6" />
          <circle cx="47" cy="116" r="2.6" fill="#c8893f" />
        </>
      )}
      {role === "civilian" && (
        // wool scarf
        <path d="M36 90 C 44 96, 56 96, 64 90 L 66 96 C 56 102, 44 102, 34 96 Z M56 98 L 62 120 L 55 121 L 51 100 Z" fill="#781210" />
      )}
      {role === "don" && (
        // red rose on the lapel
        <g transform="translate(64 101)">
          <circle r="3.4" fill="#9a1a17" />
          <path d="M-1.6 -1 a 1.8 1.8 0 1 1 3 1.4" fill="none" stroke="#5c0c0a" strokeWidth="0.8" />
          <path d="M-1 3 L -3 8" stroke="#2c2312" strokeWidth="1" />
        </g>
      )}
      {role === "sheriff" && (
        // six-point star badge
        <path
          transform="translate(35 104)"
          d="M0 -6 L 1.8 -3 L 5.2 -3 L 3.4 0 L 5.2 3 L 1.8 3 L 0 6 L -1.8 3 L -5.2 3 L -3.4 0 L -5.2 -3 L -1.8 -3 Z"
          fill="#e0b06a"
          stroke="#8a5a20"
          strokeWidth="0.5"
        />
      )}

      {/* Neck and head */}
      <rect x="44" y="74" width="12" height="16" rx="3" fill={ink} />
      <ellipse cx="50" cy="62" rx="14" ry="17" fill={ink} />
      {/* rim light on the cheek */}
      <path d="M38.5 54 C 36 62, 38 72, 44 77" fill="none" stroke="#e0b06a" strokeOpacity="0.55" strokeWidth="1.2" strokeLinecap="round" />

      {/* Hats */}
      {(role === "don" || role === "mafia") && (
        <g transform={role === "mafia" ? "rotate(-9 50 47)" : undefined}>
          <ellipse cx="50" cy="48" rx="27" ry="5.5" fill="#0d0a08" />
          <path d="M34 48 C 33 33, 40 27, 50 28 C 60 27, 67 33, 66 48 Z" fill={ink} />
          <path d="M43 30 C 47 34, 53 34, 57 30" fill="none" stroke="#000" strokeOpacity="0.5" strokeWidth="1.2" />
          <rect x="34.5" y="42" width="31" height="4.5" fill={role === "don" ? "#781210" : "#2c2312"} />
        </g>
      )}
      {role === "sheriff" && (
        <g>
          <path d="M22 50 C 30 54, 70 54, 78 50 C 74 47, 26 47, 22 50 Z" fill="#0d0a08" />
          <path d="M35 49 C 35 36, 41 30, 50 31 C 59 30, 65 36, 65 49 Z" fill={ink} />
          <rect x="35" y="44" width="30" height="3.5" fill="#74491e" />
        </g>
      )}
      {role === "civilian" && (
        <g>
          <path d="M35 50 C 35 41, 44 37, 53 37.5 C 62 38, 67 43, 67 49 Z" fill="#2c2312" />
          <path d="M33 50.5 C 44 48, 62 47.5, 76 51 C 73 53.5, 66 54, 62 53 C 52 52, 42 52.5, 33 53 Z" fill="#1d1810" />
          <circle cx="50" cy="38" r="1.4" fill="#1d1810" />
        </g>
      )}
      {role === "doctor" && (
        // head mirror
        <g>
          <path d="M37 52 C 42 47, 58 47, 63 52" fill="none" stroke="#2c2312" strokeWidth="2.4" />
          <circle cx="50" cy="48.5" r="6" fill="#e9dcc0" stroke="#8a5a20" strokeWidth="1.2" />
          <circle cx="50" cy="48.5" r="1.6" fill="#16110f" />
        </g>
      )}
      {role === "mafia" && <rect x="64" y="69" width="9" height="1.8" rx="0.9" fill="#efe6cf" transform="rotate(-12 64 69)" />}
    </svg>
  );
}
