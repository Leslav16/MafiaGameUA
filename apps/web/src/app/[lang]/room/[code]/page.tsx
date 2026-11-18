import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "../../dictionaries";
import { RoomClient } from "./parts/RoomClient";

async function Room({ params }: { params: PageProps<"/[lang]/room/[code]">["params"] }) {
  const { lang, code } = await params;
  if (!hasLocale(lang) || !/^[a-z0-9]{4,12}$/.test(code)) notFound();
  const dict = await getDictionary(lang);
  return <RoomClient lang={lang} code={code} dict={{ roomUi: dict.roomUi, hostPanel: dict.hostPanel, ui: dict.ui, rules: dict.rules, game: dict.game, host: dict.host, locations: dict.locations }} />;
}

/** The game room: video table for 11 players and the host, plus the host's controls. */
export default function RoomPage({ params }: PageProps<"/[lang]/room/[code]">) {
  return (
    <Suspense fallback={<main data-phase="night" className="phase-surface min-h-dvh" />}>
      <Room params={params} />
    </Suspense>
  );
}
