export type FeedbackTone = "success" | "try-again" | "info";

export type FeedbackSource = Readonly<{
  valid: boolean;
  code: string;
  message?: string;
  affectedIds?: readonly string[];
}>;

export type FriendlyFeedback = Readonly<{
  code: string;
  tone: FeedbackTone;
  title: string;
  message: string;
  nextStep: string;
  affectedIds: readonly string[];
  announce: "polite" | "assertive";
}>;

type FeedbackCopy = Omit<FriendlyFeedback, "code" | "affectedIds">;
const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TECHNICAL_DETAILS = /syntaxerror|typeerror|referenceerror|internal\s+ast|stack\s*trace|\bat\s+\S+\.(?:js|ts|tsx):\d+/i;

const success = (title: string, message: string, nextStep: string): FeedbackCopy => ({
  tone: "success", title, message, nextStep, announce: "polite",
});
const retry = (title: string, message: string, nextStep: string): FeedbackCopy => ({
  tone: "try-again", title, message, nextStep, announce: "assertive",
});

const feedbackByCode: Readonly<Record<string, FeedbackCopy>> = {
  "level-completed-perfectly": success("Чудова робота!", "Усі умови виконано — це дуже вдалий розв’язок.", "Можеш перейти до наступного рівня."),
  "level-completed": success("Рівень пройдено!", "Герой дістався мети. Твій алгоритм працює.", "Спробуй покращити розв’язок або продовжуй далі."),
  "goal-not-reached": retry("Майже вийшло", "Герой ще не дістався фінішу.", "Перевір напрямок і кількість кроків."),
  "item-not-collected": retry("Предмет залишився", "Потрібний предмет ще не зібрано.", "Приведи героя до предмета та скористайся командою підбору."),
  "required-command-missing": retry("Спробуй нову команду", "У цьому розв’язку бракує важливої команди.", "Переглянь доступні команди та умову завдання."),
  "too-many-commands": retry("Розв’язок можна скоротити", "Мета досягнута, але команд більше, ніж рекомендовано.", "Пошукай повтори або коротший шлях."),
  "collision-detected": retry("Перешкода на шляху", "Герой зіткнувся з перешкодою.", "Зміни напрямок або обійди небезпечну клітинку."),
  "program-not-ready": retry("Збери алгоритм", "Поки що немає команд для запуску.", "Додай першу команду й спробуй ще раз."),
  "execution-cancelled": retry("Запуск зупинено", "Алгоритм було зупинено до завершення.", "Запусти його ще раз, коли будеш готовий."),
  "execution-limit-exceeded": retry("Забагато кроків", "Алгоритм виконує надто багато дій.", "Скороти повторення та перевір умову циклу."),
  "execution-time-limit-exceeded": retry("Алгоритм працює задовго", "Виконання безпечно зупинено.", "Перевір повторення та зроби шлях коротшим."),
  "sandbox-source-empty": retry("Напиши першу команду", "Поле коду поки порожнє.", "Додай команду для героя й запусти код."),
  "sandbox-source-required": retry("Потрібен код", "Щоб почати, додай хоча б одну команду.", "Скористайся прикладом біля доступних команд."),
  "sandbox-command-unavailable": retry("Команда недоступна", "Цю команду не можна використати на цьому рівні.", "Обери одну з команд у панелі завдання."),
  "sandbox-command-not-allowed": retry("Обери іншу команду", "Ця команда ще не відкрита для цього завдання.", "Перевір список доступних команд."),
  "sandbox-api-forbidden": retry("Ця дія тут не потрібна", "Середовище дозволяє лише навчальні команди героя.", "Скористайся командами, показаними біля редактора."),
  "sandbox-unbounded-loop-forbidden": retry("Циклу потрібна межа", "Повторення має завершуватися після відомої кількості кроків.", "Вкажи невелику кількість повторень."),
  "sandbox-loop-limit-exceeded": retry("Забагато повторень", "Кількість повторень завелика для цього рівня.", "Зменш число повторень і спробуй ще раз."),
  "sandbox-argument-out-of-range": retry("Перевір число", "Значення команди виходить за дозволені межі.", "Подивись підказку біля команди та зміни число."),
  "sandbox-integer-required": retry("Додай число", "Команді потрібне ціле число або вже створена числова змінна.", "Впиши число між дужками або передай назву змінної."),
  "sandbox-variable-unknown": retry("Спочатку створи змінну", "Програма ще не знає такої назви.", "Додай const зі значенням вище за команду, яка використовує змінну."),
  "sandbox-unexpected-argument": retry("Прибери зайве число", "Ця команда працює без числового аргументу.", "Залиши круглі дужки порожніми."),
  "sandbox-loop-must-start-at-zero": retry("Почни лічильник з нуля", "Навчальний цикл for рахує повторення від 0.", "У першій частині циклу запиши let i = 0."),
  "sandbox-loop-counter-mismatch": retry("Перевір лічильник", "У частинах циклу використано різні назви лічильника.", "Використай одну назву, наприклад i, в умові та i++."),
  "sandbox-unsupported-syntax": retry("Спрости запис", "Ця конструкція ще не входить до навчального режиму.", "Використай команди hero, const або обмежений цикл for із прикладу."),
  "sandbox-no-commands": retry("Додай дію героя", "У коді є підготовка, але немає команди, яку виконає герой.", "Додай виклик hero.move(), hero.jump() або іншої доступної команди."),
  "sandbox-syntax-error": retry("Перевір запис команди", "У коді є місце, яке редактор не може прочитати.", "Звір дужки, крапки з комою та назви команд із прикладом."),
};

const genericFailure = retry(
  "Спробуй ще раз",
  "Алгоритм поки не виконав завдання, але ти вже на правильному шляху.",
  "Перевір останню команду або відкрий першу підказку.",
);

export function containsTechnicalDetails(value: string) {
  return TECHNICAL_DETAILS.test(value);
}

export function createFriendlyFeedback(source: FeedbackSource): FriendlyFeedback {
  const copy = feedbackByCode[source.code] ?? (source.valid
    ? success("Готово!", "Завдання виконано.", "Можеш перейти далі або спробувати інший розв’язок.")
    : genericFailure);
  return {
    code: SAFE_ID.test(source.code) ? source.code : "unknown-result",
    ...copy,
    affectedIds: (source.affectedIds ?? []).filter((id) => SAFE_ID.test(id)).slice(0, 20),
  };
}

export function isChildSafeFeedback(feedback: FriendlyFeedback) {
  return !containsTechnicalDetails(`${feedback.title} ${feedback.message} ${feedback.nextStep}`);
}
