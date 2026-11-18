/** Shared look for the host panel's controls. Plain on purpose; the design work may restyle. */
export const btn =
  "inline-flex min-h-10 items-center justify-center gap-1 rounded-md border px-3 font-medium transition-colors disabled:opacity-40";
export const plain = "border-[var(--line)] bg-[var(--surface-raised)] hover:border-lamp";
export const primary = "border-lamp bg-lamp text-ink hover:brightness-105";
export const danger = "border-oxblood bg-oxblood text-card hover:brightness-110";
export const big = "min-h-12 w-full text-lg";

export type HostDict = typeof import("../../app/[lang]/dictionaries/en.json")["hostPanel"];
export type RoleNames = typeof import("../../app/[lang]/dictionaries/en.json")["roomUi"]["roles"];
