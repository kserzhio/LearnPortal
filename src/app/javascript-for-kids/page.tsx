import type { Metadata } from "next";
import { DirectionLanding } from "@/features/directions/direction-landing";
import { javascriptForKidsDirection } from "@/features/directions/content";
import { createSeoMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createSeoMetadata({
  ...javascriptForKidsDirection.seo,
  pathname: javascriptForKidsDirection.pathname,
});

export default function JavaScriptForKidsDirectionPage() {
  return <DirectionLanding content={javascriptForKidsDirection} />;
}

