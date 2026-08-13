import type { ReactNode } from "react";
import type { LessonDefinition } from "@/content/course-contract";

export type LessonCodeExample = Readonly<{
  label: string;
  title: string;
  description: string;
  language: string;
  code: string;
}>;

export type LessonDiagramNode = Readonly<{
  id: string;
  title: string;
  detail: string;
}>;

export type LessonDiagram = Readonly<{
  label: string;
  title: string;
  description: string;
  accessibleDescription: string;
  nodes: readonly LessonDiagramNode[];
}>;

type LessonShellProps = Readonly<{
  courseTitle: string;
  moduleTitle: string;
  modulePosition: number;
  totalLessonCount: number;
  lesson: LessonDefinition;
  codeExample: LessonCodeExample;
  diagram: LessonDiagram;
  accessNotice?: ReactNode;
  resultAction?: ReactNode;
  practiceAddon?: ReactNode;
  learningSupport?: ReactNode;
}>;

const shellSections = [
  ["theory", "Теорія"],
  ["code", "Формула / код"],
  ["diagram", "Схема"],
  ["practice", "Практика"],
  ["result", "Результат"],
] as const;

function LessonSectionHeading({ label, title }: Readonly<{ label: string; title: string }>) {
  return <header className="lesson-section-heading"><span>{label}</span><h2>{title}</h2></header>;
}

export function LessonShell({
  courseTitle,
  moduleTitle,
  modulePosition,
  totalLessonCount,
  lesson,
  codeExample,
  diagram,
  accessNotice,
  resultAction,
  practiceAddon,
  learningSupport,
}: LessonShellProps) {
  const lessonNumber = String(lesson.position).padStart(2, "0");

  return (
    <article className="lesson-shell" aria-labelledby="lessonTitle">
      <header className="lesson-shell-hero">
        <div className="lesson-shell-number" aria-hidden="true">{lessonNumber}</div>
        <div>
          <p>{courseTitle} · Модуль {modulePosition}</p>
          <h1 id="lessonTitle">{lesson.title}</h1>
          <p className="lesson-shell-summary">{lesson.summary}</p>
          <dl className="lesson-shell-meta">
            <div><dt>Модуль</dt><dd>{moduleTitle}</dd></div>
            <div><dt>Тривалість</dt><dd>{lesson.durationMinutes} хв</dd></div>
            <div><dt>Заняття</dt><dd>{lesson.position} із {totalLessonCount}</dd></div>
          </dl>
        </div>
      </header>

      {accessNotice ? <aside className="lesson-shell-notice" aria-label="Умови доступу">{accessNotice}</aside> : null}

      <nav className="lesson-shell-navigation" aria-label="Структура заняття">
        <span>У цьому занятті</span>
        <ol>{shellSections.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ol>
      </nav>

      <section className="lesson-shell-section" id="theory">
        <LessonSectionHeading label="01 · THEORY" title="Основні поняття та критерії вибору" />
        <div className="lesson-theory-grid">
          {lesson.topics.map((topic, index) => (
            <article key={topic.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{topic.title}</h3>
              <p>{topic.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lesson-shell-section lesson-code-section" id="code">
        <LessonSectionHeading label={`02 · ${codeExample.label}`} title={codeExample.title} />
        <p>{codeExample.description}</p>
        <figure>
          <figcaption>{codeExample.language}</figcaption>
          <pre tabIndex={0}><code>{codeExample.code}</code></pre>
        </figure>
      </section>

      <section className="lesson-shell-section" id="diagram">
        <LessonSectionHeading label={`03 · ${diagram.label}`} title={diagram.title} />
        <p className="lesson-section-intro">{diagram.description}</p>
        <figure className="lesson-system-diagram">
          <figcaption>{diagram.accessibleDescription}</figcaption>
          <ol>
            {diagram.nodes.map((node, index) => (
              <li key={node.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{node.title}</b>
                <small>{node.detail}</small>
              </li>
            ))}
          </ol>
        </figure>
      </section>

      <section className="lesson-shell-section" id="practice">
        <LessonSectionHeading label="04 · PRACTICE" title={lesson.practice.title} />
        <div className="lesson-practice-layout">
          <div>
            <h3>Що потрібно зробити</h3>
            <ol>{lesson.practice.tasks.map(task => <li key={task}>{task}</li>)}</ol>
            <h3>Артефакт</h3>
            <p>{lesson.practice.deliverable}</p>
          </div>
          <div className="lesson-validation-expectations">
            <article className="expected-success"><span>EXPECTED SUCCESS</span><p>{lesson.practice.validation.expectedSuccess}</p></article>
            <article className="expected-failure"><span>EXPECTED FAILURE</span><ul>{lesson.practice.validation.expectedFailures.map(failure => <li key={failure}>{failure}</li>)}</ul></article>
          </div>
        </div>
        {practiceAddon}
      </section>

      <section className="lesson-shell-result" id="result">
        <div><span>05 · РЕЗУЛЬТАТ ЗАНЯТТЯ</span><h2>{lesson.outcome}</h2></div>
        {resultAction}
      </section>
      {learningSupport}
    </article>
  );
}
