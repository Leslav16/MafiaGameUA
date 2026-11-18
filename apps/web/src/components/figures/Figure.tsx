"use client";

import { useId, type CSSProperties } from "react";

export type FigureRole = "don" | "mafia" | "sheriff" | "doctor" | "civilian";

type Outfit = {
  body: string;
  bodyDark: string;
  skin: string;
  skinDark: string;
};

const OUTFIT: Record<FigureRole, Outfit> = {
  don: { body: "#2a2220", bodyDark: "#0f0b0a", skin: "#e2b892", skinDark: "#b98962" },
  mafia: { body: "#3a332e", bodyDark: "#171311", skin: "#d9ad85", skinDark: "#a9774f" },
  sheriff: { body: "#b07646", bodyDark: "#6e4321", skin: "#e6be98", skinDark: "#b8885f" },
  doctor: { body: "#efe8da", bodyDark: "#b9ae98", skin: "#e8c4a2", skinDark: "#bb9069" },
  civilian: { body: "#7d5a33", bodyDark: "#4a3219", skin: "#e4bc96", skinDark: "#b4855c" },
};

/**
 * An original big-head vinyl-toy style figure for each role: square-round
 * head, dot eyes, small body, standing on a round base. Pure SVG, shaded
 * with gradients for a 3D look. `asleep` closes the eyes (night).
 * Idle motion comes from the .figure CSS class (bob + head tilt).
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
  const o = OUTFIT[role];
  const id = `fig-${role}-${useId().replace(/:/g, "")}`;
  const eyes = asleep ? (
    <g stroke="#1a1210" strokeWidth="3" strokeLinecap="round" fill="none">
      <path d="M41 61 q6 4 12 0" />
      <path d="M67 61 q6 4 12 0" />
    </g>
  ) : (
    <g>
      <ellipse cx="47" cy="60" rx="5.5" ry="6.2" fill="#140e0c" />
      <ellipse cx="73" cy="60" rx="5.5" ry="6.2" fill="#140e0c" />
      <circle cx="45.3" cy="57.8" r="1.7" fill="#fff" opacity="0.9" />
      <circle cx="71.3" cy="57.8" r="1.7" fill="#fff" opacity="0.9" />
    </g>
  );

  return (
    <svg
      viewBox="0 0 120 170"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`figure overflow-visible ${className}`}
      style={{ ...style, ["--fig-delay" as string]: `${-delay}s` }}
    >
      {title && <title>{title}</title>}
      <defs>
        <radialGradient id={`${id}-skin`} cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#fff3e4" stopOpacity="0.9" />
          <stop offset="18%" stopColor={o.skin} />
          <stop offset="100%" stopColor={o.skinDark} />
        </radialGradient>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={o.body} />
          <stop offset="100%" stopColor={o.bodyDark} />
        </linearGradient>
        <linearGradient id={`${id}-hat`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={role === "sheriff" ? "#c89a64" : "#3b322d"} />
          <stop offset="100%" stopColor={role === "sheriff" ? "#7a5530" : "#0e0a09"} />
        </linearGradient>
        <radialGradient id={`${id}-base`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#4f2d12" />
          <stop offset="100%" stopColor="#1c110a" />
        </radialGradient>
      </defs>

      {/* Base and shadow */}
      <ellipse cx="60" cy="160" rx="38" ry="8" fill="#000" opacity="0.35" />
      <ellipse cx="60" cy="156" rx="34" ry="8" fill={`url(#${id}-base)`} />
      <ellipse cx="60" cy="154" rx="34" ry="7" fill="none" stroke="#c8893f" strokeOpacity="0.35" />

      <g className="figure-body">
        {/* Legs */}
        <rect x="45" y="128" width="12" height="26" rx="5" fill={role === "doctor" ? "#3a332e" : o.bodyDark} />
        <rect x="63" y="128" width="12" height="26" rx="5" fill={role === "doctor" ? "#3a332e" : o.bodyDark} />
        <ellipse cx="51" cy="153" rx="8" ry="4" fill="#120c0a" />
        <ellipse cx="69" cy="153" rx="8" ry="4" fill="#120c0a" />

        {/* Arms */}
        <rect x="27" y="92" width="13" height="34" rx="6.5" fill={`url(#${id}-body)`} transform="rotate(8 33 92)" />
        <rect x="80" y="92" width="13" height="34" rx="6.5" fill={`url(#${id}-body)`} transform="rotate(-8 87 92)" />
        <circle cx="31" cy="127" r="5.5" fill={o.skin} />
        <circle cx="89" cy="127" r="5.5" fill={o.skin} />

        {/* Torso */}
        <path d="M37 92 Q60 84 83 92 L86 134 Q60 140 34 134 Z" fill={`url(#${id}-body)`} />
        <Outfit role={role} />
      </g>

      <g className="figure-head">
        {/* Head */}
        <rect x="22" y="22" width="76" height="68" rx="29" fill={`url(#${id}-skin)`} />
        <ellipse cx="60" cy="88" rx="22" ry="3" fill="#000" opacity="0.12" />
        <Hair role={role} />
        {eyes}
        {/* Nose */}
        <ellipse cx="60" cy="70" rx="2.6" ry="2" fill={o.skinDark} opacity="0.8" />
        <Accessory role={role} />
        <Hat role={role} id={id} />
      </g>
    </svg>
  );
}

function Outfit({ role }: { role: FigureRole }) {
  switch (role) {
    case "don":
      return (
        <g>
          <path d="M52 88 L60 112 L68 88 Z" fill="#efe6d4" />
          <path d="M52 88 L60 112 L46 130 L40 96 Z" fill="#141010" />
          <path d="M68 88 L60 112 L74 130 L80 96 Z" fill="#141010" />
          <path d="M53 92 l7 3 l7 -3 l0 6 l-7 -3 l-7 3 Z" fill="#0b0808" />
          {/* Rose */}
          <circle cx="73" cy="102" r="4.2" fill="#9d1714" />
          <circle cx="72" cy="101" r="1.8" fill="#c73a32" />
          <path d="M71 106 l-3 5" stroke="#3c4a22" strokeWidth="1.6" />
        </g>
      );
    case "mafia":
      return (
        <g>
          <path d="M53 88 L60 104 L67 88 Z" fill="#1c1715" />
          <path d="M58 92 L62 92 L63 118 L60 122 L57 118 Z" fill="#8e1714" />
          <g stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1">
            <path d="M44 92 L42 132M50 95 L49 134M70 95 L71 134M76 92 L78 132" />
          </g>
        </g>
      );
    case "sheriff":
      return (
        <g>
          <path d="M52 88 L60 98 L68 88" fill="none" stroke="#6e4321" strokeWidth="2.5" />
          {/* Star badge */}
          <path
            d="M47 101 l2.4 4.9 l5.4 .8 l-3.9 3.8 l.9 5.4 l-4.8 -2.6 l-4.8 2.6 l.9 -5.4 l-3.9 -3.8 l5.4 -.8 Z"
            fill="#e2b04a"
            stroke="#8a5d14"
            strokeWidth="0.8"
          />
          <rect x="35" y="124" width="50" height="5" rx="1" fill="#3a2414" />
          <rect x="56" y="123" width="8" height="7" rx="1.5" fill="#d9a441" />
        </g>
      );
    case "doctor":
      return (
        <g>
          <path d="M60 90 L60 134" stroke="#c9bfa9" strokeWidth="1.5" />
          <path d="M50 90 Q46 110 56 118 Q60 121 64 118" fill="none" stroke="#2c2725" strokeWidth="2.4" />
          <circle cx="65" cy="117" r="3.4" fill="#8a8f99" stroke="#2c2725" strokeWidth="1.4" />
          <rect x="68" y="104" width="12" height="10" rx="1.5" fill="#e3dccb" />
          <path d="M74 106 v6 M71 109 h6" stroke="#b3201b" strokeWidth="2.2" />
        </g>
      );
    case "civilian":
      return (
        <g>
          <path d="M50 88 Q60 96 70 88" fill="none" stroke="#d6c7a1" strokeWidth="3.5" />
          <g stroke="#000" strokeOpacity="0.12" strokeWidth="1.2">
            <path d="M40 104 h40M38 114 h44M37 124 h46" />
          </g>
        </g>
      );
  }
}

function Hair({ role }: { role: FigureRole }) {
  switch (role) {
    case "don":
      return <path d="M24 52 Q24 26 50 23 Q38 32 30 56 Z M96 52 Q96 26 70 23 Q82 32 90 56 Z" fill="#9a958c" />;
    case "doctor":
      return <path d="M23 50 Q22 20 60 20 Q98 20 97 50 Q90 32 60 32 Q30 32 23 50 Z" fill="#5a3a20" />;
    case "civilian":
      return <path d="M24 56 Q24 40 30 36 L32 54 Z M96 56 Q96 40 90 36 L88 54 Z" fill="#6b4524" />;
    default:
      return <path d="M24 54 Q24 34 32 30 L33 52 Z M96 54 Q96 34 88 30 L87 52 Z" fill="#1c1412" />;
  }
}

function Accessory({ role }: { role: FigureRole }) {
  switch (role) {
    case "mafia":
      return (
        <g>
          <rect x="36" y="53" width="22" height="13" rx="5" fill="#0d0a09" />
          <rect x="62" y="53" width="22" height="13" rx="5" fill="#0d0a09" />
          <path d="M58 58 h4" stroke="#0d0a09" strokeWidth="3" />
          <path d="M40 56 l6 0" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
          <path d="M66 56 l6 0" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "don":
      return <path d="M50 77 Q55 73 60 76 Q65 73 70 77 Q65 80 60 78 Q55 80 50 77 Z" fill="#7d776e" />;
    case "doctor":
      return (
        <g>
          <path d="M24 40 Q60 30 96 40" fill="none" stroke="#2c2725" strokeWidth="2.5" />
          <circle cx="60" cy="35" r="7.5" fill="#d8dde3" stroke="#8a8f99" strokeWidth="1.5" />
          <circle cx="60" cy="35" r="2.5" fill="#fff" />
        </g>
      );
    default:
      return null;
  }
}

function Hat({ role, id }: { role: FigureRole; id: string }) {
  const hat = `url(#${id}-hat)`;
  switch (role) {
    case "don":
    case "mafia":
      return (
        <g transform={role === "mafia" ? "rotate(-7 60 30)" : undefined}>
          <ellipse cx="60" cy="31" rx="47" ry="9" fill={hat} />
          <path d="M33 31 Q34 4 60 6 Q86 4 87 31 Z" fill={hat} />
          <path d="M48 9 Q60 16 72 9" fill="none" stroke="#000" strokeOpacity="0.4" strokeWidth="2" />
          <rect x="33" y="22" width="54" height="7" fill={role === "don" ? "#781210" : "#0b0807"} />
          <ellipse cx="52" cy="14" rx="9" ry="4" fill="#fff" opacity="0.08" />
        </g>
      );
    case "sheriff":
      return (
        <g>
          <path d="M6 30 Q30 42 60 40 Q90 42 114 30 Q104 48 60 47 Q16 48 6 30 Z" fill={hat} />
          <path d="M34 38 Q35 6 60 8 Q85 6 86 38 Z" fill={hat} />
          <path d="M48 12 Q60 20 72 12" fill="none" stroke="#000" strokeOpacity="0.3" strokeWidth="2" />
          <rect x="34" y="30" width="52" height="5" fill="#4a2c14" />
          <ellipse cx="50" cy="16" rx="9" ry="4" fill="#fff" opacity="0.15" />
        </g>
      );
    case "civilian":
      return (
        <g>
          <path d="M25 38 Q26 12 60 12 Q92 13 95 34 Q80 40 60 40 Q40 40 25 38 Z" fill="#5d5a4a" />
          <path d="M28 38 Q60 46 96 34 Q104 38 100 44 Q64 50 26 42 Z" fill="#46433a" />
          <circle cx="60" cy="14" r="2.5" fill="#3a382f" />
        </g>
      );
    default:
      return null;
  }
}
