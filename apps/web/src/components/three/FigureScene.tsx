"use client";

import { useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { gsap, MOTION } from "@/lib/motion";
import type { CardRole } from "../cards/RoleArt";
import { Lights } from "./Lights";
import { Toy, type ToyPose } from "./Toy";

/**
 * One vinyl figure that jumps out of the drawn card, lands, and then gives a
 * small happy hop now and then.
 *
 * Performance (web3d-integration-patterns): one canvas, rendered on demand
 * (frameloop="demand"). A single GSAP timeline owns the figure's rig and pose;
 * every GSAP update calls invalidate(), so between hops nothing is drawn at
 * all. Pixel ratio is capped at 2. The timeline is killed on unmount, and
 * R3F disposes the renderer with the canvas.
 */
export default function FigureScene({ role, delay = 0 }: { role: CardRole; delay?: number }) {
  return (
    <Canvas
      frameloop="demand"
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ position: [0, 1.4, 7.2], fov: 26 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <Lights keyAt={[0.4, 6, 5]} />
      <group position={[0, -1.15, 0]}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[6, 6]} />
          <shadowMaterial opacity={0.22} />
        </mesh>
        <Jumper role={role} delay={delay} />
      </group>
    </Canvas>
  );
}

function Jumper({ role, delay }: { role: CardRole; delay: number }) {
  const rig = useRef<THREE.Group>(null);
  const pose = useRef<ToyPose>({ arms: 0, squash: 0 });
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const g = rig.current;
    if (!g) return;
    const p = pose.current;
    const draw = () => invalidate();

    if (!window.matchMedia(MOTION.ok).matches) {
      // Reduced motion: the figure simply stands there.
      g.position.set(0, 0, 0);
      g.scale.setScalar(1);
      draw();
      return;
    }

    // Start hidden, low and to the left (out of the card).
    g.position.set(-1.7, -0.4, 0);
    g.rotation.set(0, -Math.PI, 0);
    g.scale.setScalar(0.001);
    p.arms = 0;
    p.squash = 0;
    draw();

    const tl = gsap.timeline({ delay, onUpdate: draw });
    // The leap: grows out of the card, arcs over, spins to face us, arms up.
    tl.to(g.scale, { x: 1, y: 1, z: 1, duration: 0.35, ease: "back.out(2)" }, 0)
      .to(g.position, { x: 0, duration: 0.75, ease: "power1.inOut" }, 0)
      .to(g.position, { y: 1.1, duration: 0.38, ease: "power2.out" }, 0)
      .to(g.position, { y: 0, duration: 0.37, ease: "power2.in" }, 0.38)
      .to(g.rotation, { y: 0, duration: 0.75, ease: "power2.out" }, 0)
      .to(p, { arms: 1, duration: 0.3 }, 0.05)
      // Landing: a squash, then the arms come down.
      .to(p, { squash: 0.14, duration: 0.09, ease: "power2.out" }, 0.75)
      .to(p, { squash: 0, duration: 0.5, ease: "elastic.out(1.2, 0.4)" }, 0.84)
      .to(p, { arms: 0, duration: 0.45, ease: "power2.inOut" }, 0.95);

    // Now and then: one small hop with a cheer. Between hops nothing renders.
    const hop = gsap.timeline({ repeat: -1, repeatDelay: 2.6, delay: delay + 2.2, onUpdate: draw });
    hop
      .to(p, { squash: 0.1, duration: 0.12, ease: "power2.out" })
      .to(p, { squash: 0, duration: 0.1 })
      .to(g.position, { y: 0.45, duration: 0.3, ease: "power2.out" }, "<")
      .to(p, { arms: 1, duration: 0.25 }, "<")
      .to(g.position, { y: 0, duration: 0.3, ease: "power2.in" })
      .to(p, { squash: 0.1, duration: 0.08 })
      .to(p, { squash: 0, duration: 0.35, ease: "elastic.out(1.2, 0.45)" })
      .to(p, { arms: 0, duration: 0.4, ease: "power2.inOut" }, "<");

    return () => {
      tl.kill();
      hop.kill();
    };
  }, [delay, invalidate]);

  return (
    <group ref={rig}>
      <Toy role={role} pose={pose} />
    </group>
  );
}
