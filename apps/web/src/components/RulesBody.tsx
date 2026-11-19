import type { Dictionary } from "@/app/[lang]/dictionaries";

const MOB = new Set(["don", "mafia"]);

export type RulesText = Dictionary["rules"] & { game: Dictionary["game"]; host: Dictionary["host"] };

/** The rules popup: the five roles, the game in five steps, and what the host does (folded away). */
export function RulesBody({ rules }: { rules: RulesText }) {
  return (
    <div className="grid gap-6">
      <section aria-labelledby="rules-roles">
        <h3 id="rules-roles" className="font-display text-xl tracking-wide">{rules.rolesTitle}</h3>
        {/* The five roles by name, in the stamp face; no card pictures, so it stays short. */}
        <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-5">
          {rules.roles.map((r) => (
            <div key={r.id} className="grid grid-cols-[6rem_1fr] items-baseline gap-x-3 sm:grid-cols-1 sm:gap-y-1">
              <dt className={`headline text-2xl leading-none ${MOB.has(r.id) ? "text-[var(--color-oxblood)]" : ""}`}>{r.name}</dt>
              <dd className="text-[0.95rem] leading-snug text-[var(--text-muted)]">{r.text}</dd>
            </div>
          ))}
        </dl>
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
