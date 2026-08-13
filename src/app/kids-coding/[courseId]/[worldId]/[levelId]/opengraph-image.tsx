import { ImageResponse } from "next/og";
import { getKidsLevel } from "@/features/kids-coding/content";
import { SystemaOgCard } from "@/features/sharing/og-card";

export const alt = "Інтерактивна вправа з програмування для дітей у SYSTEMA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function KidsLevelOpenGraphImage({ params }: Readonly<{ params: Promise<{ courseId:string; worldId:string; levelId:string }> }>) {
  const { courseId, worldId, levelId } = await params;
  const found = getKidsLevel(courseId, worldId, levelId);

  return new ImageResponse(
    <SystemaOgCard
      eyebrow="KIDS CODING · ІНТЕРАКТИВНА ВПРАВА"
      title={found?.level.title ?? "Навчальна вправа SYSTEMA"}
      description={found?.level.description ?? "Навчання алгоритмів і JavaScript через гру."}
      accent={found?.course.accent ?? "KC"}
    />,
    { ...size },
  );
}
