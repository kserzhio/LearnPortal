import { ImageResponse } from "next/og";
import { getCourseBySlug } from "@/content/courses";
import { SystemaOgCard } from "@/features/sharing/og-card";

export const alt = "Курс на навчальному порталі SYSTEMA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function CourseOpenGraphImage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  return new ImageResponse(
    <SystemaOgCard
      eyebrow={course?.status === "published" ? "ПРАКТИЧНИЙ КУРС" : "COURSE ROADMAP"}
      title={course?.title ?? "Навчальний портал SYSTEMA"}
      description={course?.description ?? "Інтерактивне навчання через практику та перевірку рішень."}
      accent={course?.accent ?? "SY"}
    />,
    { ...size },
  );
}
