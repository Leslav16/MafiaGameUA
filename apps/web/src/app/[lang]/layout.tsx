import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Golos_Text, Oswald, Playfair_Display, Rubik_Dirt } from "next/font/google";
import { getDictionary, hasLocale, locales } from "./dictionaries";
import "../globals.css";

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

/** Main headings only (the landing title, the nightfall): a worn rubber-stamp face, chosen by the owner. */
const dirt = Rubik_Dirt({
  variable: "--font-dirt",
  subsets: ["latin", "cyrillic"],
  weight: "400",
});

/** The classic partner for the stamp: italic lines under the main headings. */
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "cyrillic"],
  weight: ["700"],
  style: ["italic"],
});

const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
});

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  // Link previews (Telegram, Viber...) need the picture's full address, and the site's address
  // changes with every free Cloudflare link, so it is read from the request itself.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  // On the home network (localhost or an IP) it is http; any named address is the https Cloudflare link.
  const proto = /^(localhost|\d+\.\d+\.\d+\.\d+)(:\d+)?$/.test(host) ? "http" : "https";
  return {
    metadataBase: `${proto}://${host}`,
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: { languages: { uk: "/uk", en: "/en" } },
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      type: "website",
      locale: lang === "uk" ? "uk_UA" : "en_US",
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: dict.meta.title }],
    },
    twitter: { card: "summary_large_image", images: ["/og.jpg"] },
  };
}

/** Tells Next the link-preview metadata above is read per request on purpose; the page itself stays prerendered. */
async function RequestMarker() {
  await connection();
  return null;
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  return (
    <html lang={lang} className={`${oswald.variable} ${golos.variable} ${dirt.variable} ${playfair.variable}`}>
      <body>
        {children}
        <Suspense>
          <RequestMarker />
        </Suspense>
      </body>
    </html>
  );
}
