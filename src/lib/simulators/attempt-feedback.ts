export type AttemptFeedback = {
  valid: boolean;
  label: string;
  title: string;
  explanation: string;
  nextStep: string;
};

const feedbackByCode: Record<string, AttemptFeedback> = {
  "missing-final-component": {
    valid: false,
    label: "Потрібне доопрацювання",
    title: "У фінальній схемі бракує обов’язкового компонента",
    explanation: "Симулятор не знайшов повний production path від CDN і API до воркерів, сховища та сповіщень.",
    nextStep: "Повернися до canvas, звір усі шари системи та додай відсутній компонент.",
  },
  "missing-final-policy": {
    valid: false,
    label: "Потрібне доопрацювання",
    title: "Не всі reliability-рішення налаштовані",
    explanation: "Компоненти вже на місці, але частина правил масштабування, retry, failover або recovery залишилася без значення.",
    nextStep: "Заповни кожне поле reliability policy і повтори chaos validation.",
  },
  "invalid-final-policy": {
    valid: false,
    label: "Архітектурний конфлікт",
    title: "Одна або кілька політик суперечать вимогам",
    explanation: "Обрана конфігурація не гарантує незалежне масштабування, відновлення або graceful degradation для заданого навантаження.",
    nextStep: "Переглянь підсвічені правила та обери конфігурацію, що закриває відповідний failure mode.",
  },
  "final-system-design-valid": {
    valid: true,
    label: "Пройдено",
    title: "Фінальна архітектура витримала перевірку",
    explanation: "Critical path повний, reliability policies узгоджені, а система має окреме масштабування API і воркерів.",
    nextStep: "Спробуй інший chaos scenario або збережи архітектуру як базову версію.",
  },
};

const fallbackFeedback: AttemptFeedback = {
  valid: false,
  label: "Результат збережено",
  title: "Для цієї версії симулятора немає детального пояснення",
  explanation: "Спроба залишається в історії, але її validation code ще не додано до каталогу навчальних підказок.",
  nextStep: "Відкрий відповідне заняття, повтори перевірку та зверни увагу на повідомлення simulator-а.",
};

export function getAttemptFeedback(validationCode: string | null) {
  if (!validationCode) return fallbackFeedback;
  return feedbackByCode[validationCode] ?? fallbackFeedback;
}

export function getSimulatorTitle(simulatorId: string) {
  if (simulatorId === "final-system-design") return "Фінальний System Design";
  return "Architecture Simulator";
}
