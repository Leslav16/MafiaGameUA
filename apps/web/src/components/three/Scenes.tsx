"use client";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { FigureRole } from "../figures/Figure";
import { cyl, rbox, sphere } from "./geometry";
import { Lights } from "./Lights";
import { vinyl } from "./materials";
import { Toy } from "./Toy";

const MAFIA = new Set<FigureRole>(["don", "mafia"]);

const glProps = { antialias: true, alpha: true, powerPreference: "high-performance" as const };

function onCreated({ gl }: { gl: THREE.WebGLRenderer }) {
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.05;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;
}

/** Landing: the five figures standing on a lamp-lit card table. */
export function StageScene({ night }: { night: boolean }) {
  const cast: { role: FigureRole; x: number; z: number; ry: number }[] = [
    { role: "civilian", x: -2.1, z: 0.35, ry: 0.35 },
    { role: "sheriff", x: -1.05, z: -0.35, ry: 0.15 },
    { role: "don", x: 0, z: -0.6, ry: 0 },
    { role: "mafia", x: 1.05, z: -0.35, ry: -0.15 },
    { role: "doctor", x: 2.1, z: 0.35, ry: -0.35 },
  ];
  const wood = vinyl("#5a3417", { rough: 0.55, gloss: 0.45 });
  const edge = vinyl("#2c180d", { rough: 0.6 });
  const felt = vinyl("#781210", { rough: 0.5, gloss: 0.3 });
  const cream = vinyl("#d6c7a1");

  return (
    <Canvas shadows dpr={[1, 2]} gl={glProps} onCreated={onCreated} camera={{ position: [0, 3.4, 7.6], fov: 32 }}>
      <Lights night={night} />
      <group position={[0, -1.25, 0]}>
        {/* Table top and edge */}
        <mesh receiveShadow geometry={cyl(3.4, 3.4, 0.14)} material={wood} scale={[1, 1, 0.62]} position={[0, -0.07, 0]} />
        <mesh geometry={cyl(3.42, 3.3, 0.22)} material={edge} scale={[1, 1, 0.62]} position={[0, -0.24, 0]} />
        {/* Cards dealt face down */}
        {[
          [-1.5, 1.3, 0.4],
          [-0.55, 1.45, -0.15],
          [0.45, 1.5, 0.2],
          [1.45, 1.3, -0.35],
          [-0.05, 0.75, 0.05],
        ].map(([x, z, r], i) => (
          <group key={i} position={[x, 0.012, z]} rotation={[0, r, 0]}>
            <mesh receiveShadow castShadow geometry={rbox(0.36, 0.012, 0.52, 0.004)} material={cream} />
            <mesh geometry={rbox(0.31, 0.013, 0.47, 0.004)} material={felt} position={[0, 0.001, 0]} />
          </group>
        ))}
        {/* A glass and an ashtray */}
        <mesh castShadow geometry={cyl(0.13, 0.11, 0.3)} material={vinyl("#c9b48a", { gloss: 1, rough: 0.05 })} position={[-2.6, 0.15, 1.0]} />
        <mesh castShadow geometry={cyl(0.24, 0.2, 0.07)} material={vinyl("#1a1412", { gloss: 0.9, rough: 0.15 })} position={[2.6, 0.035, 1.0]} />
        <mesh geometry={sphere(0.04)} material={vinyl("#c8893f")} position={[2.6, 0.09, 1.0]} scale={[2.2, 0.5, 0.6]} />

        {cast.map((c, i) => (
          <Toy
            key={c.role}
            role={c.role}
            asleep={night && !MAFIA.has(c.role)}
            phase={i * 1.3}
            position={[c.x, 0, c.z]}
            rotation={[0, c.ry, 0]}
            scale={0.78}
          />
        ))}
      </group>
    </Canvas>
  );
}

/** Rules popup: all five figures in a row. */
export function LineupScene({ roles }: { roles: FigureRole[] }) {
  return (
    <Canvas shadows dpr={[1, 2]} gl={glProps} onCreated={onCreated} camera={{ position: [0, 1.6, 9], fov: 22 }}>
      <Lights keyAt={[0, 6, 5]} />
      <group position={[0, -1.3, 0]}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 6]} />
          <shadowMaterial opacity={0.25} />
        </mesh>
        {roles.map((r, i) => (
          <Toy key={r} role={r} phase={i * 1.1} position={[(i - (roles.length - 1) / 2) * 2.25, 0, 0]} />
        ))}
      </group>
    </Canvas>
  );
}

/** A single figure, e.g. on the role card. */
export function SingleScene({ role, asleep = false }: { role: FigureRole; asleep?: boolean }) {
  return (
    <Canvas shadows dpr={[1, 2]} gl={glProps} onCreated={onCreated} camera={{ position: [0, 1.3, 6], fov: 24 }}>
      <Lights keyAt={[1.5, 5, 4]} />
      <group position={[0, -1.1, 0]}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[6, 6]} />
          <shadowMaterial opacity={0.25} />
        </mesh>
        <Toy role={role} asleep={asleep} />
      </group>
    </Canvas>
  );
}
