import * as THREE from "three";

/**
 * Vinyl-toy materials in the game's palette: matte plastic with only a faint
 * clear coat, brass for badges and rims, glossy black for the eyes, and a
 * glowing cigar ember. Cached by their settings so every figure shares them;
 * they live for the whole page (a handful of small materials), so they are
 * never disposed one by one.
 */
const cache = new Map<string, THREE.Material>();

function cached<T extends THREE.Material>(key: string, make: () => T): T {
  let m = cache.get(key) as T | undefined;
  if (!m) {
    m = make();
    cache.set(key, m);
  }
  return m;
}

export function matte(color: string, opts: { rough?: number; coat?: number } = {}) {
  const rough = opts.rough ?? 0.62;
  const coat = opts.coat ?? 0.12;
  return cached(
    `m:${color}:${rough}:${coat}`,
    () => new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0, clearcoat: coat, clearcoatRoughness: 0.5, sheen: 0.2, sheenColor: new THREE.Color("#f3dfb8") }),
  );
}

export const brass = () =>
  cached("brass", () => new THREE.MeshPhysicalMaterial({ color: "#c8893f", roughness: 0.32, metalness: 0.85, clearcoat: 0.4 }));

export const ember = () =>
  cached("ember", () => new THREE.MeshStandardMaterial({ color: "#ff7a2a", emissive: "#ff5a12", emissiveIntensity: 2.2, roughness: 0.6 }));

export const glossyBlack = () =>
  cached(
    "eye",
    () => new THREE.MeshPhysicalMaterial({ color: "#070505", roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03 }),
  );
