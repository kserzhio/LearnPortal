import type { Metadata } from "next";
import Link from "next/link";
import { getLessons } from "@/content/course-contract";
import { highLoadArchitectureCourse } from "@/content/courses/high-load-architecture";

const course = highLoadArchitectureCourse;
const lesson = getLessons(course)[0];
const moduleTitle = course.modules[0].title;
const continuationHref = `/auth/sign-in?next=${encodeURIComponent(lesson ? `/legacy/index.html${lesson.legacyAnchor}` : course.legacyPath)}`;

export const metadata: Metadata = { title: lesson ? `Заняття ${lesson.position} — ${lesson.title}` : course.title };

export default function HighLoadPreviewLessonPage() {
  return (
    <main className="page-shell preview-lesson-page">
      <header className="preview-lesson-hero">
        <div className="course-badge large">{String(lesson.position).padStart(2, "0")}</div>
        <div><span>БЕЗКОШТОВНЕ PREVIEW · {moduleTitle.toUpperCase()}</span><h1>{lesson.title}</h1><p>{lesson.summary}</p></div>
      </header>
      <section className="preview-access-banner" aria-labelledby="previewAccessTitle">
        <div><span>1 / {getLessons(course).length}</span><h2 id="previewAccessTitle">Гостьовий доступ містить одне заняття</h2><p>Увійди через Google або GitHub, щоб відкрити повний курс, інтерактивні симулятори та синхронізацію прогресу.</p></div>
        <Link className="primary-link" href={continuationHref}>Увійти й продовжити <span>→</span></Link>
      </section>
      <section className="preview-topic-section">
        <span>ОСНОВНІ ПОНЯТТЯ</span><h2>High Load не дорівнює High Availability</h2>
        <div className="preview-topic-grid">{lesson.topics.map((topic, index) => <article key={topic.id}><span>{String(index + 1).padStart(2, "0")}</span><h3>{topic.title}</h3><p>{topic.description}</p></article>)}</div>
      </section>
      <section className="preview-calculation-section">
        <div><span>BACK-OF-THE-ENVELOPE</span><h2>Оцінимо YouTube Analytics Dashboard</h2><p>Припустимо: 100 000 daily active users, 20 dashboard-запитів на користувача і peak factor 5×.</p></div>
        <dl><div><dt>Запитів на день</dt><dd>2 000 000</dd></div><div><dt>Середнє навантаження</dt><dd>≈23 RPS</dd></div><div><dt>Пікове навантаження</dt><dd>≈116 RPS</dd></div><div><dt>Concurrency при 800 ms</dt><dd>≈93 запити</dd></div></dl>
        <code>peak RPS = users × requests per user ÷ 86 400 × peak factor</code>
      </section>
      <section className="preview-bottleneck-section">
        <span>ПОТЕНЦІЙНІ BOTTLENECKS</span><h2>Запит проходить через кілька обмежених ресурсів</h2>
        <div className="preview-flow" aria-label="Клієнт звертається до API, API читає кеш або базу даних, а фонова черга оновлює агрегати"><article><b>Client</b><small>concurrent users</small></article><i aria-hidden="true">→</i><article><b>API</b><small>CPU · connections</small></article><i aria-hidden="true">→</i><article><b>Cache / DB</b><small>reads · indexes</small></article><i aria-hidden="true">→</i><article><b>Queue</b><small>fresh aggregates</small></article></div>
        <p>Система для 100 користувачів може покладатися на один процес і базу. Для мільйона користувачів потрібні вимірювання, кешування, асинхронна обробка, реплікація та контроль failure domains.</p>
      </section>
      <section className="preview-result-section"><div><span>РЕЗУЛЬТАТ ЗАНЯТТЯ</span><h2>{lesson.outcome}</h2></div><Link className="primary-link" href={continuationHref}>Відкрити практику після входу <span>→</span></Link></section>
    </main>
  );
}
