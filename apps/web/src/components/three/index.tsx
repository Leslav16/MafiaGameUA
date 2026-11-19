"use client";

import dynamic from "next/dynamic";
import { Component, useSyncExternalStore, type ReactNode } from "react";
import type { FigureSceneProps } from "./FigureScene";

/**
 * 3D is an extra, never a requirement: three.js loads only in the browser and
 * only when a figure is actually shown. Without WebGL, or if loading or the
 * GPU fails, nothing is drawn and the card alone tells the role.
 */

let webgl: boolean | null = null;
function hasWebGL() {
  if (webgl !== null) return webgl;
  try {
    const c = document.createElement("canvas");
    const ctx = c.getContext("webgl2") || c.getContext("webgl");
    webgl = !!ctx;
    // Hand the test context back at once: browsers allow only a few at a time.
    (ctx as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl = false;
  }
  return webgl;
}
const subscribe = () => () => {};
export function useWebGL() {
  return useSyncExternalStore(subscribe, hasWebGL, () => false);
}

class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const Scene = dynamic(() => import("./FigureScene"), { ssr: false });

/**
 * The figure for a role, or nothing where 3D can't run. It fades in; with
 * `leaving` it fades out and then calls onLeft.
 */
export function RoleFigure({
  className,
  leaving = false,
  onLeft,
  ...scene
}: FigureSceneProps & { className?: string; leaving?: boolean; onLeft?: () => void }) {
  const gl = useWebGL();
  if (!gl) return null;
  return (
    <div
      className={`figure-fade ${className ?? ""}`}
      data-leaving={leaving ? "" : undefined}
      aria-hidden
      onAnimationEnd={(e) => {
        if (leaving && e.target === e.currentTarget) onLeft?.();
      }}
    >
      <Quiet>
        <Scene {...scene} />
      </Quiet>
    </div>
  );
}
