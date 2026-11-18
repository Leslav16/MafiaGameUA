"use client";

import { useEffect, useRef, useState } from "react";
import type { LocalVideoTrack, Track } from "livekit-client";
import { BACKGROUNDS, type CamEffect } from "../prefs";

type Wrapper = Awaited<ReturnType<typeof import("@livekit/track-processors").BackgroundProcessor>>;

/** Whether this browser can blur or replace the camera background. */
export function useEffectsSupported() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    import("@livekit/track-processors")
      .then((m) => live && setOk(m.supportsBackgroundProcessors()))
      .catch(() => live && setOk(false));
    return () => {
      live = false;
    };
  }, []);
  return ok;
}

/**
 * Applies the chosen background effect to this browser's published camera
 * track: blur, or one of the virtual backgrounds. The segmentation model is
 * loaded only when an effect is first turned on.
 */
export function useCameraEffect(track: Track | undefined, effect: CamEffect) {
  const proc = useRef<{ track: LocalVideoTrack; wrapper: Wrapper } | null>(null);

  useEffect(() => {
    const local = track as LocalVideoTrack | undefined;
    if (!local || typeof local.setProcessor !== "function") return;
    let cancelled = false;

    const run = async () => {
      if (effect === "none") {
        if (proc.current?.track === local) {
          await local.stopProcessor().catch(() => {});
          proc.current = null;
        }
        return;
      }
      const opts =
        effect === "blur"
          ? ({ mode: "background-blur", blurRadius: 14 } as const)
          : ({ mode: "virtual-background", imagePath: BACKGROUNDS[effect] } as const);
      if (proc.current?.track === local) {
        await proc.current.wrapper.switchTo(opts).catch(() => {});
        return;
      }
      const m = await import("@livekit/track-processors");
      if (cancelled || !m.supportsBackgroundProcessors()) return;
      const wrapper = m.BackgroundProcessor(opts);
      try {
        await local.setProcessor(wrapper);
        proc.current = { track: local, wrapper };
      } catch (e) {
        console.warn("camera effect", e);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [track, effect]);
}
