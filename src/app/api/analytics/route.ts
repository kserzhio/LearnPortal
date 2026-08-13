import { track } from "@vercel/analytics/server";
import { sanitizeAnalyticsEvent } from "@/lib/analytics/events";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = request.headers.get("x-vercel-id");
  try {
    const body: unknown = await request.json();
    const candidate = body && typeof body === "object" ? body as { name?: unknown; properties?: unknown } : {};
    const event = sanitizeAnalyticsEvent(candidate.name, candidate.properties);
    if (!event) return Response.json({ error: "Invalid analytics event." }, { status: 400 });
    if (process.env.PRODUCT_ANALYTICS_CUSTOM_EVENTS !== "true") {
      return new Response(null, { status: 204, headers: { "x-systema-analytics": "paused" } });
    }
    await track(event.name, event.properties);
    console.log(JSON.stringify({ level: "info", message: "analytics_event_accepted", event: event.name, requestId, durationMs: Date.now() - startedAt }));
    return new Response(null, { status: 204 });
  } catch {
    console.error(JSON.stringify({ level: "error", message: "analytics_event_rejected", requestId, durationMs: Date.now() - startedAt }));
    return Response.json({ error: "Invalid analytics request." }, { status: 400 });
  }
}
