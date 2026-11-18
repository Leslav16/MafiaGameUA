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
      <div className="nightfall-lamp absolute top-0 left-1/2 -translate-x-1/2">
        <span className="nightfall-cord" />
        <span className="nightfall-shade" />
        <span className="nightfall-bulb" />
        <span className="nightfall-cone" />
      </div>
      <p className="nightfall-text font-display text-[clamp(2.5rem,7vw,6rem)] tracking-wide">
        {show.to === "night" ? nightText : dayText}
      </p>
    </div>
  );
}
