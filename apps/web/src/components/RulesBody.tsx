import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { FigureRole } from "./figures/Figure";
import { LineupFigures } from "./three";

export type RulesText = Dictionary["rules"] & { game: Dictionary["game"]; host: Dictionary["host"] };

/** The rules popup content: roles with their figures, how a game goes, and what the host does. */
export function RulesBody({ rules }: { rules: RulesText }) {
  return (
    <div className="grid gap-10">
      <section aria-labelledby="rules-roles">
        <h3 id="rules-roles" className="font-display text-2xl tracking-wide">{rules.rolesTitle}</h3>
        <div className="mt-2">
          <LineupFigures roles={rules.roles.map((r) => r.id as FigureRole)} />
        </div>
        <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-5">
          {rules.roles.map((r) => (
            <li key={r.id} className="flex flex-col items-center text-center">
              <span className="mt-1 font-display text-xl tracking-wide">{r.name}</span>
              <span className="mt-1 text-sm leading-snug text-[var(--text-muted)]">{r.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="rules-game">
        <h3 id="rules-game" className="font-display text-2xl tracking-wide">{rules.game.title}</h3>
        <p className="mt-2 text-base text-[var(--text-muted)]">{rules.game.lede}</p>
        <ol className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {rules.game.steps.map((step, i) => (
            <li key={step.name} className="grid grid-cols-[2.5rem_1fr] gap-x-2">
              <span aria-hidden className="font-display text-4xl leading-none font-medium text-[var(--accent-strong)] tabular-nums">
                {i + 1}
              </span>
              <div>
                <h4 className="font-display text-xl tracking-wide">{step.name}</h4>
                <p className="mt-1 text-base text-[var(--text-muted)]">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="rules-host">
        <h3 id="rules-host" className="font-display text-2xl tracking-wide">{rules.host.title}</h3>
        <p className="mt-2 text-base text-[var(--text-muted)]">{rules.host.lede}</p>
        <dl className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {rules.host.items.map((item) => (
            <div key={item.name} className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-6">
              <dt className="font-display text-lg tracking-wide">{item.name}</dt>
              <dd className="text-base text-[var(--text-muted)]">{item.text}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
    );
}
