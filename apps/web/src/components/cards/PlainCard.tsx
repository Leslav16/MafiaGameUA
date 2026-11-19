import type { CardRole } from "./RoleArt";
import { SUIT } from "./RoleCardFace";

/**
 * The plain playing-card face from the create screen: cream stock, the suit in
 * the corners with the role's name, a big suit in the middle and the name
 * below. Sizes follow the card (container units), so it works at any size.
 */
export function PlainCard({ role, name }: { role: CardRole; name: string }) {
  const mob = role === "don" || role === "mafia";
  return (
    <span className="plain-card" data-mob={mob ? "" : undefined}>
      <span className="plain-corner" aria-hidden>
        {SUIT[role]}
        <small>{name}</small>
      </span>
      <span className="plain-glyph" aria-hidden>
        {SUIT[role]}
      </span>
      <span className="plain-name">{name}</span>
      <span className="plain-corner plain-corner-end" aria-hidden>
        {SUIT[role]}
      </span>
    </span>
  );
}
