import Link from "next/link";
import { notFound } from "next/navigation";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { PhaseShell, PhaseToggle } from "@/components/Phase";
import { TableScene } from "@/components/TableScene";
import { getDictionary, hasLocale } from "./dictionaries";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const other = lang === "uk" ? "en" : "uk";

  return (
    <PhaseShell>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
        <Link
          href={`/${lang}`}
          className="font-display text-xl font-semibold tracking-wide"
        >
          {dict.nav.home}
        </Link>
        <LanguageSwitch
          href={`/${other}`}
          locale={other}
          label={dict.nav.switchTo}
          ariaLabel={dict.nav.switchToLabel}
        />
      </header>

      <main className="flex-1">
        {/* Hero: the table under the lamp */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-6 pb-16 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:pt-12 lg:pb-24">
          <div className="max-w-xl">
            <h1 className="font-display text-[clamp(3.25rem,9vw,6.5rem)] leading-[0.95] font-medium tracking-tight text-balance">
              {dict.hero.title}
            </h1>
            <p className="mt-6 max-w-[34ch] text-xl leading-relaxed text-pretty text-[var(--text-muted)] phase-transition">
              {dict.hero.lede}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href={`/${lang}/room`}
                className="inline-flex min-h-12 items-center rounded-md bg-[var(--accent)] px-6 font-display text-lg font-medium tracking-wide text-[var(--accent-text)] transition-transform duration-150 hover:brightness-105 active:scale-[0.98]"
              >
                {dict.hero.create}
              </Link>
              <a
                href="#game"
                className="inline-flex min-h-12 items-center underline decoration-[var(--line)] underline-offset-4 hover:decoration-[var(--accent)]"
              >
                {dict.hero.how}
              </a>
            </div>
          </div>

          <div className="flex flex-col items-center gap-5">
            <TableScene
              hostLabel={dict.hero.host}
              seatLabel={dict.hero.seatLabel}
              tableLabel={dict.hero.tableLabel}
            />
            <PhaseToggle
              toNight={dict.hero.toNight}
              toDay={dict.hero.toDay}
              dayLabel={dict.hero.phaseDay}
              nightLabel={dict.hero.phaseNight}
            />
            <p className="max-w-[36ch] text-center text-base text-[var(--text-muted)] phase-transition">
              {dict.hero.lineup}
            </p>
          </div>
        </section>

        {/* How a game goes: a real sequence, so it is numbered */}
        <section
          id="game"
          aria-labelledby="game-title"
          className="phase-transition scroll-mt-8 border-t border-[var(--line)]"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 lg:py-24">
            <h2
              id="game-title"
              className="font-display text-4xl font-medium tracking-tight sm:text-5xl"
            >
              {dict.game.title}
            </h2>
            <p className="mt-4 max-w-[60ch] text-[var(--text-muted)] phase-transition">
              {dict.game.lede}
            </p>
            <ol className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {dict.game.steps.map((step, i) => (
                <li key={step.name} className="grid grid-cols-[3.5rem_1fr] gap-x-3">
                  <span
                    aria-hidden
                    className="font-display text-5xl leading-none font-medium text-[var(--accent-strong)] tabular-nums phase-transition"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-2xl tracking-wide">{step.name}</h3>
                    <p className="mt-2 max-w-[40ch] text-base text-[var(--text-muted)] phase-transition">
                      {step.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* The host's controls */}
        <section
          aria-labelledby="host-title"
          className="phase-transition border-t border-[var(--line)] bg-[var(--surface-raised)]"
        >
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:py-24">
            <div>
              <h2
                id="host-title"
                className="font-display text-4xl font-medium tracking-tight sm:text-5xl"
              >
                {dict.host.title}
              </h2>
              <p className="mt-4 max-w-[44ch] text-[var(--text-muted)] phase-transition">
                {dict.host.lede}
              </p>
            </div>
            <dl className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {dict.host.items.map((item) => (
                <div
                  key={item.name}
                  className="grid gap-1 py-5 sm:grid-cols-[12rem_1fr] sm:gap-6"
                >
                  <dt className="font-display text-xl tracking-wide">{item.name}</dt>
                  <dd className="text-base text-[var(--text-muted)] phase-transition">
                    {item.text}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <footer className="phase-transition border-t border-[var(--line)]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-base text-[var(--text-muted)] sm:px-8">
          <span className="font-display text-lg tracking-wide text-[var(--text)]">
            {dict.nav.home}
          </span>
          <span>{dict.footer.note}</span>
        </div>
      </footer>
    </PhaseShell>
  );
}
