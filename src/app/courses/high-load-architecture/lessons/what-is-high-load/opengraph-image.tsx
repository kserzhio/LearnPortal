import { ImageResponse } from "next/og";
import { getLessons } from "@/content/course-contract";
import { highLoadArchitectureCourse } from "@/content/courses/high-load-architecture";
import { SystemaOgCard } from "@/features/sharing/og-card";

export const alt = "Публічне заняття про High Load і High Availability у SYSTEMA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function LessonOpenGraphImage() {
  const lesson = getLessons(highLoadArchitectureCourse)[0];
  return new ImageResponse(
    <SystemaOgCard eyebrow="ПУБЛІЧНЕ ЗАНЯТТЯ · 01" title={lesson.title} description={lesson.summary} accent="HL" />,
    { ...size },
  );
}
