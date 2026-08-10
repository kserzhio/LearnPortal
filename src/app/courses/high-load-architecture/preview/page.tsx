import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Заняття 1 — Що таке високонавантажена система" };

const topics = [
  ["High Load", "Система обробляє великий або нерівномірний потік роботи."],
  ["High Availability", "Сервіс залишається доступним під час відмов окремих компонентів."],
  ["Throughput", "Кількість операцій, яку система завершує за одиницю часу."],
  ["Latency", "Час проходження однієї операції через систему."],
  ["CPU / I/O bound", "Різні bottlenecks потребують різних способів масштабування."],
] as const;

export default function HighLoadPreviewLessonPage() {
  return (
    <main className="page-shell preview-lesson-page">
      <header className="preview-lesson-hero">
        <div className="course-badge large">01</div>
        <div><span>БЕЗКОШТОВНЕ PREVIEW · МОДУЛЬ 1</span><h1>Що таке високонавантажена система</h1><p>Перетворюємо бізнесове «буде багато користувачів» на RPS, latency, concurrency, capacity та конкретні bottlenecks.</p></div>
      </header>
      <section className="preview-access-banner" aria-labelledby="previewAccessTitle">
        <div><span>1 / 19</span><h2 id="previewAccessTitle">Гостьовий доступ містить одне заняття</h2><p>Увійди через Google або GitHub, щоб відкрити повний курс, інтерактивні симулятори та синхронізацію прогресу.</p></div>
        <Link className="primary-link" href="/auth/sign-in?next=%2Flegacy%2Findex.html%23lesson-1">Увійти й продовжити <span>→</span></Link>
      </section>
      <section className="preview-topic-section">
        <span>ОСНОВНІ ПОНЯТТЯ</span><h2>High Load не дорівнює High Availability</h2>
        <div className="preview-topic-grid">{topics.map(([title, description], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
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
      <section className="preview-result-section"><div><span>РЕЗУЛЬТАТ ЗАНЯТТЯ</span><h2>Ти можеш перевести бізнес-вимогу в технічні показники</h2></div><Link className="primary-link" href="/auth/sign-in?next=%2Flegacy%2Findex.html%23lesson-1">Відкрити практику після входу <span>→</span></Link></section>
    </main>
  );
}
