import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "../dictionaries";
import { Figure } from "@/components/figures/Figure";
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
        <div aria-hidden className="relative hidden justify-center lg:flex">
          <div className="absolute inset-x-10 top-1/4 bottom-0 rounded-[50%] bg-[radial-gradient(closest-side,rgb(200_137_63/0.28),transparent)]" />
          <Figure role="don" className="relative w-72" />
        </div>
      </div>
    </main>
  );
}
