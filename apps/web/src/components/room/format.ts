/** Fills "{n}" in a dictionary string. */
export function fill(text: string, n: number | string) {
  return text.replaceAll("{n}", String(n));
}

/** 75 -> "1:15" */
export function clock(totalSeconds: number) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
