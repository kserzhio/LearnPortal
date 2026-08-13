import type { SkillNode } from "../domain";
import type { SkillProgress, SkillProgressState } from "../progress";

export type SkillMapFilter = "all" | string;
export type SkillMapNode = Readonly<{
  progress: SkillProgress;
  contextOnly: boolean;
  children: readonly SkillMapNode[];
}>;
export type SkillProgressSummary = Readonly<Record<SkillProgressState, number>>;

export function getSkillCategories(skills: readonly SkillNode[]) {
  return [...new Set(skills.map((skill) => skill.category))].toSorted();
}

export function resolveSkillCategoryFilter(value: string | string[] | undefined, categories: readonly string[]): SkillMapFilter {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && categories.includes(candidate) ? candidate : "all";
}

export function summarizeSkillProgress(progress: readonly SkillProgress[]): SkillProgressSummary {
  return progress.reduce<SkillProgressSummary>((summary, entry) => ({ ...summary, [entry.state]: summary[entry.state] + 1 }), { not_started: 0, in_progress: 0, completed: 0 });
}

export function buildSkillMapTree(progress: readonly SkillProgress[], filter: SkillMapFilter): readonly SkillMapNode[] {
  const byParent = new Map<string | null, SkillProgress[]>();
  for (const entry of progress) byParent.set(entry.skill.parentId, [...(byParent.get(entry.skill.parentId) ?? []), entry]);
  function nodeFor(entry: SkillProgress): SkillMapNode | null {
    const children = (byParent.get(entry.skill.id) ?? []).map(nodeFor).filter((node): node is SkillMapNode => Boolean(node));
    const matches = filter === "all" || entry.skill.category === filter;
    if (!matches && children.length === 0) return null;
    return { progress: entry, contextOnly: !matches, children };
  }
  return (byParent.get(null) ?? []).map(nodeFor).filter((node): node is SkillMapNode => Boolean(node));
}
