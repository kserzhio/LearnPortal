import type { Metadata } from "next";

export const SITE_NAME = "SYSTEMA";
export const DEFAULT_SITE_URL = "https://learn-portal-gamma.vercel.app";

function configuredSiteUrl() {
  const candidate = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  try {
    return new URL(candidate || DEFAULT_SITE_URL);
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

export const SITE_URL = configuredSiteUrl();

export function absoluteUrl(pathname: string) {
  return new URL(pathname, SITE_URL).toString();
}

type SeoMetadataInput = Readonly<{
  title: string;
  description: string;
  pathname: string;
  keywords?: readonly string[];
  index?: boolean;
}>;

export function createSeoMetadata({ title, description, pathname, keywords = [], index = true }: SeoMetadataInput): Metadata {
  const canonical = absoluteUrl(pathname);
  const socialTitle = `${title} · ${SITE_NAME}`;
  return {
    title,
    description,
    keywords: [...new Set(keywords)],
    alternates: { canonical },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
    openGraph: {
      type: "website",
      locale: "uk_UA",
      siteName: SITE_NAME,
      url: canonical,
      title: socialTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
    },
  };
}
