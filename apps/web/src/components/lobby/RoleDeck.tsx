type Card = { id: string; name: string };

const GLYPH: Record<string, string> = {
  don: "♠",
  mafia: "♣",
  sheriff: "★",
  doctor: "✚",
  civilian: "♥",
};

/**
 * The host's deck: the five role cards fanned out under the lamp. They float
 * gently and spread wider on hover. Pure CSS, no game logic.
 */
export function RoleDeck({ roles, label }: { roles: Card[]; label: string }) {
  // Don ends on top of the fan.
  const cards = [...roles].reverse();
  const n = cards.length;
  return (
    <figure className="role-deck" aria-label={label}>
      <div className="role-deck-glow" aria-hidden />
      <ul className="role-deck-fan" aria-hidden>
        {cards.map((r, i) => (
          <li
            key={r.id}
            className="role-deck-card"
            data-role={r.id}
            style={{ "--i": i - (n - 1) / 2, "--d": `${i * 0.35}s` } as React.CSSProperties}
          >
            <span className="role-deck-corner">
              {GLYPH[r.id] ?? "♦"}
              <small>{r.name}</small>
            </span>
            <span className="role-deck-glyph">{GLYPH[r.id] ?? "♦"}</span>
            <span className="role-deck-name">{r.name}</span>
            <span className="role-deck-corner role-deck-corner-end">{GLYPH[r.id] ?? "♦"}</span>
          </li>
        ))}
      </ul>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}
