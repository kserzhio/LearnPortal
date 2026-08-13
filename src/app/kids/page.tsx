import type { Metadata } from "next";
import { DirectionLanding } from "@/features/directions/direction-landing";
import { kidsDirection } from "@/features/directions/content";
import { createSeoMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createSeoMetadata({
  ...kidsDirection.seo,
  pathname: kidsDirection.pathname,
});

export default function KidsDirectionPage() {
  return <DirectionLanding content={kidsDirection} />;
}

