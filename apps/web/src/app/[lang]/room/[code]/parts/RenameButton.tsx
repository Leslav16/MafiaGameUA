"use client";

import { useState } from "react";
import type { Dictionary } from "../../../dictionaries";
import type { RoomApi } from "@/lib/room/useRoom";

/** Lets anyone at the table change their own name. Plain; the design work may move it into the settings popup. */
export function RenameButton({ room, current, t }: { room: RoomApi; current: string; t: Dictionary["roomUi"] }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(current);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--line)] px-3"
        onClick={() => {
          setName(current);
          setError(null);
          setEditing(true);
        }}
      >
        ✎ {t.rename}
      </button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const err = await room.rename(name);
        if (err) setError((t.errors as Record<string, string>)[err] ?? t.errors.server_error);
        else setEditing(false);
      }}
    >
      <label className="sr-only" htmlFor="rename-input">
        {t.nickname}
      </label>
      <input
        id="rename-input"
        autoFocus
        maxLength={24}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="min-h-11 w-44 rounded-md border border-[var(--line)] bg-[var(--surface-raised)] px-3"
      />
      <button type="submit" className="min-h-11 rounded-md bg-lamp px-3 font-medium text-ink">
        {t.renameSave}
      </button>
      <button type="button" className="min-h-11 rounded-md px-2 underline" onClick={() => setEditing(false)}>
        {t.renameCancel}
      </button>
      {error && (
        <span role="alert" className="text-sm text-[#e05a6a]">
          {error}
        </span>
      )}
    </form>
  );
}
