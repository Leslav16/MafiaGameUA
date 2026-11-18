import { RoleArt, type CardRole } from "./RoleArt";

export const SUIT: Record<CardRole, string> = { don: "♠", mafia: "♣", sheriff: "★", doctor: "✚", civilian: "♥" };

/** The face of a role card: portrait, corner suits, and the role's name. */
export function RoleCardFace({ role, name, className = "" }: { role: CardRole; name: string; className?: string }) {
  const mob = role === "don" || role === "mafia";
  return (
    <span className={`card-face ${className}`} data-mob={mob ? "" : undefined}>
      <RoleArt role={role} className="card-art" />
      <span className="card-corner" aria-hidden>
        {SUIT[role]}
      </span>
      <span className="card-corner card-corner-end" aria-hidden>
        {SUIT[role]}
      </span>
      <span className="card-name">{name}</span>
    </span>
  );
}

/** The back of every card: oxblood with a gold lattice. */
export function CardBack({ className = "" }: { className?: string }) {
  return (
    <span className={`card-back ${className}`} aria-hidden>
      <span className="card-back-seal">♠</span>
    </span>
  );
}
