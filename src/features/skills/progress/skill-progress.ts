import type { SkillCatalogKind, SkillContentCatalog, SkillMapping, SkillNode, SkillTaxonomy } from "../domain";

export type SkillProgressState = "not_started" | "in_progress" | "completed";
export type SkillUnitCompletion = Readonly<{
  catalog: SkillCatalogKind;
  courseId: string;
  unitId: string;
  completed: boolean;
}>;

export type SkillEvidence = Readonly<{
  catalog: SkillCatalogKind;
  courseId: string;
  completedUnits: number;
  requiredUnits: number;
}>;

export type SkillProgress = Readonly<{
  skill: SkillNode;
  state: SkillProgressState;
  stateLabel: string;
  explanation: string;
  evidence: SkillEvidence;
}>;

type EvidenceTrack = Readonly<{ catalog: SkillCatalogKind; courseId: string; unitIds: readonly string[] }>;
const stateLabels: Readonly<Record<SkillProgressState, string>> = {
  not_started: "Ще не розпочато",
  in_progress: "У процесі",
  completed: "Завершено",
};
function courseKey(catalog: SkillCatalogKind, courseId: string) { return `${catalog}:${courseId}`; }
function unitKey(catalog: SkillCatalogKind, courseId: string, unitId: string) { return `${catalog}:${courseId}:${unitId}`; }

export function mergeSkillUnitCompletions(...collections: readonly (readonly SkillUnitCompletion[])[]) {
  const merged = new Map<string, SkillUnitCompletion>();
  for (const record of collections.flat()) {
    const key = unitKey(record.catalog, record.courseId, record.unitId);
    const existing = merged.get(key);
    merged.set(key, { ...record, completed: Boolean(existing?.completed || record.completed) });
  }
  return [...merged.values()];
}

function unitsForMapping(mapping: SkillMapping, catalog: SkillContentCatalog) {
  if (mapping.content.contentType === "unit") return mapping.content.contentId ? [mapping.content.contentId] : [];
  return catalog[mapping.content.catalog].find((course) => course.courseId === mapping.content.courseId)?.unitIds ?? [];
}

function buildEvidenceTracks(skillId: string, taxonomy: SkillTaxonomy, catalog: SkillContentCatalog): readonly EvidenceTrack[] {
  const tracks = new Map<string, { catalog: SkillCatalogKind; courseId: string; unitIds: Set<string> }>();
  for (const mapping of taxonomy.mappings) {
    if (mapping.skillId !== skillId) continue;
    const key = courseKey(mapping.content.catalog, mapping.content.courseId);
    const track = tracks.get(key) ?? { catalog: mapping.content.catalog, courseId: mapping.content.courseId, unitIds: new Set<string>() };
    unitsForMapping(mapping, catalog).forEach((unitId) => track.unitIds.add(unitId));
    tracks.set(key, track);
  }
  return [...tracks.values()].map((track) => ({ ...track, unitIds: [...track.unitIds] }));
}

function completedUnitKeys(records: readonly SkillUnitCompletion[]) {
  return new Set(mergeSkillUnitCompletions(records).filter((record) => record.completed).map((record) => unitKey(record.catalog, record.courseId, record.unitId)));
}

function evidenceForTrack(track: EvidenceTrack, completed: ReadonlySet<string>): SkillEvidence {
  return {
    catalog: track.catalog,
    courseId: track.courseId,
    completedUnits: track.unitIds.filter((unitId) => completed.has(unitKey(track.catalog, track.courseId, unitId))).length,
    requiredUnits: track.unitIds.length,
  };
}

function preferredEvidence(evidence: readonly SkillEvidence[]) {
  return evidence.find((entry) => entry.requiredUnits > 0 && entry.completedUnits === entry.requiredUnits)
    ?? evidence.reduce((best, entry) => entry.completedUnits > best.completedUnits ? entry : best, evidence[0]);
}

function explanation(state: SkillProgressState, evidence: SkillEvidence) {
  const source = `${evidence.catalog} course «${evidence.courseId}»`;
  if (state === "completed") return `Завершено всі ${evidence.requiredUnits} mapped units у ${source}.`;
  if (state === "in_progress") return `Завершено ${evidence.completedUnits} із ${evidence.requiredUnits} mapped units у ${source}.`;
  return `Ще немає завершених mapped units у ${source}.`;
}

export function buildSkillProgress(
  taxonomy: SkillTaxonomy,
  catalog: SkillContentCatalog,
  records: readonly SkillUnitCompletion[],
): readonly SkillProgress[] {
  const completed = completedUnitKeys(records);
  return taxonomy.skills.map((skill) => {
    const evidence = buildEvidenceTracks(skill.id, taxonomy, catalog).map((track) => evidenceForTrack(track, completed));
    if (evidence.length === 0) throw new Error(`Skill ${skill.id} has no evidence tracks.`);
    const selected = preferredEvidence(evidence);
    const state: SkillProgressState = selected.requiredUnits > 0 && selected.completedUnits === selected.requiredUnits
      ? "completed"
      : evidence.some((entry) => entry.completedUnits > 0) ? "in_progress" : "not_started";
    return { skill, state, stateLabel: stateLabels[state], explanation: explanation(state, selected), evidence: selected };
  });
}
