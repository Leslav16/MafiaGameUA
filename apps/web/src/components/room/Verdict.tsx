"use client";

import { Fragment, useRef, useState } from "react";
import { gsap, MOTION, useGSAP } from "@/lib/motion";
import type { RoomPhase } from "./types";

export type VerdictWords = {
  /** Small line above: "Перемога Мафії". */
  kicker: string;
  /** The big words: "Місто належить Сім'ї". */
  title: string;
  /** A closing line in italics. */
  line: string;
};

/** How long the verdict stays before it lifts by itself (seconds, after it has fully appeared). */
const HOLD = 3.6;

/** Splits words into letters, each in its own span, keeping words together on one line. */
function Letters({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((word, w, all) => (
        <Fragment key={w}>
          <span className="vd-word inline-block whitespace-nowrap">
            {Array.from(word).map((ch, i) => (
              <span key={i} className="vd-ch inline-block">
                {ch}
              </span>
            ))}
          </span>
          {w < all.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}

/**
 * The end of the game, in words only, like "The town falls asleep": the room goes dark,
 * a thin line is drawn (blood red for the mafia, brass for the town), the verdict's letters
 * come out of the dark one by one, a closing line follows, and it all lifts after a few seconds.
 * A click or a key closes it sooner. Shown only when the game ends while you watch, not when
 * you join an ended table. With reduced motion it simply fades in and out.
 */
export function Verdict({
  phase,
  winner,
  words,
  closeLabel,
}: {
  phase: RoomPhase;
  winner: "town" | "mafia" | null;
  words: Record<"town" | "mafia", VerdictWords>;
  closeLabel: string;
}) {
  const [prev, setPrev] = useState(phase);
  const [show, setShow] = useState<{ who: "town" | "mafia"; n: number } | null>(null);
  if (phase !== prev) {
    setPrev(phase);
    if (phase === "ended" && winner) setShow({ who: winner, n: (show?.n ?? 0) + 1 });
    else if (phase !== "ended" && show) setShow(null);
  }

  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      if (!show || !root.current) return;
      const mm = gsap.matchMedia();
      const done = () => setShow(null);
      mm.add(MOTION.ok, () => {
        const t = gsap.timeline({ onComplete: done });
        t.from(".vd-dark", { opacity: 0, duration: 0.9, ease: "power2.inOut" })
          .from(".vd-glow", { opacity: 0, scale: 0.6, duration: 2.2, ease: "power2.out" }, 0.3)
          .from(".vd-kicker", { opacity: 0, letterSpacing: "0.9em", duration: 1.1, ease: "power3.out" }, 0.6)
          .from(".vd-rule", { scaleX: 0, duration: 1.1, ease: "power4.inOut" }, 0.8)
          .from(
            ".vd-ch",
            {
              opacity: 0,
              yPercent: 60,
              rotate: () => gsap.utils.random(-12, 12),
              filter: "blur(10px)",
              duration: 0.9,
              ease: "power3.out",
              stagger: { each: 0.045, from: "start" },
            },
            1.2,
          )
          .from(".vd-line", { opacity: 0, y: 12, filter: "blur(4px)", duration: 1 }, ">-0.3")
          .to(".vd-title", { scale: 1.03, duration: HOLD, ease: "none" }, ">")
          .to(root.current, { opacity: 0, duration: 1.1, ease: "power2.in" }, ">-0.6");
        tl.current = t;
      });
      mm.add(MOTION.reduce, () => {
        const t = gsap.timeline({ onComplete: done });
        t.from(root.current, { opacity: 0, duration: 0.6, ease: "none" })
          .to({}, { duration: HOLD + 2 })
          .to(root.current, { opacity: 0, duration: 0.6, ease: "none" });
        tl.current = t;
      });
      return () => {
        tl.current = null;
        mm.revert();
      };
    },
    { scope: root, dependencies: [show?.n], revertOnUpdate: true },
  );

  if (!show) return null;
  const w = words[show.who];
  const close = () => {
    // Lift it quickly instead of cutting it off.
    const t = tl.current;
    if (t && root.current) {
      t.kill();
      gsap.to(root.current, { opacity: 0, duration: 0.35, ease: "power1.in", onComplete: () => setShow(null) });
    } else setShow(null);
  };

  return (
    <div
      key={show.n}
      ref={root}
      data-who={show.who}
      role="status"
      aria-live="assertive"
      className="verdict fixed inset-0 z-50 grid cursor-pointer place-items-center px-4"
      onClick={close}
      onKeyDown={(e) => e.key === "Escape" && close()}
    >
      <div className="vd-dark absolute inset-0" />
      <div aria-hidden className="vd-glow absolute inset-0" />
      <div className="relative flex max-w-5xl flex-col items-center text-center">
        <p className="vd-kicker font-display text-[clamp(0.85rem,1.6vw,1.15rem)] tracking-[0.45em] uppercase">{w.kicker}</p>
        <span aria-hidden className="vd-rule mt-4 mb-5 block h-px w-[min(26rem,70vw)]" />
        <h2 className="vd-title headline text-[clamp(2.6rem,8vw,7rem)] leading-[0.95]" aria-label={w.title}>
          <Letters text={w.title} />
        </h2>
        <p className="vd-line mt-6 text-[clamp(1.1rem,2.4vw,1.8rem)]">{w.line}</p>
      </div>
      <button type="button" onClick={close} className="sr-only">
        {closeLabel}
      </button>
    </div>
  );
}
