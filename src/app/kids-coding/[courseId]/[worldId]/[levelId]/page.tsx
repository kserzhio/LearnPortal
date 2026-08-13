import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getKidsLevel, isKidsPublicPreview, kidsCourses } from "@/features/kids-coding/content";
import { createEmptyKidsProgress } from "@/features/kids-coding/progress";
import { loadKidsProgressForUser } from "@/features/kids-coding/progress/server-progress";
import { KidsLevelScreen } from "@/features/kids-coding/ui/level-screen";
import { buildKidsWorldMap } from "@/features/kids-coding/world-map";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StructuredData } from "@/components/seo/structured-data";
import { absoluteUrl, createSeoMetadata } from "@/lib/seo/site";
import { breadcrumbStructuredData } from "@/lib/seo/structured-data";

type PageProps = Readonly<{
  params: Promise<{ courseId: string; worldId: string; levelId: string }>;
}>;

export function generateStaticParams() {
  return kidsCourses.flatMap((course) => course.worlds.flatMap((world) => world.levels.map((level) => ({
    courseId: course.id,
    worldId: world.id,
    levelId: level.id,
  }))));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { courseId, worldId, levelId } = await params;
  const found = getKidsLevel(courseId, worldId, levelId);
  const pathname = `/kids-coding/${courseId}/${worldId}/${levelId}`;
  const isPublicPreview = isKidsPublicPreview(courseId, worldId, levelId);
  return found
    ? createSeoMetadata({
      title: `${found.level.title} · ${found.course.title}`,
      description: found.level.description,
      pathname,
      keywords: [found.course.title, found.level.title, "програмування для дітей", ...found.level.learningModes],
      index: isPublicPreview,
    })
    : createSeoMetadata({ title: "Рівень не знайдено", description: "Запитаний навчальний рівень не знайдено.", pathname, index: false });
}

export default async function KidsLevelPage({ params }: PageProps) {
  const { courseId, worldId, levelId } = await params;
  const found = getKidsLevel(courseId, worldId, levelId);
  if (!found) notFound();
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const progress = user && supabase
    ? await loadKidsProgressForUser(supabase, user.id, found.course.id)
    : createEmptyKidsProgress(found.course.id);
  const map = buildKidsWorldMap(found.course, progress);
  const mapLevel = map.worlds.find((entry) => entry.id === found.world.id)?.levels.find((entry) => entry.id === found.level.id);
  if (user && mapLevel?.status === "locked") redirect(`/kids-coding/${found.course.id}`);
  const levelIndex = found.world.levels.findIndex((entry) => entry.id === found.level.id);
  const nextLevel = found.world.levels[levelIndex + 1] ?? null;
  const pathname = `/kids-coding/${found.course.id}/${found.world.id}/${found.level.id}`;
  const sharePayload = isKidsPublicPreview(found.course.id, found.world.id, found.level.id) ? {
    title: `${found.level.title} · ${found.course.title} · SYSTEMA`,
    text: `Спробуй вправу «${found.level.title}» у курсі «${found.course.title}» на SYSTEMA.`,
    url: absoluteUrl(pathname),
  } : undefined;
  return (
    <>
      <StructuredData data={breadcrumbStructuredData([
        { name: "Головна", pathname: "/" },
        { name: "Курси", pathname: "/courses" },
        { name: found.course.title, pathname: `/kids-coding/${found.course.id}` },
        { name: found.level.title, pathname: `/kids-coding/${found.course.id}/${found.world.id}/${found.level.id}` },
      ])} />
      <KidsLevelScreen
        key={found.level.id}
        authenticated={Boolean(user)}
        courseId={found.course.id}
        courseTitle={found.course.title}
        worldTitle={found.world.title}
        worldLevelCount={found.world.levels.length}
        level={found.level}
        mapHref={`/kids-coding/${found.course.id}`}
        nextLevelHref={nextLevel ? `/kids-coding/${found.course.id}/${found.world.id}/${nextLevel.id}` : null}
        sharePayload={sharePayload}
      />
    </>
  );
}
