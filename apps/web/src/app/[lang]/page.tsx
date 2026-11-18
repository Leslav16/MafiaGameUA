import Link from "next/link";
import { notFound } from "next/navigation";
import type { FigureRole } from "@/components/figures/Figure";
import { RulesBody } from "@/components/RulesBody";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { ModalButton } from "@/components/Modal";
import { PhaseShell, PhaseToggle } from "@/components/Phase";
import { Stage } from "@/components/Stage";
import { getDictionary, hasLocale } from "./dictionaries";

const link =
  "inline-flex min-h-11 items-center underline decoration-[var(--line)] underline-offset-4 hover:decoration-[var(--accent)]";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const other = lang === "uk" ? "en" : "uk";
  const roleNames = Object.fromEntries(dict.rules.roles.map((r) => [r.id, r.name])) as Record<FigureRole, string>;

  const rules = <RulesBody rules={{ ...dict.rules, game: dict.game, host: dict.host }} />;

  return (
    <PhaseShell fit>
      <header className="mx-auto flex w-full max-w-7xl shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Link href={`/${lang}`} className="font-display text-xl font-semibold tracking-wide">
          {dict.nav.home}
        </Link>
        <nav className="flex items-center gap-2 sm:gap-5">
          <ModalButton label={dict.rules.open} title={dict.rules.open} closeLabel={dict.rules.close} className={link} wide>
            {rules}
          </ModalButton>
          <LanguageSwitch href={`/${other}`} locale={other} label={dict.nav.switchTo} ariaLabel={dict.nav.switchToLabel} />
        </nav>
      </header>

      <main className="hero mx-auto grid min-h-0 w-full max-w-7xl flex-1 items-center gap-4 px-4 pb-4 sm:px-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] lg:gap-10">
        <div className="max-w-xl">
          <h1 className="hero-title font-display leading-[0.95] font-medium tracking-tight text-balance">
            {dict.hero.title}
          </h1>
          <p className="hero-lede mt-4 max-w-[36ch] leading-relaxed text-pretty text-[var(--text-muted)] phase-transition">
            {dict.hero.lede}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link
              href={`/${lang}/room`}
              className="inline-flex min-h-12 items-center rounded-md bg-[var(--accent)] px-6 font-display text-lg font-medium tracking-wide text-[var(--accent-text)] shadow-[0_8px_20px_-10px_rgba(0,0,0,0.7)] transition-transform duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98] phase-transition"
            >
              {dict.hero.create}
            </Link>
            <Link href={`/${lang}/preview`} className={link}>
              {dict.hero.preview}
            </Link>
          </div>
          <p className="hero-lineup mt-6 max-w-[44ch] text-base text-[var(--text-muted)] phase-transition">
            {dict.hero.lineup}
          </p>
        </div>

        <div className="hero-stage flex min-h-0 flex-col items-center gap-2">
          <div className="hero-stage-box w-full">
            <Stage label={dict.hero.tableLabel} roleNames={roleNames} />
          </div>
          <PhaseToggle
            toNight={dict.hero.toNight}
            toDay={dict.hero.toDay}
            dayLabel={dict.hero.phaseDay}
            nightLabel={dict.hero.phaseNight}
          />
        </div>
      </main>
    </PhaseShell>
  );
}
