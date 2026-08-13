import type { Metadata } from "next";
import { DirectionLanding } from "@/features/directions/direction-landing";
import { systemDesignDirection } from "@/features/directions/content";
import { createSeoMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createSeoMetadata({
  ...systemDesignDirection.seo,
  pathname: systemDesignDirection.pathname,
});

export default function SystemDesignDirectionPage() {
  return <DirectionLanding content={systemDesignDirection} />;
}

