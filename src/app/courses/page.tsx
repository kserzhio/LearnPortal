import type { Metadata } from "next";
import Link from "next/link";
import { courses } from "@/content/courses";

export const metadata: Metadata = { title: "Курси" };

export default function CoursesPage() {
  return (
    <main className="page-shell">
      <header className="page-intro">
        <span>КАТАЛОГ SYSTEMA</span>
        <h1>Обери наступну<br /><em>архітектурну компетенцію.</em></h1>
        <p>Кожен курс поєднує коротку теорію, практичний design і перевірку failure scenarios.</p>
      </header>
      <section className="course-grid" aria-label="Доступні курси">
        {courses.map((course) => (
          <article key={course.id} className={course.status === "planned" ? "planned" : ""}>
            <div className="course-card-top"><span className="course-badge">{course.accent}</span><small>{course.status === "published" ? "ДОСТУПНИЙ" : "ЗАПЛАНОВАНО"}</small></div>
            <h2>{course.title}</h2>
            <p>{course.description}</p>
            <dl><div><dt>Рівень</dt><dd>{course.level}</dd></div><div><dt>Тривалість</dt><dd>{course.duration}</dd></div><div><dt>Заняття</dt><dd>{course.lessonCount || "—"}</dd></div></dl>
            <Link href={`/courses/${course.slug}`}>Переглянути програму <span>→</span></Link>
          </article>
        ))}
      </section>
    </main>
  );
}
