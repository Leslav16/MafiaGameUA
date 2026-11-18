"use client";

import { useRef, useState } from "react";
import { usePhase } from "../Phase";

/**
 * The lamp's pull cord: click it, or pull it down, to switch day and night.
 * It hangs from the shade and sways with the lamp; a pull stretches it a
 * little and it springs back.
 */
export function LampCord({ toNight, toDay }: { toNight: string; toDay: string }) {
  const { phase, toggle } = usePhase();
  const [pull, setPull] = useState(0);
  const [tug, setTug] = useState(0);
  const start = useRef<number | null>(null);
  const dragged = useRef(false);
  const night = phase === "night";

  const release = () => {
    if (start.current === null) return;
    start.current = null;
    if (pull > 14) {
      toggle();
      setTug((x) => x + 1);
    }
    setPull(0);
  };

  return (
    <button
      type="button"
      aria-label={night ? toDay : toNight}
      aria-pressed={night}
      className="lamp-cord"
      style={{ "--pull": `${pull}px` } as React.CSSProperties}
      data-pulling={pull > 0 ? "" : undefined}
      onPointerDown={(e) => {
        start.current = e.clientY;
        dragged.current = false;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (start.current === null) return;
        const dy = Math.max(0, Math.min(36, e.clientY - start.current));
        if (dy > 4) dragged.current = true;
        setPull(dy);
      }}
      onPointerUp={release}
      onPointerCancel={() => {
        start.current = null;
        setPull(0);
      }}
      onClick={() => {
        // A plain click (or Enter / Space) also pulls the cord.
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        toggle();
        setTug((x) => x + 1);
      }}
    >
      <span key={tug} className="lamp-cord-string" data-tug={tug > 0 ? "" : undefined}>
        <span className="lamp-cord-bead" />
      </span>
    </button>
  );
}
