import type { CourseSummary } from "@/content/courses";
import type { FaqItem } from "@/features/learning-support/content";
import { absoluteUrl, SITE_NAME } from "./site";

export type StructuredData = Readonly<Record<string, unknown>>;

export function courseStructuredData(course: CourseSummary): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description,
    url: absoluteUrl(`/courses/${course.slug}`),
    inLanguage: "uk",
    educationalLevel: course.level,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
  };
}

export function breadcrumbStructuredData(items: readonly Readonly<{ name: string; pathname: string }>[]): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.pathname),
    })),
  };
}

export function faqStructuredData(items: readonly FaqItem[]): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

