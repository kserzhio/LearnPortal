import { SystemIcon } from "@/components/ui/system-icon";
import type { SkillProgressSummary as Summary } from "../presentation";

export function SkillProgressSummary({ summary, available = true }: Readonly<{ summary: Summary; available?: boolean }>) {
  return (
    <dl className="skill-progress-summary" aria-label="Огляд станів навичок">
      <div><dt><SystemIcon name="check" /> Завершено</dt><dd>{available ? summary.completed : "—"}</dd></div>
      <div><dt><SystemIcon name="play" /> У процесі</dt><dd>{available ? summary.in_progress : "—"}</dd></div>
      <div><dt><SystemIcon name="circle" /> Не розпочато</dt><dd>{available ? summary.not_started : "—"}</dd></div>
    </dl>
  );
}
