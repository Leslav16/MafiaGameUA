"use client";

import type { ReactNode } from "react";
import { BACKGROUNDS, setPrefs, usePrefs, type CamEffect } from "../prefs";
import type { RoomLabels } from "./types";
import { playShot } from "./sounds";
import { narrate } from "./narrator";

/** One soft card in the Settings popup. */
export function SetCard({ title, icon, children, className = "" }: { title: string; icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`set-card rounded-2xl p-4 sm:p-5 ${className}`}>
      <h3 className="mb-3.5 flex items-center gap-2 font-display text-sm tracking-[0.16em] text-[var(--accent-strong)] uppercase">
        <span aria-hidden className="grid size-7 place-items-center rounded-full bg-[var(--color-lamp)]/15 text-base">
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

/** A brass switch. */
function Toggle({ label, hint, on, onChange, action }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void; action?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg leading-tight tracking-wide">{label}</p>
        <p className="text-sm text-[var(--text-muted)]">{hint}</p>
      </div>
      {action}
      <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="switch shrink-0">
        <span className="switch-knob" />
      </button>
    </div>
  );
}

export function GamePrefs({ labels }: { labels: RoomLabels }) {
  const p = usePrefs();
  const t = labels.prefs;
  return (
    <div className="divide-y divide-[var(--line)]/60">
      <Toggle
        label={t.sfx}
        hint={t.sfxHint}
        on={p.sfx}
        onChange={(sfx) => setPrefs({ sfx })}
        action={
          p.sfx ? (
            <button type="button" onClick={() => playShot()} className="mt-0.5 rounded-full border border-[var(--line)] px-3 py-1 text-sm hover:border-[var(--color-lamp)]">
              ▶ {t.test}
            </button>
          ) : null
        }
      />
      <Toggle
        label={t.voice}
        hint={t.voiceHint}
        on={p.voice}
        onChange={(voice) => setPrefs({ voice })}
        action={
          p.voice ? (
            <button
              type="button"
              onClick={() => narrate("night", document.documentElement.lang || "uk", true)}
              className="mt-0.5 rounded-full border border-[var(--line)] px-3 py-1 text-sm hover:border-[var(--color-lamp)]"
            >
              ▶ {t.test}
            </button>
          ) : null
        }
      />
      <Toggle label={t.calm} hint={t.calmHint} on={p.calm} onChange={(calm) => setPrefs({ calm })} />
      <Toggle label={t.mirror} hint={t.mirrorHint} on={p.mirror} onChange={(mirror) => setPrefs({ mirror })} />
    </div>
  );
}

const EFFECTS: CamEffect[] = ["none", "blur", "study", "bar", "wallpaper"];

export function EffectPicker({ labels, supported }: { labels: RoomLabels; supported: boolean | null }) {
  const p = usePrefs();
  const t = labels.prefs;
  return (
    <fieldset disabled={supported === false}>
      <legend className="font-display text-lg tracking-wide">{t.effects}</legend>
      <p className="text-sm text-[var(--text-muted)]">{supported === false ? t.effectsNo : t.effectsHint}</p>
      <div className="mt-2.5 grid grid-cols-5 gap-2">
        {EFFECTS.map((e) => {
          const img = e in BACKGROUNDS ? BACKGROUNDS[e as keyof typeof BACKGROUNDS] : null;
          return (
            <button
              key={e}
              type="button"
              aria-pressed={p.effect === e}
              onClick={() => setPrefs({ effect: e })}
              className="effect-tile group flex flex-col items-center gap-1 disabled:opacity-40"
            >
              <span
                className="effect-thumb relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-lg"
                style={img ? { backgroundImage: `url(${img})` } : undefined}
                data-kind={e}
              >
                {e === "none" && <span aria-hidden className="text-xl">⊘</span>}
                {e === "blur" && <span aria-hidden className="effect-blur-figure" />}
              </span>
              <span className="text-xs leading-tight">{t[e]}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
