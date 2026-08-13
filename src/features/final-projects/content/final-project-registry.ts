import { courses } from "@/content/courses";
import {
  FINAL_DESIGN_SCHEMA_VERSION,
  FINAL_DESIGN_LESSON_ID,
  FINAL_DESIGN_SIMULATOR_ID,
  parseFinalDesignState,
  validateFinalDesign,
} from "@/lib/simulators/final-system-design";
import {
  defineFinalProject,
  type FinalProject,
  type FinalProjectCatalog,
  type FinalProjectValidatorDescriptor,
} from "../domain";

const finalSystemDesignValidator: FinalProjectValidatorDescriptor = Object.freeze({
  id: "final-system-design",
  version: 2,
  resultVersion: 2,
  simulatorId: FINAL_DESIGN_SIMULATOR_ID,
  simulatorSchemaVersion: FINAL_DESIGN_SCHEMA_VERSION,
  persistenceLessonId: FINAL_DESIGN_LESSON_ID,
  parseState: parseFinalDesignState,
  validateState(value: unknown) {
    const state = parseFinalDesignState(value);
    return state ? validateFinalDesign(state) : null;
  },
});

export const finalProjectCatalog: FinalProjectCatalog = Object.freeze({
  courses: Object.freeze({
    adult: Object.freeze(courses.map((course) => course.id)),
    kids: Object.freeze([]),
  }),
  validators: Object.freeze([finalSystemDesignValidator]),
});

const authoredFinalProjects = [
  {
    schema: "systema.final-project",
    schemaVersion: 1,
    contentVersion: 2,
    id: "high-load-audit-platform",
    slug: "high-load-audit-platform",
    title: "Спроєктуй accessibility-аудит платформу",
    shortDescription: "Фінальний System Design із навантаженням, failure scenarios та перевірними reliability рішеннями.",
    outcome: "Побудувати й аргументовано захистити production-ready архітектуру з незалежним масштабуванням API та воркерів.",
    course: { catalog: "adult", courseId: "high-load-architecture" },
    status: "published",
    estimatedMinutes: 120,
    access: { guestPreview: true },
    scenario: {
      title: "Accessibility-аудит як високонавантажена платформа",
      summary: "Користувач запускає аудит сайту, воркери перевіряють сторінки, а платформа зберігає результати, формує звіти та показує live status.",
      assumptions: [
        "Audit API приймає завдання швидше, ніж воркери можуть завершити повну перевірку.",
        "Скріншоти, PDF та VPAT є великими immutable artifacts і не повинні навантажувати application database.",
        "Відмова одного instance, primary database або цілого region не повинна безконтрольно втрачати accepted jobs.",
      ],
    },
    requirements: [
      { id: "registered-users", title: "Підтримати 100 000 користувачів", description: "Архітектура має врахувати authentication, profiles і нерівномірну активність користувачів.", priority: "must" },
      { id: "audit-throughput", title: "Обробляти 10 000 аудитів на годину", description: "Admission і processing мають бути розділені durable queue та окремо масштабованими consumers.", priority: "must" },
      { id: "site-depth", title: "Перевіряти до 500 сторінок сайту", description: "Один аудит має безпечно розкладатися на bounded page jobs без блокування HTTP request.", priority: "must" },
      { id: "retention", title: "Зберігати результати три роки", description: "Structured issues та великі report artifacts потребують різних storage і lifecycle policies.", priority: "must" },
      { id: "availability", title: "Досягти 99,9% доступності", description: "Critical path не повинен мати single point of failure, а recovery цілі мають бути явними.", priority: "must" },
      { id: "job-recovery", title: "Повторно запускати невдалі завдання", description: "Retry потребує idempotency, exponential backoff, limit і dead-letter handling.", priority: "must" },
      { id: "report-generation", title: "Генерувати PDF та VPAT", description: "Тривала генерація звітів виконується асинхронно, а artifacts віддаються через object storage і CDN.", priority: "must" },
      { id: "live-status", title: "Показувати live status", description: "Status delivery має працювати між багатьма API instances і мати graceful fallback.", priority: "should" },
    ],
    constraints: [
      { id: "api-worker-scaling", label: "Scaling boundary", value: "API та workers окремо", description: "Traffic до API й compute cost браузерних аудитів масштабуються незалежно." },
      { id: "availability-target", label: "Availability", value: "99,9%", description: "Допустимий downtime оцінюється від заявленого SLO, а не від наявності одного backup." },
      { id: "recovery-point", label: "RPO", value: "не більше 15 хвилин", description: "Втрата accepted jobs і committed results має залишатися в межах recovery point objective." },
      { id: "recovery-time", label: "RTO", value: "не більше 60 хвилин", description: "Regional recovery path має бути перевірним і вкладатися в recovery time objective." },
      { id: "data-retention", label: "Retention", value: "3 роки", description: "Lifecycle policy враховує archive, restore і контрольоване видалення." },
      { id: "bounded-page-count", label: "Audit size", value: "до 500 сторінок", description: "Fan-out має мати bounded concurrency та backpressure." },
    ],
    successCriteria: [
      { id: "complete-critical-path", title: "Critical path повний", description: "Client, API, durable jobs, workers, databases, artifacts і notifications з'єднані в пояснюваний flow." },
      { id: "independent-scaling", title: "Scaling незалежний", description: "API cluster і worker cluster можна масштабувати за різними signals без shared process state." },
      { id: "failure-recovery", title: "Failure recovery визначений", description: "Database, API instance, cache і region failures мають failover або graceful degradation path." },
      { id: "safe-retries", title: "Retries безпечні", description: "Timeout, idempotency, bounded backoff і DLQ не створюють retry storm або duplicate effects." },
      { id: "accessible-explanation", title: "Архітектура пояснена текстом", description: "Компоненти, зв'язки, trade-offs і recovery рішення доступні не лише у visual diagram." },
    ],
    builder: {
      version: 2,
      maxConnections: 40,
      components: [
        { id: "cdn", label: "CDN", description: "Кешує static assets і report downloads на edge.", category: "edge" },
        { id: "frontend", label: "Next.js Frontend", description: "Відображає dashboard і запускає audit через API.", category: "edge" },
        { id: "load-balancer", label: "Load Balancer", description: "Розподіляє traffic між healthy API instances.", category: "edge" },
        { id: "api-cluster", label: "API Service Cluster", description: "Приймає requests як stateless independently scaled instances.", category: "compute" },
        { id: "redis", label: "Redis", description: "Зберігає cache, ephemeral status і Pub/Sub state.", category: "data" },
        { id: "postgres", label: "PostgreSQL", description: "Зберігає transactional metadata та audit state.", category: "data" },
        { id: "read-replicas", label: "Read Replicas", description: "Відокремлюють read traffic і створюють recovery options.", category: "data" },
        { id: "job-queue", label: "Job Queue", description: "Буферизує audit jobs і дає workers backpressure.", category: "integration" },
        { id: "worker-cluster", label: "Worker Cluster", description: "Окремо масштабує довгі audit tasks.", category: "compute" },
        { id: "puppeteer", label: "Puppeteer", description: "Відкриває сторінки у headless browser.", category: "processing" },
        { id: "axe-core", label: "axe-core", description: "Виконує автоматичні accessibility rules.", category: "processing" },
        { id: "object-storage", label: "Object Storage / Reports", description: "Зберігає screenshots, PDF та VPAT artifacts.", category: "data" },
        { id: "notification", label: "Notification Service", description: "Повідомляє користувача після завершення job.", category: "integration" },
        { id: "status-stream", label: "Live Status Stream", description: "Передає progress у dashboard з polling fallback.", category: "integration" },
      ],
      policies: [
        { id: "api-independent", label: "API масштабується незалежно", description: "API instances не містять локального session/job state." },
        { id: "workers-independent", label: "Workers масштабуються незалежно", description: "Worker count реагує на queue depth і processing time." },
        { id: "retry-dlq", label: "Retry + DLQ", description: "Jobs мають idempotency, bounded backoff і dead-letter path." },
        { id: "realtime-pubsub", label: "Shared Pub/Sub", description: "Live status доступний між усіма API instances." },
        { id: "async-reports", label: "Асинхронні reports", description: "PDF/VPAT не генеруються всередині HTTP request." },
        { id: "multi-az-failover", label: "Multi-AZ failover", description: "Critical data tier переживає zone failure." },
        { id: "resilience-guards", label: "Timeout + circuit breaker", description: "Dependency failures не створюють hanging requests і retry storm." },
        { id: "degraded-mode", label: "Graceful degradation", description: "Core status залишається доступним без optional dependencies." },
        { id: "pitr-rpo-rto", label: "PITR та recovery objectives", description: "Backup/restore відповідають числовим RPO/RTO." },
        { id: "warm-standby", label: "Warm standby region", description: "Regional disaster має визначений recovery path." },
      ],
      scenarios: [
        { id: "db-primary", label: "Primary database failure", description: "Перевір failover, reconnect і safe retry." },
        { id: "api-instance", label: "API instance failure", description: "Перевір stateless routing та health checks." },
        { id: "redis-outage", label: "Redis outage", description: "Перевір circuit breaker і degraded status delivery." },
        { id: "region-outage", label: "Primary region outage", description: "Перевір regional recovery, RPO та RTO." },
        { id: "traffic-spike", label: "Traffic spike / overload", description: "Перевір backpressure та незалежне масштабування API і workers." },
      ],
    },
    starterScenario: {
      version: 2,
      simulatorId: "final-system-design",
      simulatorSchemaVersion: 1,
      textDescription: "Порожня архітектура без компонентів і policies; для першої перевірки обрано відмову primary database.",
      state: { components: [], rules: [], scenario: "db-primary", connections: [] },
    },
    validator: { id: "final-system-design", version: 2, resultVersion: 2 },
  },
] as const;

export const finalProjects: readonly FinalProject[] = Object.freeze(
  authoredFinalProjects.map((project) => defineFinalProject(project, finalProjectCatalog)),
);

function assertUniqueProjects(projects: readonly FinalProject[]) {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const courseVersions = new Set<string>();
  for (const project of projects) {
    if (ids.has(project.id)) throw new Error(`Duplicate final project id: ${project.id}`);
    if (slugs.has(project.slug)) throw new Error(`Duplicate final project slug: ${project.slug}`);
    const courseVersion = `${project.course.catalog}:${project.course.courseId}:${project.contentVersion}`;
    if (courseVersions.has(courseVersion)) throw new Error(`Duplicate final project course version: ${courseVersion}`);
    ids.add(project.id);
    slugs.add(project.slug);
    courseVersions.add(courseVersion);
  }
}

assertUniqueProjects(finalProjects);

export function getFinalProjectBySlug(slug: string) {
  return finalProjects.find((project) => project.slug === slug) ?? null;
}

export function getPublishedFinalProjects() {
  return finalProjects.filter((project) => project.status === "published");
}

export function getCourseFinalProject(catalog: "adult" | "kids", courseId: string) {
  return finalProjects.find((project) => project.course.catalog === catalog && project.course.courseId === courseId && project.status === "published") ?? null;
}

export function resolveFinalProjectValidator(project: FinalProject) {
  return finalProjectCatalog.validators.find((validator) =>
    validator.id === project.validator.id
    && validator.version === project.validator.version
    && validator.resultVersion === project.validator.resultVersion
    && validator.simulatorId === project.starterScenario.simulatorId
    && validator.simulatorSchemaVersion === project.starterScenario.simulatorSchemaVersion
  ) ?? null;
}
