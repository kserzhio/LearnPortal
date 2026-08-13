"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";
import { sanitizeAnalyticsEvent, type ProductAnalyticsEventName, type ProductAnalyticsProperties } from "@/lib/analytics/events";

const ignoredPaths = new Set(["/auth/callback", "/auth/sign-out"]);

export function redactAnalyticsPageView(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = new URL(event.url);
  if (ignoredPaths.has(url.pathname)) return null;
  if (url.pathname.startsWith("/u/")) url.pathname = "/u/[username]";
  url.search = "";
  url.hash = "";
  return { ...event, url: url.toString() };
}

export function ProductAnalytics() {
  useEffect(() => {
    const receiveLegacyEvent = (rawEvent: Event) => {
      const detail = (rawEvent as CustomEvent<unknown>).detail;
      if (!detail || typeof detail !== "object") return;
      const candidate = detail as { name?: unknown; properties?: unknown };
      const event = sanitizeAnalyticsEvent(candidate.name, candidate.properties);
      if (event) trackEvent(event.name, event.properties as ProductAnalyticsProperties<ProductAnalyticsEventName>);
    };
    const receiveCtaClick = (rawEvent: MouseEvent) => {
      const target = rawEvent.target instanceof Element ? rawEvent.target.closest<HTMLElement>("[data-analytics-cta]") : null;
      const ctaId = target?.dataset.analyticsCta;
      const surface = target?.dataset.analyticsSurface;
      if (ctaId && surface) trackEvent("cta_clicked", { cta_id: ctaId, surface });
    };
    window.addEventListener("systema:analytics", receiveLegacyEvent);
    document.addEventListener("click", receiveCtaClick);
    return () => {
      window.removeEventListener("systema:analytics", receiveLegacyEvent);
      document.removeEventListener("click", receiveCtaClick);
    };
  }, []);

  return <Analytics beforeSend={redactAnalyticsPageView} />;
}
