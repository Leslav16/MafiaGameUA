/** Small line icons for camera and mic state. Decorative: buttons carry their own labels. */

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function MicIcon({ off }: { off?: boolean }) {
  return (
    <svg {...base}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}

export function CamIcon({ off }: { off?: boolean }) {
  return (
    <svg {...base}>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="M16 10l5-3v10l-5-3z" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}
