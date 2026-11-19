"use client";

import { useState } from "react";
import type { RoomPhase } from "./types";

/**
 * A short full-screen moment when the phase turns: at night the lamp
 * flickers and goes out ("The town falls asleep"), in the morning it comes
 * back on. Purely visual; it never blocks clicks.
 */
export function NightFall({
  phase,
  nightText,
  dayText,
}: {
  phase: RoomPhase;
  nightText: string;
  dayText: string;
}) {
  const [prev, setPrev] = useState(phase);
  const [show, setShow] = useState<{ to: "night" | "day"; n: number } | null>(
    null,
  );

  if (phase !== prev) {
    setPrev(phase);
    if (phase === "night") setShow({ to: "night", n: (show?.n ?? 0) + 1 });
    else if (prev === "night" && phase === "day")
      setShow({ to: "day", n: (show?.n ?? 0) + 1 });
  }

  if (!show) return null;
  return (
    <div
      key={show.n}
      aria-hidden
      data-to={show.to}
      className="nightfall pointer-events-none fixed inset-0 z-50 grid place-items-center"
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) setShow(null);
      }}
    >
      <div className="nf-dark absolute inset-0" />
      <div className="nf-swing absolute top-0 left-1/2">
        <div className="nf-light">
          <span className="nf-cone" />
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="nf-mote" style={{ "--m": i } as React.CSSProperties} />
          ))}
        </div>
        <svg className="nf-lamp" viewBox="0 0 160 190" width="160" height="190">
          <defs>
            <linearGradient id="nf-shade" x1="0" x2="1">
              <stop offset="0" stopColor="#14200f" />
              <stop offset="0.35" stopColor="#3d5a2e" />
              <stop offset="0.55" stopColor="#2f4a24" />
              <stop offset="1" stopColor="#0e170b" />
            </linearGradient>
            <linearGradient id="nf-brass" x1="0" x2="1">
              <stop offset="0" stopColor="#5a3a14" />
              <stop offset="0.5" stopColor="#e0b06a" />
              <stop offset="1" stopColor="#5a3a14" />
            </linearGradient>
            <radialGradient id="nf-bulb" cx="0.5" cy="0.35" r="0.6">
              <stop offset="0" stopColor="#fffaf0" />
              <stop offset="0.6" stopColor="#ffe2a8" />
              <stop offset="1" stopColor="#f0b860" />
            </radialGradient>
          </defs>
          <line x1="80" y1="0" x2="80" y2="84" stroke="#1a1410" strokeWidth="2.5" />
          <rect x="72" y="80" width="16" height="18" rx="3" fill="url(#nf-brass)" />
          <path d="M80 96 C 46 98, 26 128, 20 150 L 140 150 C 134 128, 114 98, 80 96 Z" fill="url(#nf-shade)" />
          <path d="M44 120 C 52 108, 64 102, 76 100" stroke="#8fb07a" strokeOpacity="0.45" strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect x="18" y="148" width="124" height="5" rx="2.5" fill="url(#nf-brass)" />
          <ellipse className="nf-bulb-glass" cx="80" cy="162" rx="17" ry="14" fill="url(#nf-bulb)" />
          <path className="nf-filament" d="M72 160 q 4 -6 8 0 t 8 0" stroke="#ff9a3c" strokeWidth="1.6" fill="none" />
        </svg>
      </div>
      <p className="nightfall-text headline relative text-[clamp(2.2rem,6vw,5.4rem)]">
        {show.to === "night" ? nightText : dayText}
      </p>
    </div>
  );
}
