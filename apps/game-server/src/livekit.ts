import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";
import type { MediaPermission } from "./room.js";

/**
 * Talks to the LiveKit video server: issues join tokens and enforces the
 * host's camera/mic decisions on the server side, so a player cannot get
 * around them from their browser.
 */

function parseKeys(raw: string | undefined): { key: string; secret: string } {
  const [key, ...rest] = (raw ?? "").split(":");
  const secret = rest.join(":").trim();
  if (!key?.trim() || !secret) {
    throw new Error("LIVEKIT_KEYS must look like 'key: secret' (copy .env.example to .env)");
  }
  return { key: key.trim(), secret };
}

const { key: API_KEY, secret: API_SECRET } = parseKeys(process.env.LIVEKIT_KEYS);
/** How the game server reaches LiveKit (inside Docker: http://livekit:7880). */
const LIVEKIT_URL = process.env.LIVEKIT_URL ?? "http://localhost:7880";
/** How browsers reach LiveKit. Empty: the browser uses the same host name as the site, port 7880. */
export const LIVEKIT_PUBLIC_URL = process.env.LIVEKIT_PUBLIC_URL ?? "";

const service = new RoomServiceClient(LIVEKIT_URL, API_KEY, API_SECRET);

function sourcesFor(media: MediaPermission) {
  const sources: TrackSource[] = [];
  if (media.cam) sources.push(TrackSource.CAMERA);
  if (media.mic) sources.push(TrackSource.MICROPHONE);
  // LiveKit reads an empty list as "everything allowed", so nothing allowed means canPublish = false.
  return { canPublish: sources.length > 0, canPublishSources: sources };
}

export async function joinToken(
  room: string,
  identity: string,
  name: string,
  media: MediaPermission | "host" | "spectator",
): Promise<string> {
  const token = new AccessToken(API_KEY, API_SECRET, { identity, name, ttl: "8h" });
  const publish =
    media === "host"
      ? { canPublish: true, canPublishSources: [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE] }
      : media === "spectator"
        ? { canPublish: false, canPublishSources: [] }
        : sourcesFor(media);
  token.addGrant({
    room,
    roomJoin: true,
    // Spectators watch without showing up as participants for the players.
    ...(media === "spectator" ? { hidden: true } : {}),
    canSubscribe: true,
    canPublishData: false,
    canUpdateOwnMetadata: false,
    ...publish,
  });
  return token.toJwt();
}

const isMissing = (err: unknown) => /not.?found|does not exist/i.test(String((err as Error)?.message ?? err));

/** Applies the camera/mic rules for players whose permission changed. */
export async function applyMedia(room: string, changes: Map<string, MediaPermission>): Promise<void> {
  if (changes.size === 0) return;
  let tracks = new Map<string, { sid: string; source: TrackSource; muted: boolean }[]>();
  try {
    const participants = await service.listParticipants(room);
    tracks = new Map(participants.map((p) => [p.identity, p.tracks.map((t) => ({ sid: t.sid, source: t.source, muted: t.muted }))]));
  } catch (err) {
    if (!isMissing(err)) console.warn("livekit: list participants failed", err);
    return; // nobody is in the video room yet; their next token carries the rules
  }

  await Promise.allSettled(
    [...changes].map(async ([identity, media]) => {
      const published = tracks.get(identity);
      if (!published) return; // not connected to video right now
      const permission = { ...sourcesFor(media), canSubscribe: true, canPublishData: false };
      await service.updateParticipant(room, identity, { permission });
      // Also mute anything already published that is no longer allowed.
      await Promise.allSettled(
        published
          .filter(
            (t) =>
              !t.muted &&
              ((t.source === TrackSource.CAMERA && !media.cam) || (t.source === TrackSource.MICROPHONE && !media.mic)),
          )
          .map((t) => service.mutePublishedTrack(room, identity, t.sid, true)),
      );
    }),
  ).then((results) => {
    for (const r of results) if (r.status === "rejected") console.warn("livekit: update failed", r.reason);
  });
}

export async function removeFromVideo(room: string, identity: string): Promise<void> {
  try {
    await service.removeParticipant(room, identity);
  } catch (err) {
    if (!isMissing(err)) console.warn("livekit: remove failed", err);
  }
}

/** Ends the video room: everyone in it is disconnected. */
export async function closeVideoRoom(room: string): Promise<void> {
  try {
    await service.deleteRoom(room);
  } catch (err) {
    if (!isMissing(err)) console.warn("livekit: close room failed", err);
  }
}

export type VideoCheck = "ok" | "bad_keys" | "unreachable";

/** Asks LiveKit for its room list: tells whether it answers and accepts our key and secret. */
export async function checkVideoServer(): Promise<VideoCheck> {
  try {
    await service.listRooms();
    return "ok";
  } catch (err) {
    const e = err as { status?: number; message?: string };
    const text = `${e?.status ?? ""} ${e?.message ?? err}`;
    if (e?.status === 401 || e?.status === 403 || /unauthori|invalid token|signature|permission/i.test(text)) return "bad_keys";
    console.warn("livekit: check failed", text);
    return "unreachable";
  }
}
