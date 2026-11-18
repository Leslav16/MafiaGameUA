"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/** Shared feel for every GSAP animation on the site: quick out-eases, short durations. */
gsap.defaults({ ease: "power3.out", duration: 0.5 });

/** gsap.matchMedia() conditions: animate only when the person allows motion. */
export const MOTION = {
  ok: "(prefers-reduced-motion: no-preference)",
  reduce: "(prefers-reduced-motion: reduce)",
};

export { gsap, useGSAP };
