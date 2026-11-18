"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { Figure, type FigureRole } from "../figures/Figure";

/**
 * 3D figures load in the browser only (three.js), with the flat SVG figures
 * shown while they load and on devices without WebGL.
 */

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
const subscribe = () => () => {};
function useWebGL() {
  return useSyncExternalStore(subscribe, hasWebGL, () => false);
}

const Stage3D = dynamic(() => import("./Scenes").then((m) => m.StageScene), { ssr: false });
const Lineup3D = dynamic(() => import("./Scenes").then((m) => m.LineupScene), { ssr: false });
const Single3D = dynamic(() => import("./Scenes").then((m) => m.SingleScene), { ssr: false });

export function StageFigures({ night, fallback }: { night: boolean; fallback: React.ReactNode }) {
  return useWebGL() ? <Stage3D night={night} /> : <>{fallback}</>;
}

export function LineupFigures({ roles, className = "aspect-[5/1.5] w-full" }: { roles: FigureRole[]; className?: string }) {
  const gl = useWebGL();
  return gl ? (
    <div className={className}>
      <Lineup3D roles={roles} />
    </div>
  ) : (
    <div className="flex justify-around">
      {roles.map((r) => (
        <Figure key={r} role={r} className="w-24" />
      ))}
    </div>
  );
}

export function SingleFigure({ role, asleep, className }: { role: FigureRole; asleep?: boolean; className?: string }) {
  const gl = useWebGL();
  return <div className={className}>{gl ? <Single3D role={role} asleep={asleep} /> : <Figure role={role} asleep={asleep} className="size-full" />}</div>;
}
