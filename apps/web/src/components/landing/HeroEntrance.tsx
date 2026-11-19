"use client";

import { useRef, type ReactNode } from "react";
import { MOTION, gsap, useGSAP } from "@/lib/motion";

/**
 * The landing hero enters once on load: the copy rises in line by line
 * (children marked data-enter-item), then the lamp stage settles into place.
 * Server HTML starts hidden by `.enter-pending`; a CSS fallback reveals it if
 * scripts never run. Under reduced motion everything simply shows.
 */
export function HeroEntrance({ className, children }: { className?: string; children: ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const items = gsap.utils.toArray<HTMLElement>("[data-enter-item]");
      const stage = el.querySelector<HTMLElement>("[data-enter-stage]");
      const mm = gsap.matchMedia();

      mm.add(MOTION.ok, () => {
        gsap.set([...items, stage], { autoAlpha: 0 });
        // Phase colours fade with CSS transitions; keep those off opacity while GSAP drives it.
        el.classList.replace("enter-pending", "entering");
        const tl = gsap.timeline({
          defaults: { duration: 1.1, ease: "power3.out" },
          onComplete: () => el.classList.remove("entering"),
        });
        // A slow, cinematic entrance: the lines rise one by one while the lamp scene fades up out of the dark.
        tl.fromTo(items, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, stagger: 0.15, clearProps: "transform" }, 0.1);
        if (stage) {
          tl.fromTo(
            stage,
            { autoAlpha: 0, y: 22, scale: 0.97 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 1.8, ease: "power2.out", clearProps: "transform" },
            0.25,
          );
        }
      });
      mm.add(MOTION.reduce, () => {
        el.classList.remove("enter-pending");
      });
      return () => {
        mm.revert();
        el.classList.remove("entering");
      };
    },
    { scope: root },
  );

  return (
    <main ref={root} className={`enter-pending ${className ?? ""}`}>
      {children}
    </main>
  );
}
