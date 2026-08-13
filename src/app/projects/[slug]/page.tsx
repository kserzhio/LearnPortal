import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductEventBeacon } from "@/components/analytics/product-event-beacon";
import { SystemIcon } from "@/components/ui/system-icon";
import { getCourseBySlug } from "@/content/courses";
import { getFinalProjectBySlug } from "@/features/final-projects/content/final-project-registry";
import { loadFinalProjectArtifact, type FinalProjectPersistenceState } from "@/features/final-projects/persistence";
import { FinalProjectWorkspace } from "@/features/final-projects/ui";
import { createSeoMetadata } from "@/lib/seo/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "./project-page.module.css";

type FinalProjectPageProps = Readonly<{ params: Promise<{ slug: string }> }>;

export async function generateMetadata({ params }: FinalProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getFinalProjectBySlug(slug);
  if (!project || project.status !== "published") {
    return createSeoMetadata({ title: "Проєкт не знайдено", description: "Запитаний фінальний проєкт недоступний.", pathname: `/projects/${slug}`, index: false });
  }
  return createSeoMetadata({
    title: project.title,
    description: project.shortDescription,
    pathname: `/projects/${project.slug}`,
    index: true,
  });
}

export default async function FinalProjectPage({ params }: FinalProjectPageProps) {
  const { slug } = await params;
  const project = getFinalProjectBySlug(slug);
  if (!project || project.status !== "published") notFound();

  const course = getCourseBySlug(project.course.courseId);
  if (!course || course.status !== "published") notFound();

  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  let persistence: FinalProjectPersistenceState = { status: "guest", artifact: null };
  if (user && supabase) persistence = await loadFinalProjectArtifact(supabase, user.id, project);

  return (
    <main className={`page-shell ${styles.page}`}>
      <ProductEventBeacon name="final_project_viewed" properties={{ project_id: project.id, course_id: project.course.courseId, source: "project-page" }} />
      <nav className={styles.breadcrumbs} aria-label="Навігаційний шлях">
        <ol>
          <li><Link href="/courses">Курси</Link></li>
          <li><Link href={`/courses/${course.slug}`}>{course.title}</Link></li>
          <li aria-current="page">Фінальний проєкт</li>
        </ol>
      </nav>

      <header className={styles.hero}>
        <div>
          <p>FINAL PROJECT · {project.estimatedMinutes} ХВ</p>
          <h1>{project.title}</h1>
          <p>{project.shortDescription}</p>
          <a className="primary-link" href="#workspace">До workspace <SystemIcon name="arrow-down" /></a>
        </div>
        <aside aria-labelledby="outcomeHeading">
          <span>РЕЗУЛЬТАТ</span>
          <h2 id="outcomeHeading">Що ти маєш довести</h2>
          <p>{project.outcome}</p>
        </aside>
      </header>

      <section className={styles.scenario} aria-labelledby="scenarioHeading">
        <div>
          <p>SCENARIO</p>
          <h2 id="scenarioHeading">{project.scenario.title}</h2>
          <p>{project.scenario.summary}</p>
        </div>
        <div>
          <h3>Вихідні припущення</h3>
          <ul>{project.scenario.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
        </div>
      </section>

      <div className={styles.definitionGrid}>
        <section aria-labelledby="requirementsHeading">
          <p>REQUIREMENTS</p>
          <h2 id="requirementsHeading">Що система повинна підтримати</h2>
          <ol>{project.requirements.map((requirement) => (
            <li key={requirement.id}>
              <span>{requirement.priority === "must" ? "Обов'язково" : "Бажано"}</span>
              <h3>{requirement.title}</h3><p>{requirement.description}</p>
            </li>
          ))}</ol>
        </section>
        <section aria-labelledby="constraintsHeading">
          <p>CONSTRAINTS</p>
          <h2 id="constraintsHeading">Числові межі</h2>
          <dl>{project.constraints.map((constraint) => (
            <div key={constraint.id}><dt>{constraint.label}</dt><dd>{constraint.value}</dd><p>{constraint.description}</p></div>
          ))}</dl>
        </section>
      </div>

      <section className={styles.criteria} aria-labelledby="criteriaHeading">
        <p>SUCCESS CRITERIA</p>
        <h2 id="criteriaHeading">Коли рішення можна захищати</h2>
        <ul>{project.successCriteria.map((criterion) => <li key={criterion.id}><SystemIcon name="check" /><div><h3>{criterion.title}</h3><p>{criterion.description}</p></div></li>)}</ul>
      </section>

      <div id="workspace"><FinalProjectWorkspace project={project} persistence={persistence} /></div>
    </main>
  );
}
