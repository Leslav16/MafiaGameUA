/**
 * Counts attempts per key (an address, or an address and a room) inside a sliding window:
 * wrong passwords, new rooms. Old attempts are forgotten, so the counters never grow without end.
 */
export class Limiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  private recent(id: string, now: number): number[] {
    const recent = (this.hits.get(id) ?? []).filter((t) => t > now - this.windowMs);
    if (recent.length) this.hits.set(id, recent);
    else this.hits.delete(id);
    return recent;
  }

  /** True when this key has used up its attempts for now. */
  blocked(id: string, now = Date.now()): boolean {
    return this.recent(id, now).length >= this.max;
  }

  hit(id: string, now = Date.now()): void {
    this.hits.set(id, [...this.recent(id, now), now]);
  }

  /** Counts an attempt if there is room for it; false (and nothing counted) when blocked. */
  take(id: string, now = Date.now()): boolean {
    if (this.blocked(id, now)) return false;
    this.hit(id, now);
    return true;
  }

  clear(id: string): void {
    this.hits.delete(id);
  }

  /** Forgets everything outside the window. */
  sweep(now = Date.now()): void {
    for (const id of [...this.hits.keys()]) this.recent(id, now);
  }

  get size(): number {
    return this.hits.size;
  }
}
