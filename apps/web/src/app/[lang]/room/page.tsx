import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "../dictionaries";
import { CreateRoom } from "./parts/CreateRoom";

export default async function CreateRoomPage({ params }: PageProps<"/[lang]/room">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main
      data-phase="night"
      className="phase-surface flex min-h-dvh flex-col items-start justify-center gap-8 px-4 sm:px-16"
    >
      <CreateRoom lang={lang} t={dict.roomUi} />
      <Link href={`/${lang}`} className="underline underline-offset-4">
        {dict.room.back}
      </Link>
    </main>
  );
}
