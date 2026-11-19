"use client";

import { useRef } from "react";
import { MOTION, gsap, useGSAP } from "@/lib/motion";
import { usePhase } from "../Phase";

/**
 * The lamp's pull cord: click it, or pull it down, to switch day and night.
 * It hangs from the shade and sways with the lamp; a pull stretches it and on
 * release it springs back with a little wobble.
 *
 * The stretch lives in the `--pull` CSS variable and only GSAP writes it: the
 * finger sets it directly while dragging (no React re-render per
 * pointer move), and an elastic tween brings it back. No CSS transition or
 * keyframe touches the cord's length, so the two never fight.
 */
export function LampCord({ toNight, toDay }: { toNight: string; toDay: string }) {
  const { phase, toggle } = usePhase();
  const root = useRef<HTMLButtonElement>(null);
  const start = useRef<number | null>(null);
  const pulled = useRef(0);
  const dragged = useRef(false);
  const night = phase === "night";

  useGSAP(
    () => {
      const el = root.current;
      // The spring-back tweens start in event handlers, outside this context: kill them on unmount.
      return () => {
        if (el) gsap.killTweensOf(el);
      };
    },
    { scope: root },
  );

  /** Spring back from `from` px (a release, or the tug of a plain click). */
  const springBack = (from: number) => {
    const el = root.current;
    if (!el) return;
    gsap.killTweensOf(el, "--pull");
    if (!window.matchMedia(MOTION.ok).matches) {
      gsap.set(el, { "--pull": "0px" });
      return;
    }
    gsap.fromTo(el, { "--pull": `${from}px` }, { "--pull": "0px", duration: 0.9, ease: "elastic.out(1.1, 0.35)" });
  };

  const release = () => {
    if (start.current === null) return;
    start.current = null;
    const p = pulled.current;
    pulled.current = 0;
    if (p > 14) toggle();
    springBack(p);
  };

  return (
    <button
      ref={root}
      type="button"
      aria-label={night ? toDay : toNight}
      aria-pressed={night}
      className="lamp-cord"
      onPointerDown={(e) => {
        start.current = e.clientY;
        dragged.current = false;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (start.current === null) return;
        const dy = Math.max(0, Math.min(36, e.clientY - start.current));
        if (dy > 4) dragged.current = true;
        pulled.current = dy;
        // The cord sits under the finger: set at once, no tween to chase it.
        gsap.killTweensOf(e.currentTarget);
        gsap.set(e.currentTarget, { "--pull": `${dy}px` });
      }}
      onPointerUp={release}
      onPointerCancel={() => {
        start.current = null;
        pulled.current = 0;
        springBack(0);
      }}
      onClick={() => {
        // A plain click (or Enter / Space) also pulls the cord.
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        toggle();
        springBack(26);
      }}
    >
      <span className="lamp-cord-string">
        <span className="lamp-cord-bead" />
      </span>
    </button>
  );
}
