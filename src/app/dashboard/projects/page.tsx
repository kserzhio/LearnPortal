import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CompletedProjectsView } from "@/components/analytics/completed-projects-view";
import { SystemIcon } from "@/components/ui/system-icon";
import { loadCompletedProjects } from "@/features/final-projects/persistence/completed-projects";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DeleteProjectForm } from "./delete-project-form";
import styles from "./projects.module.css";

export const metadata: Metadata = { title: "Завершені проєкти", robots: { index: false, follow: false, nocache: true } };
const dateFormatter = new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Kyiv" });

export default async function CompletedProjectsPage() {
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/auth/sign-in?next=%2Fdashboard%2Fprojects");
  const result = await loadCompletedProjects(supabase, user.id);

  return <main className={`page-shell ${styles.page}`}>
    <CompletedProjectsView />
    <header className={styles.heading}><div><span>PRIVATE LIBRARY</span><h1>Завершені проєкти</h1><p>Тут зберігаються лише server-verified роботи. Вони приватні й доступні тільки твоєму акаунту.</p></div><Link className="secondary-link" href="/dashboard"><SystemIcon name="arrow-left" /> До кабінету</Link></header>
    <aside className={styles.privacy} aria-label="Приватність бібліотеки"><SystemIcon name="lock" /><p><strong>Приватно за замовчуванням.</strong> Проєкти не з’являються у public routes, пошуку чи профілі інших користувачів.</p></aside>
    {result.error ? <p className={styles.error} role="alert">Не вдалося завантажити бібліотеку. Онови сторінку або спробуй пізніше.</p> : null}
    {!result.error && result.projects.length === 0 ? <section className={styles.empty}><span>0 PROJECTS</span><h2>Завершених проєктів ще немає</h2><p>Побудуй фінальну архітектуру та пройди всі scenario checks. Після збереження вона з’явиться тут.</p><Link className="primary-link" href="/projects/high-load-audit-platform">Відкрити фінальний проєкт <SystemIcon name="arrow-right" /></Link></section> : null}
    {result.projects.length > 0 ? <ol className={styles.list} aria-label="Завершені проєкти">{result.projects.map((project) => <li key={project.id}><article>
      <header><div><span>COMPLETED · V{project.projectVersion}</span><h2>{project.title}</h2></div><strong>Приватний</strong></header>
      <dl><div><dt>Завершено</dt><dd><time dateTime={project.completedAt}>{dateFormatter.format(new Date(project.completedAt))}</time></dd></div><div><dt>Оновлено</dt><dd><time dateTime={project.updatedAt}>{dateFormatter.format(new Date(project.updatedAt))}</time></dd></div></dl>
      <nav aria-label={`Дії для ${project.title}`}><Link href={`/projects/${project.projectSlug}`}>Переглянути та редагувати <SystemIcon name="arrow-right" /></Link><a href={`/dashboard/projects/${project.id}/export`}>Експортувати JSON <SystemIcon name="arrow-down" /></a></nav>
      <details><summary>Видалити проєкт</summary><DeleteProjectForm artifactId={project.id} projectTitle={project.title} /></details>
    </article></li>)}</ol> : null}
  </main>;
}
