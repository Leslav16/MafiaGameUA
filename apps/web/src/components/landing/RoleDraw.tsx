"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "../Modal";
import type { CardRole } from "../cards/RoleArt";
import { RoleFigure } from "../three";

type Card = { id: string; name: string; text: string };

const GLYPH: Record<string, string> = { don: "♠", mafia: "♣", sheriff: "★", doctor: "✚", civilian: "♥" };

/** The real deck for 11 players, so the odds are honest: 1 Don, 2 Mafia, Sheriff, Doctor, 6 civilians. */
const DECK = ["don", "mafia", "mafia", "sheriff", "doctor", "civilian", "civilian", "civilian", "civilian", "civilian", "civilian"];

function drawFromDeck(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return DECK[bytes[0] % DECK.length];
}

/**
 * "Draw your role": the same fanned deck as on the create screen, face down.
 * Clicking it pulls one card out of the middle and flips it to show a role,
 * drawn from the real 11-card deck with a cryptographic random number.
 */
export function RoleDraw({
  roles,
  label,
  title,
  hint,
  pick,
  again,
  closeLabel,
  className,
}: {
  roles: Card[];
  label: ReactNode;
  title: string;
  hint: string;
  pick: string;
  again: string;
  closeLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [drawn, setDrawn] = useState<string | null>(null);
  const [n, setN] = useState(0);
  const card = roles.find((r) => r.id === drawn);
  const draw = () => {
    setDrawn(drawFromDeck());
    setN((x) => x + 1);
  };

  return (
    <>
      <button type="button" className={className} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {label}
      </button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setDrawn(null);
        }}
        title={title}
        closeLabel={closeLabel}
      >
        <div className="flex flex-col items-center gap-5">
          <p className="text-center text-[var(--text-muted)]">{hint}</p>
          <div className="relative">
            <button
              type="button"
              onClick={draw}
              aria-label={drawn ? again : pick}
              className="draw-deck"
              data-drawn={drawn ? "" : undefined}
            >
              {[-2, -1, 1, 2].map((i) => (
                <span key={i} aria-hidden className="draw-back" style={{ "--i": i } as React.CSSProperties} />
              ))}
              <span key={n} aria-hidden className="draw-card" data-role={drawn ?? undefined}>
                <span className="draw-face draw-face-back" />
                <span className="draw-face draw-face-front role-deck-card" data-role={drawn ?? undefined}>
                  <span className="role-deck-corner">
                    {drawn ? GLYPH[drawn] : ""}
                    <small>{card?.name}</small>
                  </span>
                  <span className="role-deck-glyph">{drawn ? GLYPH[drawn] : ""}</span>
                  <span className="role-deck-name">{card?.name}</span>
                  <span className="role-deck-corner role-deck-corner-end">{drawn ? GLYPH[drawn] : ""}</span>
                </span>
              </span>
            </button>
            {/* After the flip, the role's 3D figure jumps out of the card (where WebGL runs). */}
            {drawn && <RoleFigure key={n} role={drawn as CardRole} delay={0.85} className="draw-figure" />}
          </div>
          <p aria-live="polite" className="min-h-14 max-w-sm text-center">
            {card ? (
              <>
                <strong className="font-display text-2xl tracking-wide">{card.name}</strong>
                <br />
                {card.text}
              </>
            ) : null}
          </p>
          <button
            type="button"
            onClick={draw}
            className="inline-flex min-h-12 items-center rounded-md bg-[var(--accent)] px-6 font-display text-lg tracking-wide text-[var(--accent-text)] active:scale-[0.98]"
          >
            {drawn ? again : pick}
          </button>
        </div>
      </Modal>
    </>
  );
}
