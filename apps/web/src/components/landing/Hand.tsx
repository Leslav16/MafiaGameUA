"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { MOTION, gsap, useGSAP } from "@/lib/motion";
import { CardBack } from "../cards/RoleCardFace";
import { PlainCard } from "../cards/PlainCard";
import type { CardRole } from "../cards/RoleArt";
import { usePhase } from "../Phase";
import { RoleFigure } from "../three";

const ORDER: CardRole[] = ["civilian", "sheriff", "don", "mafia", "doctor"];
const MOB = new Set<CardRole>(["don", "mafia"]);

/**
 * The landing scene: the lamp over a leather desk and a hand of the five role
 * cards. Point at a card to lift it; click it and it rises into the light while
 * the role's 3D figure fades in on the desk to the right of the fan (where
 * WebGL runs). The fan itself never moves, so it stays centred under the lamp.
 * Clicking the card again, outside, or Esc puts it back. At night the town's
 * cards turn face down; only the mafia's stay open.
 */
export function Hand({
  label,
  roles,
  cord,
}: {
  label: string;
  roles: { id: string; name: string; text: string }[];
  cord?: ReactNode;
}) {
  const { phase } = usePhase();
  const night = phase === "night";
  const [open, setOpen] = useState<CardRole | null>(null);
  const byId = Object.fromEntries(roles.map((r) => [r.id, r]));
  const scene = useRef<HTMLDivElement>(null);

  // The card being read, unless night has turned it face down.
  const active = open && !(night && !MOB.has(open)) ? open : null;

  // The figure on the desk. A new card first fades the old figure out.
  const [fig, setFig] = useState<Figure | null>(null);
  const [seen, setSeen] = useState<CardRole | null>(null);
  if (active !== seen) {
    setSeen(active);
    if (fig && !fig.leaving) setFig({ ...fig, leaving: true });
    else if (!fig && active) setFig(figureFor(active));
  }
  const seenRef = useRef(seen);
  const onLeft = useCallback(() => setFig(seenRef.current ? figureFor(seenRef.current) : null), []);
  useEffect(() => {
    seenRef.current = seen;
  }, [seen]);
  // If the 3D part never ran (no WebGL, failed to load) nothing reports back: don't wait forever.
  useEffect(() => {
    if (!fig?.leaving) return;
    const t = setTimeout(onLeft, 900);
    return () => clearTimeout(t);
  }, [fig, onLeft]);

  // Click outside the hand or Esc closes the card.
  useEffect(() => {
    if (!open) return;
    const el = scene.current;
    const down = (e: PointerEvent) => {
      if (el && !el.contains(e.target as Node)) setOpen(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  // The fan tilts in 3D towards the mouse, as if the hand were held up to the lamp.
  // GSAP owns only the transform of a wrapper (.hand-tilt); the fan's own `translate`
  // and the cards' lift and flip stay in CSS. GSAP folds
  // CSS `translate` into its transform, so the two must never share an element.
  // Only with a real mouse and motion allowed.
  useGSAP(
    () => {
      const el = scene.current;
      const fan = el?.querySelector<HTMLElement>(".hand-tilt");
      if (!el || !fan) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION.pointer, () => {
        const ry = gsap.quickTo(fan, "rotationY", { duration: 0.6, ease: "power3.out" });
        const rx = gsap.quickTo(fan, "rotationX", { duration: 0.6, ease: "power3.out" });
        const move = (e: PointerEvent) => {
          const b = el.getBoundingClientRect();
          const x = (e.clientX - b.left) / b.width - 0.5;
          const y = (e.clientY - b.top) / b.height - 0.5;
          ry(x * 18);
          rx(-y * 10);
        };
        const leave = () => {
          ry(0);
          rx(0);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        return () => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
          gsap.set(fan, { clearProps: "transform" });
        };
      });
      return () => mm.revert();
    },
    { scope: scene },
  );

  return (
    <div ref={scene} role="group" aria-label={label} className="stage hand-scene relative w-full select-none" data-night={night ? "" : undefined}>
      <div className="hand-pool" aria-hidden />

      {/* Lamp, as on the table: shade, bulb, cone, and the pull cord */}
      <div className="stage-lamp pointer-events-none absolute inset-x-0 top-0 z-20 h-full" aria-hidden>
        <div className="absolute top-0 left-1/2 h-[6%] w-[2px] -translate-x-1/2 bg-[var(--text)]/50" />
        <svg viewBox="0 0 100 40" className="absolute top-[5%] left-1/2 w-[17%] -translate-x-1/2 overflow-visible">
          <defs>
            <linearGradient id="hand-shade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1f2a1a" />
              <stop offset="45%" stopColor="#3e5235" />
              <stop offset="100%" stopColor="#141b11" />
            </linearGradient>
          </defs>
          <path d="M44 2 h12 v6 h-12 Z" fill="#6a4a22" />
          <path d="M22 30 Q26 8 50 7 Q74 8 78 30 Z" fill="url(#hand-shade)" />
          <path d="M33 17 Q40 10 50 9.5" stroke="#9cbf86" strokeOpacity="0.35" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <ellipse cx="50" cy="30" rx="28" ry="4" fill="#e9c27a" className="stage-bulb" />
        </svg>
        <div className="stage-cone absolute top-[11.5%] left-1/2 h-[80%] w-[78%] -translate-x-1/2" />
        {cord && <div className="pointer-events-auto absolute top-[10.6%] left-[54.2%] h-[15%] -translate-x-1/2">{cord}</div>}
      </div>

      {/* The hand */}
      <div className="hand-tilt">
      <ul className="hand">
        {ORDER.map((role, i) => {
          const r = byId[role];
          if (!r) return null;
          const down = night && !MOB.has(role);
          const reading = open === role && !down;
          return (
            <li key={role} className="hand-slot" data-center={i === 2 ? "" : undefined} style={{ "--i": i - 2, zIndex: 3 - Math.abs(i - 2) } as React.CSSProperties}>
              <button
                type="button"
                className="hand-card"
                data-down={down ? "" : undefined}
                data-open={reading ? "" : undefined}
                aria-pressed={reading}
                aria-label={down ? r.name : `${r.name}. ${r.text}`}
                onClick={() => setOpen(reading ? null : role)}
              >
                <span className="hand-card-inner">
                  <span className="hand-front">
                    <PlainCard role={role} name={r.name} />
                  </span>
                  <CardBack className="hand-back" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      </div>

      {fig && <RoleFigure key={fig.n} role={fig.role} leaving={fig.leaving} onLeft={onLeft} className="hand-figure" />}
    </div>
  );
}

type Figure = { role: CardRole; n: number; leaving: boolean };
let figures = 0;
function figureFor(role: CardRole): Figure {
  figures += 1;
  return { role, n: figures, leaving: false };
}
