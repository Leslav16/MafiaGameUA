import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "../dictionaries";
import { RoleDeck } from "@/components/lobby/RoleDeck";
import { CreateRoom } from "./parts/CreateRoom";

export default async function CreateRoomPage({ params }: PageProps<"/[lang]/room">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main data-phase="night" className="phase-surface min-h-dvh px-4 sm:px-16">
      <div className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col items-start gap-8">
          <CreateRoom lang={lang} t={dict.roomUi} />
          <Link
            href={`/${lang}`}
            className="inline-flex min-h-11 items-center underline decoration-[var(--line)] underline-offset-4 hover:decoration-[var(--accent)]"
          >
            {dict.room.back}
          </Link>
        </div>
        <div className="relative hidden justify-center lg:flex">
          <RoleDeck roles={dict.rules.roles} label={dict.ui.create.deckLabel} />
        </div>
      </div>
    </main>
  );
}
