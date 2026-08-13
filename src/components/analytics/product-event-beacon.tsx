"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/client";
import type { ProductAnalyticsEventName, ProductAnalyticsProperties } from "@/lib/analytics/events";

export function ProductEventBeacon<Name extends ProductAnalyticsEventName>({ name, properties }: Readonly<{ name: Name; properties: ProductAnalyticsProperties<Name> }>) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackEvent(name, properties);
  }, [name, properties]);
  return null;
}
