import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { enrollInCourse } from "@/app/courses/[slug]/actions";
import { CourseProgressCta } from "@/components/course/course-progress-cta";
import { getCourseBySlug, getCourseDefinition, getCourseLessons, getCoursePublicStartPath } from "@/content/courses";
import { buildContinueLearningState } from "@/lib/progress/continue-learning";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccessibleFaq } from "@/features/learning-support/learning-support";
import { highLoadCourseFaq } from "@/features/learning-support/content";
import { ProductEventBeacon } from "@/components/analytics/product-event-beacon";
import { StructuredData } from "@/components/seo/structured-data";
import { createSeoMetadata } from "@/lib/seo/site";
import { breadcrumbStructuredData, courseStructuredData, faqStructuredData } from "@/lib/seo/structured-data";
import { getCourseFinalProject } from "@/features/final-projects/content/final-project-registry";
import { SystemIcon } from "@/components/ui/system-icon";

type CoursePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ enrollment?: string }>;
};

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  if (!course) return createSeoMetadata({ title: "Курс не знайдено", description: "Запитаний курс відсутній у каталозі SYSTEMA.", pathname: `/courses/${slug}`, index: false });
  const definition = getCourseDefinition(course.id);
  const keywords = definition
    ? [...new Set(definition.modules.flatMap((courseModule) => courseModule.lessons.flatMap((lesson) => lesson.topics.map((topic) => topic.title))))].slice(0, 12)
    : [];
  return createSeoMetadata({
    title: course.title,
    description: course.description,
    pathname: `/courses/${course.slug}`,
    keywords,
    index: course.status === "published",
  });
}

export default async function CoursePage({ params, searchParams }: CoursePageProps) {
  const { slug } = await params;
  const { enrollment: enrollmentResult } = await searchParams;
  const course = getCourseBySlug(slug);
  if (!course) notFound();

  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const [enrollmentQuery, progressQuery] = user && supabase && course.status === "published"
    ? await Promise.all([
      supabase.from("course_enrollments").select("course_id").eq("user_id", user.id).eq("course_id", course.id).maybeSingle(),
      supabase.from("lesson_progress").select("lesson_id, completed, updated_at").eq("user_id", user.id).eq("course_id", course.id),
    ])
    : [{ data: null }, { data: [] }];
  const isEnrolled = Boolean(enrollmentQuery.data);
  const courseProgress = progressQuery.data ?? [];
  const lessons = getCourseLessons(course.id);
  const learningState = user && course.status === "published"
    ? buildContinueLearningState(course, lessons, courseProgress.map((item) => ({ lessonId: item.lesson_id, completed: item.completed, updatedAt: item.updated_at })))
    : null;
  const enrollAction = enrollInCourse.bind(null, course.id, course.slug);
  const publicStartPath = getCoursePublicStartPath(course);
  const finalProject = getCourseFinalProject("adult", course.id);

  return (
    <main className="page-shell">
      <StructuredData data={breadcrumbStructuredData([
        { name: "Головна", pathname: "/" },
        { name: "Курси", pathname: "/courses" },
        { name: course.title, pathname: `/courses/${course.slug}` },
      ])} />
      {course.status === "published" ? <StructuredData data={courseStructuredData(course)} /> : null}
      {course.id === "high-load-architecture" ? <StructuredData data={faqStructuredData(highLoadCourseFaq)} /> : null}
      <ProductEventBeacon name="course_viewed" properties={{ course_id: course.id, source: "course-page" }} />
      <section className="course-detail-hero">
        <span className="course-badge large">{course.accent}</span>
        <div>
          <p>{course.status === "published" ? "ОПУБЛІКОВАНИЙ КУРС" : "КУРС У РОЗРОБЦІ"}</p>
          <h1>{course.title}</h1>
          <div className="course-meta"><span>{course.level}</span><span>{course.duration}</span><span>{course.lessonCount || "—"} занять</span></div>
        </div>
      </section>
      <section className="course-detail-body">
        <div><span>ПРО КУРС</span><h2>Навчання через архітектурні рішення</h2><p>{course.description}</p><p>Кожне заняття містить system diagram, практичне завдання, validator і failure simulation.</p></div>
        <aside>
          <h2>{course.status === "published" ? (isEnrolled ? "Курс у твоєму кабінеті" : "Готовий почати?") : "Курс ще готується"}</h2>
          <p>{course.status === "published" ? "Для гостя прогрес зберігається локально. Після входу він автоматично об’єднується з профілем у Supabase." : "Структура з’явиться в каталозі після першого content release."}</p>
          {user && course.status === "published" ? (
            isEnrolled ? (
              <p className="enrollment-status" role="status">Курс додано до твого кабінету</p>
            ) : (
              <form className="enrollment-form" action={enrollAction}>
                <button type="submit">Додати до моїх курсів</button>
              </form>
            )
          ) : null}
          {!user && course.status === "published" ? <Link className="enrollment-link" href={`/auth/sign-in?next=${encodeURIComponent(`/courses/${course.slug}`)}`}>Увійти, щоб синхронізувати прогрес</Link> : null}
          {enrollmentResult === "success" ? <p className="enrollment-message" role="status">Курс додано до твого кабінету.</p> : null}
          {enrollmentResult === "failed" ? <p className="enrollment-message error" role="alert">Не вдалося додати курс. Спробуй ще раз.</p> : null}
          {course.legacyPath && course.status === "published" ? (
            <CourseProgressCta
              course={course}
              lessons={lessons.map(({ id, position, title }) => ({ id, position, title }))}
              initialState={learningState}
              authenticated={Boolean(user)}
              publicStartPath={publicStartPath}
            />
          ) : <Link className="secondary-link" href="/courses">Повернутися до каталогу</Link>}
        </aside>
      </section>
      {finalProject ? (
        <section className="lesson-shell-notice" aria-labelledby="courseFinalProjectHeading">
          <div>
            <span>FINAL PROJECT</span>
            <h2 id="courseFinalProjectHeading">Застосуй увесь курс в одному System Design</h2>
            <p>{finalProject.shortDescription}</p>
          </div>
          <Link className="primary-link" href={`/projects/${finalProject.slug}`}>Відкрити проєкт <SystemIcon name="arrow-right" /></Link>
        </section>
      ) : null}
      {course.id === "high-load-architecture" ? <AccessibleFaq title="FAQ курсу" items={highLoadCourseFaq} /> : null}
    </main>
  );
}
