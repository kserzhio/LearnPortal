"use client";

import { track } from "@vercel/analytics";
import { sanitizeAnalyticsEvent, type ProductAnalyticsEventName, type ProductAnalyticsProperties } from "./events";

const sentOnce = new Set<string>();
const customEventsEnabled = process.env.NEXT_PUBLIC_PRODUCT_ANALYTICS_CUSTOM_EVENTS === "true";

export function trackEvent<Name extends ProductAnalyticsEventName>(name: Name, properties: ProductAnalyticsProperties<Name>) {
  const event = sanitizeAnalyticsEvent(name, properties);
  if (!event || typeof window === "undefined") return false;
  if (customEventsEnabled) track(event.name, event.properties);
  window.dispatchEvent(new CustomEvent("systema:analytics:tracked", {
    detail: { ...event, delivery: customEventsEnabled ? "enabled" : "paused" },
  }));
  return true;
}

export function trackEventOnce<Name extends ProductAnalyticsEventName>(key: string, name: Name, properties: ProductAnalyticsProperties<Name>) {
  if (sentOnce.has(key)) return false;
  const tracked = trackEvent(name, properties);
  if (tracked) sentOnce.add(key);
  return tracked;
}
