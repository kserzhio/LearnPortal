import assert from "node:assert/strict";
import { buildShareUrl, isSafePublicShareUrl, type SharePayload } from "../src/features/sharing/share-links";

const payload: SharePayload = {
  title: "Заняття про High Load · SYSTEMA",
  text: "Я завершив курс «Архітектура систем» у SYSTEMA.",
  url: "https://learn-portal-gamma.vercel.app/courses/high-load-architecture",
};

const linkedIn = new URL(buildShareUrl("linkedin", payload));
assert.equal(linkedIn.origin, "https://www.linkedin.com");
assert.equal(linkedIn.searchParams.get("url"), payload.url);

const telegram = new URL(buildShareUrl("telegram", payload));
assert.equal(telegram.searchParams.get("url"), payload.url);
assert.equal(telegram.searchParams.get("text"), payload.text);

const x = new URL(buildShareUrl("x", payload));
assert.equal(x.origin, "https://x.com");
assert.equal(x.searchParams.get("url"), payload.url);
assert.equal(x.searchParams.get("text"), payload.text);

assert.equal(isSafePublicShareUrl(payload.url), true);
assert.equal(isSafePublicShareUrl("http://localhost:3000/courses"), true);
assert.equal(isSafePublicShareUrl("javascript:alert(1)"), false);
assert.equal(isSafePublicShareUrl("http://evil.example/courses"), false);
assert.equal(isSafePublicShareUrl("not-a-url"), false);

console.log("Sharing check passed: canonical URLs are validated and social URLs preserve Unicode text and exact public destinations.");
