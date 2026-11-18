/**
 * Places for the introduction round: before the game the host picks one (or a
 * random one, or types their own), and everyone introduces themselves as if
 * they were there. The list itself lives in the dictionaries ("locations").
 * The room stores "loc:<id>" for a ready place, or the host's own words.
 */
export type Location = { id: string; name: string; text: string };

export function findLocation(value: string | null | undefined, list: Location[]): Location | null {
  if (!value?.startsWith("loc:")) return null;
  return list.find((l) => l.id === value.slice(4)) ?? null;
}

/** The place's display name: a ready place by its name, or the host's own words. */
export function locationName(value: string | null | undefined, list: Location[]): string | null {
  if (!value) return null;
  return findLocation(value, list)?.name ?? (value.startsWith("loc:") ? null : value);
}

/** A random place other than the current one. */
export function randomLocation(list: Location[], current?: string | null): string {
  const others = list.filter((l) => `loc:${l.id}` !== current);
  const pool = others.length ? others : list;
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return `loc:${pool[bytes[0] % pool.length].id}`;
}
