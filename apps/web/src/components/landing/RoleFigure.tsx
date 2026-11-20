"use client";

import { useRef } from "react";
import { MOTION, gsap, useGSAP } from "@/lib/motion";
import type { CardRole } from "../cards/RoleArt";

/** The owner's own vinyl figures, cut out of their photos (public/figures). */
export const FIGURE_SRC: Record<CardRole, string> = {
  civilian: "/figures/civilian.webp",
  sheriff: "/figures/sheriff.webp",
  don: "/figures/don.webp",
  mafia: "/figures/mafia.webp",
  doctor: "/figures/doctor.webp",
};
const SIZE: Record<CardRole, [number, number]> = {
  civilian: [542, 960],
  sheriff: [641, 960],
  don: [622, 960],
  mafia: [592, 960],
  doctor: [483, 960],
};

/** Warm the browser cache so the first click shows the figure at once. */
export function preloadFigures() {
  for (const src of Object.values(FIGURE_SRC)) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}

/**
 * A role's figure standing on the desk. Who animates what (one library per
 * property, per element):
 *   .figure-fade (wrapper)  CSS: entrance and exit (opacity, filter, translate)
 *   .rf-tilt                GSAP: turns towards the mouse, like a toy in the hand
 *   .rf-body                GSAP: slow breathing, a slight sway from the feet
 *   .rf-sheen               GSAP: lamp glint that slides as the figure turns
 * Every tween lives in a gsap.matchMedia() context, so it stops with reduced
 * motion and is reverted when the figure leaves.
 */
export function RoleFigure({
  role,
  className,
  leaving = false,
  onLeft,
}: {
  role: CardRole;
  className?: string;
  leaving?: boolean;
  onLeft?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const src = FIGURE_SRC[role];
  const [w, h] = SIZE[role];

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const body = el.querySelector<HTMLElement>(".rf-body");
      const tilt = el.querySelector<HTMLElement>(".rf-tilt");
      const sheen = el.querySelector<HTMLElement>(".rf-sheen");
      if (!body || !tilt || !sheen) return;
      const mm = gsap.matchMedia();

      mm.add(MOTION.ok, () => {
        // Breathing: a long, barely-there rise and sway. Big moments slow.
        const breathe = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: "sine.inOut" } });
        breathe.to(body, { scaleY: 1.014, scaleX: 0.996, duration: 2.6 }, 0);
        const sway = gsap.fromTo(
          body,
          { rotation: -0.7 },
          { rotation: 0.7, duration: 4.2, ease: "sine.inOut", repeat: -1, yoyo: true },
        );
        return () => {
          breathe.kill();
          sway.kill();
        };
      });

      mm.add(MOTION.pointer, () => {
        const ry = gsap.quickTo(tilt, "rotationY", { duration: 0.9, ease: "power3.out" });
        const rx = gsap.quickTo(tilt, "rotationX", { duration: 0.9, ease: "power3.out" });
        const sx = gsap.quickTo(sheen, "xPercent", { duration: 0.9, ease: "power3.out" });
        const move = (e: PointerEvent) => {
          const b = el.getBoundingClientRect();
          const x = Math.max(-1, Math.min(1, (e.clientX - (b.left + b.width / 2)) / (window.innerWidth / 2)));
          const y = Math.max(-1, Math.min(1, (e.clientY - (b.top + b.height / 2)) / (window.innerHeight / 2)));
          ry(x * 14);
          rx(-y * 6);
          sx(-x * 30);
        };
        window.addEventListener("pointermove", move);
        return () => window.removeEventListener("pointermove", move);
      });

      return () => mm.revert();
    },
    { scope: root, dependencies: [role] },
  );

  return (
    <div
      ref={root}
      className={`figure-fade role-figure ${className ?? ""}`}
      data-role={role}
      data-leaving={leaving ? "" : undefined}
      aria-hidden
      onAnimationEnd={(e) => {
        if (leaving && e.target === e.currentTarget) onLeft?.();
      }}
    >
      <div className="rf-shadow" />
      <div className="rf-tilt">
        <div className="rf-body" style={{ aspectRatio: `${w} / ${h}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a fixed, pre-optimised cut-out */}
          <img src={src} alt="" width={w} height={h} decoding="async" draggable={false} className="rf-img" />
          <div className="rf-sheen-mask" style={{ maskImage: `url(${src})`, WebkitMaskImage: `url(${src})` }}>
            <div className="rf-sheen" />
          </div>
        </div>
      </div>
    </div>
  );
}
