import * as THREE from "three";

/**
 * Vinyl-toy materials: a soft satin plastic with a light clear coat, glossy
 * black for the eyes. Cached by colour so every figure shares them.
 */
const cache = new Map<string, THREE.Material>();

export function vinyl(color: string, opts: { gloss?: number; rough?: number; metal?: number } = {}) {
  const key = `v:${color}:${opts.gloss ?? 0.35}:${opts.rough ?? 0.42}:${opts.metal ?? 0}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshPhysicalMaterial({
      color,
      roughness: opts.rough ?? 0.42,
      metalness: opts.metal ?? 0,
      clearcoat: opts.gloss ?? 0.35,
      clearcoatRoughness: 0.35,
      sheen: 0.15,
    });
    cache.set(key, m);
  }
  return m;
}

export function glossyBlack() {
  let m = cache.get("eye");
  if (!m) {
    m = new THREE.MeshPhysicalMaterial({
      color: "#070505",
      roughness: 0.08,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
    });
    cache.set("eye", m);
  }
  return m;
}
