import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const level = read("src/features/kids-coding/ui/level-screen.tsx");
const levelCss = read("src/features/kids-coding/ui/level-screen.module.css");
const map = read("src/features/kids-coding/ui/world-map.tsx");
const mapCss = read("src/features/kids-coding/ui/world-map.module.css");
const dashboard = read("src/features/kids-coding/ui/course-dashboard.tsx");
const dashboardCss = read("src/features/kids-coding/ui/course-dashboard.module.css");
const globalsCss = read("src/app/globals.css");
const sandbox = read("src/features/kids-coding/sandbox/restricted-javascript.ts");
const progressApi = read("src/app/api/kids-progress/route.ts");
const proxy = read("src/proxy.ts");

const requiredLevelContracts = [
  'role="img"', 'aria-live="polite"', 'role="group"', 'aria-busy=',
  'aria-label={`Позиція у світі:', 'aria-describedby="kids-code-help"',
  'aria-errormessage=', 'aria-invalid=', 'aria-labelledby="code-feedback-title"',
  'aria-label="Збереження прогресу"', 'role="status"',
];
requiredLevelContracts.forEach((contract) => assert.ok(level.includes(contract), `Missing level accessibility contract: ${contract}`));
[
  'aria-current={level.status === "current" ? "step" : undefined}',
  'levelStatusCopy[level.status]',
  '${level.stars} із 3 зірок',
  'id="world-map-progress"',
  'aria-label={`Загальний прогрес: ${map.completedLevels} із ${map.totalLevels} рівнів`}',
].forEach((contract) => assert.ok(map.includes(contract), `Missing map accessibility contract: ${contract}`));
assert.ok(dashboard.includes('aria-label={`Прогрес ${course.title}:'), "Course-card progress needs an accessible name.");

const kidsCss = `${levelCss}\n${mapCss}\n${dashboardCss}`;
assert.equal(/\d+(?:\.\d+)?px\b/i.test(kidsCss), false, "Kids Coding CSS must not contain px declarations.");
assert.ok(levelCss.includes("min-height: 2.75rem"), "Interactive controls need a 2.75rem minimum target.");
assert.ok(levelCss.includes(".breadcrumbs a { display: inline-flex; min-height: 2.75rem"), "Level breadcrumbs need a 2.75rem target.");
assert.ok(globalsCss.includes(".site-brand { display:flex; min-height:2.75rem"), "The shared brand link needs a 2.75rem target.");
assert.ok(globalsCss.includes(".site-header nav a { display:inline-flex; min-height:2.75rem"), "Header navigation links need a 2.75rem target.");
assert.ok(globalsCss.includes(".user-chip { display:grid; width:2.75rem; height:2.75rem"), "The profile link needs a 2.75rem target.");
assert.ok(levelCss.includes("@media (max-width: 30em)"), "Level screen needs a 20rem-oriented reflow breakpoint.");
assert.ok(mapCss.includes("@media (max-width: 25em)"), "World Map needs a narrow reflow breakpoint.");
assert.ok(levelCss.includes("@media (prefers-reduced-motion: reduce)"), "Level screen must respect reduced motion.");
assert.ok(levelCss.includes("@media (forced-colors: active)"), "Level screen must support Forced Colors.");
assert.ok(mapCss.includes("@media (forced-colors: active)"), "World Map must support Forced Colors.");
assert.ok(dashboardCss.includes("@media (forced-colors: active)"), "Kids course cards must support Forced Colors.");
assert.ok(levelCss.includes(":focus-visible") && mapCss.includes(":focus-visible") && dashboardCss.includes(":focus-visible"), "Every Kids surface needs visible focus styles.");

function luminance(hex) {
  const channels = hex.match(/[a-f0-9]{2}/gi).map((value) => Number.parseInt(value, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const textPairs = [
  ["primary text", "#f8f9ff", "#111426"],
  ["muted page text", "#c9cee2", "#111426"],
  ["muted panel text", "#c9cee2", "#1b2038"],
  ["lime text", "#c8f35e", "#111426"],
  ["dark CTA text", "#111426", "#c8f35e"],
  ["violet metadata", "#a9a0ff", "#111426"],
  ["obstacle", "#ffb6c5", "#292f4f"],
  ["remove action", "#ffffff", "#5a2142"],
  ["code CTA", "#f8f9ff", "#5748c9"],
  ["earned star", "#ffe27a", "#173a35"],
  ["retry text", "#c9cee2", "#3b1e32"],
];
textPairs.forEach(([name, foreground, background]) => {
  assert.ok(contrast(foreground, background) >= 4.5, `${name} must meet WCAG AA text contrast.`);
});
assert.ok(contrast("#68708f", "#1b2038") >= 3, "Component boundaries must meet non-text contrast.");
assert.ok(contrast("#c8f35e", "#111426") >= 3, "Focus indicator must meet non-text contrast.");

assert.equal(/\beval\s*\(/.test(sandbox), false, "Sandbox must not execute eval.");
assert.equal(/new\s+Function\s*\(/.test(sandbox), false, "Sandbox must not create Function constructors.");
assert.ok(progressApi.includes("verifyAttempt") && progressApi.includes("createGameExecutionEngine"), "Server must re-run submitted attempts.");
assert.ok(progressApi.includes("sameOrigin(request)") && progressApi.includes("authenticatedClient()"), "Progress mutations need origin and auth checks.");
assert.ok(proxy.includes("lockedKidsPath") && proxy.includes("kidsPreviewPathByCourse"), "Guest and locked Kids paths need server enforcement.");

console.log(`Kids accessibility contract passed: ${textPairs.length} text contrast pairs, non-text contrast, semantics, focus, 20rem reflow, reduced motion, Forced Colors and sandbox/server guards.`);
