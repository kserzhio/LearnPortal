import Link from "next/link";
import { courses } from "@/content/courses";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const { account } = await searchParams;
  const publishedCourse = courses.find((course) => course.status === "published");

  return (
    <main>
      {account === "deleted" ? <div className="account-deleted-notice" role="status">Акаунт і пов’язані навчальні дані видалено.</div> : null}
      <section className="portal-hero">
        <div className="eyebrow"><span>NEW</span> SYSTEM DESIGN LEARNING PLATFORM</div>
        <h1>Вивчай архітектуру.<br /><em>Перевіряй рішення симуляцією.</em></h1>
        <p>Теорія, розрахунки, інтерактивні схеми, failure scenarios і конкретні пояснення помилок — в одному навчальному середовищі.</p>
        <div className="hero-actions">
          {publishedCourse ? <Link className="primary-link" href={`/courses/${publishedCourse.slug}`}>Почати навчання <span>→</span></Link> : null}
          <Link className="secondary-link" href="/courses">Переглянути курси</Link>
        </div>
        <div className="hero-stat hero-stat-one"><b>{publishedCourse?.lessonCount ?? 0}</b><span>interactive lessons</span></div>
        <div className="hero-stat hero-stat-two"><b>AA</b><span>WCAG contrast</span></div>
      </section>

      <section className="portal-section">
        <div className="section-kicker">НАВЧАЛЬНА МОДЕЛЬ</div>
        <div className="value-grid">
          <article><span>01</span><h2>Зрозумій trade-off</h2><p>Кожна тема пояснює не лише pattern, а й ціну його використання.</p></article>
          <article><span>02</span><h2>Побудуй систему</h2><p>Симулятори перетворюють архітектурні поняття на конкретні рішення.</p></article>
          <article><span>03</span><h2>Зламай безпечно</h2><p>Failure modes показують, як система поводиться під реальним навантаженням.</p></article>
        </div>
      </section>

      <section className="portal-section course-preview-section">
        <div className="section-heading-row"><div><span>КАТАЛОГ</span><h2>Курси Systema</h2></div><Link href="/courses">Усі курси →</Link></div>
        <div className="compact-course-grid">
          {courses.map((course) => (
            <article key={course.id}>
              <div className="course-badge">{course.accent}</div>
              <span>{course.status === "published" ? `${course.lessonCount} занять` : "Незабаром"}</span>
              <h3>{course.title}</h3>
              <p>{course.description}</p>
              <Link href={`/courses/${course.slug}`}>{course.status === "published" ? "Відкрити курс" : "Детальніше"} →</Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
