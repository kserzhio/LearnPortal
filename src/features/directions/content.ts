import type { FaqItem } from "@/features/learning-support/content";

export type DirectionCourseCard = Readonly<{
  id: string;
  accent: string;
  label: string;
  title: string;
  description: string;
  facts: readonly Readonly<{ label: string; value: string }>[];
  href: string;
  cta: string;
}>;

export type DirectionContent = Readonly<{
  id: "system-design" | "kids" | "javascript-for-kids";
  pathname: `/${string}`;
  kicker: string;
  title: string;
  highlightedTitle: string;
  description: string;
  audience: string;
  primaryCta: Readonly<{ label: string; href: string }>;
  secondaryCta: Readonly<{ label: string; href: string }>;
  outcomes: readonly Readonly<{ label: string; title: string; description: string }>[];
  method: readonly Readonly<{ label: string; title: string; description: string }>[];
  courses: readonly DirectionCourseCard[];
  example: Readonly<{
    kind: "failure-simulation" | "level-preview";
    label: string;
    title: string;
    description: string;
    steps?: readonly string[];
    code?: string;
    href: string;
    cta: string;
  }>;
  faqs: readonly FaqItem[];
  seo: Readonly<{ title: string; description: string; keywords: readonly string[] }>;
}>;

const learningMethod = [
  { label: "01 · LEARN", title: "Зрозумій", description: "Коротка теорія пояснює одну концепцію без зайвого перевантаження." },
  { label: "02 · BUILD", title: "Побудуй", description: "Застосуй концепцію у схемі, алгоритмі або видимій команді." },
  { label: "03 · SIMULATE", title: "Перевір", description: "Запусти сценарій і побач результат власного рішення." },
  { label: "04 · IMPROVE", title: "Покращ", description: "Отримай конкретний feedback і спробуй інший варіант." },
] as const;

const highLoadCard: DirectionCourseCard = {
  id: "high-load-architecture",
  accent: "HA",
  label: "PRO · INTERACTIVE",
  title: "Архітектура високонавантажених систем",
  description: "Від метрик навантаження до кешування, черг, шардінгу, observability та фінального System Design.",
  facts: [
    { label: "Заняття", value: "19" },
    { label: "Тривалість", value: "≈24 години" },
    { label: "Рівень", value: "Intermediate" },
  ],
  href: "/courses/high-load-architecture",
  cta: "Переглянути курс",
};

const robotQuestCard: DirectionCourseCard = {
  id: "robot-quest-algorithms",
  accent: "RQ",
  label: "KIDS · 6+",
  title: "Robot Quest — Algorithms",
  description: "Алгоритмічне мислення через блоки, рух героя, повороти, перешкоди та repeat.",
  facts: [
    { label: "Рівні", value: "5" },
    { label: "Темп", value: "≈10 хв" },
    { label: "Режим", value: "Блоки" },
  ],
  href: "/kids-coding/robot-quest-algorithms/village/robot-village-01",
  cta: "Спробувати перший рівень",
};

const javascriptCard: DirectionCourseCard = {
  id: "code-adventure-javascript",
  accent: "JS",
  label: "KIDS · 7+",
  title: "Code Adventure — JavaScript",
  description: "Перші JavaScript-команди з миттєвим видимим результатом у грі.",
  facts: [
    { label: "Рівні", value: "5" },
    { label: "Темп", value: "≈10 хв" },
    { label: "Режим", value: "JavaScript" },
  ],
  href: "/kids-coding/code-adventure-javascript/village/code-village-01",
  cta: "Запустити перший код",
};

export const systemDesignDirection: DirectionContent = {
  id: "system-design",
  pathname: "/system-design",
  kicker: "SYSTEM DESIGN · HIGH LOAD",
  title: "Проєктуй системи, які",
  highlightedTitle: "витримують реальне навантаження.",
  description: "Навчися переводити бізнес-вимоги у RPS, знаходити bottlenecks і будувати відмовостійку архітектуру через практику та симуляції.",
  audience: "Для frontend, backend, QA, DevOps та інженерів, які хочуть впевнено розуміти повний шлях запиту й архітектурні trade-offs.",
  primaryCta: { label: "Спробувати перше заняття", href: "/courses/high-load-architecture/lessons/what-is-high-load" },
  secondaryCta: { label: "Переглянути програму", href: "/courses/high-load-architecture" },
  outcomes: [
    { label: "CAPACITY", title: "Оцінювати навантаження", description: "Рахувати average і peak RPS, concurrency, storage, traffic та worker capacity." },
    { label: "ARCHITECTURE", title: "Будувати system design", description: "Обирати API, database, cache, queue, workers і межі сервісів під вимоги." },
    { label: "RELIABILITY", title: "Проєктувати відмовостійкість", description: "Знаходити single points of failure, додавати redundancy, failover і graceful degradation." },
  ],
  method: learningMethod,
  courses: [highLoadCard],
  example: {
    kind: "failure-simulation",
    label: "LIVE FAILURE SCENARIO",
    title: "Вимкни один сервер",
    description: "Перевір, чи Load Balancer збереже доступність системи після відмови одного application server.",
    href: "/courses/high-load-architecture/lessons/what-is-high-load",
    cta: "Перейти до повного заняття",
  },
  faqs: [
    { id: "system-design-level", question: "Який рівень знань потрібен?", answer: "Достатньо базово розуміти HTTP і шлях запиту у web application. Усі метрики та архітектурні поняття пояснюються через конкретні сценарії." },
    { id: "system-design-practice", question: "Чи є практичні завдання?", answer: "Так. Курс містить розрахунки, architecture diagrams, validators, failure simulations і фінальний System Design simulator." },
    { id: "system-design-guest", question: "Що доступно без реєстрації?", answer: "Без реєстрації можна пройти перше заняття. Вхід відкриває повний курс і синхронізацію прогресу." },
  ],
  seo: {
    title: "System Design та високонавантажені системи",
    description: "Практичне навчання System Design українською: high load, scalability, databases, queues, caching, observability і відмовостійкість.",
    keywords: ["system design українською", "архітектура високонавантажених систем", "high load course", "scalability", "відмовостійкість"],
  },
};

export const kidsDirection: DirectionContent = {
  id: "kids",
  pathname: "/kids",
  kicker: "KIDS CODING · 6–12 РОКІВ",
  title: "Програмування, яке дитина",
  highlightedTitle: "бачить як пригоду.",
  description: "Короткі ігрові рівні розвивають логіку, алгоритмічне мислення та перші навички коду без перевантаження.",
  audience: "Для дітей 6–12 років без попереднього досвіду. Молодшим учням може знадобитися допомога дорослого лише з читанням мети.",
  primaryCta: { label: "Спробувати Robot Quest", href: robotQuestCard.href },
  secondaryCta: { label: "Спробувати JavaScript", href: javascriptCard.href },
  outcomes: [
    { label: "LOGIC", title: "Мислити послідовностями", description: "Складати дії у зрозумілий алгоритм і передбачати результат до запуску." },
    { label: "DEBUG", title: "Не боятися помилок", description: "Бачити, де герой зупинився, змінювати рішення та повторювати спробу." },
    { label: "CODE", title: "Переходити до JavaScript", description: "Пов’язувати видимі дії героя з командами, arguments, variables і loops." },
  ],
  method: learningMethod,
  courses: [robotQuestCard, javascriptCard],
  example: {
    kind: "level-preview",
    label: "ПЕРШИЙ РІВЕНЬ · БЕЗ РЕЄСТРАЦІЇ",
    title: "Одна команда — один видимий результат",
    description: "Герой стоїть поруч із фінішем. Додай одну команду руху, запусти алгоритм і одразу побач результат.",
    steps: ["Обери MOVE", "Запусти алгоритм", "Дійди до фінішу"],
    href: robotQuestCard.href,
    cta: "Відкрити ігровий рівень",
  },
  faqs: [
    { id: "kids-experience", question: "Чи потрібен досвід програмування?", answer: "Ні. Перший рівень використовує одну видиму команду, а нові поняття додаються поступово." },
    { id: "kids-time", question: "Скільки часу займає рівень?", answer: "Орієнтовно 10 хвилин. Рівень можна повторювати без обмежень і без штрафів." },
    { id: "kids-access", question: "Що доступно без реєстрації?", answer: "Перший рівень кожного дитячого курсу доступний без входу. Для збереження повного прогресу потрібен акаунт." },
  ],
  seo: {
    title: "Програмування для дітей через гру",
    description: "Інтерактивні курси програмування для дітей 6–12 років: алгоритми, логіка та перші JavaScript-команди через короткі ігрові рівні.",
    keywords: ["програмування для дітей", "курси програмування 6 років", "алгоритми для дітей", "навчання через гру", "JavaScript для дітей"],
  },
};

export const javascriptForKidsDirection: DirectionContent = {
  id: "javascript-for-kids",
  pathname: "/javascript-for-kids",
  kicker: "JAVASCRIPT · KIDS · 7+",
  title: "Перший JavaScript, який",
  highlightedTitle: "одразу щось робить.",
  description: "Дитина пише коротку команду, запускає її та бачить, як герой рухається. Код перестає бути абстрактним текстом.",
  audience: "Для дітей від 7 років, які вже читають короткі інструкції. Попередній досвід програмування не потрібен.",
  primaryCta: { label: "Запустити першу команду", href: javascriptCard.href },
  secondaryCta: { label: "Усі Kids курси", href: "/kids" },
  outcomes: [
    { label: "COMMANDS", title: "Викликати команди", description: "Розуміти зв’язок між `hero.move()` і видимою дією персонажа." },
    { label: "VALUES", title: "Передавати значення", description: "Керувати кількістю кроків через argument і зберігати число у variable." },
    { label: "LOOPS", title: "Помічати повторення", description: "Замінювати однакові команди коротким bounded loop у безпечному sandbox." },
  ],
  method: learningMethod,
  courses: [javascriptCard],
  example: {
    kind: "level-preview",
    label: "CODE PREVIEW · РІВЕНЬ 1",
    title: "Запусти `hero.move()`",
    description: "Перша команда вже підготовлена. Натисни Run у справжньому рівні та побач, як герой робить крок до фінішу.",
    code: "hero.move();",
    steps: ["Прочитай команду", "Натисни Run", "Побач рух героя"],
    href: javascriptCard.href,
    cta: "Відкрити JavaScript-рівень",
  },
  faqs: [
    { id: "javascript-syntax", question: "Чи не буде JavaScript занадто складним?", answer: "Курс починається з однієї готової команди. Syntax вводиться маленькими кроками разом із видимим результатом." },
    { id: "javascript-safe", question: "Чи безпечно запускати код?", answer: "Так. Рівень підтримує лише обмежену навчальну підмножину команд у sandbox із budget та timeout." },
    { id: "javascript-next", question: "Що дитина вивчить далі?", answer: "Після першої команди з’являються arguments, variables, jump і bounded for loop. Поточний курс містить п’ять рівнів." },
  ],
  seo: {
    title: "JavaScript для дітей через інтерактивну гру",
    description: "Перші JavaScript-команди для дітей від 7 років: hero.move(), arguments, variables і loops з миттєвим результатом у грі.",
    keywords: ["JavaScript для дітей", "програмування JavaScript 7 років", "перший код для дітей", "інтерактивний JavaScript", "навчальна гра програмування"],
  },
};

export const directions = [systemDesignDirection, kidsDirection, javascriptForKidsDirection] as const;

