"use client";

import { usePhase } from "./Phase";

const SEATS = 11;
const CX = 300;
const CY = 280;
const RX = 250;
const RY = 190;
const TILE_W = 74;
const TILE_H = 56;

/** Seats that "open their eyes" at night. Decorative only, not a real game. */
const MAFIA_SEATS = new Set([3, 7, 9]);

function seatPosition(index: number) {
  // Twelve places around the table: the host takes the top one (-90°),
  // seats 1–11 follow clockwise.
  const angle = ((-90 + 30 * (index + 1)) * Math.PI) / 180;
  return { x: CX + RX * Math.cos(angle), y: CY + RY * Math.sin(angle) };
}

export function TableScene({
  hostLabel,
  seatLabel,
  tableLabel,
}: {
  hostLabel: string;
  seatLabel: string;
  tableLabel: string;
}) {
  const { phase } = usePhase();
  const night = phase === "night";

  return (
    <svg
      viewBox="0 0 600 540"
      role="img"
      aria-label={tableLabel}
      className="h-auto w-full max-w-[640px] select-none"
    >
      <defs>
        <radialGradient id="lamp" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#E8A33D" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#E8A33D" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#E8A33D" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Pool of lamplight */}
      <ellipse
        cx={CX}
        cy={CY}
        rx={RX + 40}
        ry={RY + 40}
        fill="url(#lamp)"
        className="phase-transition"
        style={{ opacity: "var(--glow-opacity)" }}
      />

      {/* Table */}
      <ellipse
        cx={CX}
        cy={CY}
        rx={RX - 70}
        ry={RY - 62}
        className="phase-transition"
        style={{ fill: "var(--table)" }}
      />
      <ellipse
        cx={CX}
        cy={CY}
        rx={RX - 82}
        ry={RY - 74}
        fill="none"
        strokeWidth="1.5"
        className="phase-transition"
        style={{ stroke: "var(--surface)", opacity: 0.35 }}
      />

      {/* Host at the head of the table */}
      <g transform={`translate(${CX - 60}, ${CY - RY - 34})`}>
        <rect
          width="120"
          height="68"
          rx="8"
          className="phase-transition"
          style={{ fill: "var(--color-ink)", stroke: "var(--color-lamp)" }}
          strokeWidth="2"
        />
        <text
          x="60"
          y="43"
          textAnchor="middle"
          className="font-display"
          fontSize="22"
          letterSpacing="0.04em"
          fill="#EFE4CC"
        >
          {hostLabel}
        </text>
      </g>

      {/* Seats 1–11 */}
      {Array.from({ length: SEATS }, (_, i) => {
        const n = i + 1;
        const { x, y } = seatPosition(i);
        const mafiaAwake = night && MAFIA_SEATS.has(n);
        return (
          <g
            key={n}
            transform={`translate(${x - TILE_W / 2}, ${y - TILE_H / 2})`}
            aria-label={seatLabel.replace("{n}", String(n))}
          >
            <rect
              width={TILE_W}
              height={TILE_H}
              rx="6"
              strokeWidth={mafiaAwake ? 3 : 1}
              className="phase-transition"
              style={{
                fill: "var(--seat-fill)",
                stroke: mafiaAwake ? "var(--color-oxblood)" : "var(--line)",
              }}
            />
            <text
              x={TILE_W / 2}
              y={TILE_H / 2 + 11}
              textAnchor="middle"
              className="phase-transition font-display"
              fontSize="30"
              fontWeight="500"
              style={{ fill: mafiaAwake ? "#C9545F" : "var(--seat-text)" }}
            >
              {n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
