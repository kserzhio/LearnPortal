import { createLegacyIcon, iconLabel } from './icons.js?v=20260812-1';

const COURSE_ID = 'high-load-architecture';
const typeLabels = { question: ['question', 'Питання'], idea: ['idea', 'Ідея'], 'lesson-problem': ['bug', 'Проблема з уроком'] };
const lessonSupport = {
  1: { hints: ['Знайди компонент, відмова якого зупинить увесь request path.', 'Перевір Load Balancer, application layer і Database окремо.', 'Для single point of failure додай replica або failover.'], faq: [['Чим High Load відрізняється від High Availability?', 'High Load описує обсяг роботи, а High Availability — здатність залишатися доступною під час відмов.'], ['Чи завжди великий DAU означає великий RPS?', 'Ні. Важливі частота дій, peak factor і розподіл активності протягом дня.']], check: { id: 'high-load-01-failover', type: 'ПЕРЕДБАЧ РЕЗУЛЬТАТ', question: 'Два application servers працюють за Load Balancer. Один server падає. Що має статися?', options: [['site-down','Весь сайт падає'],['reroute','Traffic переходить на здоровий server'],['database-server','Database створює новий server'],['dns-delete','DNS видаляється']] } },
  2: { hints: ['Сформулюй вимогу так, щоб її можна було перевірити.', 'Додай число, одиницю вимірювання та часовий період.', 'Розділи SLI, внутрішню ціль SLO та зовнішню обіцянку SLA.'], faq: [['Чи є accessibility нефункціональною вимогою?', 'Так. Вона визначає вимірювані характеристики інтерфейсу й процесу розробки.']] },
  3: { hints: ['Почни з кількості дій за добу.', 'Поділи добове навантаження на 86 400 і застосуй peak factor.', 'Worker capacity визначай через тривалість однієї job та concurrency.'], faq: [['Навіщо рахувати приблизно?', 'Оцінка порядку величин швидко виявляє нереалістичні припущення й основні bottlenecks.']] },
  9: { hints: ['Довга робота не повинна утримувати HTTP connection.', 'API може повернути 202 Accepted і job identifier.', 'Передбач retry, idempotency та dead-letter queue.'], faq: [['Чому не повернути 200 після завершення аудиту?', 'Довгий HTTP request нестабільний і погано масштабується; 202 відокремлює прийняття job від виконання.']], check: { id: 'high-load-09-async', type: 'ПИТАННЯ', question: 'Аудит триває кілька хвилин. Яку відповідь має повернути API після створення job?', options: [['wait-200','Тримати connection і чекати на 200 OK'],['accepted-202','202 Accepted із job identifier'],['redirect-301','301 Redirect на worker']] } },
  13: { hints: ['Не виконуй update і publish як два незалежні writes.', 'Запиши domain change та outbox event в одну локальну transaction.', 'Relay має підтримувати at-least-once delivery, а consumer — idempotency.'], faq: [['Чи гарантує outbox exactly-once?', 'Ні. Outbox зазвичай дає at-least-once delivery, тому consumer повинен безпечно обробляти дублікати.']], check: { id: 'high-load-13-outbox', type: 'ЗНАЙДИ ПРОБЛЕМУ', question: 'Статус аудиту записали, але publish notification event завершився помилкою. Що прибирає dual-write risk?', options: [['more-retries','Нескінченний retry HTTP request'],['outbox','Transactional outbox'],['read-replica','Read replica']] } },
  15: { hints: ['API instance не повинен володіти незамінним session state.', 'Load Balancer направляє запит лише на healthy instances.', 'Винось shared state у зовнішнє сховище.'], faq: [['Коли потрібні sticky sessions?', 'Лише як контрольований компроміс. Stateless API простіше масштабувати й відновлювати.']], check: { id: 'high-load-15-stateless', type: 'ПЕРЕДБАЧ РЕЗУЛЬТАТ', question: 'Load Balancer перенаправив request з API-1 на API-3. Що потрібно для коректної роботи?', options: [['local-session','Session зберігається тільки в RAM API-1'],['shared-state','API stateless, а shared state — у зовнішньому сховищі'],['disable-health','Вимкнути health checks']] } },
  19: { hints: ['Познач усі single points of failure.', 'Окремо масштабуй API, queue consumers і audit workers.', 'Перевір RPO, RTO, retry, backup і multi-region trade-offs.'], faq: [['Чи означає multi-region автоматично 100% availability?', 'Ні. Multi-region зменшує частину ризиків, але додає складність routing, replication і consistency.']], check: { id: 'high-load-19-resilience', type: 'ЗНАЙДИ ПРОБЛЕМУ', question: 'У схемі є три API instances, але один Job Queue і одна Database без replica. Чи виконується High Availability?', options: [['yes-api','Так, бо API вже має три instances'],['no-spof','Ні, Queue і Database залишаються single points of failure'],['yes-backup','Так, якщо backup створюється раз на добу']] } },
};

const state = { lesson: null, authenticated: false, moderator: false, questions: [], filter: 'all', revealed: 0 };

function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(options).forEach(([key, value]) => {
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('aria-')) node.setAttribute(key, value);
    else node[key] = value;
  });
  node.append(...children.filter(Boolean));
  return node;
}

function contentId() { return `high-load-${String(state.lesson.position).padStart(2, '0')}`; }
function api(path, options) { return fetch(`/api/learning-support${path}`, { cache: 'no-store', ...options }); }

async function loadQuestions() {
  const response = await api(`/questions?courseId=${COURSE_ID}&contentId=${contentId()}`);
  if (!response.ok) return;
  const payload = await response.json();
  state.questions = payload.questions || [];
  state.authenticated = payload.authenticated === true;
  state.moderator = payload.moderator === true;
  renderDiscussion();
}

function openQuestionForm() {
  if (!state.authenticated) {
    const prompt = document.querySelector('#legacyDiscussionPrompt');
    prompt.replaceChildren(element('p', { text: 'Увійди, щоб поставити питання.' }), element('a', { href: `/auth/sign-in?next=${encodeURIComponent(location.pathname + location.hash)}`, text: 'Увійти' }));
    prompt.hidden = false;
    return;
  }
  document.querySelector('#legacyQuestionDialog').showModal();
}

function questionDialog() {
  const dialog = element('dialog', { id: 'legacyQuestionDialog', className: 'legacy-question-dialog', 'aria-labelledby': 'legacyQuestionDialogTitle' });
  const close = element('button', { type: 'button', className: 'dialog-close', 'aria-label': 'Закрити форму питання' }, [createLegacyIcon('close')]);
  close.addEventListener('click', () => dialog.close());
  const form = element('form');
  const title = element('h2', { id: 'legacyQuestionDialogTitle', text: 'Поставити питання' });
  const type = element('select', { name: 'type' }, [element('option', { value: 'question', text: 'Питання' }), element('option', { value: 'idea', text: 'Ідея' }), element('option', { value: 'lesson-problem', text: 'Проблема з уроком' })]);
  const headline = element('input', { name: 'title', required: true, minLength: 5, maxLength: 140 });
  const body = element('textarea', { name: 'body', required: true, minLength: 10, maxLength: 4000 });
  const message = element('p', { className: 'legacy-form-message', 'aria-live': 'polite' });
  form.append(title, element('label', { text: 'Тип' }, [type]), element('label', { text: 'Заголовок' }, [headline]), element('label', { text: 'Опис' }, [body]), message, element('button', { type: 'submit', text: 'Опублікувати' }));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    message.textContent = 'Публікуємо…';
    const data = new FormData(form);
    const response = await api('/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId: COURSE_ID, contentId: contentId(), type: data.get('type'), title: data.get('title'), body: data.get('body') }) });
    if (!response.ok) { message.textContent = (await response.json()).error || 'Не вдалося опублікувати.'; return; }
    form.reset(); dialog.close(); await loadQuestions();
  });
  dialog.append(close, form);
  return dialog;
}

function renderDiscussion() {
  const root = document.querySelector('#legacyQuestionList');
  if (!root) return;
  const count = document.querySelector('#legacyQuestionCount');
  if (count) { count.textContent = String(state.questions.length); count.setAttribute('aria-label', `${state.questions.length} питань`); }
  const filtered = state.questions.filter(question => state.filter === 'all' || state.filter === 'popular' || (state.filter === 'unanswered' && !question.lesson_replies.some(reply => reply.is_official_answer)) || (state.filter === 'resolved' && question.status === 'resolved'))
    .sort((a, b) => state.filter === 'popular' ? b.lesson_replies.length - a.lesson_replies.length : 0);
  root.replaceChildren();
  if (!filtered.length) { root.append(element('p', { text: 'Поки немає питань у цій категорії.' })); return; }
  filtered.forEach(question => {
    const card = element('article', { className: 'legacy-question-card' });
    const typeLabel = typeLabels[question.type] || typeLabels.question;
    const badges = element('div', { className: 'legacy-question-badges' }, [element('span', {}, iconLabel(typeLabel[0], typeLabel[1])), question.status === 'resolved' ? element('b', {}, iconLabel('check', 'Вирішено')) : null, question.lesson_replies.some(reply => reply.is_official_answer) ? element('b', {}, iconLabel('badge-check', 'Відповідь автора')) : null]);
    const replies = element('details');
    replies.append(element('summary', { text: `Відповіді · ${question.lesson_replies.length}` }));
    question.lesson_replies.forEach(reply => {
      const actions = element('div', { className: 'legacy-moderation-actions' });
      if (state.authenticated) {
        const useful = element('button', { type: 'button', 'aria-pressed': String(reply.useful_by_user === true) }, iconLabel('thumbs-up', 'Корисно'));
        useful.addEventListener('click', async () => { await api(`/replies/${reply.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ useful: !reply.useful_by_user }) }); await loadQuestions(); });
        actions.append(useful);
      }
      if (state.moderator) {
        const official = element('button', { type: 'button', text: reply.is_official_answer ? 'Зняти позначку' : 'Позначити відповіддю автора' });
        official.addEventListener('click', async () => { await api(`/questions/${question.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle-official', replyId: reply.id }) }); await loadQuestions(); });
        const remove = element('button', { type: 'button', text: 'Видалити відповідь' });
        remove.addEventListener('click', async () => { await api(`/replies/${reply.id}`, { method: 'DELETE' }); await loadQuestions(); });
        actions.append(official, remove);
      }
      replies.append(element('article', { className: 'legacy-reply' }, [element('strong', { text: reply.author_name }), reply.is_official_answer ? element('b', {}, iconLabel('badge-check', 'Відповідь автора')) : null, element('p', { text: reply.body }), element('small', { text: `${reply.useful_count || 0} позначок «корисно»` }), actions]));
    });
    if (state.authenticated) {
      const replyForm = element('form', { className: 'legacy-reply-form' });
      const replyBody = element('textarea', { required: true, minLength: 2, maxLength: 4000, 'aria-label': `Відповідь на питання ${question.title}` });
      const replyMessage = element('p', { className: 'legacy-form-message', role: 'status' });
      replyForm.append(replyBody, element('button', { type: 'submit', text: 'Відповісти' }), replyMessage);
      replyForm.addEventListener('submit', async event => { event.preventDefault(); replyMessage.textContent = 'Публікуємо…'; const response = await api(`/questions/${question.id}/replies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: replyBody.value }) }); if (response.ok) await loadQuestions(); else replyMessage.textContent = (await response.json()).error || 'Не вдалося опублікувати відповідь.'; });
      replies.append(replyForm);
    }
    const moderation = element('div', { className: 'legacy-moderation-actions' });
    if (state.moderator) {
      const resolved = element('button', { type: 'button', text: question.status === 'resolved' ? 'Відкрити знову' : 'Позначити вирішеним' });
      resolved.addEventListener('click', async () => { await api(`/questions/${question.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle-resolved' }) }); await loadQuestions(); });
      moderation.append(resolved);
    }
    if (state.moderator || question.is_owner) {
      const remove = element('button', { type: 'button', text: 'Видалити питання' });
      remove.addEventListener('click', async () => { if (!confirm('Видалити це питання разом із відповідями?')) return; await api(`/questions/${question.id}`, { method: 'DELETE' }); await loadQuestions(); });
      moderation.append(remove);
    }
    card.append(badges, element('h3', { text: question.title }), element('small', { text: question.author_name }), element('p', { text: question.body }), replies, moderation);
    root.append(card);
  });
}

function supportConfig() {
  return lessonSupport[state.lesson.position] || { hints: [`Повернися до мети заняття «${state.lesson.title}» і назви головний trade-off.`, 'Перевір, який компонент або припущення обмежує рішення.', 'Сформулюй expected success і один failure scenario.'], faq: [['Як перевірити, що я зрозумів заняття?', 'Поясни рішення власними словами, назви trade-off і перевір його на одному failure scenario.']] };
}

function renderMount() {
  document.querySelectorAll('.legacy-learning-support').forEach(node => node.remove());
  const activeView = document.querySelector(`#lesson${state.lesson.position}View`);
  if (!activeView) return;
  state.revealed = 0; state.questions = [];
  const config = supportConfig();
  const mount = element('section', { className: 'legacy-learning-support', 'aria-label': 'Допомога та обговорення заняття' });
  const help = element('aside', { className: 'legacy-need-help' }, [element('div', {}, [element('span', { text: 'NEED HELP?' }), element('h2', { text: 'Застряг?' })])]);
  const hintList = element('ol', { 'aria-live': 'polite' });
  const hintButton = element('button', { type: 'button', text: 'Отримати підказку' });
  hintButton.addEventListener('click', () => { if (state.revealed >= config.hints.length) return; const index = state.revealed++; hintList.append(element('li', {}, [element('strong', { text: `Підказка ${index + 1}` }), element('p', { text: config.hints[index] })])); if (state.revealed === config.hints.length) { hintButton.disabled = true; hintButton.textContent = 'Усі підказки відкрито'; } });
  const askLink = element('a', { href: '#legacyDiscussion', text: 'Поставити питання' });
  help.append(element('div', { className: 'legacy-help-actions' }, [hintButton, askLink]), hintList);

  const feedback = element('section', { className: 'legacy-feedback' }, [element('h2', { text: 'Це заняття було корисним?' })]);
  const feedbackStatus = element('p', { className: 'legacy-form-message', role: 'status' });
  const negativeForm = element('form', { className: 'legacy-negative-feedback', hidden: true });
  const reasons = element('fieldset'); reasons.append(element('legend', { text: 'Що можна покращити? (необов’язково)' }));
  [['too-hard','Було складно'],['unclear','Незрозуміле пояснення'],['practice-broken','Не працює практика'],['too-much','Забагато інформації'],['other','Інше']].forEach(([value, label]) => reasons.append(element('label', {}, [element('input', { type: 'checkbox', name: 'reason', value }), document.createTextNode(label)])));
  const feedbackComment = element('textarea', { name: 'comment', maxLength: 1000 });
  negativeForm.append(reasons, element('label', { text: 'Хочеш додати коментар?' }, [feedbackComment]), element('button', { type: 'submit', text: 'Надіслати feedback' }));
  const saveFeedback = async (helpful, selectedReasons = [], comment = '') => { feedbackStatus.textContent = 'Зберігаємо…'; const response = await api('/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId: COURSE_ID, contentId: contentId(), helpful, reasons: selectedReasons, comment }) }); feedbackStatus.textContent = response.ok ? 'Дякуємо — feedback збережено.' : 'Не вдалося зберегти feedback.'; };
  negativeForm.addEventListener('submit', event => { event.preventDefault(); const formData = new FormData(negativeForm); void saveFeedback(false, formData.getAll('reason'), formData.get('comment')); });
  feedback.append(element('div', { className: 'legacy-feedback-actions', role: 'group', 'aria-label': 'Оцінити заняття' }, [element('button', { type: 'button', 'aria-label': 'Заняття було корисним', onclick: () => { negativeForm.hidden = true; void saveFeedback(true); } }, iconLabel('thumbs-up', 'Так')), element('button', { type: 'button', 'aria-label': 'Заняття не було корисним', onclick: () => { negativeForm.hidden = false; negativeForm.querySelector('input').focus(); } }, iconLabel('thumbs-down', 'Ні'))]), negativeForm, feedbackStatus);

  const discussion = element('section', { id: 'legacyDiscussion', className: 'legacy-discussion' });
  discussion.append(element('div', { className: 'legacy-support-heading' }, [element('div', {}, [element('span', { text: 'ASK' }), element('h2', { text: 'Питання та обговорення' })]), element('b', { id: 'legacyQuestionCount', text: '0', 'aria-label': '0 питань' })]), element('button', { type: 'button', className: 'legacy-primary-action', text: 'Поставити питання', onclick: openQuestionForm }), element('div', { id: 'legacyDiscussionPrompt', className: 'legacy-login-prompt', hidden: true }));
  const filters = element('div', { className: 'legacy-question-filters', role: 'group', 'aria-label': 'Фільтр питань' });
  [['all','Всі'],['popular','Популярні'],['unanswered','Без відповіді'],['resolved','Вирішені']].forEach(([value, label]) => { const button = element('button', { type: 'button', text: label, 'aria-pressed': String(value === state.filter) }); button.addEventListener('click', () => { state.filter = value; filters.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button))); renderDiscussion(); }); filters.append(button); });
  discussion.append(filters, element('div', { id: 'legacyQuestionList', className: 'legacy-question-list' }), questionDialog());

  const faq = element('section', { className: 'legacy-faq' }, [element('span', { text: 'FAQ' }), element('h2', { text: 'FAQ цього заняття' })]);
  config.faq.forEach(([question, answer]) => { const details = element('details'); details.append(element('summary', { text: question }), element('p', { text: answer })); faq.append(details); });
  const knowledge = config.check ? element('section', { className: 'legacy-knowledge-check' }) : null;
  if (knowledge) {
    knowledge.append(element('span', { text: 'CHECK' }), element('h2', { text: 'Перевір себе' }));
    const checkForm = element('form');
    const fieldset = element('fieldset');
    fieldset.append(element('legend', {}, [element('span', { text: `01 · ${config.check.type}` }), document.createTextNode(config.check.question)]));
    config.check.options.forEach(([value, label]) => fieldset.append(element('label', {}, [element('input', { type: 'radio', name: config.check.id, value, required: true }), element('span', { text: label })])));
    const result = element('div', { className: 'legacy-check-result', role: 'status', hidden: true });
    checkForm.append(fieldset, element('button', { type: 'submit', text: 'Перевірити' }), result);
    checkForm.addEventListener('submit', async event => {
      event.preventDefault();
      const selectedAnswer = new FormData(checkForm).get(config.check.id);
      const response = await api('/knowledge-checks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId: COURSE_ID, contentId: contentId(), checkId: config.check.id, selectedAnswer }) });
      if (!response.ok) { result.textContent = 'Не вдалося перевірити відповідь.'; result.dataset.tone = 'error'; result.hidden = false; return; }
      const payload = await response.json();
      result.replaceChildren(payload.correct ? element('strong', {}, iconLabel('check', 'Правильно')) : element('strong', { text: 'Не зовсім' }), element('p', { text: payload.explanation }));
      result.dataset.tone = payload.correct ? 'success' : 'error'; result.hidden = false;
    });
    knowledge.append(checkForm);
  }
  mount.append(help, knowledge, feedback, discussion, faq); activeView.append(mount); void loadQuestions();
}

export function initializeLegacyLearningSupport() {
  document.addEventListener('systema:lesson-change', event => { state.lesson = event.detail.lesson; renderMount(); });
}
