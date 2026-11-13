import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "../dictionaries";

export default async function RoomPlaceholder({
  params,
}: PageProps<"/[lang]/room">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main
      data-phase="night"
      className="phase-surface flex min-h-dvh flex-col items-start justify-center gap-6 px-4 sm:px-16"
    >
      <h1 className="font-display text-5xl font-medium tracking-tight sm:text-6xl">
        {dict.room.title}
      </h1>
      <p className="max-w-[44ch] text-xl text-[var(--text-muted)]">{dict.room.text}</p>
      <Link
        href={`/${lang}`}
        className="inline-flex min-h-12 items-center rounded-md bg-[var(--accent)] px-6 font-display text-lg font-medium tracking-wide text-[var(--accent-text)]"
      >
        {dict.room.back}
      </Link>
    </main>
  );
}
