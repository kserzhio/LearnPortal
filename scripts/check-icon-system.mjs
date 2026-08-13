import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

async function filesUnder(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(target, extension) : entry.name.endsWith(extension) ? [target] : [];
  }));
  return nested.flat();
}

const tsxFiles = await filesUnder("src", ".tsx");
const tsxSources = await Promise.all(tsxFiles.map(async (file) => [file, await readFile(file, "utf8")]));
const prohibitedEmoji = /[❓💡🐛👍👎⚑★▶]/u;
const violations = tsxSources.filter(([, source]) => prohibitedEmoji.test(source)).map(([file]) => file);
assert.deepEqual(violations, [], `Product emoji must use SystemIcon instead: ${violations.join(", ")}`);

const [systemIcon, legacyIcons, legacyApp, iconSpec, packageJson] = await Promise.all([
  readFile("src/components/ui/system-icon.tsx", "utf8"),
  readFile("public/legacy/runtime/icons.js", "utf8"),
  readFile("public/legacy/app.js", "utf8"),
  readFile("docs/ICON_SYSTEM.md", "utf8"),
  readFile("package.json", "utf8"),
]);

assert.match(systemIcon, /focusable="false"/, "React icons must not enter keyboard focus.");
assert.match(systemIcon, /aria-hidden/, "Decorative React icons must be hidden from assistive technology.");
assert.match(systemIcon, /aria-label/, "Meaningful React icons must support accessible labels.");
assert.doesNotMatch(systemIcon, /lucide-react\/dynamic/, "Do not ship Lucide's dynamic all-icons loader.");
assert.match(legacyIcons, /currentColor/, "Legacy icons must inherit the product color system.");
assert.match(legacyIcons, /MutationObserver/, "Dynamic legacy controls must receive the same icon treatment.");
assert.match(legacyApp, /initializeLegacyIconSystem\(\)/, "Legacy icon enhancement must initialize on every lesson.");
assert.match(iconSpec, /never the only success, error or status indicator/i, "The icon specification must prohibit icon-only status meaning.");
assert.match(packageJson, /"lucide-react"/, "Lucide React must be an explicit dependency.");

console.log(`Icon-system check passed: ${tsxFiles.length} TSX files contain no prohibited product emoji; React and legacy accessibility contracts are present.`);
