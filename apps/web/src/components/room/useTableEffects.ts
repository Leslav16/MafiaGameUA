"use client";

import { useEffect, useRef } from "react";
import { playChip, playShot } from "./sounds";

type Log = { day: number; kind: string; seat?: number }[];

/**
 * Plays a quiet shot when the mafia fires (or, for players who don't see the
 * night log, when a kill is announced). Only new log entries count, so
 * joining mid-game is silent.
 */
export function useShotSound(log: Log | undefined) {
  const seen = useRef<number | null>(null);
  useEffect(() => {
    if (!log) return;
    if (seen.current === null) {
      seen.current = log.length;
      return;
    }
    const fresh = log.slice(seen.current);
    seen.current = log.length;
    const shots = fresh.filter(
      (e) =>
        e.kind === "shot" ||
        e.kind === "missed" ||
        (e.kind === "killed" &&
          !log.some(
            (x) =>
              x.day === e.day && (x.kind === "shot" || x.kind === "missed"),
          )),
    );
    if (shots.length) playShot();
  }, [log]);
}

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function centre(seat: number) {
  const el = document.querySelector<HTMLElement>(`[data-seat="${seat}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * Vote chips: each new vote flies as a red chip from the voter's tile to the
 * candidate's tile along a small arc, lands with a click, then fades.
 */
export function useVoteChips(votes: Record<number, number[]> | undefined) {
  const prev = useRef<Record<number, number[]>>({});
  useEffect(() => {
    const now = votes ?? {};
    const before = prev.current;
    prev.current = now;
    const flights: { from: number; to: number }[] = [];
    for (const [cand, voters] of Object.entries(now)) {
      const old = new Set(before[Number(cand)] ?? []);
      for (const v of voters)
        if (!old.has(v)) flights.push({ from: v, to: Number(cand) });
    }
    if (!flights.length) return;
    flights.forEach((f, i) => {
      const a = centre(f.from);
      const b = centre(f.to);
      if (!b) return;
      const start = a ?? { x: b.x, y: window.innerHeight + 40 };
      const chip = document.createElement("span");
      chip.className = "vote-chip";
      chip.textContent = String(f.from);
      document.body.appendChild(chip);
      const dx = b.x - start.x;
      const dy = b.y - start.y;
      const lift = -Math.min(160, 60 + Math.hypot(dx, dy) * 0.25);
      const jitter = {
        x: (Math.random() - 0.5) * 36,
        y: (Math.random() - 0.5) * 24,
      };
      const at = (p: number, h: number) =>
        `translate(${start.x + dx * p + jitter.x * p - 16}px, ${start.y + dy * p + jitter.y * p + h - 16}px)`;
      const anim = chip.animate(
        reduced()
          ? [
              { transform: at(1, 0), opacity: 0 },
              { transform: at(1, 0), opacity: 1 },
            ]
          : [
              { transform: `${at(0, 0)} scale(0.6)`, opacity: 0 },
              {
                transform: `${at(0.15, lift * 0.5)} scale(1.1)`,
                opacity: 1,
                offset: 0.15,
              },
              {
                transform: `${at(0.5, lift)} scale(1.15) rotate(180deg)`,
                offset: 0.5,
              },
              { transform: `${at(1, 0)} scale(1) rotate(360deg)`, offset: 0.9 },
              {
                transform: `${at(1, -6)} scale(1) rotate(360deg)`,
                offset: 0.95,
              },
              { transform: `${at(1, 0)} scale(1) rotate(360deg)`, opacity: 1 },
            ],
        {
          duration: reduced() ? 150 : 900,
          delay: i * 120,
          easing: "cubic-bezier(0.3, 0, 0.3, 1)",
          fill: "both",
        },
      );
      anim.onfinish = () => {
        playChip();
        chip.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 600,
          delay: 1600,
          fill: "forwards",
        }).onfinish = () => chip.remove();
      };
    });
  }, [votes]);
}
