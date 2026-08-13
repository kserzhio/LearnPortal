import type { LevelDefinition, WorldDefinition } from "../domain/course-model";
import type { KidsProgressBundle } from "../progress/progress-model";

export type WorldMapCourse = Readonly<{
  id: string;
  worlds: readonly Pick<WorldDefinition, "id" | "title" | "description" | "position" | "themeKey" | "levels">[];
}>;

export type WorldMapLevelStatus = "completed" | "current" | "available" | "locked";
export type WorldMapWorldStatus = "completed" | "current" | "unlocked" | "locked";

export type WorldMapLevel = Readonly<{
  id: string;
  worldId: string;
  position: number;
  title: string;
  description: string;
  difficulty: LevelDefinition["difficulty"];
  status: WorldMapLevelStatus;
  stars: 0 | 1 | 2 | 3;
}>;

export type WorldMapWorld = Readonly<{
  id: string;
  position: number;
  title: string;
  description: string;
  themeKey: string;
  status: WorldMapWorldStatus;
  levels: readonly WorldMapLevel[];
}>;

export type KidsWorldMap = Readonly<{
  courseId: string;
  worlds: readonly WorldMapWorld[];
  current: Readonly<{ worldId: string; levelId: string }> | null;
  completedLevels: number;
  totalLevels: number;
  earnedStars: number;
  availableStars: number;
}>;

const clampStars = (value: number): 0 | 1 | 2 | 3 => Math.min(3, Math.max(0, Math.trunc(value))) as 0 | 1 | 2 | 3;

export function buildKidsWorldMap(course: WorldMapCourse, progress: Pick<KidsProgressBundle, "courseId" | "levels" | "unlocks">): KidsWorldMap {
  if (course.id !== progress.courseId) throw new Error("World map progress belongs to another course.");
  const progressByLevel = new Map(progress.levels.map((level) => [`${level.worldId}:${level.levelId}`, level]));
  const explicitWorldUnlocks = new Set(progress.unlocks.filter((unlock) => unlock.kind === "world").map((unlock) => unlock.referenceId));
  const orderedWorlds = [...course.worlds].sort((left, right) => left.position - right.position || left.id.localeCompare(right.id));
  let previousWorldCompleted = true;
  let current: KidsWorldMap["current"] = null;
  let completedLevels = 0;
  let earnedStars = 0;
  let totalLevels = 0;

  const worlds = orderedWorlds.map((world, worldIndex): WorldMapWorld => {
    const orderedLevels = [...world.levels].sort((left, right) => left.position - right.position || left.id.localeCompare(right.id));
    const worldUnlocked = worldIndex === 0 || previousWorldCompleted || explicitWorldUnlocks.has(world.id);
    const worldCompleted = orderedLevels.length > 0 && orderedLevels.every((level) => progressByLevel.get(`${world.id}:${level.id}`)?.completed);
    let nextLevelExposed = false;
    const levels = orderedLevels.map((level): WorldMapLevel => {
      const saved = progressByLevel.get(`${world.id}:${level.id}`);
      const completed = Boolean(saved?.completed);
      const stars = clampStars(saved?.stars ?? 0);
      totalLevels += 1;
      earnedStars += stars;
      if (completed) completedLevels += 1;

      let status: WorldMapLevelStatus = "locked";
      if (completed) status = "completed";
      else if (worldUnlocked && !nextLevelExposed) {
        status = current ? "available" : "current";
        nextLevelExposed = true;
        if (!current) current = { worldId: world.id, levelId: level.id };
      }
      return {
        id: level.id,
        worldId: world.id,
        position: level.position,
        title: level.title,
        description: level.description,
        difficulty: level.difficulty,
        status,
        stars,
      };
    });
    const status: WorldMapWorldStatus = worldCompleted
      ? "completed"
      : levels.some((level) => level.status === "current")
        ? "current"
        : worldUnlocked ? "unlocked" : "locked";
    previousWorldCompleted = worldCompleted;
    return { id: world.id, position: world.position, title: world.title, description: world.description, themeKey: world.themeKey, status, levels };
  });

  return {
    courseId: course.id,
    worlds,
    current,
    completedLevels,
    totalLevels,
    earnedStars,
    availableStars: totalLevels * 3,
  };
}
