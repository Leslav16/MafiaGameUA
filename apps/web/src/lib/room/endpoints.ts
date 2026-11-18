/**
 * Where the browser finds the game server and the video server.
 * By default both run on the same computer as the site: game server on port 4000,
 * LiveKit on port 7880. Set NEXT_PUBLIC_GAME_SERVER_URL to change the first;
 * the game server tells the browser the LiveKit address if LIVEKIT_PUBLIC_URL is set.
 */

export function gameServerUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_GAME_SERVER_URL;
  if (fromEnv) return fromEnv;
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:4000`;
}

export function livekitUrl(fromServer?: string): string {
  if (fromServer) return fromServer;
  const { protocol, hostname } = window.location;
  return `${protocol === "https:" ? "wss" : "ws"}://${hostname}:7880`;
}

const storageKey = (code: string) => `mafia:room:${code}`;

/** The secret key that lets this browser come back to its seat after a reload. */
export function loadKey(code: string): string | null {
  try {
    return localStorage.getItem(storageKey(code));
  } catch {
    return null;
  }
}

export function saveKey(code: string, key: string | null): void {
  try {
    if (key) localStorage.setItem(storageKey(code), key);
    else localStorage.removeItem(storageKey(code));
  } catch {
    // Private mode or blocked storage: the player just can't come back after a reload.
  }
}
