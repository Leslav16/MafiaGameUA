"use client";

import Link from "next/link";

export function LanguageSwitch({
  href,
  locale,
  label,
  ariaLabel,
}: {
  href: string;
  locale: string;
  label: string;
  ariaLabel: string;
}) {
  return (
    <Link
      href={href}
      hrefLang={locale}
      lang={locale}
      aria-label={ariaLabel}
      onClick={() => {
        document.cookie = `lang=${locale}; path=/; max-age=31536000; samesite=lax`;
      }}
      className="inline-flex min-h-11 items-center px-2 text-base underline decoration-[var(--line)] underline-offset-4 hover:decoration-[var(--accent)]"
    >
      {label}
    </Link>
  );
}
