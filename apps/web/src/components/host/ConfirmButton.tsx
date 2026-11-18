"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * A button that asks once before acting: the first press shows "Confirm" and
 * "Cancel" in its place. Used for kill, remove, re-deal and end game, where a
 * misclick in the middle of a game would hurt.
 */
export function ConfirmButton({
  children,
  question,
  confirmLabel,
  cancelLabel,
  onConfirm,
  className,
  disabled,
}: {
  children: ReactNode;
  question: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const [asking, setAsking] = useState(false);

  // Forget a forgotten question after a few seconds.
  useEffect(() => {
    if (!asking) return;
    const id = setTimeout(() => setAsking(false), 6000);
    return () => clearTimeout(id);
  }, [asking]);

  if (!asking) {
    return (
      <button type="button" className={className} disabled={disabled} onClick={() => setAsking(true)}>
        {children}
      </button>
    );
  }
  return (
    <span role="group" aria-label={question} className="inline-flex flex-wrap items-center gap-1">
      <span className="text-sm font-medium">{question}</span>
      <button
        type="button"
        autoFocus
        className="min-h-9 rounded bg-oxblood px-3 text-sm font-medium text-card"
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        className="min-h-9 rounded border border-[var(--line)] px-3 text-sm"
        onClick={() => setAsking(false)}
      >
        {cancelLabel}
      </button>
    </span>
  );
}
