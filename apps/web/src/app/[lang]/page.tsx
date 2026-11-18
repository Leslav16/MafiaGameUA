import Link from "next/link";
import { notFound } from "next/navigation";
import type { FigureRole } from "@/components/figures/Figure";
import { RulesBody } from "@/components/RulesBody";
import { JoinByCode } from "@/components/JoinByCode";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { ModalButton } from "@/components/Modal";
import { PhaseShell } from "@/components/Phase";
import { CameraCheck } from "@/components/landing/CameraCheck";
import { LampCord } from "@/components/landing/LampCord";
import { OpenTables } from "@/components/landing/OpenTables";
import { RoleDraw } from "@/components/landing/RoleDraw";
import { Stage } from "@/components/Stage";
import { getDictionary, hasLocale } from "./dictionaries";

const link =
  "inline-flex min-h-11 items-center underline decoration-[var(--line)] underline-offset-4 hover:decoration-[var(--accent)]";
const chip =
  "phase-transition inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] px-4 font-display text-base tracking-wide hover:border-[var(--accent)] active:scale-[0.98]";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const other = lang === "uk" ? "en" : "uk";
  const roleNames = Object.fromEntries(dict.rules.roles.map((r) => [r.id, r.name])) as Record<FigureRole, string>;

  const rules = <RulesBody rules={{ ...dict.rules, game: dict.game, host: dict.host }} />;

  return (
    <PhaseShell fit className="landing-bg">
      <header className="mx-auto flex w-full max-w-7xl shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Link href={`/${lang}`} className="hidden font-display text-xl font-semibold tracking-wide sm:inline">
          {dict.nav.home}
        </Link>
        <nav className="flex flex-1 items-center justify-between gap-3 whitespace-nowrap sm:flex-none sm:justify-end sm:gap-5">
          <ModalButton label={dict.hero.howTo} title={dict.hero.howTo} closeLabel={dict.rules.close} className={link}>
            <ol className="flex flex-col gap-4">
              {dict.hero.howToSteps.map((step, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <span className="font-display text-3xl leading-none text-[var(--accent-strong)] tabular-nums">{i + 1}</span>
                  <span className="text-lg">{step}</span>
                </li>
              ))}
            </ol>
          </ModalButton>
          <OpenTables lang={lang} t={{ ...dict.hero, close: dict.rules.close }} locations={dict.locations} className={link} />
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
          <p className="hero-tagline mt-3 font-display tracking-wide text-[var(--accent-strong)] phase-transition">
            {dict.hero.tagline}
          </p>
          <div className="mt-8 flex flex-col items-start gap-4">
            <Link
              href={`/${lang}/room`}
              className="inline-flex min-h-13 items-center rounded-md bg-[var(--accent)] px-7 font-display text-xl font-medium tracking-wide text-[var(--accent-text)] shadow-[0_10px_24px_-12px_rgba(0,0,0,0.8)] transition-transform duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98] phase-transition"
            >
              {dict.hero.create}
            </Link>
            <span className="text-sm tracking-[0.2em] text-[var(--text-muted)] uppercase phase-transition">{dict.hero.or}</span>
            <JoinByCode
              lang={lang}
              label={dict.hero.codeLabel}
              placeholder={dict.hero.codePlaceholder}
              submit={dict.hero.join}
              error={dict.hero.codeError}
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <RoleDraw
              roles={dict.rules.roles}
              label={`🂠 ${dict.hero.drawRole}`}
              title={dict.hero.drawRole}
              hint={dict.hero.drawHint}
              pick={dict.hero.drawPick}
              again={dict.hero.drawAgain}
              closeLabel={dict.rules.close}
              className={chip}
            />
            <CameraCheck label={`◉ ${dict.hero.camCheck}`} title={dict.hero.camCheck} labels={dict.ui} className={chip} />
          </div>
        </div>

        <div className="hero-stage flex min-h-0 flex-col items-center gap-2">
          <div className="hero-stage-box w-full">
            <Stage
              label={dict.hero.tableLabel}
              roleNames={roleNames}
              cord={<LampCord toNight={dict.hero.toNight} toDay={dict.hero.toDay} />}
            />
          </div>
          <p className="lamp-cord-hint phase-transition text-[var(--text-muted)]">{dict.hero.cordHint}</p>
        </div>
      </main>
    </PhaseShell>
  );
}
