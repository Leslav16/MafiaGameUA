import { RoleCardFace } from "./RoleCardFace";
import type { CardRole } from "./RoleArt";

/** A few role cards fanned out under a pool of lamplight (decorative). */
export function CardFan({ roles, names, className = "" }: { roles: CardRole[]; names: Record<CardRole, string>; className?: string }) {
  const mid = (roles.length - 1) / 2;
  return (
    <div aria-hidden className={`card-fan relative ${className}`}>
      <div className="card-fan-pool" />
      <ul className="card-fan-hand">
        {roles.map((r, i) => (
          <li key={r} className="card-fan-slot" style={{ "--i": i - mid, "--d": `${i * 0.4}s`, zIndex: 10 - Math.abs(i - mid) * 2 } as React.CSSProperties}>
            <RoleCardFace role={r} name={names[r]} />
          </li>
        ))}
      </ul>
    </div>
  );
}
