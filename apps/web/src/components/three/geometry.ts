import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/** Shared, cached geometries so a table of figures stays light. */
const cache = new Map<string, THREE.BufferGeometry>();

function get<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = cache.get(key) as T | undefined;
  if (!g) {
    g = make();
    cache.set(key, g);
  }
  return g;
}

export const rbox = (w: number, h: number, d: number, r: number) =>
  get(`rb:${w}:${h}:${d}:${r}`, () => new RoundedBoxGeometry(w, h, d, 6, r));
export const sphere = (r: number) => get(`s:${r}`, () => new THREE.SphereGeometry(r, 40, 28));
export const capsule = (r: number, l: number) => get(`c:${r}:${l}`, () => new THREE.CapsuleGeometry(r, l, 8, 20));
export const cyl = (rt: number, rb: number, h: number) =>
  get(`cy:${rt}:${rb}:${h}`, () => new THREE.CylinderGeometry(rt, rb, h, 56, 1));
export const torus = (r: number, t: number, arc = Math.PI * 2) =>
  get(`t:${r}:${t}:${arc}`, () => new THREE.TorusGeometry(r, t, 16, 48, arc));
export const dome = (r: number) =>
  get(`d:${r}`, () => new THREE.SphereGeometry(r, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2));

export const star = () =>
  get("star", () => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 0.075 : 0.032;
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 });
  });
