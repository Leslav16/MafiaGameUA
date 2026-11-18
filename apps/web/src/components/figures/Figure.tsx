"use client";

import { useId, type CSSProperties } from "react";

export type FigureRole = "don" | "mafia" | "sheriff" | "doctor" | "civilian";

type Look = {
  skin: string;
  skinDark: string;
  hair: string;
  hairLight: string;
  top: string;
  topDark: string;
  legs: string;
  shoes: string;
};

const LOOK: Record<FigureRole, Look> = {
  don: { skin: "#e9c6a3", skinDark: "#b98962", hair: "#8d8a84", hairLight: "#d7d3cb", top: "#2b2523", topDark: "#0d0a09", legs: "#1c1716", shoes: "#0b0807" },
  mafia: { skin: "#e2b791", skinDark: "#a9774f", hair: "#1d1513", hairLight: "#5a4a43", top: "#46403b", topDark: "#1c1815", legs: "#2c2724", shoes: "#0d0a09" },
  sheriff: { skin: "#ecc7a2", skinDark: "#b8885f", hair: "#6b4524", hairLight: "#a8743f", top: "#b8814f", topDark: "#6e4321", legs: "#3e4a5c", shoes: "#3a2414" },
  doctor: { skin: "#eccaa9", skinDark: "#bb9069", hair: "#4a2f1a", hairLight: "#8a5a32", top: "#f3eee4", topDark: "#b9ae98", legs: "#4f7f86", shoes: "#d6d2c8" },
  civilian: { skin: "#e8c39f", skinDark: "#b4855c", hair: "#6b4524", hairLight: "#a06a3a", top: "#86603a", topDark: "#4a3219", legs: "#3f3a33", shoes: "#2a1a10" },
};

/**
 * An original collectible-vinyl-toy style figure for each role: an oversized
 * rounded-square head, big glossy black eyes, no mouth, a small body, and
 * soft shading for a moulded 3D look. Pure SVG.
 *
 * Motion lives in CSS (.figure): an idle bob and head tilt, and on hover a
 * little run left and right with swinging legs and arms.
 * `asleep` closes the eyes (night).
 */
export function Figure({
  role,
  asleep = false,
  className = "",
  style,
  title,
  delay = 0,
}: {
  role: FigureRole;
  asleep?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
  /** Seconds to offset the idle animation, so a group doesn't move in sync. */
  delay?: number;
}) {
  const L = LOOK[role];
  const id = `fig-${role}-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const u = (name: string) => `url(#${id}-${name})`;

  return (
    <svg
      viewBox="0 -14 120 196"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`figure overflow-visible ${className}`}
      style={{ ...style, ["--fig-delay" as string]: `${-delay}s` }}
    >
      {title && <title>{title}</title>}
      <defs>
        {/* Moulded skin: lit from the top-left */}
        <radialGradient id={`${id}-skin`} cx="34%" cy="30%" r="85%">
          <stop offset="0%" stopColor="#fff6ea" />
          <stop offset="14%" stopColor={L.skin} />
          <stop offset="72%" stopColor={L.skin} />
          <stop offset="100%" stopColor={L.skinDark} />
        </radialGradient>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#3a1d0c" stopOpacity="0.28" />
        </linearGradient>
        <radialGradient id={`${id}-hair`} cx="35%" cy="20%" r="90%">
          <stop offset="0%" stopColor={L.hairLight} />
          <stop offset="55%" stopColor={L.hair} />
          <stop offset="100%" stopColor={L.hair} stopOpacity="0.9" />
        </radialGradient>
        <linearGradient id={`${id}-top`} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%" stopColor={L.top} />
          <stop offset="100%" stopColor={L.topDark} />
        </linearGradient>
        <linearGradient id={`${id}-legs`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={L.legs} />
          <stop offset="100%" stopColor={L.legs} stopOpacity="0.7" />
        </linearGradient>
        <radialGradient id={`${id}-eye`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#3a3533" />
          <stop offset="60%" stopColor="#0c0909" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <linearGradient id={`${id}-hat`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={role === "sheriff" ? "#d6a872" : role === "civilian" ? "#77735f" : "#4a403a"} />
          <stop offset="100%" stopColor={role === "sheriff" ? "#7a5530" : role === "civilian" ? "#3f3c31" : "#0d0a09"} />
        </linearGradient>
      </defs>

      {/* Floor shadow */}
      <ellipse className="figure-shadow" cx="60" cy="173" rx="30" ry="5.5" fill="#000" opacity="0.3" />

      <g className="figure-body">
        {/* Legs and shoes */}
        <g className="figure-leg figure-leg-l">
          <rect x="45" y="136" width="13" height="30" rx="5" fill={u("legs")} />
          <ellipse cx="50" cy="167" rx="9" ry="5" fill={L.shoes} />
          <ellipse cx="47" cy="165" rx="3.5" ry="1.4" fill="#fff" opacity="0.18" />
        </g>
        <g className="figure-leg figure-leg-r">
          <rect x="62" y="136" width="13" height="30" rx="5" fill={u("legs")} />
          <ellipse cx="70" cy="167" rx="9" ry="5" fill={L.shoes} />
          <ellipse cx="67" cy="165" rx="3.5" ry="1.4" fill="#fff" opacity="0.18" />
        </g>

        {/* Arms */}
        <g className="figure-arm figure-arm-l">
          <path d="M42 100 Q31 104 30 128 L39 129 Q40 112 46 106 Z" fill={u("top")} />
          <circle cx="34.5" cy="131" r="5.6" fill={u("skin")} />
        </g>
        <g className="figure-arm figure-arm-r">
          <path d="M78 100 Q89 104 90 128 L81 129 Q80 112 74 106 Z" fill={u("top")} />
          <circle cx="85.5" cy="131" r="5.6" fill={u("skin")} />
        </g>

        {/* Torso */}
        <path d="M42 96 Q60 91 78 96 L81 141 Q60 145 39 141 Z" fill={u("top")} />
        <Outfit role={role} />
        {/* Shadow cast by the big head */}
        <ellipse cx="60" cy="98" rx="20" ry="5" fill="#000" opacity="0.28" />
      </g>

      <g className="figure-head">
        {/* Ears */}
        <ellipse cx="12" cy="62" rx="5.5" ry="9" fill={L.skinDark} />
        <ellipse cx="108" cy="62" rx="5.5" ry="9" fill={L.skinDark} />
        {/* Head */}
        <rect x="12" y="6" width="96" height="92" rx="38" fill={u("skin")} />
        <rect x="12" y="6" width="96" height="92" rx="38" fill={u("shade")} />
        {/* Soft rim light on the right */}
        <path d="M100 30 Q109 52 103 80" fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="2.5" strokeLinecap="round" />

        <Hair role={role} fill={u("hair")} hairLight={L.hairLight} />

        {/* Brows */}
        {role !== "mafia" && (
          <g stroke={L.hair} strokeWidth="3.4" strokeLinecap="round" fill="none">
            <path d={role === "don" ? "M31 47 q10 -5 19 0" : "M32 45 q9 -4 18 -1"} />
            <path d={role === "don" ? "M70 47 q9 -5 19 0" : "M70 44 q9 -3 18 1"} />
          </g>
        )}

        {/* Eyes: big, glossy, black */}
        {asleep ? (
          <g stroke="#1a1210" strokeWidth="3.4" strokeLinecap="round" fill="none">
            <path d="M32 63 q9 6 18 0" />
            <path d="M70 63 q9 6 18 0" />
          </g>
        ) : (
          <g className="figure-eyes">
            {[41, 79].map((x) => (
              <g key={x}>
                <circle cx={x} cy="61" r="10" fill={u("eye")} />
                <ellipse cx={x - 3.6} cy="56.8" rx="3.4" ry="2.6" fill="#fff" opacity="0.92" transform={`rotate(-25 ${x - 3.6} 56.8)`} />
                <circle cx={x + 3.8} cy="65" r="1.3" fill="#fff" opacity="0.55" />
              </g>
            ))}
          </g>
        )}

        {/* Nose: a small moulded bump */}
        <ellipse cx="60" cy="74" rx="4.2" ry="3.4" fill={L.skinDark} opacity="0.55" />
        <ellipse cx="59" cy="72.6" rx="1.8" ry="1.1" fill="#fff" opacity="0.45" />

        <Accessory role={role} />
        <Hat role={role} fill={u("hat")} />
        {/* Top gloss on the whole head */}
        <ellipse cx="44" cy="20" rx="20" ry="6" fill="#fff" opacity="0.1" />
      </g>
    </svg>
  );
}

function Outfit({ role }: { role: FigureRole }) {
  switch (role) {
    case "don":
      return (
        <g>
          <path d="M53 95 L60 118 L67 95 Z" fill="#f1e9d8" />
          <path d="M53 95 L60 118 L47 138 L42 100 Z" fill="#141010" />
          <path d="M67 95 L60 118 L73 138 L78 100 Z" fill="#141010" />
          <path d="M53 99 l7 3 l7 -3 v6 l-7 -3 l-7 3 Z" fill="#0b0808" />
          <circle cx="60" cy="125" r="1.3" fill="#3a3330" />
          <circle cx="60" cy="132" r="1.3" fill="#3a3330" />
          {/* Rose */}
          <circle cx="72" cy="108" r="4.4" fill="#9d1714" />
          <circle cx="71" cy="107" r="1.9" fill="#d04a40" />
          <path d="M70 112 l-3 5" stroke="#3c4a22" strokeWidth="1.6" />
        </g>
      );
    case "mafia":
      return (
        <g>
          <path d="M53 95 L60 110 L67 95 Z" fill="#d9d4cb" />
          <path d="M58 98 h4 l1.5 22 l-3.5 4 l-3.5 -4 Z" fill="#8e1714" />
          <g stroke="#fff" strokeOpacity="0.09" strokeWidth="1">
            <path d="M45 99 L43 140M51 101 L50 142M69 101 L70 142M75 99 L77 140" />
          </g>
          <path d="M45 104 h6" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" />
        </g>
      );
    case "sheriff":
      return (
        <g>
          <path d="M52 95 L60 104 L68 95" fill="none" stroke="#6e4321" strokeWidth="2.6" />
          <path d="M60 104 V138" stroke="#6e4321" strokeWidth="1.2" opacity="0.6" />
          <path
            d="M48 108 l2.6 5.3 l5.8 .8 l-4.2 4.1 l1 5.8 l-5.2 -2.8 l-5.2 2.8 l1 -5.8 l-4.2 -4.1 l5.8 -.8 Z"
            fill="#e8b84e"
            stroke="#8a5d14"
            strokeWidth="0.8"
          />
          <rect x="39" y="131" width="42" height="6" rx="1" fill="#3a2414" />
          <rect x="56" y="130" width="8" height="8" rx="1.5" fill="#e0ad48" />
        </g>
      );
    case "doctor":
      return (
        <g>
          <path d="M52 95 L60 112 L68 95 Z" fill="#4f7f86" />
          <path d="M60 112 V141" stroke="#c9bfa9" strokeWidth="1.5" />
          <path d="M49 98 Q45 118 55 124 Q60 127 65 124" fill="none" stroke="#2c2725" strokeWidth="2.4" />
          <circle cx="66" cy="123" r="3.6" fill="#a7adb6" stroke="#2c2725" strokeWidth="1.4" />
          <rect x="67" y="106" width="11" height="10" rx="1.5" fill="#e3dccb" />
          <path d="M72.5 108 v6 M69.5 111 h6" stroke="#b3201b" strokeWidth="2.2" />
        </g>
      );
    case "civilian":
      return (
        <g>
          <path d="M50 95 Q60 104 70 95" fill="none" stroke="#e6d9b8" strokeWidth="4" />
          <g stroke="#000" strokeOpacity="0.13" strokeWidth="1.2">
            <path d="M42 112 h36M41 122 h38M40 132 h40" />
          </g>
          <rect x="44" y="113" width="9" height="7" rx="1.5" fill="#000" opacity="0.12" />
        </g>
      );
  }
}

function Hair({ role, fill, hairLight }: { role: FigureRole; fill: string; hairLight: string }) {
  const gloss = <path d="M30 22 Q46 12 64 14" fill="none" stroke={hairLight} strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" />;
  switch (role) {
    case "don":
      // Grey hair at the sides, under the hat
      return <path d="M12 58 Q10 30 24 20 L30 52 Z M108 58 Q110 30 96 20 L90 52 Z" fill={fill} />;
    case "mafia":
      return <path d="M12 58 Q10 28 26 20 L30 50 Z M108 58 Q110 28 94 20 L90 50 Z" fill={fill} />;
    case "doctor":
      return (
        <g>
          <path d="M12 54 Q8 4 60 4 Q112 4 108 54 Q100 26 74 26 Q66 34 52 28 Q24 26 12 54 Z" fill={fill} />
          {gloss}
        </g>
      );
    case "sheriff":
      return <path d="M12 56 Q10 34 20 26 L26 52 Z M108 56 Q110 34 100 26 L94 52 Z" fill={fill} />;
    case "civilian":
      return <path d="M12 60 Q10 40 18 32 L24 56 Z M108 60 Q110 40 102 32 L96 56 Z" fill={fill} />;
  }
}

function Accessory({ role }: { role: FigureRole }) {
  switch (role) {
    case "mafia":
      // Dark glasses, with a glint
      return (
        <g>
          <rect x="27" y="51" width="28" height="18" rx="7" fill="#0d0a09" />
          <rect x="65" y="51" width="28" height="18" rx="7" fill="#0d0a09" />
          <path d="M55 57 h10" stroke="#0d0a09" strokeWidth="3.5" />
          <path d="M32 55 l9 0" stroke="#fff" strokeOpacity="0.45" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M70 55 l9 0" stroke="#fff" strokeOpacity="0.45" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M44 44 q8 -3 14 0 M62 44 q8 -3 14 0" stroke="#1d1513" strokeWidth="3.4" strokeLinecap="round" fill="none" />
        </g>
      );
    case "don":
      // Moustache
      return <path d="M47 82 Q53 77 60 80 Q67 77 73 82 Q67 86 60 83 Q53 86 47 82 Z" fill="#8d8a84" />;
    case "doctor":
      // Head mirror on a band
      return (
        <g>
          <path d="M13 36 Q60 24 107 36" fill="none" stroke="#2c2725" strokeWidth="3" />
          <circle cx="60" cy="30" r="8.5" fill="#dfe4ea" stroke="#8a8f99" strokeWidth="1.6" />
          <circle cx="57.5" cy="27.5" r="2.6" fill="#fff" />
        </g>
      );
    default:
      return null;
  }
}

function Hat({ role, fill }: { role: FigureRole; fill: string }) {
  switch (role) {
    case "don":
    case "mafia":
      return (
        <g transform={role === "mafia" ? "rotate(-8 60 22)" : undefined}>
          <ellipse cx="60" cy="25" rx="60" ry="10" fill={fill} />
          <ellipse cx="60" cy="23" rx="58" ry="7" fill="#fff" opacity="0.06" />
          <path d="M26 25 Q27 -12 60 -10 Q93 -12 94 25 Z" fill={fill} />
          <path d="M46 -6 Q60 4 74 -6" fill="none" stroke="#000" strokeOpacity="0.45" strokeWidth="2.4" />
          <rect x="26" y="14" width="68" height="9" fill={role === "don" ? "#781210" : "#0b0807"} />
          <ellipse cx="44" cy="2" rx="10" ry="5" fill="#fff" opacity="0.12" />
        </g>
      );
    case "sheriff":
      return (
        <g>
          <path d="M-4 22 Q24 36 60 34 Q96 36 124 22 Q112 44 60 43 Q8 44 -4 22 Z" fill={fill} />
          <path d="M28 32 Q29 -10 60 -8 Q91 -10 92 32 Z" fill={fill} />
          <path d="M46 -3 Q60 7 74 -3" fill="none" stroke="#000" strokeOpacity="0.3" strokeWidth="2.4" />
          <rect x="28" y="23" width="64" height="6" fill="#4a2c14" />
          <ellipse cx="44" cy="4" rx="10" ry="5" fill="#fff" opacity="0.18" />
        </g>
      );
    case "civilian":
      return (
        <g>
          <path d="M14 36 Q14 2 60 2 Q104 3 108 30 Q86 38 60 38 Q34 38 14 36 Z" fill={fill} />
          <path d="M16 36 Q60 46 108 30 Q118 36 112 44 Q64 52 14 42 Z" fill="#3a382f" />
          <circle cx="60" cy="4" r="3" fill="#3a382f" />
          <path d="M30 16 Q46 8 64 9" fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    default:
      return null;
  }
}
