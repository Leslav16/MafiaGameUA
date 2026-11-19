"use client";

import { useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { gsap, MOTION } from "@/lib/motion";
import type { CardRole } from "../cards/RoleArt";
import { Lights } from "./Lights";
import { Toy, type ToyPose } from "./Toy";

export type FigureSceneProps = { role: CardRole };

/**
 * One vinyl figure standing on the desk, quiet and serious: it only turns its
 * look slowly now and then. It fades in and out with its wrapper (CSS, see
 * RoleFigure), so the scene itself has no entrance of its own.
 *
 * Performance (web3d-integration-patterns): one canvas, rendered on demand
 * (frameloop="demand"). A GSAP timeline owns the figure's turn and calls
 * invalidate() on update, so between turns nothing is drawn. Pixel ratio is
 * capped at 2. The timeline is killed on unmount; R3F disposes the renderer.
 */
export default function FigureScene({ role }: FigureSceneProps) {
  return (
    <Canvas
      frameloop="demand"
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ position: [0, 1.25, 7.6], fov: 24 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <Lights keyAt={[-1.5, 6, 5]} />
      <group position={[0, -0.95, 0]}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.4, 48]} />
          <shadowMaterial opacity={0.32} />
        </mesh>
        <Stander role={role} />
      </group>
    </Canvas>
  );
}

function Stander({ role }: { role: CardRole }) {
  const rig = useRef<THREE.Group>(null);
  const pose = useRef<ToyPose>({ arms: 0, squash: 0 });
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const g = rig.current;
    if (!g) return;
    // Turned a little towards the cards (to its left), as if it just stepped out of them.
    g.rotation.y = -0.35;
    invalidate();
    if (!window.matchMedia(MOTION.ok).matches) return;

    const draw = () => invalidate();
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 3.5, delay: 2.5, onUpdate: draw });
    tl.to(g.rotation, { y: 0.1, duration: 1.6, ease: "sine.inOut" })
      .to(g.rotation, { y: -0.35, duration: 1.8, ease: "sine.inOut" }, "+=2.2");
    return () => {
      tl.kill();
    };
  }, [invalidate]);

  return (
    <group ref={rig}>
      <Toy role={role} pose={pose} />
    </group>
  );
}
