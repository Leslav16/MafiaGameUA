"use client";

import { useState } from "react";
import type { HostAction, RoomView } from "@/lib/room/types";
import { ConfirmButton } from "./ConfirmButton";
import { btn, danger, plain, type HostDict } from "./ui";

/**
 * The room itself: listed on the home page or not, a password to come in,
 * and closing the room for good (everyone goes back to the home page).
 */
export function RoomSettings({ view, act, t }: { view: RoomView; act: (a: HostAction) => void; t: HostDict }) {
  const [draft, setDraft] = useState("");

  return (
    <div className="flex flex-col gap-4 text-sm">
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={view.isPublic}
          onChange={(e) => act({ type: "setPublic", on: e.target.checked })}
          className="mt-0.5 size-4 shrink-0 accent-[var(--color-lamp)]"
        />
        <span>
          {t.publicTable}
          <span className="block text-xs text-[var(--text-muted)]">{t.publicTableHint}</span>
        </span>
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="font-medium">{view.locked ? `🔒 ${t.roomLocked}` : t.roomOpen}</span>
        {view.locked ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-[var(--surface-raised)] px-2 py-1 text-base tracking-wide">{view.roomPassword}</code>
            <button type="button" className={`${btn} ${plain} text-sm`} onClick={() => act({ type: "setRoomPassword", password: null })}>
              {t.roomUnlock}
            </button>
          </div>
        ) : (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              act({ type: "setRoomPassword", password: draft });
              setDraft("");
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={32}
              placeholder={t.roomPasswordPlaceholder}
              aria-label={t.roomPasswordPlaceholder}
              className="min-h-10 min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 focus:border-[var(--color-lamp)] focus:outline-none"
            />
            <button type="submit" disabled={!draft.trim()} className={`${btn} ${plain} text-sm disabled:opacity-50`}>
              {t.roomLock}
            </button>
          </form>
        )}
        <span className="text-xs text-[var(--text-muted)]">{t.roomPasswordHint}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <ConfirmButton
          question={t.closeRoomQuestion}
          confirmLabel={t.closeRoom}
          cancelLabel={t.cancel}
          className={`${btn} ${danger} text-sm`}
          onConfirm={() => act({ type: "closeRoom" })}
        >
          {t.closeRoom}
        </ConfirmButton>
        <span className="text-xs text-[var(--text-muted)]">{t.closeRoomHint}</span>
      </div>
    </div>
  );
}
