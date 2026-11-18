"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  AudioPresets,
  ConnectionState,
  Room as VideoRoom,
  RoomEvent,
  Track,
  VideoPresets,
  type Participant,
} from "livekit-client";
import { gameServerUrl, livekitUrl, loadKey, saveKey } from "./endpoints";
import type { HostAction, RoomView } from "./types";

export type RoomStatus =
  | "connecting" // talking to the game server
  | "join" // this browser has no seat yet: show the join form
  | "joined"
  | "kicked"
  | "not_found"
  | "offline"; // the game server can't be reached

export interface ParticipantMedia {
  video: Track | undefined;
  audio: Track | undefined;
  camOn: boolean;
  micOn: boolean;
  speaking: boolean;
  isLocal: boolean;
}

interface JoinReply {
  ok: boolean;
  error?: string;
  key?: string;
  as?: "host" | "player";
  token?: string;
  livekitUrl?: string;
}

const EMPTY_MEDIA: ParticipantMedia = {
  video: undefined,
  audio: undefined,
  camOn: false,
  micOn: false,
  speaking: false,
  isLocal: false,
};

/** Best camera and mic settings from docs/PLAN.md: 720p simulcast (1080p for the host), high-bitrate Opus. */
function createVideoRoom(isHost: boolean) {
  return new VideoRoom({
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: isHost ? VideoPresets.h1080.resolution : VideoPresets.h720.resolution,
    },
    audioCaptureDefaults: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: !isHost,
    },
    publishDefaults: {
      simulcast: true,
      videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
      videoEncoding: isHost ? VideoPresets.h1080.encoding : VideoPresets.h720.encoding,
      audioPreset: AudioPresets.music,
      dtx: true,
      red: true,
    },
  });
}

function mediaOf(p: Participant | undefined, isLocal: boolean): ParticipantMedia {
  if (!p) return EMPTY_MEDIA;
  const cam = p.getTrackPublication(Track.Source.Camera);
  const mic = p.getTrackPublication(Track.Source.Microphone);
  return {
    video: cam && !cam.isMuted ? cam.track : undefined,
    audio: !isLocal && mic && !mic.isMuted ? mic.track : undefined,
    camOn: !!cam && !cam.isMuted && !!cam.track,
    micOn: !!mic && !mic.isMuted && !!mic.track,
    speaking: p.isSpeaking,
    isLocal,
  };
}

/**
 * Everything a room page needs: the game state from the game server and the
 * cameras and mics from LiveKit. The server decides what is allowed; this hook
 * follows it (turns this browser's camera/mic off when the host or the night says so).
 */
export function useRoom(code: string) {
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const [view, setView] = useState<RoomView | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [videoState, setVideoState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [mediaVersion, setMediaVersion] = useState(0);
  const [wantCam, setWantCam] = useState(true);
  const [wantMic, setWantMic] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const videoRef = useRef<VideoRoom | null>(null);

  const connectVideo = useCallback(async (reply: JoinReply, isHost: boolean) => {
    if (!reply.token || videoRef.current) return;
    const room = createVideoRoom(isHost);
    videoRef.current = room;
    const bump = () => setMediaVersion((v) => v + 1);
    room
      .on(RoomEvent.ConnectionStateChanged, (s) => {
        setVideoState(s);
        bump();
      })
      .on(RoomEvent.ParticipantConnected, bump)
      .on(RoomEvent.ParticipantDisconnected, bump)
      .on(RoomEvent.TrackSubscribed, bump)
      .on(RoomEvent.TrackUnsubscribed, bump)
      .on(RoomEvent.TrackPublished, bump)
      .on(RoomEvent.TrackUnpublished, bump)
      .on(RoomEvent.TrackMuted, bump)
      .on(RoomEvent.TrackUnmuted, bump)
      .on(RoomEvent.LocalTrackPublished, bump)
      .on(RoomEvent.LocalTrackUnpublished, bump)
      .on(RoomEvent.ActiveSpeakersChanged, bump)
      .on(RoomEvent.AudioPlaybackStatusChanged, () => setAudioBlocked(!room.canPlaybackAudio))
      .on(RoomEvent.Disconnected, () => {
        if (videoRef.current === room) videoRef.current = null;
        bump();
      });
    try {
      await room.connect(livekitUrl(reply.livekitUrl), reply.token);
      setAudioBlocked(!room.canPlaybackAudio);
      socketRef.current?.emit("video:connected");
    } catch (err) {
      console.error("video connect failed", err);
      if (videoRef.current === room) videoRef.current = null;
      setError("video_failed");
    }
  }, []);

  const handleJoinReply = useCallback(
    (reply: JoinReply) => {
      if (!reply.ok || !reply.key) return false;
      saveKey(code, reply.key);
      setStatus("joined");
      setError(null);
      void connectVideo(reply, reply.as === "host");
      return true;
    },
    [code, connectVideo],
  );

  // Connect to the game server, and come back to a saved seat if there is one.
  useEffect(() => {
    const socket = io(gameServerUrl(), { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      const key = loadKey(code);
      if (!key) {
        socket.emit("room:peek", { code }, (r: { ok: boolean }) => setStatus(r.ok ? "join" : "not_found"));
        return;
      }
      socket.emit("room:join", { code, key }, (reply: JoinReply) => {
        if (handleJoinReply(reply)) return;
        if (reply.error === "room_not_found") return setStatus("not_found");
        saveKey(code, null); // the seat is gone (removed by the host): join again
        setStatus("join");
      });
    });
    socket.on("connect_error", () => setStatus((s) => (s === "joined" ? s : "offline")));
    socket.on("room:state", (v: RoomView) => {
      setClockOffset(v.serverNow - Date.now());
      setView(v);
    });
    socket.on("room:kicked", () => {
      saveKey(code, null);
      setStatus("kicked");
      void videoRef.current?.disconnect();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      void videoRef.current?.disconnect();
      videoRef.current = null;
    };
  }, [code, handleJoinReply]);

  const emitJoin = useCallback(
    (payload: Record<string, unknown>) =>
      new Promise<string | null>((resolve) => {
        const socket = socketRef.current;
        if (!socket?.connected) return resolve("offline");
        socket.emit("room:join", { code, ...payload }, (reply: JoinReply) => {
          resolve(handleJoinReply(reply) ? null : (reply.error ?? "server_error"));
        });
      }),
    [code, handleJoinReply],
  );

  const joinAsPlayer = useCallback((name: string, seat: number) => emitJoin({ name, seat }), [emitJoin]);
  const joinAsHost = useCallback((password: string) => emitJoin({ host: true, password }), [emitJoin]);

  const freeSeats = useCallback(
    () =>
      new Promise<number[]>((resolve) => {
        socketRef.current?.emit("room:peek", { code }, (r: { ok: boolean; freeSeats?: number[] }) =>
          resolve(r.freeSeats ?? []),
        );
      }),
    [code],
  );

  const hostAction = useCallback(
    (action: HostAction) =>
      new Promise<string | null>((resolve) => {
        const socket = socketRef.current;
        if (!socket?.connected) return resolve("offline");
        socket.emit("host:action", action, (r: { ok: boolean; error?: string }) =>
          resolve(r.ok ? null : (r.error ?? "server_error")),
        );
      }),
    [],
  );

  // What this browser may publish right now.
  const isHost = view?.me.kind === "host";
  const mySeat = view?.me.kind === "player" ? view.seats[view.me.seat - 1] : undefined;
  const camAllowed = isHost || !!mySeat?.camAllowed;
  const micAllowed = isHost || !!mySeat?.micAllowed;

  // Follow the rules: switch this browser's camera and mic to (wanted AND allowed).
  useEffect(() => {
    const room = videoRef.current;
    if (!room || videoState !== ConnectionState.Connected || !view) return;
    const lp = room.localParticipant;
    const run = async () => {
      try {
        await lp.setCameraEnabled(wantCam && camAllowed);
        await lp.setMicrophoneEnabled(wantMic && micAllowed);
        setMediaError(null);
      } catch (err) {
        const name = (err as Error)?.name;
        setMediaError(name === "NotAllowedError" ? "media_denied" : name === "NotFoundError" ? "media_missing" : "media_failed");
        console.warn("camera/mic", err);
      }
    };
    void run();
  }, [videoState, view, wantCam, wantMic, camAllowed, micAllowed]);

  /** Browsers block sound until the page is clicked; call this from a click. */
  const startAudio = useCallback(async () => {
    await videoRef.current?.startAudio();
    setAudioBlocked(!(videoRef.current?.canPlaybackAudio ?? true));
  }, []);

  /** Camera, mic and speaking state of a participant, by LiveKit identity. */
  const media = useCallback(
    (identity: string | null | undefined): ParticipantMedia => {
      const room = videoRef.current;
      if (!room || !identity) return EMPTY_MEDIA;
      if (identity === room.localParticipant.identity) return mediaOf(room.localParticipant, true);
      return mediaOf(room.remoteParticipants.get(identity), false);
    },
    // mediaVersion changes whenever LiveKit reports a change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mediaVersion],
  );

  return useMemo(
    () => ({
      status,
      view,
      error,
      mediaError,
      videoConnected: videoState === ConnectionState.Connected,
      clockOffset,
      joinAsPlayer,
      joinAsHost,
      freeSeats,
      hostAction,
      media,
      wantCam,
      wantMic,
      camAllowed,
      micAllowed,
      setWantCam,
      setWantMic,
      audioBlocked,
      startAudio,
    }),
    [status, view, error, mediaError, videoState, clockOffset, joinAsPlayer, joinAsHost, freeSeats, hostAction, media, wantCam, wantMic, camAllowed, micAllowed, audioBlocked, startAudio],
  );
}

export type RoomApi = ReturnType<typeof useRoom>;
