"use client";

import { useState } from "react";
import type { HostAction } from "@/lib/room/types";
import { findLocation, randomLocation, type Location } from "../locations";
import { btn, plain, type HostDict } from "./ui";

/**
 * Before the game: where the introduction round is set. A random place, one
 * from the list, or the host's own words. Everyone sees it above the table.
 */
export function LocationPicker({
  value,
  locations,
  act,
  t,
}: {
  value: string | null;
  locations: Location[];
  act: (a: HostAction) => void;
  t: HostDict;
}) {
  const ready = findLocation(value, locations);
  const custom = value && !ready ? value : "";
  const [own, setOwn] = useState(custom);
  const set = (location: string | null) => act({ type: "setLocation", location });

  return (
    <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-2">
      <p className="font-display text-sm tracking-[0.12em] text-[var(--text-muted)] uppercase">{t.location}</p>
      {value ? (
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface-raised)] p-2.5">
          <p className="font-display text-lg leading-tight">{ready?.name ?? value}</p>
          {ready && <p className="text-sm text-[var(--text-muted)]">{ready.text}</p>}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">{t.locationHint}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={`${btn} ${plain} text-sm`} onClick={() => set(randomLocation(locations, value))}>
          🎲 {t.locationRandom}
        </button>
        {value && (
          <button type="button" className={`${btn} ${plain} text-sm`} onClick={() => set(null)}>
            {t.locationNone}
          </button>
        )}
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="sr-only">{t.locationPick}</span>
        <select
          className="min-h-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 text-[var(--text)]"
          value={ready ? ready.id : ""}
          onChange={(e) => e.target.value && set(`loc:${e.target.value}`)}
        >
          <option value="">{t.locationPick}</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (own.trim()) set(own.trim());
        }}
      >
        <input
          className="min-h-10 min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 text-sm text-[var(--text)]"
          value={own}
          maxLength={80}
          placeholder={t.locationOwn}
          aria-label={t.locationOwn}
          onChange={(e) => setOwn(e.target.value)}
        />
        <button type="submit" disabled={!own.trim()} className={`${btn} ${plain} text-sm`}>
          ✓
        </button>
      </form>
    </div>
  );
}
