"use client";

import { useRef, useState } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import type { FigureRole } from "../figures/Figure";
import { capsule, cyl, dome, rbox, sphere, star, torus } from "./geometry";
import { glossyBlack, vinyl } from "./materials";

type Look = { skin: string; hair: string; top: string; legs: string; shoes: string };

const LOOK: Record<FigureRole, Look> = {
  don: { skin: "#eac7a4", hair: "#9c968c", top: "#221c1a", legs: "#1a1514", shoes: "#0c0908" },
  mafia: { skin: "#e3b893", hair: "#1c1412", top: "#47403b", legs: "#2f2a26", shoes: "#0d0a09" },
  sheriff: { skin: "#eec9a5", hair: "#6b4524", top: "#b47e4c", legs: "#3e4a5c", shoes: "#3a2414" },
  doctor: { skin: "#eecdac", hair: "#4a2f1a", top: "#f2ede3", legs: "#4f8088", shoes: "#d9d5cc" },
  civilian: { skin: "#e9c4a0", hair: "#6b4524", top: "#8a6238", legs: "#3f3a33", shoes: "#2a1a10" },
};

const HEAD_Y = 1.42;
const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * One original vinyl-toy figure, built from rounded primitives: a big
 * rounded-square head, glossy black eyes, a small body. About 2.2 units tall,
 * standing on y = 0, facing +z.
 *
 * Motion: a slow idle sway; on hover one gentle hop at a time with both arms
 * raised. `asleep` closes the eyes (night).
 */
export function Toy({
  role,
  asleep = false,
  phase = 0,
  ...props
}: { role: FigureRole; asleep?: boolean; phase?: number } & ThreeElements["group"]) {
  const L = LOOK[role];
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const hop = useRef({ t: 0, active: false });
  const still = useRef(reduceMotion());

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime + phase;
    const g = root.current;
    if (!g || !head.current || !armL.current || !armR.current || !eyes.current) return;
    const k = 1 - Math.exp(-dt * 8); // smoothing

    // Hop: 0.9 s per hop, starts on hover, always finishes the hop it began.
    const h = hop.current;
    if (hover && !h.active) {
      h.active = true;
      h.t = 0;
    }
    let lift = 0;
    let squash = 0;
    if (h.active) {
      h.t += dt / 0.9;
      const p = Math.min(h.t, 1);
      lift = Math.sin(p * Math.PI) * (still.current ? 0.04 : 0.28);
      squash = p < 0.12 ? Math.sin((p / 0.12) * Math.PI) * 0.08 : 0; // little crouch on take-off
      if (h.t >= 1) h.active = hover; // keep hopping while hovered
      if (h.t >= 1) h.t = 0;
    }
    g.position.y = lift;
    g.scale.set(1 + squash * 0.5, 1 - squash, 1 + squash * 0.5);

    // Arms go up while hovered, rest by the sides otherwise
    const up = hover ? 2.55 : 0.12;
    armL.current.rotation.z = THREE.MathUtils.lerp(armL.current.rotation.z, -up, k);
    armR.current.rotation.z = THREE.MathUtils.lerp(armR.current.rotation.z, up, k);

    // Idle: slow head tilt and body sway
    const idle = still.current ? 0 : 1;
    head.current.rotation.z = Math.sin(t * 0.9) * 0.05 * idle;
    head.current.rotation.y = Math.sin(t * 0.55) * 0.12 * idle;
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, hover ? 0 : Math.sin(t * 0.4) * 0.08 * idle, k);

    // Eyes close at night
    const target = asleep ? 0.12 : 1;
    eyes.current.scale.y = THREE.MathUtils.lerp(eyes.current.scale.y, target, k);
  });

  const skin = vinyl(L.skin, { gloss: 0.25, rough: 0.5 });
  const hair = vinyl(L.hair, { gloss: 0.5, rough: 0.35 });
  const top = vinyl(L.top);
  const legs = vinyl(L.legs);
  const shoes = vinyl(L.shoes, { gloss: 0.7, rough: 0.25 });

  return (
    <group {...props}>
      {/* Invisible hit box so hovering anywhere on the figure counts */}
      <mesh
        position={[0, 1.15, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
        geometry={rbox(1.15, 2.4, 0.9, 0.1)}
        visible={false}
      />
      <group ref={root}>
        {/* Legs and shoes */}
        {[-0.12, 0.12].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh castShadow geometry={capsule(0.085, 0.3)} material={legs} position={[0, 0.3, 0]} />
            <mesh castShadow geometry={rbox(0.17, 0.1, 0.27, 0.045)} material={shoes} position={[0, 0.05, 0.04]} />
          </group>
        ))}

        {/* Torso */}
        <mesh castShadow geometry={rbox(0.5, 0.56, 0.34, 0.13)} material={top} position={[0, 0.74, 0]} />
        <Outfit role={role} />

        {/* Arms: pivot at the shoulder */}
        {(
          [
            [armL, -0.3],
            [armR, 0.3],
          ] as const
        ).map(([ref, x]) => (
          <group key={x} ref={ref} position={[x, 0.95, 0]} rotation={[0, 0, x < 0 ? -0.12 : 0.12]}>
            <mesh castShadow geometry={capsule(0.068, 0.3)} material={top} position={[0, -0.2, 0]} />
            <mesh castShadow geometry={sphere(0.075)} material={role === "doctor" || role === "sheriff" ? skin : skin} position={[0, -0.42, 0]} />
          </group>
        ))}

        {/* Head */}
        <group ref={head} position={[0, HEAD_Y, 0]}>
          <mesh castShadow receiveShadow geometry={rbox(1.0, 0.9, 0.86, 0.34)} material={skin} />
          {/* Ears */}
          {[-0.5, 0.5].map((x) => (
            <mesh key={x} geometry={sphere(0.1)} material={skin} position={[x, -0.02, 0]} scale={[0.6, 1, 0.8]} />
          ))}
          {/* Eyes: big, glossy, black */}
          <group ref={eyes} position={[0, -0.02, 0.4]}>
            {[-0.21, 0.21].map((x) => (
              <mesh key={x} geometry={sphere(0.125)} material={glossyBlack()} position={[x, 0, 0]} scale={[1, 1, 0.45]} />
            ))}
          </group>
          {/* Nose */}
          <mesh geometry={sphere(0.045)} material={skin} position={[0, -0.14, 0.43]} scale={[1.2, 0.9, 0.8]} />
          {/* Brows */}
          {role !== "mafia" &&
            [-0.21, 0.21].map((x) => (
              <mesh
                key={x}
                geometry={rbox(0.17, 0.035, 0.03, 0.015)}
                material={hair}
                position={[x, 0.17, 0.42]}
                rotation={[0, 0, role === "don" ? (x < 0 ? 0.18 : -0.18) : x < 0 ? -0.08 : 0.08]}
              />
            ))}
          <Hair role={role} />
          <Accessory role={role} />
          <Hat role={role} />
        </group>
      </group>
    </group>
  );
}

function Outfit({ role }: { role: FigureRole }) {
  const white = vinyl("#efe8da");
  const red = vinyl("#8e1714", { gloss: 0.6 });
  switch (role) {
    case "don":
      return (
        <group>
          {/* Shirt V and bow tie */}
          <mesh geometry={rbox(0.14, 0.3, 0.02, 0.01)} material={white} position={[0, 0.86, 0.171]} />
          <mesh geometry={sphere(0.04)} material={vinyl("#0b0808")} position={[-0.045, 0.97, 0.18]} scale={[1.2, 0.8, 0.6]} />
          <mesh geometry={sphere(0.04)} material={vinyl("#0b0808")} position={[0.045, 0.97, 0.18]} scale={[1.2, 0.8, 0.6]} />
          {/* Rose */}
          <mesh geometry={sphere(0.05)} material={red} position={[0.15, 0.86, 0.18]} />
        </group>
      );
    case "mafia":
      return (
        <group>
          <mesh geometry={rbox(0.12, 0.3, 0.02, 0.01)} material={white} position={[0, 0.86, 0.171]} />
          <mesh geometry={rbox(0.06, 0.28, 0.025, 0.012)} material={red} position={[0, 0.82, 0.18]} />
        </group>
      );
    case "sheriff":
      return (
        <group>
          <mesh geometry={star()} material={vinyl("#e2b04a", { metal: 0.6, rough: 0.25, gloss: 0.8 })} position={[-0.12, 0.84, 0.165]} />
          <mesh geometry={rbox(0.52, 0.07, 0.36, 0.03)} material={vinyl("#3a2414")} position={[0, 0.5, 0]} />
          <mesh geometry={rbox(0.09, 0.08, 0.02, 0.01)} material={vinyl("#d9a441", { metal: 0.6, rough: 0.3 })} position={[0, 0.5, 0.18]} />
        </group>
      );
    case "doctor":
      return (
        <group>
          <mesh geometry={rbox(0.12, 0.22, 0.02, 0.01)} material={vinyl("#4f8088")} position={[0, 0.9, 0.171]} />
          <mesh geometry={torus(0.12, 0.012, Math.PI)} material={vinyl("#2c2725")} position={[0, 0.8, 0.18]} rotation={[0, 0, Math.PI]} />
          <mesh geometry={sphere(0.035)} material={vinyl("#a7adb6", { metal: 0.7, rough: 0.2 })} position={[0.12, 0.8, 0.19]} />
          <mesh geometry={rbox(0.03, 0.1, 0.01, 0.004)} material={red} position={[-0.14, 0.86, 0.172]} />
          <mesh geometry={rbox(0.1, 0.03, 0.01, 0.004)} material={red} position={[-0.14, 0.86, 0.172]} />
        </group>
      );
    case "civilian":
      return <mesh geometry={torus(0.12, 0.03)} material={vinyl("#e6d9b8")} position={[0, 1.0, 0.03]} rotation={[Math.PI / 2, 0, 0]} />;
  }
}

function Hair({ role }: { role: FigureRole }) {
  const L = LOOK[role];
  const hair = vinyl(L.hair, { gloss: 0.5, rough: 0.35 });
  if (role === "doctor")
    return <mesh castShadow geometry={rbox(1.04, 0.36, 0.9, 0.17)} material={hair} position={[0, 0.3, -0.02]} />;
  // Hair at the sides, under hats
  return (
    <group>
      {[-0.49, 0.49].map((x) => (
        <mesh key={x} geometry={rbox(0.08, 0.36, 0.6, 0.04)} material={hair} position={[x, 0.08, -0.08]} />
      ))}
      <mesh geometry={rbox(1.0, 0.3, 0.2, 0.1)} material={hair} position={[0, 0.12, -0.36]} />
    </group>
  );
}

function Accessory({ role }: { role: FigureRole }) {
  switch (role) {
    case "mafia":
      return (
        <group position={[0, -0.01, 0.44]}>
          {[-0.21, 0.21].map((x) => (
            <mesh key={x} geometry={rbox(0.32, 0.2, 0.04, 0.07)} material={glossyBlack()} position={[x, 0, 0]} />
          ))}
          <mesh geometry={rbox(0.12, 0.03, 0.03, 0.01)} material={glossyBlack()} position={[0, 0.04, 0]} />
        </group>
      );
    case "don":
      return (
        <group position={[0, -0.24, 0.42]}>
          <mesh geometry={sphere(0.07)} material={vinyl("#9c968c")} position={[-0.07, 0, 0]} scale={[1.4, 0.55, 0.6]} rotation={[0, 0, -0.25]} />
          <mesh geometry={sphere(0.07)} material={vinyl("#9c968c")} position={[0.07, 0, 0]} scale={[1.4, 0.55, 0.6]} rotation={[0, 0, 0.25]} />
        </group>
      );
    case "doctor":
      return (
        <group>
          <mesh geometry={torus(0.5, 0.02)} material={vinyl("#2c2725")} position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.88, 1]} />
          <mesh geometry={cyl(0.1, 0.1, 0.02)} material={vinyl("#dfe4ea", { metal: 0.9, rough: 0.12, gloss: 1 })} position={[0, 0.33, 0.44]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      );
    default:
      return null;
  }
}

function Hat({ role }: { role: FigureRole }) {
  switch (role) {
    case "don":
    case "mafia": {
      const felt = vinyl(role === "don" ? "#2a2321" : "#1b1716", { gloss: 0.25, rough: 0.6 });
      return (
        <group position={[0, 0.44, 0]} rotation={role === "mafia" ? [0.06, 0, -0.12] : [0.04, 0, 0]}>
          <mesh castShadow geometry={cyl(0.74, 0.74, 0.035)} material={felt} scale={[1, 1, 0.9]} />
          <mesh castShadow geometry={cyl(0.4, 0.47, 0.34)} material={felt} position={[0, 0.18, 0]} scale={[1, 1, 0.88]} />
          <mesh geometry={cyl(0.475, 0.475, 0.08)} material={role === "don" ? vinyl("#781210", { gloss: 0.6 }) : vinyl("#0a0807")} position={[0, 0.06, 0]} scale={[1, 1, 0.88]} />
        </group>
      );
    }
    case "sheriff": {
      const leather = vinyl("#a87a48", { rough: 0.55 });
      return (
        <group position={[0, 0.46, 0]}>
          <mesh castShadow geometry={cyl(0.82, 0.82, 0.035)} material={leather} scale={[1, 1, 0.82]} />
          {[-1, 1].map((side) => (
            <mesh key={side} castShadow geometry={rbox(0.26, 0.035, 0.9, 0.017)} material={leather} position={[side * 0.7, 0.07, 0]} rotation={[0, 0, side * 0.5]} />
          ))}
          <mesh castShadow geometry={cyl(0.38, 0.46, 0.36)} material={leather} position={[0, 0.19, 0]} scale={[1, 1, 0.85]} />
          <mesh geometry={cyl(0.465, 0.465, 0.06)} material={vinyl("#4a2c14")} position={[0, 0.05, 0]} scale={[1, 1, 0.85]} />
        </group>
      );
    }
    case "civilian": {
      const cloth = vinyl("#5f5b4b", { rough: 0.7, gloss: 0.1 });
      return (
        <group position={[0, 0.3, 0]}>
          <mesh castShadow geometry={dome(0.55)} material={cloth} scale={[1, 0.45, 0.9]} />
          <mesh castShadow geometry={rbox(0.7, 0.04, 0.32, 0.02)} material={vinyl("#46433a")} position={[0, 0.02, 0.5]} rotation={[0.15, 0, 0]} />
          <mesh geometry={sphere(0.05)} material={cloth} position={[0, 0.25, 0]} />
        </group>
      );
    }
    default:
      return null;
  }
}
