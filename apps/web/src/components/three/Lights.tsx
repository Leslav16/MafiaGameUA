"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Soft studio light for vinyl: a neutral room reflection (for the glossy
 * eyes and clear coat), a warm key light from the lamp above with soft
 * shadows, and a cool fill. `night` dims the key and fill.
 */
export function Lights({ night = false, keyAt = [0.5, 6, 3] as [number, number, number] }) {
  const gl = useThree((st) => st.gl);
  const get = useThree((st) => st.get);
  const key = useRef<THREE.SpotLight>(null);
  const fill = useRef<THREE.HemisphereLight>(null);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const scene = get().scene;
    scene.environment = env;
    scene.environmentIntensity = 0.55;
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, get]);

  useFrame((state, dt) => {
    const k = 1 - Math.exp(-dt * 3);
    if (key.current) key.current.intensity = THREE.MathUtils.lerp(key.current.intensity, night ? 25 : 70, k);
    if (fill.current) fill.current.intensity = THREE.MathUtils.lerp(fill.current.intensity, night ? 0.25 : 1.1, k);
    const scene = state.scene;
    scene.environmentIntensity = THREE.MathUtils.lerp(scene.environmentIntensity ?? 0.55, night ? 0.18 : 0.55, k);
  });

  return (
    <>
      <hemisphereLight ref={fill} args={["#fff1dc", "#3a2414", 1.1]} />
      <spotLight
        ref={key}
        position={keyAt}
        angle={0.75}
        penumbra={0.9}
        intensity={70}
        color="#ffd9a0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-radius={6}
      />
      <directionalLight position={[-4, 3, 5]} intensity={0.5} color="#e6cfa8" />
    </>
  );
}
