"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type Phase = "day" | "night";

const PhaseContext = createContext<{
  phase: Phase;
  toggle: () => void;
} | null>(null);

export function usePhase() {
  const ctx = useContext(PhaseContext);
  if (!ctx) throw new Error("usePhase must be used inside <PhaseShell>");
  return ctx;
}

/** Holds the day/night state and paints the whole page with it. */
export function PhaseShell({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("day");
  const toggle = () => setPhase((p) => (p === "day" ? "night" : "day"));

  return (
    <PhaseContext.Provider value={{ phase, toggle }}>
      <div data-phase={phase} className="phase-surface flex min-h-dvh flex-col">
        {children}
      </div>
    </PhaseContext.Provider>
  );
}

export function PhaseToggle({
  toNight,
  toDay,
  dayLabel,
  nightLabel,
}: {
  toNight: string;
  toDay: string;
  dayLabel: string;
  nightLabel: string;
}) {
  const { phase, toggle } = usePhase();
  const isNight = phase === "night";

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={isNight}
        className="phase-transition inline-flex min-h-11 items-center gap-3 rounded-full border border-[var(--line)] px-5 font-display text-lg tracking-wide hover:border-[var(--accent)] active:scale-[0.98]"
      >
        <span
          aria-hidden
          className="phase-transition block size-3 rounded-full"
          style={{ backgroundColor: isNight ? "var(--color-smoke)" : "var(--color-lamp)" }}
        />
        {isNight ? toDay : toNight}
      </button>
      <p aria-live="polite" className="sr-only">
        {isNight ? nightLabel : dayLabel}
      </p>
    </div>
  );
}
