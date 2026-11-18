"use client";

import { useState } from "react";
import { CreateRoomForm, ShareLink } from "../lobby/CreateRoom";
import { DeviceCheck } from "../lobby/DeviceCheck";
import { JoinForm } from "../lobby/JoinForm";
import { Roster } from "../lobby/Roster";
import type { RoomLabels } from "../room/types";

const TAKEN: Record<number, string> = { 1: "Оля", 2: "Тарас", 4: "Max", 5: "Богдан", 8: "Kate", 10: "Марта" };

export function PreviewCreate({ labels, lang }: { labels: RoomLabels; lang: string }) {
  const [made, setMade] = useState(false);
  return made ? (
    <ShareLink labels={labels} url={`http://192.168.1.20:3000/${lang}/room/K7M2QX`} enterHref="#room" />
  ) : (
    <CreateRoomForm labels={labels} onCreate={() => setMade(true)} />
  );
}

export function PreviewJoin({ labels }: { labels: RoomLabels }) {
  return <JoinForm labels={labels} taken={TAKEN} onJoin={() => {}} />;
}

export function PreviewLobby({ labels }: { labels: RoomLabels }) {
  const [ready, setReady] = useState(false);
  const seats = Object.fromEntries(
    Object.entries(TAKEN).map(([n, name]) => [n, { name, ready: Number(n) % 2 === 0 }]),
  ) as Record<number, { name: string; ready: boolean }>;
  seats[6] = { name: labels.you, ready };
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(16rem,1fr)]">
      <DeviceCheck labels={labels} ready={ready} onReadyChange={setReady} />
      <Roster labels={labels} seats={seats} />
    </div>
  );
}
