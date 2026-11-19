"use client";

import { useRef } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import type * as THREE from "three";
import type { CardRole } from "../cards/RoleArt";
import { capsule, cyl, dome, rbox, sphere, star, torus } from "./geometry";
import { brass, ember, glossyBlack, matte } from "./materials";

/**
 * Pose values written from outside (by a GSAP timeline): 0..1 arm raise and a
 * squash amount. The toy has no clock-driven motion of its own, so a canvas
 * with frameloop="demand" only draws while GSAP plays.
 */
export type ToyPose = { arms: number; squash: number };

/** The Godfather palette (globals.css tokens) in matte vinyl. */
const C = {
  night: "#16110f",
  umber: "#2c180d",
  wood: "#4f2d12",
  ochre: "#74491e",
  terracotta: "#a56a40",
  olive: "#2c2312",
  lamp: "#c8893f",
  card: "#d6c7a1",
  oxblood: "#781210",
  smoke: "#857963",
  skin: "#e2bf9c",
} as const;

type Look = { suit: string; lapel: string; legs: string; shoes: string; hair: string; stripes?: string };

const LOOK: Record<CardRole, Look> = {
  don: { suit: "#1b1512", lapel: "#0d0a09", legs: "#1b1512", shoes: "#0b0807", hair: "#a29a8c", stripes: "#3a302a" },
  mafia: { suit: "#3a2b22", lapel: "#2a1e18", legs: "#3a2b22", shoes: "#120d0b", hair: "#1c1412", stripes: "#6d5a48" },
  sheriff: { suit: C.ochre, lapel: "#5e3a17", legs: "#3b3326", shoes: C.umber, hair: "#5a3517" },
  doctor: { suit: C.card, lapel: "#bfae86", legs: C.olive, shoes: C.umber, hair: "#3a2414" },
  civilian: { suit: C.wood, lapel: "#3d230e", legs: "#3a3127", shoes: "#24160c", hair: "#5a3517" },
};

const HEAD_Y = 1.42;

/**
 * One original vinyl-toy figure, serious rather than cute: a big rounded-square
 * head, glossy black eyes under stern brows, a small body with tailored
 * details. About 2.4 units tall, standing on y = 0, facing +z.
 */
export function Toy({
  role,
  asleep = false,
  pose,
  ...props
}: { role: CardRole; asleep?: boolean; pose: React.RefObject<ToyPose> } & ThreeElements["group"]) {
  const L = LOOK[role];
  const body = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);

  // Apply the pose as is, no easing of our own (one owner per property: GSAP).
  useFrame(() => {
    if (!body.current || !armL.current || !armR.current || !eyes.current) return;
    const p = pose.current;
    const up = 0.12 + p.arms * 2.43;
    armL.current.rotation.z = -up;
    armR.current.rotation.z = up;
    body.current.scale.set(1 + p.squash * 0.5, 1 - p.squash, 1 + p.squash * 0.5);
    eyes.current.scale.y = asleep ? 0.12 : 0.86; // a little narrowed: serious, not cute
  });

  const suit = matte(L.suit);
  const lapel = matte(L.lapel, { rough: 0.45, coat: 0.3 });
  const legs = matte(L.legs);
  const shoes = matte(L.shoes, { rough: 0.3, coat: 0.6 });
  const skin = matte(C.skin, { rough: 0.55 });
  const hair = matte(L.hair, { rough: 0.5 });
  const shirt = matte(C.card, { rough: 0.7 });

  return (
    <group {...props}>
      <group ref={body}>
        {/* Legs and shoes; suits get pinstripes down the trousers */}
        {[-0.12, 0.12].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh castShadow geometry={capsule(0.085, 0.3)} material={legs} position={[0, 0.3, 0]} />
            {L.stripes &&
              [-0.035, 0.035].map((sx) => (
                <mesh key={sx} geometry={rbox(0.008, 0.36, 0.01, 0.003)} material={matte(L.stripes!)} position={[sx, 0.32, 0.082]} />
              ))}
            <mesh castShadow geometry={rbox(0.17, 0.1, 0.28, 0.045)} material={shoes} position={[0, 0.05, 0.045]} />
          </group>
        ))}

        {/* Torso: jacket, shirt, lapels, buttons */}
        <mesh castShadow geometry={rbox(0.5, 0.56, 0.34, 0.13)} material={suit} position={[0, 0.74, 0]} />
        {role === "doctor" && (
          /* The doctor's coat runs down over the hips */
          <mesh castShadow geometry={rbox(0.52, 0.3, 0.35, 0.1)} material={suit} position={[0, 0.48, 0]} />
        )}
        {L.stripes &&
          [-0.17, -0.1, 0.1, 0.17].map((sx) => (
            <mesh key={sx} geometry={rbox(0.008, 0.42, 0.01, 0.003)} material={matte(L.stripes!)} position={[sx, 0.72, 0.168]} />
          ))}
        <mesh geometry={rbox(0.15, 0.28, 0.02, 0.01)} material={shirt} position={[0, 0.88, 0.165]} />
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            geometry={rbox(0.07, 0.3, 0.02, 0.01)}
            material={lapel}
            position={[side * 0.085, 0.86, 0.175]}
            rotation={[0, 0, side * 0.32]}
          />
        ))}
        {[0.68, 0.58].map((y) => (
          <mesh key={y} geometry={sphere(0.022)} material={role === "doctor" ? matte("#9a8a68") : brass()} position={[0, y, 0.172]} scale={[1, 1, 0.5]} />
        ))}
        <Outfit role={role} />

        {/* Arms: pivot at the shoulder, a hand with fingers at the end */}
        {(
          [
            [armL, -0.3],
            [armR, 0.3],
          ] as const
        ).map(([ref, x]) => (
          <group key={x} ref={ref} position={[x, 0.95, 0]} rotation={[0, 0, x < 0 ? -0.12 : 0.12]}>
            <mesh castShadow geometry={capsule(0.07, 0.3)} material={suit} position={[0, -0.2, 0]} />
            {/* Shirt cuff */}
            <mesh geometry={cyl(0.066, 0.066, 0.04)} material={shirt} position={[0, -0.39, 0]} />
            <Hand skin={skin} side={x < 0 ? -1 : 1} />
            {role === "doctor" && x > 0 && <Bag />}
          </group>
        ))}

        {/* Head */}
        <group position={[0, HEAD_Y, 0]}>
          <mesh castShadow receiveShadow geometry={rbox(1.0, 0.9, 0.86, 0.34)} material={skin} />
          {[-0.5, 0.5].map((x) => (
            <mesh key={x} geometry={sphere(0.1)} material={skin} position={[x, -0.02, 0]} scale={[0.6, 1, 0.8]} />
          ))}
          {/* Eyes: big, glossy, black, with a catch-light */}
          <group ref={eyes} position={[0, -0.02, 0.4]}>
            {[-0.21, 0.21].map((x) => (
              <group key={x} position={[x, 0, 0]}>
                <mesh geometry={sphere(0.125)} material={glossyBlack()} scale={[1, 1, 0.45]} />
                <mesh geometry={sphere(0.028)} material={matte("#fff6e6", { rough: 0.2 })} position={[0.045, 0.05, 0.05]} scale={[1, 1, 0.4]} />
              </group>
            ))}
          </group>
          <mesh geometry={sphere(0.045)} material={skin} position={[0, -0.14, 0.43]} scale={[1.2, 0.9, 0.8]} />
          {role !== "mafia" &&
            [-0.21, 0.21].map((x) => (
              <mesh
                key={x}
                geometry={rbox(0.17, 0.035, 0.03, 0.015)}
                material={hair}
                position={[x, 0.14, 0.42]}
                // Inner ends down: a stern, watchful look.
                rotation={[0, 0, x < 0 ? -0.24 : 0.24]}
              />
            ))}
          <Hair role={role} />
          <Face role={role} />
          <Hat role={role} />
        </group>
      </group>
    </group>
  );
}

function Hand({ skin, side }: { skin: THREE.Material; side: number }) {
  return (
    <group position={[0, -0.46, 0]}>
      <mesh castShadow geometry={sphere(0.068)} material={skin} scale={[1, 1.05, 0.8]} />
      {[-0.034, 0, 0.034].map((fx) => (
        <mesh key={fx} geometry={capsule(0.019, 0.04)} material={skin} position={[fx * 0.9, -0.07, 0.012]} />
      ))}
      <mesh geometry={capsule(0.02, 0.035)} material={skin} position={[-side * 0.06, -0.02, 0.03]} rotation={[0, 0, side * 0.7]} />
    </group>
  );
}

/** The doctor's leather bag, held in the right hand. */
function Bag() {
  const leather = matte("#3b1e0c", { rough: 0.45, coat: 0.4 });
  return (
    <group position={[0, -0.66, 0.02]}>
      <mesh geometry={torus(0.06, 0.012, Math.PI)} material={leather} position={[0, 0.1, 0]} />
      <mesh castShadow geometry={rbox(0.3, 0.2, 0.15, 0.05)} material={leather} />
      <mesh geometry={rbox(0.31, 0.03, 0.155, 0.01)} material={brass()} position={[0, 0.07, 0]} />
      <mesh geometry={rbox(0.025, 0.08, 0.01, 0.004)} material={matte(C.oxblood)} position={[0, -0.02, 0.078]} />
      <mesh geometry={rbox(0.08, 0.025, 0.01, 0.004)} material={matte(C.oxblood)} position={[0, -0.02, 0.078]} />
    </group>
  );
}

function Outfit({ role }: { role: CardRole }) {
  const red = matte(C.oxblood, { rough: 0.4, coat: 0.5 });
  const cream = matte(C.card);
  switch (role) {
    case "don":
      return (
        <group>
          {/* Bow tie, a rose on the lapel, a pocket square */}
          <mesh geometry={sphere(0.04)} material={glossyBlack()} position={[-0.045, 0.98, 0.18]} scale={[1.2, 0.8, 0.6]} />
          <mesh geometry={sphere(0.04)} material={glossyBlack()} position={[0.045, 0.98, 0.18]} scale={[1.2, 0.8, 0.6]} />
          <mesh geometry={sphere(0.05)} material={red} position={[-0.15, 0.86, 0.19]} />
          <mesh geometry={sphere(0.03)} material={matte(C.olive)} position={[-0.12, 0.81, 0.19]} scale={[1.4, 0.6, 0.6]} />
          <mesh geometry={rbox(0.08, 0.04, 0.02, 0.008)} material={cream} position={[0.15, 0.84, 0.174]} rotation={[0, 0, 0.12]} />
        </group>
      );
    case "mafia":
      return (
        <group>
          <mesh geometry={rbox(0.06, 0.28, 0.025, 0.012)} material={red} position={[0, 0.83, 0.18]} />
          <mesh geometry={rbox(0.08, 0.04, 0.02, 0.008)} material={red} position={[0.15, 0.84, 0.174]} rotation={[0, 0, -0.1]} />
        </group>
      );
    case "sheriff":
      return (
        <group>
          {/* Neckerchief, badge, belt with buckle, holster on the right hip */}
          <mesh geometry={torus(0.12, 0.035)} material={red} position={[0, 1.0, 0.02]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={star()} material={brass()} position={[-0.13, 0.84, 0.175]} />
          <mesh geometry={rbox(0.52, 0.07, 0.36, 0.03)} material={matte(C.umber, { rough: 0.45 })} position={[0, 0.5, 0]} />
          <mesh geometry={rbox(0.09, 0.08, 0.02, 0.01)} material={brass()} position={[0, 0.5, 0.18]} />
          <group position={[0.29, 0.42, 0.04]}>
            <mesh castShadow geometry={rbox(0.11, 0.22, 0.09, 0.03)} material={matte("#5e3a17", { rough: 0.45 })} />
            <mesh geometry={rbox(0.06, 0.1, 0.06, 0.02)} material={matte("#2a1d14", { rough: 0.35 })} position={[0, 0.13, -0.01]} rotation={[0, 0, -0.25]} />
          </group>
        </group>
      );
    case "doctor":
      return (
        <group>
          {/* Stethoscope, a red cross on the chest pocket */}
          <mesh geometry={torus(0.12, 0.012, Math.PI)} material={matte("#2c2725")} position={[0, 0.82, 0.18]} rotation={[0, 0, Math.PI]} />
          <mesh geometry={sphere(0.035)} material={brass()} position={[0.12, 0.82, 0.19]} />
          <mesh geometry={rbox(0.03, 0.1, 0.01, 0.004)} material={red} position={[-0.14, 0.88, 0.176]} />
          <mesh geometry={rbox(0.1, 0.03, 0.01, 0.004)} material={red} position={[-0.14, 0.88, 0.176]} />
        </group>
      );
    case "civilian":
      return (
        <group>
          {/* A knitted ochre scarf, a pocket */}
          <mesh geometry={torus(0.13, 0.04)} material={matte(C.lamp, { rough: 0.9 })} position={[0, 1.0, 0.02]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={rbox(0.09, 0.22, 0.03, 0.01)} material={matte(C.lamp, { rough: 0.9 })} position={[0.1, 0.84, 0.18]} rotation={[0, 0, 0.1]} />
          <mesh geometry={rbox(0.12, 0.08, 0.02, 0.01)} material={matte("#3d230e")} position={[-0.13, 0.62, 0.172]} />
        </group>
      );
  }
}

function Hair({ role }: { role: CardRole }) {
  const hair = matte(LOOK[role].hair, { rough: 0.5 });
  if (role === "doctor") return <mesh castShadow geometry={rbox(1.04, 0.36, 0.9, 0.17)} material={hair} position={[0, 0.3, -0.02]} />;
  return (
    <group>
      {[-0.49, 0.49].map((x) => (
        <mesh key={x} geometry={rbox(0.08, 0.36, 0.6, 0.04)} material={hair} position={[x, 0.08, -0.08]} />
      ))}
      <mesh geometry={rbox(1.0, 0.3, 0.2, 0.1)} material={hair} position={[0, 0.12, -0.36]} />
    </group>
  );
}

function Face({ role }: { role: CardRole }) {
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
        <group>
          {/* Grey moustache and a cigar with a glowing tip */}
          <group position={[0, -0.24, 0.42]}>
            <mesh geometry={sphere(0.07)} material={matte("#a29a8c")} position={[-0.07, 0, 0]} scale={[1.4, 0.55, 0.6]} rotation={[0, 0, -0.25]} />
            <mesh geometry={sphere(0.07)} material={matte("#a29a8c")} position={[0.07, 0, 0]} scale={[1.4, 0.55, 0.6]} rotation={[0, 0, 0.25]} />
          </group>
          <group position={[0.17, -0.31, 0.45]} rotation={[0.25, 0.7, -0.15]}>
            <mesh geometry={cyl(0.026, 0.026, 0.26)} material={matte("#5a3417", { rough: 0.7 })} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.1]} />
            <mesh geometry={cyl(0.027, 0.027, 0.03)} material={matte(C.oxblood)} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.03]} />
            <mesh geometry={sphere(0.024)} material={ember()} position={[0, 0, 0.23]} scale={[1, 1, 0.6]} />
          </group>
        </group>
      );
    case "doctor":
      return (
        <group>
          <mesh geometry={torus(0.5, 0.02)} material={matte("#2c2725")} position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.88, 1]} />
          <mesh geometry={cyl(0.1, 0.1, 0.02)} material={brass()} position={[0, 0.33, 0.44]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      );
    default:
      return null;
  }
}

function Hat({ role }: { role: CardRole }) {
  switch (role) {
    case "don":
    case "mafia": {
      const felt = matte(role === "don" ? "#211a17" : "#2c2312", { rough: 0.75, coat: 0.05 });
      return (
        <group position={[0, 0.44, 0]} rotation={role === "mafia" ? [0.06, 0, -0.12] : [0.04, 0, 0]}>
          <mesh castShadow geometry={cyl(0.74, 0.74, 0.035)} material={felt} scale={[1, 1, 0.9]} />
          <mesh castShadow geometry={cyl(0.4, 0.47, 0.34)} material={felt} position={[0, 0.18, 0]} scale={[1, 1, 0.88]} />
          {/* Pinch at the crown */}
          <mesh geometry={rbox(0.3, 0.04, 0.5, 0.02)} material={matte("#120e0c")} position={[0, 0.355, 0]} />
          <mesh geometry={cyl(0.475, 0.475, 0.08)} material={role === "don" ? matte(C.oxblood, { rough: 0.4, coat: 0.4 }) : matte("#0a0807")} position={[0, 0.06, 0]} scale={[1, 1, 0.88]} />
        </group>
      );
    }
    case "sheriff": {
      const leather = matte(C.terracotta, { rough: 0.55 });
      return (
        <group position={[0, 0.46, 0]}>
          <mesh castShadow geometry={cyl(0.82, 0.82, 0.035)} material={leather} scale={[1, 1, 0.82]} />
          {[-1, 1].map((side) => (
            <mesh key={side} castShadow geometry={rbox(0.26, 0.035, 0.9, 0.017)} material={leather} position={[side * 0.7, 0.07, 0]} rotation={[0, 0, side * 0.5]} />
          ))}
          <mesh castShadow geometry={cyl(0.38, 0.46, 0.36)} material={leather} position={[0, 0.19, 0]} scale={[1, 1, 0.85]} />
          <mesh geometry={cyl(0.465, 0.465, 0.06)} material={matte(C.umber)} position={[0, 0.05, 0]} scale={[1, 1, 0.85]} />
          <mesh geometry={star()} material={brass()} position={[0, 0.06, 0.4]} scale={0.6} />
        </group>
      );
    }
    case "civilian": {
      const cloth = matte(C.smoke, { rough: 0.85, coat: 0 });
      return (
        <group position={[0, 0.3, 0]}>
          <mesh castShadow geometry={dome(0.55)} material={cloth} scale={[1, 0.45, 0.9]} />
          <mesh castShadow geometry={rbox(0.7, 0.04, 0.32, 0.02)} material={matte("#5f5546", { rough: 0.85 })} position={[0, 0.02, 0.5]} rotation={[0.15, 0, 0]} />
          <mesh geometry={sphere(0.05)} material={cloth} position={[0, 0.25, 0]} />
        </group>
      );
    }
    default:
      return null;
  }
}
