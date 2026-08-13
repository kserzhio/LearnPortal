import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sitemap from "../src/app/sitemap";
import robots from "../src/app/robots";
import { getCourseBySlug, getPublicCourseLessons, getPublicLessonPath } from "../src/content/courses";
import { absoluteUrl } from "../src/lib/seo/site";
import { directions } from "../src/features/directions/content";

const course = getCourseBySlug("high-load-architecture");
assert(course && course.status === "published");
const publicLesson = getPublicCourseLessons(course.id)[0];
assert(publicLesson?.seo?.slug === "what-is-high-load");
const publicLessonPath = getPublicLessonPath(course.slug, publicLesson);
assert.equal(publicLessonPath, "/courses/high-load-architecture/lessons/what-is-high-load");

const entries = sitemap();
const urls = entries.map((entry) => entry.url);
assert(urls.includes(absoluteUrl("/")));
assert(urls.includes(absoluteUrl("/courses")));
assert(urls.includes(absoluteUrl(`/courses/${course.slug}`)));
assert(urls.includes(absoluteUrl(publicLessonPath)));
for (const direction of directions) assert(urls.includes(absoluteUrl(direction.pathname)));
assert(!urls.some((url) => /\/auth\/|\/dashboard\/|\/profile\/|\/legacy\//.test(url)));
assert.equal(new Set(urls).size, urls.length);

const robotsFile = robots();
const rules = Array.isArray(robotsFile.rules) ? robotsFile.rules : [robotsFile.rules];
const disallowed = rules.flatMap((rule) => Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : []);
for (const pathname of ["/api/", "/auth/", "/dashboard/", "/profile/", "/legacy/"]) assert(disallowed.includes(pathname));
assert.equal(robotsFile.sitemap, absoluteUrl("/sitemap.xml"));

const [layout, coursePage, lessonPage, previewPage, seoDocs] = await Promise.all([
  readFile("src/app/layout.tsx", "utf8"),
  readFile("src/app/courses/[slug]/page.tsx", "utf8"),
  readFile("src/app/courses/high-load-architecture/lessons/what-is-high-load/page.tsx", "utf8"),
  readFile("src/app/courses/high-load-architecture/preview/page.tsx", "utf8"),
  readFile("docs/TECHNICAL_SEO.md", "utf8"),
]);
assert.match(layout, /metadataBase: SITE_URL/);
assert.match(coursePage, /courseStructuredData/);
assert.match(coursePage, /faqStructuredData/);
assert.match(lessonPage, /breadcrumbStructuredData/);
assert.match(previewPage, /permanentRedirect/);
assert.match(seoDocs, /не обходить server-side access rules/i);

console.log(`Technical SEO check passed: ${entries.length} unique public URLs, canonical lesson redirect, private-route exclusions and truthful schemas are present.`);
