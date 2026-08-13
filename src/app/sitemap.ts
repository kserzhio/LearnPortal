import type { MetadataRoute } from "next";
import { courses, getPublicCourseLessons, getPublicLessonPath } from "@/content/courses";
import { kidsCourses } from "@/features/kids-coding/content/course-registry";
import { directions } from "@/features/directions/content";
import { absoluteUrl } from "@/lib/seo/site";
import { getPublishedFinalProjects } from "@/features/final-projects/content/final-project-registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const publishedCourses = courses.filter((course) => course.status === "published");
  const courseEntries: MetadataRoute.Sitemap = publishedCourses.map((course) => ({
    url: absoluteUrl(`/courses/${course.slug}`),
    changeFrequency: "monthly",
    priority: 0.8,
  }));
  const lessonEntries: MetadataRoute.Sitemap = publishedCourses.flatMap((course) =>
    getPublicCourseLessons(course.id).flatMap((lesson) => {
      const pathname = getPublicLessonPath(course.slug, lesson);
      return pathname ? [{ url: absoluteUrl(pathname), changeFrequency: "monthly" as const, priority: 0.7 }] : [];
    }),
  );
  const kidsPreviewEntries: MetadataRoute.Sitemap = kidsCourses.flatMap((course) => {
    const world = course.worlds[0];
    const level = world?.levels[0];
    return world && level ? [{
      url: absoluteUrl(`/kids-coding/${course.id}/${world.id}/${level.id}`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }] : [];
  });
  const directionEntries: MetadataRoute.Sitemap = directions.map((direction) => ({
    url: absoluteUrl(direction.pathname),
    changeFrequency: "monthly",
    priority: 0.8,
  }));
  const finalProjectEntries: MetadataRoute.Sitemap = getPublishedFinalProjects().map((project) => ({
    url: absoluteUrl(`/projects/${project.slug}`),
    changeFrequency: "monthly",
    priority: 0.8,
  }));
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/courses"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/paths"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/skills"), changeFrequency: "weekly", priority: 0.8 },
    ...directionEntries,
    ...courseEntries,
    ...lessonEntries,
    ...finalProjectEntries,
    ...kidsPreviewEntries,
  ];
}
