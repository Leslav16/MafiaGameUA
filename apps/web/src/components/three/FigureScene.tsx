"use client";

import { useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { gsap, MOTION } from "@/lib/motion";
import type { CardRole } from "../cards/RoleArt";
import { Lights } from "./Lights";
import { Toy, type ToyPose } from "./Toy";

export type FigureSceneProps = {
  role: CardRole;
  /** Which way the card is: -1 the card is to the right of the figure, 1 to its left. */
  side: -1 | 1;
  /** Set to send the figure back into its card; onLeft fires when it is gone. */
  leaving?: boolean;
  onLeft?: () => void;
};

/**
 * One vinyl figure that leaps out of the clicked card, lands on its base, and
 * gives a small cheer now and then; when the card closes it hops back in.
 *
 * Performance (web3d-integration-patterns): one canvas, rendered on demand
 * (frameloop="demand"). GSAP timelines own the figure's rig and pose and call
 * invalidate() on update, so between hops nothing is drawn. Pixel ratio is
 * capped at 2. Timelines are killed on unmount; R3F disposes the renderer.
 */
export default function FigureScene(props: FigureSceneProps) {
  return (
    <Canvas
      frameloop="demand"
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ position: [0, 1.25, 8.2], fov: 24 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <Lights keyAt={[0.4, 6, 5]} />
      <group position={[0, -1.05, 0]}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.16, 0]}>
          <circleGeometry args={[1.6, 48]} />
          <shadowMaterial opacity={0.3} />
        </mesh>
        <Jumper {...props} />
      </group>
    </Canvas>
  );
}

const OUT = 1.9; // how far the card is, in scene units

function Jumper({ role, side, leaving = false, onLeft }: FigureSceneProps) {
  const rig = useRef<THREE.Group>(null);
  const pose = useRef<ToyPose>({ arms: 0, squash: 0 });
  const invalidate = useThree((s) => s.invalidate);
  const onLeftRef = useRef(onLeft);
  useEffect(() => {
    onLeftRef.current = onLeft;
  }, [onLeft]);

  // Entrance, then the idle cheer.
  useEffect(() => {
    const g = rig.current;
    if (!g) return;
    const p = pose.current;
    const draw = () => invalidate();

    if (!window.matchMedia(MOTION.ok).matches) {
      g.position.set(0, 0, 0);
      g.scale.setScalar(1);
      draw();
      return;
    }

    g.position.set(-side * OUT, 0.9, -0.6);
    g.rotation.set(0, -side * Math.PI, 0);
    g.scale.setScalar(0.001);
    p.arms = 0;
    p.squash = 0;
    draw();

    // The leap: out of the card, a high arc with a turn to face us, arms up; a soft landing.
    const tl = gsap.timeline({ onUpdate: draw });
    tl.to(g.scale, { x: 1, y: 1, z: 1, duration: 0.45, ease: "back.out(1.8)" }, 0)
      .to(g.position, { x: 0, z: 0, duration: 1.0, ease: "power1.inOut" }, 0)
      .to(g.position, { y: 1.5, duration: 0.5, ease: "power2.out" }, 0)
      .to(g.position, { y: 0, duration: 0.5, ease: "power2.in" }, 0.5)
      .to(g.rotation, { y: 0, duration: 1.0, ease: "power2.inOut" }, 0)
      .to(p, { arms: 1, duration: 0.35 }, 0.05)
      .to(p, { squash: 0.15, duration: 0.1, ease: "power2.out" }, 1.0)
      .to(p, { squash: 0, duration: 0.6, ease: "elastic.out(1.2, 0.4)" }, 1.1)
      .to(p, { arms: 0, duration: 0.55, ease: "power2.inOut" }, 1.2);

    // Now and then: a small hop with a cheer, and a glance around. Between them nothing renders.
    const idle = gsap.timeline({ repeat: -1, repeatDelay: 2.8, delay: 3, onUpdate: draw });
    idle
      .to(g.rotation, { y: 0.35 * side, duration: 0.6, ease: "power2.inOut" })
      .to(g.rotation, { y: 0, duration: 0.6, ease: "power2.inOut" }, "+=0.5")
      .to(p, { squash: 0.1, duration: 0.12, ease: "power2.out" }, "+=0.6")
      .to(p, { squash: 0, duration: 0.1 })
      .to(g.position, { y: 0.45, duration: 0.32, ease: "power2.out" }, "<")
      .to(p, { arms: 1, duration: 0.28 }, "<")
      .to(g.position, { y: 0, duration: 0.32, ease: "power2.in" })
      .to(p, { squash: 0.1, duration: 0.08 })
      .to(p, { squash: 0, duration: 0.4, ease: "elastic.out(1.2, 0.45)" })
      .to(p, { arms: 0, duration: 0.45, ease: "power2.inOut" }, "<");

    return () => {
      tl.kill();
      idle.kill();
    };
  }, [side, invalidate]);

  // Exit: hop back into the card. Runs after the entrance effect's cleanup has killed its timelines.
  useEffect(() => {
    if (!leaving) return;
    const g = rig.current;
    const p = pose.current;
    if (!g || !window.matchMedia(MOTION.ok).matches) {
      onLeftRef.current?.();
      return;
    }
    gsap.killTweensOf([g.position, g.rotation, g.scale, p]);
    const draw = () => invalidate();
    const tl = gsap.timeline({ onUpdate: draw, onComplete: () => onLeftRef.current?.() });
    tl.to(p, { squash: 0.12, arms: 1, duration: 0.12 })
      .to(p, { squash: 0, duration: 0.1 })
      .to(g.position, { x: -side * OUT, z: -0.6, duration: 0.55, ease: "power1.in" }, "<")
      .to(g.position, { y: 1.1, duration: 0.25, ease: "power2.out" }, "<")
      .to(g.position, { y: 0.7, duration: 0.3, ease: "power2.in" }, ">")
      .to(g.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.35, ease: "power2.in" }, "<-0.1");
    return () => {
      tl.kill();
    };
  }, [leaving, side, invalidate]);

  return (
    <group ref={rig}>
      <Toy role={role} pose={pose} />
    </group>
  );
}
