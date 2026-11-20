"use client";

import { useSyncExternalStore } from "react";

/**
 * This browser's own preferences (not shared with anyone): sound effects, the night music volume,
 * calmer motion, a mirrored self-view, the camera background effect and the last nickname.
 * Kept in localStorage; every read and write is guarded because storage can
 * be blocked.
 */
export type CamEffect = "none" | "blur" | "study" | "bar" | "wallpaper";
export type Prefs = {
  sfx: boolean;
  /** This browser's own volume for the host's night music, 0..1 (multiplied by the table volume the host sets). */
  music: number;
  calm: boolean;
  mirror: boolean;
  effect: CamEffect;
  cameraId?: string;
  /** The last name this browser used at a table, offered again in the join and create forms. */
  nickname?: string;
  micId?: string;
};

const KEY = "mafia.prefs";
const DEFAULTS: Prefs = { sfx: true, music: 1, calm: false, mirror: true, effect: "none" };
let current: Prefs = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) current = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {}
  apply();
}

function apply() {
  if (typeof document !== "undefined") document.documentElement.dataset.motion = current.calm ? "calm" : "full";
}

export function getPrefs(): Prefs {
  load();
  return current;
}

export function setPrefs(patch: Partial<Prefs>) {
  load();
  current = { ...current, ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {}
  apply();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, getPrefs, () => DEFAULTS);
}

export const BACKGROUNDS: Record<Exclude<CamEffect, "none" | "blur">, string> = {
  study: "/backgrounds/study.jpg",
  bar: "/backgrounds/bar.jpg",
  wallpaper: "/backgrounds/wallpaper.jpg",
};

/** Remembers the name for next time (trimmed; empty names are not saved). */
export function rememberNickname(name: string) {
  const clean = name.trim();
  if (clean && clean !== getPrefs().nickname) setPrefs({ nickname: clean });
}
