import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const projectRoot = process.cwd();
const ignoredDirectories = new Set([".git", ".next", ".vercel", "node_modules"]);
const fontDeclarationPattern = /font(?:-size)?\s*:[^;}]+/giu;
const remValuePattern = /(?<![\w-])(\d*\.?\d+)rem/giu;
const pixelValuePattern = /(?<![\w-])\d*\.?\d+px/giu;

async function findCssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(entries.map(async (entry) => {
    if (ignoredDirectories.has(entry.name)) return [];
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return findCssFiles(entryPath);
    return extname(entry.name) === ".css" ? [entryPath] : [];
  }));
  return nestedFiles.flat();
}

const violations = [];
for (const filePath of await findCssFiles(projectRoot)) {
  const source = await readFile(filePath, "utf8");
  for (const declaration of source.matchAll(fontDeclarationPattern)) {
    if (pixelValuePattern.test(declaration[0])) {
      const line = source.slice(0, declaration.index).split("\n").length;
      violations.push(`${relative(projectRoot, filePath)}:${line} use rem instead of px: ${declaration[0]}`);
    }
    pixelValuePattern.lastIndex = 0;
    for (const value of declaration[0].matchAll(remValuePattern)) {
      if (Number(value[1]) < 1) {
        const ruleStart = source.lastIndexOf("}", declaration.index) + 1;
        const selectorEnd = source.indexOf("{", ruleStart);
        const selector = source.slice(ruleStart, selectorEnd).trim();
        const isLegacySidebarException = relative(projectRoot, filePath).replaceAll("\\", "/") === "public/legacy/styles.css"
          && (selector.includes(".course-navigation") || selector.includes(".course-switcher"));
        if (isLegacySidebarException && Number(value[1]) === 0.8) continue;
        const line = source.slice(0, declaration.index).split("\n").length;
        violations.push(`${relative(projectRoot, filePath)}:${line} ${declaration[0]}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Readable text must use a font size of at least 1rem:\n" + violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Font-size check passed: text is at least 1rem, except the explicit 0.8rem legacy sidebar density overrides.");
}
