import Link from "next/link";
import { ServerFailureDemo } from "@/components/home/server-failure-demo";
import { StructuredData } from "@/components/seo/structured-data";
import { SystemIcon } from "@/components/ui/system-icon";
import { breadcrumbStructuredData, faqStructuredData } from "@/lib/seo/structured-data";
import type { DirectionContent } from "./content";
import styles from "./direction-landing.module.css";

function SectionHeading({ label, title, description }: Readonly<{ label: string; title: string; description?: string }>) {
  return (
    <header className={styles.sectionHeading}>
      <div><span>{label}</span><h2>{title}</h2></div>
      {description ? <p>{description}</p> : null}
    </header>
  );
}

function LevelPreview({ content }: Readonly<{ content: DirectionContent["example"] }>) {
  return (
    <section className={styles.example} aria-labelledby="direction-example-title">
      <div className={styles.exampleCopy}>
        <span>{content.label}</span>
        <h2 id="direction-example-title">{content.title}</h2>
        <p>{content.description}</p>
        <Link href={content.href}>{content.cta} <SystemIcon name="arrow-right" /></Link>
      </div>
      <div className={styles.exampleBoard} aria-label="Попередній перегляд навчального рівня">
        {content.code ? <pre tabIndex={0}><code>{content.code}</code></pre> : null}
        <div className={styles.levelTrack} aria-hidden="true">
          <span className={styles.hero}>→</span><i /><i /><span className={styles.goal}>◆</span>
        </div>
        <ol>
          {content.steps?.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span>{step}</li>)}
        </ol>
      </div>
    </section>
  );
}

function DirectionFaq({ content }: Readonly<{ content: DirectionContent }>) {
  return (
    <section className={styles.section} aria-labelledby="direction-faq-title">
      <SectionHeading label="FAQ" title="Короткі відповіді перед стартом" />
      <div className={styles.faqList}>
        {content.faqs.map((item) => (
          <details key={item.id}>
            <summary>{item.question}<span aria-hidden="true">+</span></summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function DirectionLanding({ content }: Readonly<{ content: DirectionContent }>) {
  return (
    <main className={styles.page}>
      <StructuredData data={breadcrumbStructuredData([
        { name: "Головна", pathname: "/" },
        { name: content.seo.title, pathname: content.pathname },
      ])} />
      <StructuredData data={faqStructuredData(content.faqs)} />

      <section className={styles.hero} aria-labelledby="direction-title">
        <div className={styles.heroCopy}>
          <span>{content.kicker}</span>
          <h1 id="direction-title">{content.title} <br /><em>{content.highlightedTitle}</em></h1>
          <p>{content.description}</p>
          <div className={styles.actions}>
            <Link data-analytics-cta={`${content.id}-start`} data-analytics-surface="direction" href={content.primaryCta.href}>{content.primaryCta.label} <SystemIcon name="arrow-right" /></Link>
            <Link href={content.secondaryCta.href}>{content.secondaryCta.label}</Link>
          </div>
        </div>
        <div className={styles.heroSignal} aria-hidden="true">
          <span>LEARN</span><i /><span>BUILD</span><i /><span>CHECK</span>
        </div>
      </section>

      <section className={`${styles.section} ${styles.audience}`} aria-labelledby="direction-audience-title">
        <span>ДЛЯ КОГО</span>
        <h2 id="direction-audience-title">{content.audience}</h2>
      </section>

      <section className={styles.section} aria-labelledby="direction-outcomes-title">
        <SectionHeading label="РЕЗУЛЬТАТ" title="Що ти зможеш після навчання" description="Не абстрактні обіцянки, а конкретні дії, які відпрацьовуються у наявних заняттях." />
        <div className={styles.outcomeGrid}>
          {content.outcomes.map((outcome, index) => (
            <article key={outcome.label}>
              <span>{String(index + 1).padStart(2, "0")} · {outcome.label}</span>
              <h3>{outcome.title}</h3>
              <p>{outcome.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.methodSection}`} aria-labelledby="direction-method-title">
        <SectionHeading label="МЕТОД SYSTEMA" title="Від пояснення до власного рішення" description="Кожен етап має видимий результат і зрозумілий наступний крок." />
        <ol className={styles.methodGrid}>
          {content.method.map((step) => <li key={step.label}><span>{step.label}</span><h3>{step.title}</h3><p>{step.description}</p></li>)}
        </ol>
      </section>

      {content.example.kind === "failure-simulation" ? (
        <section className={styles.demoSection} aria-label={content.example.title}>
          <ServerFailureDemo />
        </section>
      ) : <LevelPreview content={content.example} />}

      <section className={styles.section} aria-labelledby="direction-courses-title">
        <SectionHeading label="ДОСТУПНІ КУРСИ" title={content.courses.length > 1 ? "Обери першу пригоду" : "Почни з готового курсу"} description="Показуємо лише опубліковані курси та вправи, які вже можна відкрити." />
        <div className={styles.courseGrid}>
          {content.courses.map((course) => (
            <article key={course.id}>
              <header><span className={styles.courseAccent}>{course.accent}</span><strong>{course.label}</strong></header>
              <h3>{course.title}</h3>
              <p>{course.description}</p>
              <dl>{course.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
              <Link href={course.href}>{course.cta} <SystemIcon name="arrow-right" /></Link>
            </article>
          ))}
        </div>
      </section>

      <DirectionFaq content={content} />

      <section className={styles.finalCta} aria-labelledby="direction-final-title">
        <span>ПЕРШИЙ КРОК ВІДКРИТИЙ</span>
        <h2 id="direction-final-title">Почни з реальної вправи, <br /><em>а не з довгої обіцянки.</em></h2>
        <Link href={content.primaryCta.href}>{content.primaryCta.label} <SystemIcon name="arrow-right" /></Link>
        <p>Перший урок або рівень доступний без реєстрації.</p>
      </section>
    </main>
  );
}
