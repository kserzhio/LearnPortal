import type { Metadata } from "next";
import Link from "next/link";
import { SystemIcon, type SystemIconName } from "@/components/ui/system-icon";
import { skillContentCatalog, skillTaxonomy } from "@/features/skills/content";
import { buildSkillMapTree, getSkillCategories, resolveSkillCategoryFilter, summarizeSkillProgress, type SkillMapNode } from "@/features/skills/presentation";
import { buildSkillProgress, loadSkillUnitCompletions, type SkillProgressState } from "@/features/skills/progress";
import { SkillProgressSummary } from "@/features/skills/ui";
import { createSeoMetadata } from "@/lib/seo/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "./skills.module.css";

type SkillsPageProps = Readonly<{ searchParams: Promise<{ category?: string | string[] }> }>;
const categoryLabels: Readonly<Record<string, string>> = { foundation:"Основи", architecture:"Архітектура", data:"Дані", performance:"Продуктивність", reliability:"Надійність", quality:"Якість" };
const stateIcons: Readonly<Record<SkillProgressState, SystemIconName>> = { completed:"check", in_progress:"play", not_started:"circle" };

export const metadata: Metadata = createSeoMetadata({ title:"Карта навичок", description:"Доступна карта навичок SYSTEMA з реальними станами, ієрархією та прозорим походженням progress.", pathname:"/skills", keywords:["карта навичок", "system design skills", "навички архітектора"] });

function SkillBranch({ nodes, progressAvailable }: Readonly<{ nodes: readonly SkillMapNode[]; progressAvailable: boolean }>) {
  return <ol>{nodes.map((node) => {
    const { skill, state, stateLabel, explanation, evidence } = node.progress;
    const visibleState = progressAvailable ? state : "not_started";
    return <li key={skill.id} className={node.contextOnly ? styles.context : undefined}>
      <article id={skill.slug} className={styles[progressAvailable ? state : "unavailable"]}>
        <header><span>{categoryLabels[skill.category] ?? skill.category}</span><strong><SystemIcon name={progressAvailable ? stateIcons[visibleState] : "help"} /> {progressAvailable ? stateLabel : "Статус недоступний"}</strong></header>
        <h3>{skill.title}</h3><p>{skill.description}</p>
        {node.contextOnly ? <p className={styles.contextLabel}>Контекст ієрархії для вибраної категорії.</p> : null}
        <div className={styles.evidence}><strong>Підстава стану</strong><p>{progressAvailable ? explanation : "Не вдалося завантажити owner progress. Структура skill map залишається доступною."}</p>{progressAvailable ? <span>{evidence.completedUnits} із {evidence.requiredUnits} mapped units · {evidence.catalog}</span> : null}</div>
      </article>
      {node.children.length ? <SkillBranch nodes={node.children} progressAvailable={progressAvailable} /> : null}
    </li>;
  })}</ol>;
}

export default async function SkillsPage({ searchParams }: SkillsPageProps) {
  const [query, supabase] = await Promise.all([searchParams, createSupabaseServerClient()]);
  const categories = getSkillCategories(skillTaxonomy.skills);
  const activeFilter = resolveSkillCategoryFilter(query.category, categories);
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const loadResult = user && supabase ? await loadSkillUnitCompletions(supabase, user.id, skillTaxonomy) : { available:true, records:[] };
  const progress = buildSkillProgress(skillTaxonomy, skillContentCatalog, loadResult.records);
  const summary = summarizeSkillProgress(progress);
  const tree = buildSkillMapTree(progress, activeFilter);
  const progressAvailable = !user || loadResult.available;

  return <main className={`page-shell ${styles.page}`}>
    <header className={styles.hero}><div><p className={styles.kicker}>SKILL MAP · SYSTEMA</p><h1>Бач, <em>що вже вмієш</em> і що формує кожна навичка.</h1><p>Це не рейтинг і не mastery score. Стани походять лише з фактично завершених занять та рівнів.</p></div><SkillProgressSummary summary={summary} available={progressAvailable} /></header>
    {!user ? <aside className={styles.notice}><div><strong>Гостьовий нульовий стан</strong><p>Структура карти доступна всім. Увійди, щоб завантажити власні completion records.</p></div><Link href={`/auth/sign-in?next=${encodeURIComponent("/skills")}`}>Увійти <SystemIcon name="arrow-right" /></Link></aside> : null}
    {user && !loadResult.available ? <div className={styles.error} role="status">Прогрес тимчасово недоступний. Структуру навичок показано без фальшивих нульових станів.</div> : null}
    <nav className={styles.filters} aria-label="Фільтр карти навичок"><Link href="/skills" aria-current={activeFilter === "all" ? "page" : undefined}>Усі навички</Link>{categories.map((category) => <Link key={category} href={`/skills?category=${category}`} aria-current={activeFilter === category ? "page" : undefined}>{categoryLabels[category] ?? category}</Link>)}</nav>
    <section className={styles.map} aria-labelledby="skillMapHeading"><header><p>TEXT-FIRST HIERARCHY · {activeFilter.toUpperCase()}</p><h2 id="skillMapHeading">Навички та залежності</h2><p>Відступ і лінії показують parent-child зв’язок. Той самий зв’язок закодований порядком вкладеного списку.</p></header><div className={styles.tree}><SkillBranch nodes={tree} progressAvailable={progressAvailable} /></div></section>
  </main>;
}
