/**
 * Where the browser finds the game server and the video server.
 *
 * Opened on port 3000 (the site on its own, `npm run dev:web` or http://localhost:3000):
 * game server on port 4000 and LiveKit on port 7880 of the same computer.
 *
 * Opened any other way (the gateway on http://localhost:8080, or the internet link from
 * start-online.bat): everything sits behind one address, so the browser uses that same
 * address for the game server and for LiveKit's signalling.
 *
 * NEXT_PUBLIC_GAME_SERVER_URL overrides the game server address; the game server tells
 * the browser the LiveKit address when LIVEKIT_PUBLIC_URL is set (LiveKit Cloud).
 */

const DIRECT_SITE_PORT = "3000";

function behindGateway(): boolean {
  return window.location.port !== DIRECT_SITE_PORT;
}

export function gameServerUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_GAME_SERVER_URL;
  if (fromEnv) return fromEnv;
  const { protocol, hostname, origin } = window.location;
  if (behindGateway()) return origin;
  return `${protocol}//${hostname}:4000`;
}

export function livekitUrl(fromServer?: string): string {
  if (fromServer) return fromServer;
  const { protocol, hostname, host } = window.location;
  const ws = protocol === "https:" ? "wss" : "ws";
  if (behindGateway()) return `${ws}://${host}`;
  return `${ws}://${hostname}:7880`;
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
