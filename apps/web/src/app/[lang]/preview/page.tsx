import Link from "next/link";
import { notFound } from "next/navigation";
import { PhaseShell } from "@/components/Phase";
import { PreviewCreate, PreviewJoin, PreviewLobby } from "@/components/preview/PreviewForms";
import { PreviewRoom } from "@/components/preview/PreviewRoom";
import { getDictionary, hasLocale } from "../dictionaries";

/** A sample of every room screen with made-up players, for checking the look. */
export default async function Preview({ params }: PageProps<"/[lang]/preview">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const ui = dict.ui;

  const section = "mx-auto w-full max-w-6xl px-4 py-12 sm:px-8";
  const h2 = "font-display text-3xl font-medium tracking-tight sm:text-4xl";
  const tag =
    "ml-3 rounded-sm border border-[var(--line)] px-1.5 py-0.5 align-middle font-sans text-sm font-normal tracking-normal text-[var(--text-muted)]";

  return (
    <PhaseShell>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
        <Link href={`/${lang}`} className="font-display text-xl font-semibold tracking-wide">
          {dict.nav.home}
        </Link>
      </header>
      <main>
        <div className={section}>
          <h1 className="font-display text-5xl font-medium tracking-tight">{ui.preview.title}</h1>
          <p className="mt-3 max-w-[60ch] text-[var(--text-muted)] phase-transition">{ui.preview.lede}</p>
        </div>

        <section id="room" className="mx-auto w-full max-w-[96rem] px-2 pb-12 sm:px-6">
          <h2 className={`${h2} mb-4 px-2`}>
            {ui.preview.asPlayer}
            <span className={tag}>{ui.preview.sample}</span>
          </h2>
          <PreviewRoom labels={ui} />
        </section>

        <section className={`${section} border-t border-[var(--line)] phase-transition`}>
          <h2 className={h2}>{ui.create.title}</h2>
          <p className="mt-2 mb-8 max-w-[52ch] text-[var(--text-muted)] phase-transition">{ui.create.lede}</p>
          <div className="max-w-xl">
            <PreviewCreate labels={ui} lang={lang} />
          </div>
        </section>

        <section className={`${section} border-t border-[var(--line)] phase-transition`}>
          <h2 className={`${h2} mb-8`}>{ui.join.title}</h2>
          <PreviewJoin labels={ui} />
        </section>

        <section className={`${section} border-t border-[var(--line)] phase-transition`}>
          <h2 className={h2}>{ui.lobby.title}</h2>
          <p className="mt-2 mb-8 max-w-[52ch] text-[var(--text-muted)] phase-transition">{ui.lobby.lede}</p>
          <PreviewLobby labels={ui} />
        </section>
      </main>
    </PhaseShell>
  );
}
