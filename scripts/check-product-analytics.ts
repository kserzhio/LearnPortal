import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sanitizeAnalyticsEvent } from "../src/lib/analytics/events";

const valid = sanitizeAnalyticsEvent("lesson_viewed", { course_id: "high-load-architecture", content_id: "high-load-01" });
assert.equal(valid?.name, "lesson_viewed");
assert.deepEqual(valid?.properties, { course_id: "high-load-architecture", content_id: "high-load-01" });
assert.equal(sanitizeAnalyticsEvent("lesson_viewed", { course_id: "high-load-architecture", content_id: "high-load-01", email: "person@example.com" }), null);
assert.equal(sanitizeAnalyticsEvent("question_created", { content_id: "high-load-01", question_type: "person@example.com" }), null);
assert.equal(sanitizeAnalyticsEvent("unknown", {}), null);
assert.equal(sanitizeAnalyticsEvent("hint_opened", { content_id: "high-load-01", stage: { value: 1 } }), null);

const [layout, analyticsComponent, apiRoute, legacyAnalytics, docs, packageJson] = await Promise.all([
  readFile("src/app/layout.tsx", "utf8"),
  readFile("src/components/analytics/product-analytics.tsx", "utf8"),
  readFile("src/app/api/analytics/route.ts", "utf8"),
  readFile("public/legacy/runtime/analytics.js", "utf8"),
  readFile("docs/PRODUCT_ANALYTICS.md", "utf8"),
  readFile("package.json", "utf8"),
]);

assert.match(packageJson, /"@vercel\/analytics"/);
assert.match(layout, /<ProductAnalytics \/>/);
assert.match(analyticsComponent, /url\.search = ""/);
assert.match(analyticsComponent, /url\.hash = ""/);
assert.match(analyticsComponent, /\/auth\/callback/);
assert.match(apiRoute, /sanitizeAnalyticsEvent/);
assert.match(apiRoute, /PRODUCT_ANALYTICS_CUSTOM_EVENTS/);
assert.match(analyticsComponent, /<Analytics/);
assert.doesNotMatch(legacyAnalytics, /localStorage|sessionStorage|userId|email/i);
assert.match(docs, /Custom events.*Pro\/Enterprise/i);
assert.match(docs, /custom events поставлено на паузу/i);
assert.match(docs, /question\/reply\/comment text/i);

console.log("Product analytics check passed: provider is singular, event payloads are allowlisted, and sensitive page/event data is rejected.");
