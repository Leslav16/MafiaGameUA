/** Shared look for the host panel's controls: one shape, one press feel (`.btn-feel` in globals.css). */
export const btn =
  "btn-feel inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 font-medium disabled:opacity-40";
export const plain = "border-[var(--line)] bg-[var(--surface-raised)] hover:border-lamp hover:bg-[color-mix(in_oklab,var(--surface-raised),var(--color-lamp)_10%)]";
export const primary = "border-lamp bg-lamp text-ink hover:brightness-105";
export const danger = "border-oxblood bg-oxblood text-card hover:brightness-110";
export const big = "min-h-12 w-full text-lg";

export type HostDict = typeof import("../../app/[lang]/dictionaries/en.json")["hostPanel"];
export type RoleNames = typeof import("../../app/[lang]/dictionaries/en.json")["roomUi"]["roles"];
