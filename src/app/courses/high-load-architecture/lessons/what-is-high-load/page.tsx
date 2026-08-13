import type { Metadata } from "next";
import Link from "next/link";
import { LessonShell } from "@/components/course/lesson-shell";
import { ProductEventBeacon } from "@/components/analytics/product-event-beacon";
import { StructuredData } from "@/components/seo/structured-data";
import { SystemIcon } from "@/components/ui/system-icon";
import { getLessons } from "@/content/course-contract";
import { highLoadArchitectureCourse } from "@/content/courses/high-load-architecture";
import { highLoadLessonOneSupport } from "@/features/learning-support/content";
import { LessonLearningSupport } from "@/features/learning-support/learning-support";
import { SharePanel } from "@/features/sharing/share-panel";
import { absoluteUrl, createSeoMetadata } from "@/lib/seo/site";
import { breadcrumbStructuredData } from "@/lib/seo/structured-data";

const course = highLoadArchitectureCourse;
const lesson = getLessons(course)[0];
const moduleTitle = course.modules[0].title;
const pathname = `/courses/${course.slug}/lessons/${lesson.seo?.slug ?? "what-is-high-load"}`;
const continuationHref = `/auth/sign-in?next=${encodeURIComponent(`/legacy/index.html${lesson.legacyAnchor}`)}`;

export const metadata: Metadata = createSeoMetadata({
  title: `Заняття ${lesson.position}: ${lesson.title}`,
  description: `${lesson.summary} ${lesson.outcome}`,
  pathname,
  keywords: lesson.seo?.keywords,
});

export default function HighLoadPublicLessonPage() {
  return (
    <main className="page-shell preview-lesson-page">
      <StructuredData data={breadcrumbStructuredData([
        { name: "Головна", pathname: "/" },
        { name: "Курси", pathname: "/courses" },
        { name: course.title, pathname: `/courses/${course.slug}` },
        { name: lesson.title, pathname },
      ])} />
      <ProductEventBeacon name="lesson_viewed" properties={{ course_id: course.id, content_id: lesson.id }} />
      <ProductEventBeacon name="lesson_started" properties={{ course_id: course.id, content_id: lesson.id }} />
      <LessonShell
        courseTitle={course.title}
        moduleTitle={moduleTitle}
        modulePosition={course.modules[0].position}
        totalLessonCount={getLessons(course).length}
        lesson={lesson}
        codeExample={{
          label: "BACK-OF-THE-ENVELOPE",
          title: "Оцінимо YouTube Analytics Dashboard",
          description: "Припустимо: 100 000 daily active users, 20 dashboard-запитів на користувача і peak factor 5×.",
          language: "capacity-formula.txt",
          code: "daily requests = 100 000 × 20 = 2 000 000\naverage RPS = 2 000 000 ÷ 86 400 ≈ 23\npeak RPS = 23 × 5 ≈ 116\nconcurrency = 116 × 0.8 s ≈ 93",
        }}
        diagram={{
          label: "SYSTEM FLOW",
          title: "Запит проходить через кілька обмежених ресурсів",
          description: "Кожен компонент має власну capacity, latency та failure mode. Bottleneck визначає реальний throughput усього шляху.",
          accessibleDescription: "Послідовність запиту: Client передає запит до API, API читає Cache або Database, а Queue оновлює агрегати у фоні.",
          nodes: [
            { id: "client", title: "Client", detail: "concurrent users" },
            { id: "api", title: "API", detail: "CPU · connections" },
            { id: "data", title: "Cache / DB", detail: "reads · indexes" },
            { id: "queue", title: "Queue", detail: "fresh aggregates" },
          ],
        }}
        accessNotice={(
          <><div><span>1 / {getLessons(course).length}</span><h2>Гостьовий доступ містить одне заняття</h2><p>Увійди через Google або GitHub, щоб відкрити весь курс, інтерактивні симулятори та синхронізацію прогресу.</p></div><Link className="primary-link" href={continuationHref}>Увійти й продовжити <SystemIcon name="arrow-right" /></Link></>
        )}
        resultAction={<Link className="primary-link" href={continuationHref}>Відкрити симулятор після входу <SystemIcon name="arrow-right" /></Link>}
        learningSupport={<LessonLearningSupport courseId={course.id} contentId={lesson.id} content={highLoadLessonOneSupport} />}
      />
      <SharePanel
        compact
        heading="Поділися публічним заняттям"
        description="Посилання відкриває це заняття без авторизації та не містить твого прогресу."
        payload={{
          title: `${lesson.title} · SYSTEMA`,
          text: `Заняття «${lesson.title}» про High Load і High Availability у SYSTEMA.`,
          url: absoluteUrl(pathname),
        }}
      />
    </main>
  );
}
