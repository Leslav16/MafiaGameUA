"use client";

import { Figure, type FigureRole } from "./figures/Figure";
import { usePhase } from "./Phase";

/** Who stands around the table, left to right. */
const CAST: { role: FigureRole; left: number; top: number; width: number; z: number }[] = [
  { role: "civilian", left: 12, top: 27, width: 23, z: 1 },
  { role: "sheriff", left: 31, top: 19, width: 23, z: 0 },
  { role: "don", left: 50, top: 15, width: 24, z: 0 },
  { role: "mafia", left: 69, top: 19, width: 23, z: 0 },
  { role: "doctor", left: 88, top: 27, width: 23, z: 1 },
];

const MAFIA = new Set<FigureRole>(["don", "mafia"]);

/**
 * The landing scene: a hanging lamp over a wooden card table, with the cast
 * standing around it. At night the lamp dims and everyone closes their eyes,
 * except the mafia.
 */
export function Stage({
  label,
  roleNames,
}: {
  label: string;
  roleNames: Record<FigureRole, string>;
}) {
  const { phase } = usePhase();
  const night = phase === "night";

  return (
    <div role="img" aria-label={label} className="stage relative aspect-[4/3] w-full select-none" data-night={night ? "" : undefined}>
      {/* Lamp: cord, shade and the cone of light, swaying together */}
      <div className="stage-lamp absolute inset-x-0 top-0 h-full" aria-hidden>
        <div className="absolute top-0 left-1/2 h-[6%] w-[2px] -translate-x-1/2 bg-[var(--text)]/50" />
        <svg viewBox="0 0 100 40" className="absolute top-[5%] left-1/2 w-[17%] -translate-x-1/2 overflow-visible">
          <defs>
            <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1f2a1a" />
              <stop offset="45%" stopColor="#3e5235" />
              <stop offset="100%" stopColor="#141b11" />
            </linearGradient>
          </defs>
          <path d="M44 2 h12 v6 h-12 Z" fill="#6a4a22" />
          <path d="M22 30 Q26 8 50 7 Q74 8 78 30 Z" fill="url(#shade)" />
          <ellipse cx="50" cy="30" rx="28" ry="4" fill="#e9c27a" className="stage-bulb" />
        </svg>
        <div className="stage-cone absolute top-[12%] left-1/2 h-[80%] w-[78%] -translate-x-1/2" />
      </div>

      {/* Cast, behind the table */}
      {CAST.map((c, i) => (
        <div
          key={c.role}
          className="stage-figure absolute -translate-x-1/2"
          style={{ left: `${c.left}%`, top: `${c.top}%`, width: `${c.width}%`, zIndex: c.z }}
          data-mafia={MAFIA.has(c.role) ? "" : undefined}
        >
          <Figure role={c.role} asleep={night && !MAFIA.has(c.role)} delay={i * 0.7} title={roleNames[c.role]} />
        </div>
      ))}

      {/* Table: top surface plus a darker edge underneath for thickness */}
      <div aria-hidden className="absolute inset-x-[7%] top-[60%] bottom-[4%] z-10">
        <div className="stage-table-edge absolute inset-0 translate-y-[7%] rounded-[50%]" />
        <div className="stage-table absolute inset-0 rounded-[50%]">
          <div className="absolute inset-[9%] rounded-[50%] border border-[var(--color-lamp)]/25" />
          {/* Cards dealt face down */}
          {[
            [30, 40, -18],
            [42, 30, -6],
            [55, 31, 8],
            [67, 42, 20],
            [48, 55, 2],
          ].map(([l, t, r], i) => (
            <div
              key={i}
              className="stage-card absolute aspect-[5/7] w-[6.5%]"
              style={{ left: `${l}%`, top: `${t}%`, transform: `rotate(${r}deg) rotateX(50deg)` }}
            />
          ))}
          {/* A tumbler and an ashtray, for the mood */}
          <div className="absolute top-[38%] left-[16%] aspect-square w-[6%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#e9d9b5_0,#a58d63_45%,#4b3720_100%)] opacity-80 shadow-[0_4px_6px_-2px_rgba(0,0,0,0.6)]" />
          <div className="absolute top-[44%] right-[15%] aspect-[2/1] w-[9%] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_40%,#2a2522_0,#0f0b0a_60%,#3a332e_100%)] shadow-[0_4px_6px_-2px_rgba(0,0,0,0.6)]" />
        </div>
      </div>
    </div>
  );
}
