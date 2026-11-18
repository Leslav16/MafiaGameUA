"use client";

import { useState } from "react";
import { CreateRoomForm, ShareLink } from "../lobby/CreateRoom";
import { JoinForm } from "../lobby/JoinForm";
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
