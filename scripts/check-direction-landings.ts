import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { directions } from "../src/features/directions/content";

function relativeLuminance(hex: string) {
  const channels = hex.match(/[a-f\d]{2}/gi)?.map((value) => Number.parseInt(value, 16) / 255) ?? [];
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrastRatio(first: string, second: string) {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].toSorted((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

assert.equal(directions.length, 3);
assert.deepEqual(directions.map((direction) => direction.pathname), ["/system-design", "/kids", "/javascript-for-kids"]);
assert.equal(new Set(directions.map((direction) => direction.id)).size, directions.length);
assert.equal(new Set(directions.map((direction) => direction.pathname)).size, directions.length);
assert.equal(new Set(directions.map((direction) => direction.seo.title)).size, directions.length);
assert.equal(new Set(directions.map((direction) => direction.seo.description)).size, directions.length);

for (const direction of directions) {
  assert(direction.outcomes.length >= 3);
  assert.equal(direction.method.length, 4);
  assert(direction.courses.length >= 1);
  assert(direction.faqs.length >= 3);
  assert(direction.primaryCta.href.startsWith("/"));
  assert(!/planned|coming soon|скоро|у розробці/i.test(JSON.stringify(direction.courses)));
  assert(!direction.courses.some((course) => /auth|dashboard|profile|legacy/.test(course.href)));
  await access(`src/app${direction.pathname}/page.tsx`);
}

const [component, styles, sitemap, header, homepage] = await Promise.all([
  readFile("src/features/directions/direction-landing.tsx", "utf8"),
  readFile("src/features/directions/direction-landing.module.css", "utf8"),
  readFile("src/app/sitemap.ts", "utf8"),
  readFile("src/components/site-header.tsx", "utf8"),
  readFile("src/app/page.tsx", "utf8"),
]);

assert.match(component, /<main/);
assert.match(component, /<h1/);
assert.match(component, /faqStructuredData/);
assert.match(component, /ServerFailureDemo/);
assert.match(component, /<details/);
assert.match(styles, /@media \(max-width:30em\)/);
assert.match(styles, /@media \(prefers-reduced-motion:reduce\)/);
assert.match(styles, /@media \(forced-colors:active\)/);
assert.doesNotMatch(styles, /\b\d+(?:\.\d+)?px\b/);
assert.doesNotMatch(styles, /font(?:-size)?:[^;]*(?:0\.[0-9]+)rem/);
for (const [foreground, background] of [["#d7d8e2", "#16172b"], ["#c9c5ff", "#16172b"], ["#5f6070", "#f7f6f2"], ["#ffffff", "#4d3fc2"], ["#17182b", "#c8f35e"]]) {
  assert(contrastRatio(foreground, background) >= 4.5, `${foreground} on ${background} must meet WCAG AA text contrast`);
}
assert.match(sitemap, /directions\.map/);
assert.match(header, /href="\/system-design"/);
assert.match(header, /href="\/kids"/);
assert.match(homepage, /href="\/system-design"/);
assert.match(homepage, /href="\/kids"/);

console.log("Direction landing check passed: three unique real-content routes share one accessible, responsive and SEO-ready contract.");
