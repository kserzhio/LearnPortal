import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourseBySlug } from "@/content/courses";

type CoursePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  return { title: course?.title ?? "Курс не знайдено" };
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  if (!course) notFound();

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
          <h2>{course.status === "published" ? "Готовий почати?" : "Курс ще готується"}</h2>
          <p>{course.status === "published" ? "Прогрес поки зберігається локально. Після підключення Supabase він синхронізуватиметься з профілем." : "Структура з’явиться в каталозі після першого content release."}</p>
          {course.legacyPath ? <Link className="primary-link" href={course.legacyPath}>Відкрити заняття 1 <span>→</span></Link> : <Link className="secondary-link" href="/courses">Повернутися до каталогу</Link>}
        </aside>
      </section>
    </main>
  );
}
