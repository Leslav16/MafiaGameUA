import type { Dictionary } from "@/app/[lang]/dictionaries";
import { RoleCardFace } from "./cards/RoleCardFace";
import type { CardRole } from "./cards/RoleArt";

export type RulesText = Dictionary["rules"] & { game: Dictionary["game"]; host: Dictionary["host"] };

/** The rules popup: the five role cards, the game in five steps, and what the host does (folded away). */
export function RulesBody({ rules }: { rules: RulesText }) {
  return (
    <div className="grid gap-8">
      <section aria-labelledby="rules-roles">
        <h3 id="rules-roles" className="font-display text-xl tracking-wide">{rules.rolesTitle}</h3>
        <ul className="mt-3 grid grid-cols-1 gap-x-3 gap-y-3 min-[480px]:grid-cols-3 min-[480px]:gap-y-4 sm:grid-cols-5">
          {rules.roles.map((r) => (
            <li key={r.id} className="flex items-center gap-3 min-[480px]:flex-col min-[480px]:items-stretch min-[480px]:gap-2">
              <span className="relative block aspect-[5/7] w-[4.5rem] shrink-0 drop-shadow-[0_8px_10px_rgb(0_0_0/0.3)] min-[480px]:w-full">
                <RoleCardFace role={r.id as CardRole} name={r.name} />
              </span>
              <span className="text-sm leading-snug text-[var(--text-muted)]">{r.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="rules-game">
        <h3 id="rules-game" className="font-display text-xl tracking-wide">{rules.game.title}</h3>
        <p className="mt-1 text-[0.95rem] text-[var(--text-muted)]">{rules.game.lede}</p>
        <ol className="rules-steps mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {rules.game.steps.map((step, i) => (
            <li key={step.name} className="grid grid-cols-[1.75rem_1fr] gap-x-2">
              <span aria-hidden className="grid size-7 place-items-center rounded-full bg-[var(--color-oxblood)] font-display text-sm text-[var(--color-card)] tabular-nums">
                {i + 1}
              </span>
              <div>
                <h4 className="font-display text-lg leading-7 tracking-wide">{step.name}</h4>
                <p className="text-[0.95rem] leading-snug text-[var(--text-muted)]">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <details className="rules-host group rounded-xl border border-[var(--line)] px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-display text-lg tracking-wide">
          {rules.host.title}
          <span aria-hidden className="text-[var(--accent-strong)] transition-transform duration-200 group-open:rotate-45">+</span>
        </summary>
        <p className="mt-2 text-[0.95rem] text-[var(--text-muted)]">{rules.host.lede}</p>
        <dl className="mt-2 divide-y divide-[var(--line)]">
          {rules.host.items.map((item) => (
            <div key={item.name} className="grid gap-0.5 py-2.5 sm:grid-cols-[10rem_1fr] sm:gap-5">
              <dt className="font-display tracking-wide">{item.name}</dt>
              <dd className="text-[0.95rem] text-[var(--text-muted)]">{item.text}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
