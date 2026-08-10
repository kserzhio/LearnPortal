import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { enrollInCourse } from "@/app/courses/[slug]/actions";
import { getCourseBySlug } from "@/content/courses";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CoursePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ enrollment?: string }>;
};

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  return { title: course?.title ?? "Курс не знайдено" };
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
      supabase.from("lesson_progress").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("course_id", course.id).eq("completed", true),
    ])
    : [{ data: null }, { count: 0 }];
  const isEnrolled = Boolean(enrollmentQuery.data);
  const completedLessons = progressQuery.count ?? 0;
  const enrollAction = enrollInCourse.bind(null, course.id, course.slug);

  return (
    <main className="page-shell">
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
              <p className="enrollment-status" role="status">У моїх курсах · завершено {completedLessons} із {course.lessonCount}</p>
            ) : (
              <form className="enrollment-form" action={enrollAction}>
                <button type="submit">Додати до моїх курсів</button>
              </form>
            )
          ) : null}
          {!user && course.status === "published" ? <Link className="enrollment-link" href={`/auth/sign-in?next=${encodeURIComponent(`/courses/${course.slug}`)}`}>Увійти, щоб синхронізувати прогрес</Link> : null}
          {enrollmentResult === "success" ? <p className="enrollment-message" role="status">Курс додано до твого кабінету.</p> : null}
          {enrollmentResult === "failed" ? <p className="enrollment-message error" role="alert">Не вдалося додати курс. Спробуй ще раз.</p> : null}
          {course.legacyPath ? <Link className="primary-link" href={course.legacyPath}>Відкрити заняття 1 <span>→</span></Link> : <Link className="secondary-link" href="/courses">Повернутися до каталогу</Link>}
        </aside>
      </section>
    </main>
  );
}
