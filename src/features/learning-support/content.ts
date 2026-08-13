export type FaqItem = Readonly<{ id: string; question: string; answer: string }>;
export type KnowledgeCheck = Readonly<{
  id: string;
  type: "multiple-choice" | "predict" | "find-issue";
  question: string;
  options: readonly Readonly<{ id: string; label: string }>[];
  correctAnswer: string;
  explanation: string;
  incorrectExplanation: string;
}>;
export type LearningSupportContent = Readonly<{
  faqs: readonly FaqItem[];
  hints: readonly string[];
  checks: readonly KnowledgeCheck[];
}>;

export const highLoadLessonOneSupport: LearningSupportContent = {
  faqs: [
    { id: "load-balancer-failure", question: "Що буде, якщо впаде Load Balancer?", answer: "Один Load Balancer стане single point of failure. Для High Availability потрібні щонайменше два екземпляри або керований сервіс із вбудованим failover." },
    { id: "vertical-only", question: "Чому не можна просто додати потужніший сервер?", answer: "Вертикальне масштабування має фізичну межу й не прибирає single point of failure. Воно корисне, але за високих вимог до доступності його поєднують із горизонтальним масштабуванням." },
    { id: "redis-always", question: "Чи завжди потрібен Redis?", answer: "Ні. Кеш додають лише після вимірювання bottleneck і коли вигода перевищує складність invalidation та додаткової інфраструктури." },
  ],
  hints: [
    "Подумай, який компонент може зупинити весь шлях запиту.",
    "Зверни увагу не лише на application servers, а й на Load Balancer та Database.",
    "Для кожного single point of failure запропонуй replica, failover або graceful degradation.",
  ],
  checks: [{
    id: "high-load-01-failover",
    type: "predict",
    question: "Два application servers працюють за Load Balancer. Один server падає. Що має статися?",
    options: [
      { id: "site-down", label: "Весь сайт падає" },
      { id: "reroute", label: "Traffic переходить на здоровий server" },
      { id: "database-server", label: "Database створює новий server" },
      { id: "dns-delete", label: "DNS видаляється" },
    ],
    correctAnswer: "reroute",
    explanation: "Правильно. Health check виключає несправний server, а Load Balancer спрямовує traffic на здоровий екземпляр.",
    incorrectExplanation: "Не зовсім. Load Balancer має виявити несправний server через health check і направити traffic на здоровий екземпляр.",
  }],
};

const highLoadKnowledgeChecks: Readonly<Record<string, readonly KnowledgeCheck[]>> = {
  "high-load-01": highLoadLessonOneSupport.checks,
  "high-load-09": [{
    id: "high-load-09-async",
    type: "multiple-choice",
    question: "Аудит триває кілька хвилин. Яку відповідь має повернути API після створення job?",
    options: [
      { id: "wait-200", label: "Тримати connection і чекати на 200 OK" },
      { id: "accepted-202", label: "202 Accepted із job identifier" },
      { id: "redirect-301", label: "301 Redirect на worker" },
    ],
    correctAnswer: "accepted-202",
    explanation: "Правильно. 202 Accepted підтверджує прийняття job, а Queue і Worker виконують її асинхронно.",
    incorrectExplanation: "Довга операція не повинна утримувати HTTP connection. API повертає 202 Accepted із job identifier.",
  }],
  "high-load-13": [{
    id: "high-load-13-outbox",
    type: "find-issue",
    question: "Статус аудиту записали в Database, але publish notification event завершився помилкою. Що прибирає цей dual-write risk?",
    options: [
      { id: "more-retries", label: "Нескінченний retry HTTP request" },
      { id: "outbox", label: "Transactional outbox" },
      { id: "read-replica", label: "Read replica" },
    ],
    correctAnswer: "outbox",
    explanation: "Правильно. Domain change та outbox event записуються в одній локальній transaction, а relay публікує event окремо.",
    incorrectExplanation: "Потрібно атомарно зберегти domain change та event. Це забезпечує transactional outbox, а не окремий retry.",
  }],
  "high-load-15": [{
    id: "high-load-15-stateless",
    type: "predict",
    question: "Load Balancer перенаправив наступний request користувача з API-1 на API-3. Що потрібно для коректної роботи?",
    options: [
      { id: "local-session", label: "Session зберігається тільки в RAM API-1" },
      { id: "shared-state", label: "API stateless, а shared state — у зовнішньому сховищі" },
      { id: "disable-health", label: "Вимкнути health checks" },
    ],
    correctAnswer: "shared-state",
    explanation: "Правильно. Stateless instances взаємозамінні, тому Load Balancer може безпечно розподіляти requests.",
    incorrectExplanation: "Локальна session прив’язує користувача до одного instance. Для горизонтального масштабування винеси shared state назовні.",
  }],
  "high-load-19": [{
    id: "high-load-19-resilience",
    type: "find-issue",
    question: "У схемі є три API instances, але один Job Queue і одна Database без replica. Чи виконується вимога High Availability?",
    options: [
      { id: "yes-api", label: "Так, бо API вже має три instances" },
      { id: "no-spof", label: "Ні, Queue і Database залишаються single points of failure" },
      { id: "yes-backup", label: "Так, якщо backup створюється раз на добу" },
    ],
    correctAnswer: "no-spof",
    explanation: "Правильно. Надлишковість лише на API layer не усуває single points of failure в усьому request path.",
    incorrectExplanation: "High Availability оцінює весь critical path. Queue і Database також потребують redundancy та failover.",
  }],
};

export function getCourseKnowledgeCheckIds(courseId: string): readonly string[] {
  if (courseId !== "high-load-architecture") return [];
  return Object.values(highLoadKnowledgeChecks).flatMap((checks) => checks.map((check) => check.id));
}

export const highLoadCourseFaq: readonly FaqItem[] = [
  { id: "required-level", question: "Який рівень знань потрібен?", answer: "Достатньо впевнено розуміти HTTP, backend або frontend application flow. Курс починається з базових метрик навантаження." },
  { id: "backend-experience", question: "Чи потрібен backend-досвід?", answer: "Не обов’язково. Backend-досвід допоможе, але всі архітектурні поняття пояснюються через конкретні приклади." },
  { id: "course-duration", question: "Скільки часу займає курс?", answer: "Курс містить 19 занять і приблизно 24 години матеріалу та практики." },
  { id: "frontend-developer", question: "Чи підійде курс frontend developer’у?", answer: "Так. Він допоможе краще розуміти API, кешування, CDN, доступність та обмеження backend-систем." },
];

export const kidsCourseFaq: readonly FaqItem[] = [
  { id: "kids-age", question: "Для якого віку курс?", answer: "Поточні курси розраховані на дітей від 6–7 до 12 років; конкретний рекомендований вік вказаний на картці курсу." },
  { id: "kids-experience", question: "Чи потрібен досвід програмування?", answer: "Ні. Перші рівні починаються з однієї видимої команди та поступово вводять нові поняття." },
  { id: "kids-parent-help", question: "Чи потрібна допомога батьків?", answer: "Дитина може проходити рівні самостійно. Для молодших дітей корисно допомогти прочитати мету й першу підказку." },
  { id: "kids-duration", question: "Скільки триває один рівень?", answer: "Орієнтовно 10 хвилин. Рівень можна повторювати без обмежень." },
];

export function findKnowledgeCheck(courseId: string, contentId: string, checkId: string) {
  if (courseId !== "high-load-architecture") return null;
  return highLoadKnowledgeChecks[contentId]?.find((check) => check.id === checkId) ?? null;
}
