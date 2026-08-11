const architectureDecisionConfig = {
  labels: {
    monolith: 'Модульний моноліт',
    microservices: 'Мікросервіси',
    'event-driven': 'Event-driven архітектура',
  },
  supportingReasons: {
    monolith: ['simplicity', 'cost'],
    microservices: ['autonomy', 'scaling'],
    'event-driven': ['bursts', 'coupling'],
  },
  presets: {
    mvp: { team: 'small', traffic: 'steady', deployment: 'low', consistency: 'strong', operations: 'low' },
    scale: { team: 'large', traffic: 'growing', deployment: 'high', consistency: 'mixed', operations: 'high' },
    events: { team: 'medium', traffic: 'bursty', deployment: 'medium', consistency: 'eventual', operations: 'high' },
  },
};

const architectureDecisionState = {
  scenario: { ...architectureDecisionConfig.presets.mvp },
  choice: '',
  reasons: [],
  rationale: '',
};

function calculateArchitectureScores(scenario) {
  const scores = { monolith: 5, microservices: 3, 'event-driven': 3 };
  if (scenario.team === 'small') { scores.monolith += 3; scores.microservices -= 1; }
  if (scenario.team === 'medium') { scores.microservices += 1; scores['event-driven'] += 1; }
  if (scenario.team === 'large') { scores.monolith -= 2; scores.microservices += 3; scores['event-driven'] += 1; }
  if (scenario.traffic === 'growing') { scores.microservices += 2; scores['event-driven'] += 1; }
  if (scenario.traffic === 'bursty') { scores.monolith -= 1; scores.microservices += 1; scores['event-driven'] += 4; }
  if (scenario.deployment === 'medium') scores.microservices += 1;
  if (scenario.deployment === 'high') { scores.monolith -= 2; scores.microservices += 4; scores['event-driven'] += 1; }
  if (scenario.consistency === 'strong') { scores.monolith += 2; scores['event-driven'] -= 2; }
  if (scenario.consistency === 'mixed') scores.microservices += 1;
  if (scenario.consistency === 'eventual') { scores.microservices += 1; scores['event-driven'] += 3; }
  if (scenario.operations === 'low') { scores.monolith += 2; scores.microservices -= 2; scores['event-driven'] -= 1; }
  if (scenario.operations === 'medium') scores.microservices += 1;
  if (scenario.operations === 'high') { scores.microservices += 2; scores['event-driven'] += 2; }
  return Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, Math.max(0, Math.min(10, value))]));
}

function getArchitectureRecommendation(scores) {
  return Object.entries(scores).sort((left, right) => right[1] - left[1])[0][0];
}

function syncArchitectureDecisionState() {
  architectureDecisionState.scenario = {
    team: document.querySelector('#architectureTeam').value,
    traffic: document.querySelector('#architectureTraffic').value,
    deployment: document.querySelector('#architectureDeployment').value,
    consistency: document.querySelector('#architectureConsistency').value,
    operations: document.querySelector('#architectureOperations').value,
  };
  architectureDecisionState.choice = document.querySelector('[name="architectureChoice"]:checked')?.value || '';
  architectureDecisionState.reasons = Array.from(document.querySelectorAll('[name="architectureReason"]:checked'), input => input.value);
  architectureDecisionState.rationale = document.querySelector('#architectureRationale').value.trim();
}

function resetArchitectureValidation() {
  const panel = document.querySelector('#architectureValidation');
  panel.className = 'architecture-validation';
  document.querySelector('#architectureValidationTitle').textContent = 'Рішення ще не перевірено';
  document.querySelector('#architectureValidationMessage').textContent = 'Налаштуй контекст, обери підхід і сформулюй аргументацію.';
}

function renderArchitectureScores() {
  syncArchitectureDecisionState();
  const scores = calculateArchitectureScores(architectureDecisionState.scenario);
  const recommendation = getArchitectureRecommendation(scores);
  const scoreBindings = {
    monolith: ['#monolithScore', '#monolithMeter', '#monolithSummary'],
    microservices: ['#microservicesScore', '#microservicesMeter', '#microservicesSummary'],
    'event-driven': ['#eventDrivenScore', '#eventDrivenMeter', '#eventDrivenSummary'],
  };
  const summaries = {
    monolith: architectureDecisionState.scenario.operations === 'low' ? 'Сильний за простотою та ціною' : 'Простий, але масштабується цілком',
    microservices: architectureDecisionState.scenario.deployment === 'high' ? 'Підтримує автономні deployment' : 'Незалежність із operational overhead',
    'event-driven': architectureDecisionState.scenario.traffic === 'bursty' ? 'Найкраще поглинає пікові події' : 'Слабкий coupling, eventual consistency',
  };
  Object.entries(scoreBindings).forEach(([key, selectors]) => {
    document.querySelector(selectors[0]).textContent = scores[key];
    document.querySelector(selectors[1]).value = scores[key];
    document.querySelector(selectors[1]).textContent = `${scores[key]} з 10`;
    document.querySelector(selectors[2]).textContent = summaries[key];
    document.querySelector(`[data-architecture-score="${key}"]`).classList.toggle('recommended', key === recommendation);
  });
  document.querySelector('#architectureRecommendation').textContent = architectureDecisionConfig.labels[recommendation];
  document.querySelector('#rationaleCount').textContent = document.querySelector('#architectureRationale').value.length;
  return { scores, recommendation };
}

function validateArchitectureDecision() {
  syncArchitectureDecisionState();
  const { scores, recommendation } = renderArchitectureScores();
  const state = architectureDecisionState;
  if (!state.choice) return { valid: false, code: 'missing-choice', title: 'Обери архітектурний підхід', message: 'Матриця допомагає порівняти варіанти, але рішення має бути явним.' };
  if (state.reasons.length < 2) return { valid: false, code: 'missing-reasons', title: 'Потрібно щонайменше два аргументи', message: 'Сильне ADR спирається на кілька критеріїв, а не на одну перевагу.' };
  if (state.rationale.length < 80) return { valid: false, code: 'short-rationale', title: 'Розкрий обґрунтування', message: `Зараз ${state.rationale.length} символів. Опиши контекст, перевагу та прийнятий компроміс.` };
  const supporting = architectureDecisionConfig.supportingReasons[state.choice].filter(reason => state.reasons.includes(reason));
  if (supporting.length < 2) return { valid: false, code: 'weak-evidence', title: 'Аргументи не підтримують вибір', message: `Для «${architectureDecisionConfig.labels[state.choice]}» обери критерії, що пояснюють його сильні сторони.` };
  if (state.choice !== recommendation && state.reasons.length < 3 && state.rationale.length < 120) return { valid: false, code: 'context-mismatch', title: 'Вибір не збігається з контекстом', message: `Матриця рекомендує «${architectureDecisionConfig.labels[recommendation]}» (${scores[recommendation]}/10). Додай сильнішу аргументацію або зміни контекст.` };
  if (state.choice !== recommendation) return { valid: true, code: 'reasoned-alternative', title: 'Альтернативний вибір обґрунтовано', message: `Матриця віддає перевагу «${architectureDecisionConfig.labels[recommendation]}», але ти назвав достатньо причин і trade-offs для альтернативи.` };
  return { valid: true, code: 'context-aligned', title: 'Рішення відповідає контексту', message: `«${architectureDecisionConfig.labels[state.choice]}» має найкращу відповідність (${scores[state.choice]}/10), а аргументація пояснює переваги й ціну вибору.` };
}

function showArchitectureValidation(result) {
  const panel = document.querySelector('#architectureValidation');
  panel.className = `architecture-validation ${result.valid ? 'valid' : 'invalid'}`;
  panel.dataset.validationCode = result.code;
  panel.querySelector('div > span').textContent = result.valid ? '✓' : '!';
  document.querySelector('#architectureValidationTitle').textContent = result.title;
  document.querySelector('#architectureValidationMessage').textContent = result.message;
}

document.querySelectorAll('#architectureScenario select').forEach(select => select.addEventListener('change', () => { renderArchitectureScores(); resetArchitectureValidation(); }));
document.querySelectorAll('#architectureDecision input').forEach(input => input.addEventListener('change', resetArchitectureValidation));
document.querySelector('#architectureRationale').addEventListener('input', () => { document.querySelector('#rationaleCount').textContent = document.querySelector('#architectureRationale').value.length; resetArchitectureValidation(); });
document.querySelectorAll('[data-architecture-preset]').forEach(button => button.addEventListener('click', () => {
  const preset = architectureDecisionConfig.presets[button.dataset.architecturePreset];
  Object.entries(preset).forEach(([key, value]) => { document.querySelector(`#architecture${key[0].toUpperCase()}${key.slice(1)}`).value = value; });
  renderArchitectureScores();
  resetArchitectureValidation();
}));
document.querySelector('#resetArchitectureDecision').addEventListener('click', () => {
  document.querySelector('#architectureScenario').reset();
  document.querySelector('#architectureDecision').reset();
  renderArchitectureScores();
  resetArchitectureValidation();
});
document.querySelector('#validateArchitectureDecision').addEventListener('click', () => showArchitectureValidation(validateArchitectureDecision()));

const apiContractConfig = {
  transitions: {
    queued: ['running', 'cancelled'],
    running: ['completed', 'failed', 'cancelled'],
    completed: [],
    failed: [],
    cancelled: [],
  },
  terminalStates: ['completed', 'failed', 'cancelled'],
};

const apiDesignState = { statusPath: [] };

function resetApiValidation() {
  const panel = document.querySelector('#apiContractValidation');
  panel.className = 'api-contract-validation';
  panel.dataset.validationCode = 'not-validated';
  panel.querySelector('div > span').textContent = '?';
  document.querySelector('#apiValidationTitle').textContent = 'API ще не перевірено';
  document.querySelector('#apiValidationMessage').textContent = 'Налаштуй контракт і побудуй lifecycle аудиту.';
}

function renderAuditStatusPath() {
  const canvas = document.querySelector('#auditStatusCanvas');
  canvas.replaceChildren();
  if (!apiDesignState.statusPath.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Почни зі стану queued';
    canvas.append(empty);
  } else {
    const flow = document.createElement('div');
    flow.className = 'audit-status-flow';
    apiDesignState.statusPath.forEach((status, index) => {
      const node = document.createElement('span');
      node.className = `audit-status-node status-${status}`;
      node.textContent = status;
      flow.append(node);
      if (index < apiDesignState.statusPath.length - 1) {
        const arrow = document.createElement('i');
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '→';
        flow.append(arrow);
      }
    });
    canvas.append(flow);
  }
  const completed = apiDesignState.statusPath.at(-1) === 'completed';
  const reportAccess = document.querySelector('#reportAccess');
  reportAccess.classList.toggle('available', completed);
  reportAccess.textContent = completed ? 'Report endpoint доступний: 200 OK' : 'Report endpoint ще недоступний: 409 Conflict';
}

function getApiFieldName(select) {
  return select.closest('label')?.childNodes[0]?.textContent.trim() || 'Поле контракту';
}

function validateApiContract() {
  const contractFields = Array.from(document.querySelectorAll('[data-api-contract]'));
  const policyFields = Array.from(document.querySelectorAll('[data-api-policy]'));
  const unanswered = [...contractFields, ...policyFields].find(select => !select.value);
  if (unanswered) return { valid: false, code: 'missing-contract', title: 'Контракт заповнений не повністю', message: `Обери значення для «${getApiFieldName(unanswered)}».` };
  const wrongContract = contractFields.find(select => select.value !== select.dataset.apiContract);
  if (wrongContract) return { valid: false, code: 'wrong-http-status', title: 'HTTP semantics потребує виправлення', message: `Для «${getApiFieldName(wrongContract)}» очікується ${wrongContract.dataset.apiContract}. Довга операція приймається окремо від її виконання.` };
  const wrongPolicy = policyFields.find(select => select.value !== select.dataset.apiPolicy);
  if (wrongPolicy) {
    const policyMessages = {
      'idempotency-key': 'POST потребує Idempotency-Key, щоб retry не створив другий аудит.',
      cursor: 'Cursor pagination не пропускає та не дублює записи під час активних вставок.',
      'url-version': 'Явний /api/v1 дозволяє еволюцію breaking changes.',
      429: 'Rate limit повертає 429 Too Many Requests разом із Retry-After.',
    };
    return { valid: false, code: `policy-${wrongPolicy.dataset.apiPolicy}`, title: 'Guardrail обрано неправильно', message: policyMessages[wrongPolicy.dataset.apiPolicy] };
  }
  const path = apiDesignState.statusPath;
  if (!path.length) return { valid: false, code: 'empty-lifecycle', title: 'Lifecycle порожній', message: 'Кожен новий асинхронний аудит починається зі стану queued.' };
  if (path[0] !== 'queued') return { valid: false, code: 'invalid-start', title: 'Неправильний початковий стан', message: `Першим має бути queued, а не ${path[0]}.` };
  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1];
    const current = path[index];
    if (!apiContractConfig.transitions[previous].includes(current)) return { valid: false, code: 'invalid-transition', title: 'Неможливий перехід стану', message: `Перехід ${previous} → ${current} заборонений. Terminal state не може запускати нову роботу.` };
  }
  const lastStatus = path.at(-1);
  if (!apiContractConfig.terminalStates.includes(lastStatus)) return { valid: false, code: 'nonterminal-lifecycle', title: 'Lifecycle ще не завершено', message: `Стан ${lastStatus} має перейти в completed, failed або cancelled.` };
  return { valid: true, code: 'api-contract-valid', title: 'API-контракт узгоджений', message: `HTTP semantics, guardrails і шлях ${path.join(' → ')} сумісні. Клієнт може безпечно повторювати запити та відстежувати аудит.` };
}

function showApiValidation(result) {
  const panel = document.querySelector('#apiContractValidation');
  panel.className = `api-contract-validation ${result.valid ? 'valid' : 'invalid'}`;
  panel.dataset.validationCode = result.code;
  panel.querySelector('div > span').textContent = result.valid ? '✓' : '!';
  document.querySelector('#apiValidationTitle').textContent = result.title;
  document.querySelector('#apiValidationMessage').textContent = result.message;
}

document.querySelectorAll('#apiContractLab select').forEach(select => select.addEventListener('change', resetApiValidation));
document.querySelectorAll('[data-audit-status]').forEach(button => button.addEventListener('click', () => {
  apiDesignState.statusPath.push(button.dataset.auditStatus);
  renderAuditStatusPath();
  resetApiValidation();
}));
document.querySelector('#undoAuditStatus').addEventListener('click', () => { apiDesignState.statusPath.pop(); renderAuditStatusPath(); resetApiValidation(); });
document.querySelector('#resetApiContract').addEventListener('click', () => {
  document.querySelector('#endpointDesigner').reset();
  document.querySelector('#apiPolicyForm').reset();
  apiDesignState.statusPath = [];
  renderAuditStatusPath();
  resetApiValidation();
});
document.querySelector('#apiContractExample').addEventListener('click', () => {
  document.querySelectorAll('[data-api-contract]').forEach(select => { select.value = select.dataset.apiContract; });
  document.querySelectorAll('[data-api-policy]').forEach(select => { select.value = select.dataset.apiPolicy; });
  apiDesignState.statusPath = ['queued', 'running', 'completed'];
  renderAuditStatusPath();
  resetApiValidation();
});
document.querySelector('#validateApiContract').addEventListener('click', () => showApiValidation(validateApiContract()));

const asyncProcessingConfig = {
  expectedPipeline: ['Client', 'API', 'Queue', 'Worker', 'Database'],
  scenarioLogs: {
    success: [
      ['info', 'API', 'Збережено job aud_123 і повернуто 202 Accepted.'],
      ['info', 'Producer', 'Повідомлення aud_123 опубліковано в Queue.'],
      ['info', 'Consumer', 'Worker отримав message, attempt 1.'],
      ['success', 'Database', 'Результат збережено, status = completed.'],
      ['success', 'ACK', 'Broker видалив підтверджене повідомлення.'],
    ],
    transient: [
      ['info', 'API', '202 Accepted; job aud_123 поставлено в Queue.'],
      ['warning', 'Attempt 1', 'Worker отримав timeout; ack не надіслано.'],
      ['info', 'Retry', 'Backoff + jitter перед повторною доставкою.'],
      ['warning', 'Attempt 2', 'Зовнішній browser process недоступний.'],
      ['info', 'Retry', 'Наступна пауза збільшена exponential backoff.'],
      ['success', 'Attempt 3', 'Аудит виконано й результат записано.'],
      ['success', 'ACK', 'Повідомлення підтверджено після commit.'],
    ],
    permanent: [
      ['info', 'API', '202 Accepted; клієнт не чекає виконання.'],
      ['warning', 'Attempts 1–3', 'Retry з backoff не усунув помилку payload.'],
      ['danger', 'DLQ', 'Poison message переміщено для аналізу та replay.'],
      ['info', 'Database', 'Audit status = failed; причина збережена.'],
    ],
    duplicate: [
      ['info', 'Delivery 1', 'Job aud_123 оброблено та записано в Database.'],
      ['warning', 'Delivery 2', 'Broker повторно доставив aud_123 після втрати ACK.'],
      ['success', 'Idempotent consumer', 'jobId уже processed — side effect пропущено.'],
      ['success', 'ACK', 'Duplicate підтверджено без другого аудиту.'],
    ],
  },
};

const asyncProcessingState = { pipeline: [] };

function setJobEventLog(events) {
  const log = document.querySelector('#jobEventLog');
  log.replaceChildren();
  events.forEach(([tone, title, detail], index) => {
    const item = document.createElement('li');
    item.dataset.tone = tone;
    const number = document.createElement('span');
    number.textContent = String(index + 1);
    const copy = document.createElement('p');
    const heading = document.createElement('b');
    heading.textContent = title;
    const description = document.createElement('small');
    description.textContent = detail;
    copy.append(heading, description);
    item.append(number, copy);
    log.append(item);
  });
}

function resetAsyncValidation(clearLog = true) {
  const panel = document.querySelector('#asyncValidation');
  panel.className = 'async-validation';
  panel.dataset.validationCode = 'not-validated';
  panel.querySelector('div > span').textContent = '?';
  document.querySelector('#asyncValidationTitle').textContent = 'Pipeline ще не перевірено';
  document.querySelector('#asyncValidationMessage').textContent = 'Побудуй п’ять компонентів і налаштуй delivery.';
  if (clearLog) setJobEventLog([['idle', 'Очікування', 'Налаштуй pipeline і запусти симуляцію.']]);
}

function renderAsyncPipeline() {
  const canvas = document.querySelector('#asyncPipelineCanvas');
  canvas.replaceChildren();
  if (!asyncProcessingState.pipeline.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Додай Client як producer-side початок';
    canvas.append(empty);
  } else {
    const flow = document.createElement('div');
    flow.className = 'async-component-flow';
    asyncProcessingState.pipeline.forEach((component, index) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.dataset.removeAsyncIndex = String(index);
      node.title = `Видалити ${component}`;
      const code = document.createElement('span');
      code.textContent = component === 'Database' ? 'DB' : component === 'Queue' ? 'Q' : component === 'Worker' ? 'W' : component === 'Client' ? 'UI' : 'API';
      const label = document.createElement('b');
      label.textContent = component;
      node.append(code, label);
      flow.append(node);
      if (index < asyncProcessingState.pipeline.length - 1) {
        const arrow = document.createElement('i');
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '→';
        flow.append(arrow);
      }
    });
    canvas.append(flow);
  }
  document.querySelectorAll('[data-async-component]').forEach(button => { button.disabled = asyncProcessingState.pipeline.includes(button.dataset.asyncComponent); });
}

function validateAsyncProcessing() {
  const pipeline = asyncProcessingState.pipeline;
  const mismatch = asyncProcessingConfig.expectedPipeline.findIndex((component, index) => pipeline[index] !== component);
  if (mismatch !== -1 || pipeline.length !== asyncProcessingConfig.expectedPipeline.length) {
    const expected = asyncProcessingConfig.expectedPipeline[mismatch] || 'кінець pipeline';
    const actual = pipeline[mismatch] || 'компонент відсутній';
    return { valid: false, code: 'pipeline-order', title: `Помилка на кроці ${mismatch + 1}`, message: `Очікується ${expected}, зараз — ${actual}. Потік має бути Client → API → Queue → Worker → Database.` };
  }
  const configFields = Array.from(document.querySelectorAll('[data-async-config]'));
  const unanswered = configFields.find(select => !select.value);
  if (unanswered) return { valid: false, code: 'missing-delivery-config', title: 'Delivery налаштовано не повністю', message: `Обери значення для «${getApiFieldName(unanswered)}».` };
  const wrong = configFields.find(select => select.value !== select.dataset.asyncConfig);
  if (wrong) {
    const messages = {
      202: 'API має повернути 202 Accepted після durable enqueue, не чекаючи Worker.',
      'at-least-once': 'At-least-once зменшує ризик втрати job, але вимагає idempotent consumer.',
      'job-id': 'Consumer має перевіряти jobId, інакше duplicate message створить повторний side effect.',
      backoff: 'Exponential backoff із jitter не створює retry storm під час масової відмови.',
      dlq: 'Після вичерпання retry poison message треба ізолювати в DLQ, а не тихо видаляти.',
    };
    return { valid: false, code: `async-${wrong.dataset.asyncConfig}`, title: 'Ненадійна delivery configuration', message: messages[wrong.dataset.asyncConfig] };
  }
  return { valid: true, code: 'async-pipeline-valid', title: 'Async pipeline готовий', message: 'API швидко повертає 202, Queue зберігає job, а idempotent Worker використовує retry, ACK і DLQ.' };
}

function showAsyncValidation(result) {
  const panel = document.querySelector('#asyncValidation');
  panel.className = `async-validation ${result.valid ? 'valid' : 'invalid'}`;
  panel.dataset.validationCode = result.code;
  panel.querySelector('div > span').textContent = result.valid ? '✓' : '!';
  document.querySelector('#asyncValidationTitle').textContent = result.title;
  document.querySelector('#asyncValidationMessage').textContent = result.message;
}

document.querySelectorAll('[data-async-component]').forEach(button => button.addEventListener('click', () => {
  asyncProcessingState.pipeline.push(button.dataset.asyncComponent);
  renderAsyncPipeline();
  resetAsyncValidation();
}));
document.querySelector('#asyncPipelineCanvas').addEventListener('click', event => {
  const button = event.target.closest('[data-remove-async-index]');
  if (!button) return;
  asyncProcessingState.pipeline.splice(Number(button.dataset.removeAsyncIndex), 1);
  renderAsyncPipeline();
  resetAsyncValidation();
});
document.querySelectorAll('[data-async-config]').forEach(select => select.addEventListener('change', () => resetAsyncValidation()));
document.querySelector('#asyncScenario').addEventListener('change', event => {
  document.querySelector('#asyncScenarioLabel').textContent = event.target.selectedOptions[0].textContent;
  resetAsyncValidation();
});
document.querySelector('#asyncPipelineExample').addEventListener('click', () => {
  asyncProcessingState.pipeline = [...asyncProcessingConfig.expectedPipeline];
  document.querySelectorAll('[data-async-config]').forEach(select => { select.value = select.dataset.asyncConfig; });
  renderAsyncPipeline();
  resetAsyncValidation();
});
document.querySelector('#clearAsyncPipeline').addEventListener('click', () => {
  asyncProcessingState.pipeline = [];
  document.querySelector('#asyncConfigForm').reset();
  renderAsyncPipeline();
  resetAsyncValidation();
});
document.querySelector('#validateAsyncPipeline').addEventListener('click', () => showAsyncValidation(validateAsyncProcessing()));
document.querySelector('#runAsyncSimulation').addEventListener('click', () => {
  const validation = validateAsyncProcessing();
  showAsyncValidation(validation);
  if (!validation.valid) return;
  const scenario = document.querySelector('#asyncScenario').value;
  setJobEventLog(asyncProcessingConfig.scenarioLogs[scenario]);
  const outcomes = {
    success: ['Job виконано успішно', 'Consumer зберіг результат перед ACK.'],
    transient: ['Retry відновив обробку', 'Тимчасові failures пережито без втрати job.'],
    permanent: ['Poison message ізольовано', 'Retry вичерпано, повідомлення збережено в DLQ.'],
    duplicate: ['Duplicate нейтралізовано', 'Повторна доставка не створила другий side effect.'],
  };
  showAsyncValidation({ valid: true, code: `simulation-${scenario}`, title: outcomes[scenario][0], message: outcomes[scenario][1] });
});

const relationalSchemaConfig = {
  tables: {
    users: [['id', 'uuid · PK'], ['email', 'text · UNIQUE'], ['created_at', 'timestamptz']],
    projects: [['id', 'uuid · PK'], ['user_id', 'uuid · FK'], ['name', 'text'], ['created_at', 'timestamptz']],
    audits: [['id', 'uuid · PK'], ['project_id', 'uuid · FK'], ['status', 'audit_status'], ['created_at', 'timestamptz']],
    audit_pages: [['id', 'uuid · PK'], ['audit_id', 'uuid · FK'], ['url', 'text'], ['score', 'numeric']],
    issues: [['id', 'uuid · PK'], ['audit_id', 'uuid · FK'], ['severity', 'text'], ['rule', 'text']],
    audit_events: [['id', 'uuid · PK'], ['audit_id', 'uuid · FK'], ['type', 'text'], ['created_at', 'timestamptz']],
  },
};
const relationalSchemaState = { tables: [] };

function resetSchemaValidation() {
  const panel = document.querySelector('#schemaValidation');
  panel.className = 'schema-validation';
  panel.dataset.validationCode = 'not-validated';
  panel.querySelector('span').textContent = '?';
  document.querySelector('#schemaValidationTitle').textContent = 'Схема ще не перевірена';
  document.querySelector('#schemaValidationMessage').textContent = 'Додай таблиці, зв’язки, індекси й operational rules.';
}

function renderRelationalSchema() {
  const canvas = document.querySelector('#schemaCanvas');
  canvas.replaceChildren();
  if (!relationalSchemaState.tables.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Додай таблицю users';
    canvas.append(empty);
  } else {
    const grid = document.createElement('div');
    grid.className = 'schema-table-grid';
    relationalSchemaState.tables.forEach(tableName => {
      const table = document.createElement('article');
      table.className = 'schema-table-card';
      const heading = document.createElement('div');
      const title = document.createElement('b');
      title.textContent = tableName;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.dataset.removeSchemaTable = tableName;
      remove.setAttribute('aria-label', `Видалити таблицю ${tableName}`);
      remove.textContent = '×';
      heading.append(title, remove);
      const fields = document.createElement('ul');
      relationalSchemaConfig.tables[tableName].forEach(([name, type]) => {
        const item = document.createElement('li');
        const field = document.createElement('code');
        const dataType = document.createElement('span');
        field.textContent = name;
        dataType.textContent = type;
        item.append(field, dataType);
        fields.append(item);
      });
      table.append(heading, fields);
      grid.append(table);
    });
    canvas.append(grid);
  }
  document.querySelectorAll('[data-schema-table]').forEach(button => {
    button.disabled = relationalSchemaState.tables.includes(button.dataset.schemaTable);
  });
}

function updateQueryPlanPreview() {
  const correct = [...document.querySelectorAll('[data-schema-index]')].filter(select => select.value === select.dataset.schemaIndex).length;
  const meter = document.querySelector('#indexCoverage');
  meter.value = correct;
  meter.textContent = `${correct} з 6`;
  const type = document.querySelector('#queryPlanType');
  const detail = document.querySelector('#queryPlanDetail');
  if (correct === 6) {
    type.textContent = 'Index Scan';
    detail.textContent = 'Усі шість query patterns мають придатний індекс; підтвердь вибір через EXPLAIN ANALYZE.';
  } else if (correct > 0) {
    type.textContent = 'Mixed plan';
    detail.textContent = `${correct} з 6 частих запитів покрито. Решта можуть перейти у Seq Scan на великих таблицях.`;
  } else {
    type.textContent = 'Seq Scan';
    detail.textContent = 'Індекси ще не налаштовані: planner змушений читати таблиці повністю.';
  }
}

function validateRelationalSchema() {
  const expectedTables = Object.keys(relationalSchemaConfig.tables);
  const missingTables = expectedTables.filter(table => !relationalSchemaState.tables.includes(table));
  if (missingTables.length) return { valid: false, code: 'missing-tables', title: 'Схема неповна', message: `Додай таблиці: ${missingTables.join(', ')}. Без них доменні дані доведеться дублювати.` };
  const relationSelects = [...document.querySelectorAll('[data-schema-relation]')];
  const missingRelation = relationSelects.find(select => !select.value);
  if (missingRelation) return { valid: false, code: 'missing-foreign-key', title: 'Не всі зв’язки визначені', message: `Обери target для ${missingRelation.closest('label').childNodes[0].textContent.trim()}.` };
  const wrongRelation = relationSelects.find(select => select.value !== select.dataset.schemaRelation);
  if (wrongRelation) return { valid: false, code: 'wrong-foreign-key', title: 'Foreign key веде не до тієї сутності', message: `${wrongRelation.closest('label').childNodes[0].textContent.trim()} має посилатися на ${wrongRelation.dataset.schemaRelation}.` };
  const indexSelects = [...document.querySelectorAll('[data-schema-index]')];
  const missingIndex = indexSelects.find(select => !select.value);
  if (missingIndex) return { valid: false, code: 'missing-index', title: 'Не всі часті запити покриті', message: `Додай індекс для сценарію «${missingIndex.closest('label').childNodes[0].textContent.trim()}».` };
  const wrongIndex = indexSelects.find(select => select.value !== select.dataset.schemaIndex);
  if (wrongIndex) return { valid: false, code: 'wrong-index', title: 'Порядок колонок індексу не відповідає запиту', message: `Для «${wrongIndex.closest('label').childNodes[0].textContent.trim()}» краще ${wrongIndex.dataset.schemaIndex}.` };
  const operationSelects = [...document.querySelectorAll('[data-database-ops]')];
  const missingOperation = operationSelects.find(select => !select.value);
  if (missingOperation) return { valid: false, code: 'missing-operational-rule', title: 'Operational strategy неповна', message: `Обери рішення для «${missingOperation.closest('label').childNodes[0].textContent.trim()}».` };
  const wrongOperation = operationSelects.find(select => select.value !== select.dataset.databaseOps);
  if (wrongOperation) {
    const errors = {
      'bounded-pool': ['connection-pooling', 'Connections можуть вичерпатися', 'Використай bounded pool та зовнішній pooler для burst-навантаження.'],
      batch: ['prisma-n-plus-one', 'Знайдено N+1 проблему', 'Query у циклі масштабується разом із кількістю audits. Використай include/select або batching.'],
      transaction: ['missing-transaction', 'Можливий частково записаний стан', 'Audit і queued event мають створюватися в одній prisma.$transaction.'],
    };
    const [code, title, message] = errors[wrongOperation.dataset.databaseOps];
    return { valid: false, code, title, message };
  }
  return { valid: true, code: 'relational-schema-valid', title: 'Production-ready основа готова', message: 'Таблиці нормалізовані, FK захищають цілісність, індекси відповідають запитам, а Prisma не створює N+1 чи connection storm.' };
}

function showSchemaValidation(result) {
  const panel = document.querySelector('#schemaValidation');
  panel.className = `schema-validation ${result.valid ? 'valid' : 'invalid'}`;
  panel.dataset.validationCode = result.code;
  panel.querySelector('span').textContent = result.valid ? '✓' : '!';
  document.querySelector('#schemaValidationTitle').textContent = result.title;
  document.querySelector('#schemaValidationMessage').textContent = result.message;
}

document.querySelectorAll('[data-schema-table]').forEach(button => button.addEventListener('click', () => {
  relationalSchemaState.tables.push(button.dataset.schemaTable);
  renderRelationalSchema();
  resetSchemaValidation();
}));
document.querySelector('#schemaCanvas').addEventListener('click', event => {
  const button = event.target.closest('[data-remove-schema-table]');
  if (!button) return;
  relationalSchemaState.tables = relationalSchemaState.tables.filter(table => table !== button.dataset.removeSchemaTable);
  renderRelationalSchema();
  resetSchemaValidation();
});
document.querySelectorAll('[data-schema-relation], [data-schema-index], [data-database-ops]').forEach(select => select.addEventListener('change', () => {
  updateQueryPlanPreview();
  resetSchemaValidation();
}));
document.querySelector('#schemaExample').addEventListener('click', () => {
  relationalSchemaState.tables = Object.keys(relationalSchemaConfig.tables);
  document.querySelectorAll('[data-schema-relation]').forEach(select => { select.value = select.dataset.schemaRelation; });
  document.querySelectorAll('[data-schema-index]').forEach(select => { select.value = select.dataset.schemaIndex; });
  document.querySelectorAll('[data-database-ops]').forEach(select => { select.value = select.dataset.databaseOps; });
  renderRelationalSchema();
  updateQueryPlanPreview();
  resetSchemaValidation();
});
document.querySelector('#schemaReset').addEventListener('click', () => {
  relationalSchemaState.tables = [];
  document.querySelector('#relationForm').reset();
  document.querySelector('#indexForm').reset();
  document.querySelector('#databaseOpsForm').reset();
  renderRelationalSchema();
  updateQueryPlanPreview();
  resetSchemaValidation();
});
document.querySelector('#validateSchema').addEventListener('click', () => showSchemaValidation(validateRelationalSchema()));

const storageDecisionConfig = {
  engines: {
    postgresql: { label: 'PostgreSQL', role: 'relations + ACID' },
    mongodb: { label: 'MongoDB', role: 'flexible documents' },
    redis: { label: 'Redis', role: 'key-value + TTL' },
    'wide-column': { label: 'Wide-column DB', role: 'write-heavy queries' },
    search: { label: 'OpenSearch', role: 'full-text + analytics' },
    object: { label: 'Object Storage', role: 'binary objects' },
  },
  rules: {
    users: { accepted: ['postgresql'], code: 'users-need-relational-integrity', message: 'Користувачам потрібні UNIQUE email, relations і транзакції — обери PostgreSQL.' },
    'audit-results': { accepted: ['postgresql', 'mongodb'], code: 'audit-results-wrong-model', message: 'Обери PostgreSQL для relational analytics або MongoDB для самодостатнього документа зі змінною схемою.' },
    screenshots: { accepted: ['object'], code: 'binary-data-in-database', message: 'Скріншоти — великі binary objects. Object Storage дешевше масштабується та підтримує lifecycle.' },
    'pdf-reports': { accepted: ['object'], code: 'reports-need-object-storage', message: 'PDF-звіти зберігай в Object Storage, а metadata та object key — у primary database.' },
    logs: { accepted: ['search'], code: 'logs-need-search-index', message: 'Для full-text, filters і aggregations логам потрібен Elasticsearch/OpenSearch.' },
    'temporary-status': { accepted: ['redis'], code: 'ephemeral-status-needs-ttl', message: 'Тимчасовий status за auditId з TTL — key-value сценарій для Redis.' },
  },
};

function getStorageSelections() {
  return [...document.querySelectorAll('[data-storage-item]')].map(select => ({ id: select.dataset.storageItem, engine: select.value }));
}

function resetStorageValidation() {
  const panel = document.querySelector('#storageValidation');
  panel.className = 'storage-validation';
  panel.dataset.validationCode = 'not-validated';
  panel.querySelector('span').textContent = '?';
  document.querySelector('#storageValidationTitle').textContent = 'Рішення ще не перевірене';
  document.querySelector('#storageValidationMessage').textContent = 'Розподіли шість типів даних між сховищами.';
}

function renderStorageTopology() {
  const selections = getStorageSelections().filter(selection => selection.engine);
  const grouped = selections.reduce((result, selection) => {
    result[selection.engine] ??= [];
    result[selection.engine].push(selection.id);
    return result;
  }, {});
  const canvas = document.querySelector('#storageTopologyCanvas');
  canvas.replaceChildren();
  const engines = Object.keys(grouped);
  if (!engines.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Обери перше сховище';
    canvas.append(empty);
  } else {
    engines.forEach(engineId => {
      const engine = storageDecisionConfig.engines[engineId];
      const card = document.createElement('article');
      const heading = document.createElement('div');
      const badge = document.createElement('span');
      const title = document.createElement('b');
      const role = document.createElement('small');
      const list = document.createElement('ul');
      badge.textContent = String(grouped[engineId].length);
      title.textContent = engine.label;
      role.textContent = engine.role;
      heading.append(badge, title, role);
      grouped[engineId].forEach(item => {
        const listItem = document.createElement('li');
        listItem.textContent = item;
        list.append(listItem);
      });
      card.append(heading, list);
      canvas.append(card);
    });
  }
  document.querySelector('#storageEngineCount').textContent = `${engines.length} ${engines.length === 1 ? 'engine' : 'engines'} selected`;
  const meter = document.querySelector('#storageComplexity');
  meter.value = engines.length;
  meter.textContent = `${engines.length} з 5`;
  document.querySelector('#storageComplexityHint').textContent = engines.length > 4
    ? 'П’ять engines допустимі, але MongoDB має виправдати додаткові backup, monitoring і expertise.'
    : 'Кожен engine має бути виправданий окремим access pattern.';
}

function validateStorageDecision() {
  const selections = getStorageSelections();
  const missing = selections.find(selection => !selection.engine);
  if (missing) return { valid: false, code: 'missing-storage-choice', message: `Обери primary storage для ${missing.id}.`, affectedIds: [missing.id] };
  for (const selection of selections) {
    const rule = storageDecisionConfig.rules[selection.id];
    if (!rule.accepted.includes(selection.engine)) return { valid: false, code: rule.code, message: rule.message, affectedIds: [selection.id] };
  }
  const auditEngine = selections.find(selection => selection.id === 'audit-results').engine;
  const engines = new Set(selections.map(selection => selection.engine));
  const auditReason = auditEngine === 'mongodb'
    ? 'MongoDB зберігає audit result як гнучкий документ; PostgreSQL лишається власником users і relations.'
    : 'PostgreSQL зберігає users та нормалізовані audit results в одній transactional boundary.';
  return { valid: true, code: 'polyglot-storage-valid', message: `${auditReason} Object Storage тримає binaries, Redis — TTL status, OpenSearch — searchable logs. Всього engines: ${engines.size}.`, affectedIds: [] };
}

function showStorageValidation(result) {
  const panel = document.querySelector('#storageValidation');
  panel.className = `storage-validation ${result.valid ? 'valid' : 'invalid'}`;
  panel.dataset.validationCode = result.code;
  panel.querySelector('span').textContent = result.valid ? '✓' : '!';
  document.querySelector('#storageValidationTitle').textContent = result.valid ? 'Polyglot persistence обґрунтовано' : 'Storage mismatch';
  document.querySelector('#storageValidationMessage').textContent = result.message;
}

document.querySelector('#storageDecisionForm').addEventListener('change', () => {
  renderStorageTopology();
  resetStorageValidation();
});
document.querySelector('#storageExample').addEventListener('click', () => {
  const example = { users: 'postgresql', 'audit-results': 'postgresql', screenshots: 'object', 'pdf-reports': 'object', logs: 'search', 'temporary-status': 'redis' };
  document.querySelectorAll('[data-storage-item]').forEach(select => { select.value = example[select.dataset.storageItem]; });
  renderStorageTopology();
  resetStorageValidation();
});
document.querySelector('#storageReset').addEventListener('click', () => {
  document.querySelector('#storageDecisionForm').reset();
  renderStorageTopology();
  resetStorageValidation();
});
document.querySelector('#validateStorageDecision').addEventListener('click', () => showStorageValidation(validateStorageDecision()));

const distributionConfig = {
  issueCount: 100000000,
  averageIssueKb: 1.5,
  storageOverhead: 2.5,
  minimumShardCount: 4,
  expectedRules: {
    primary: { code: 'writes-not-owned-by-primary', message: 'Writes має серіалізувати primary shard. Replica не є незалежним власником даних.' },
    'lag-aware': { code: 'replication-lag-ignored', message: 'Будь-яка replica може повернути старий status. Додай session pinning до primary та lag-aware routing.' },
    'created-month': { code: 'partition-key-misses-lifecycle', message: 'Для retention і pruning поділи issues за created_at по місяцях.' },
    'audit-hash': { code: 'hot-or-scattered-shard-key', message: 'hash(audit_id) рівномірно розподіляє аудити та зберігає issues одного аудиту на одному shard-і.' },
    'consistent-hashing': { code: 'full-rehash-risk', message: 'Consistent hashing із virtual nodes зменшує частку ключів, яку треба переносити при зміні cluster-а.' },
    'online-resharding': { code: 'unsafe-shard-migration', message: 'Під час copy writes не зупиняються: потрібні dual write/change stream, backfill, verify та контрольований cutover.' },
  },
};

function getDistributionState() {
  return {
    shardCount: Number(document.querySelector('#shardCount').value),
    replicaCount: Number(document.querySelector('#replicaCount').value),
    rules: [...document.querySelectorAll('[data-distribution-rule]')].map(select => ({ id: select.dataset.distributionRule, value: select.value })),
  };
}

function resetDistributionValidation() {
  const panel = document.querySelector('#distributionValidation');
  panel.className = 'distribution-validation';
  panel.dataset.validationCode = 'not-validated';
  panel.querySelector('span').textContent = '?';
  document.querySelector('#distributionValidationTitle').textContent = 'Cluster ще не перевірено';
  document.querySelector('#distributionValidationMessage').textContent = 'Налаштуй topology, ключі та протокол міграції.';
}

function formatStorageGb(value) {
  return `${new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 1 }).format(value)} GB`;
}

function renderDistributionCluster() {
  const state = getDistributionState();
  const canvas = document.querySelector('#clusterCanvas');
  canvas.replaceChildren();
  if (!state.shardCount || !state.replicaCount) {
    const empty = document.createElement('p');
    empty.textContent = 'Обери кількість shard-ів і копій';
    canvas.append(empty);
  } else {
    const grid = document.createElement('div');
    grid.className = 'cluster-shard-grid';
    for (let index = 0; index < state.shardCount; index += 1) {
      const card = document.createElement('article');
      const heading = document.createElement('div');
      const shardId = document.createElement('span');
      const title = document.createElement('b');
      const nodes = document.createElement('div');
      shardId.textContent = `S${index}`;
      title.textContent = `hash range ${String(index + 1).padStart(2, '0')}`;
      heading.append(shardId, title);
      for (let copy = 0; copy < state.replicaCount; copy += 1) {
        const node = document.createElement('i');
        node.className = copy === 0 ? 'primary-copy' : 'replica-copy';
        node.textContent = copy === 0 ? 'P' : `R${copy}`;
        node.title = copy === 0 ? 'Primary' : `Read replica ${copy}`;
        nodes.append(node);
      }
      card.append(heading, nodes);
      grid.append(card);
    }
    canvas.append(grid);
  }
  const nodeCount = state.shardCount * state.replicaCount;
  document.querySelector('#clusterNodeCount').textContent = `${nodeCount} ${nodeCount === 1 ? 'node' : 'nodes'}`;
  const totalDataGb = distributionConfig.issueCount * distributionConfig.averageIssueKb / 1000000 * distributionConfig.storageOverhead;
  document.querySelector('#storagePerPrimary').textContent = state.shardCount ? formatStorageGb(totalDataGb / state.shardCount) : '—';
  document.querySelector('#storagePerPrimaryHint').textContent = state.shardCount ? `за рівномірного розподілу на ${state.shardCount} shards` : 'обери shard count';
  document.querySelector('#clusterStorageTotal').textContent = state.replicaCount ? formatStorageGb(totalDataGb * state.replicaCount) : '—';
}

function validateDistribution() {
  const state = getDistributionState();
  if (!state.shardCount) return { valid: false, code: 'missing-shard-count', message: 'Обери кількість shard-ів для capacity calculation.', affectedIds: ['shardCount'] };
  if (state.shardCount < distributionConfig.minimumShardCount) return { valid: false, code: 'insufficient-shard-capacity', message: 'Два shards залишають приблизно 187.5 GB на primary та мало запасу для growth. Обери щонайменше 4.', affectedIds: ['shardCount'] };
  if (!state.replicaCount) return { valid: false, code: 'missing-replica-count', message: 'Обери кількість копій для кожного shard-а.', affectedIds: ['replicaCount'] };
  if (state.replicaCount < 2) return { valid: false, code: 'single-copy-data', message: 'Primary без replica є single point of failure і не масштабує reads. Додай щонайменше одну replica.', affectedIds: ['replicaCount'] };
  const missingRule = state.rules.find(rule => !rule.value);
  if (missingRule) return { valid: false, code: 'missing-distribution-rule', message: 'Заповни всі правила routing, partitioning, sharding і migration.', affectedIds: [missingRule.id] };
  const shardKeyRule = state.rules.find(rule => rule.id === 'audit-hash');
  if (shardKeyRule.value === 'project') return { valid: false, code: 'hot-shard-key', message: 'project_id створює hot shard, коли один великий tenant генерує значну частину issues. Використай hash(audit_id).', affectedIds: ['audit-hash'] };
  if (shardKeyRule.value === 'issue-hash') return { valid: false, code: 'scatter-gather-shard-key', message: 'hash(issue_id) балансує записи, але читання issues одного аудиту звертається до всіх shard-ів. Використай hash(audit_id).', affectedIds: ['audit-hash'] };
  const violatedRule = state.rules.find(rule => rule.value !== rule.id);
  if (violatedRule) {
    const config = distributionConfig.expectedRules[violatedRule.id];
    return { valid: false, code: config.code, message: config.message, affectedIds: [violatedRule.id] };
  }
  const perPrimaryGb = distributionConfig.issueCount * distributionConfig.averageIssueKb / 1000000 * distributionConfig.storageOverhead / state.shardCount;
  return { valid: true, code: 'distribution-architecture-valid', message: `${state.shardCount} shards × ${state.replicaCount} copies: приблизно ${formatStorageGb(perPrimaryGb)} на primary. Monthly partitions керують lifecycle, hash(audit_id) дає locality, а verified online resharding не губить writes.`, affectedIds: [] };
}

function showDistributionValidation(result) {
  const panel = document.querySelector('#distributionValidation');
  panel.className = `distribution-validation ${result.valid ? 'valid' : 'invalid'}`;
  panel.dataset.validationCode = result.code;
  panel.querySelector('span').textContent = result.valid ? '✓' : '!';
  document.querySelector('#distributionValidationTitle').textContent = result.valid ? 'Data distribution обґрунтовано' : 'Знайдено ризик масштабування';
  document.querySelector('#distributionValidationMessage').textContent = result.message;
}

document.querySelector('#distributionForm').addEventListener('change', () => {
  renderDistributionCluster();
  resetDistributionValidation();
});
document.querySelector('#distributionExample').addEventListener('click', () => {
  document.querySelector('#shardCount').value = '8';
  document.querySelector('#replicaCount').value = '2';
  document.querySelectorAll('[data-distribution-rule]').forEach(select => { select.value = select.dataset.distributionRule; });
  renderDistributionCluster();
  resetDistributionValidation();
});
document.querySelector('#distributionReset').addEventListener('click', () => {
  document.querySelector('#distributionForm').reset();
  renderDistributionCluster();
  resetDistributionValidation();
});
document.querySelector('#validateDistribution').addEventListener('click', () => showDistributionValidation(validateDistribution()));

const outboxSimulatorConfig = {
  pipeline: ['Audit Worker', 'DB Transaction', 'Outbox Relay', 'Message Broker', 'Notification Service'],
  ruleErrors: {
    'skip-locked': { code: 'outbox-relay-race', message: 'Кілька relay instances можуть забрати той самий рядок. Використай FOR UPDATE SKIP LOCKED для конкурентних batches.' },
    'at-least-once': { code: 'event-loss-on-relay-crash', message: 'At-most-once допускає втрату event. Outbox relay має повторювати publish, тобто працювати at-least-once.' },
    'after-confirm': { code: 'premature-outbox-ack', message: 'Позначай outbox event published лише після broker confirm; інакше crash між mark та publish втратить повідомлення.' },
    'idempotent-consumer': { code: 'duplicate-notification-risk', message: 'Crash після publish може створити duplicate. Notification Service має deduplicate за стабільним eventId.' },
    'optimistic-lock': { code: 'audit-state-race', message: 'Last-write-wins може перезаписати completed на failed. Додай version column та optimistic locking.' },
  },
  scenarios: {
    'before-publish': [
      { tone: 'success', title: 'DB commit', detail: 'audit=completed та AuditCompleted записані атомарно.' },
      { tone: 'danger', title: 'Relay crash', detail: 'Process падає до publish; outbox row залишається pending.' },
      { tone: 'warning', title: 'Relay restart', detail: 'Наступний poll знову знаходить durable event.' },
      { tone: 'success', title: 'Broker confirm', detail: 'Event прийнято, outbox row позначено published.' },
      { tone: 'success', title: 'Notification sent', detail: 'Користувач отримує повідомлення після recovery.' },
    ],
    'after-publish': [
      { tone: 'success', title: 'Publish accepted', detail: 'Broker прийняв AuditCompleted.' },
      { tone: 'danger', title: 'Crash before mark', detail: 'Relay не встиг позначити outbox row published.' },
      { tone: 'warning', title: 'Duplicate delivery', detail: 'Після restart event публікується повторно.' },
      { tone: 'success', title: 'Deduplicated', detail: 'Consumer бачить processed eventId і не надсилає другий email.' },
    ],
    'provider-failure': [
      { tone: 'success', title: 'Event consumed', detail: 'Notification Service отримав AuditCompleted.' },
      { tone: 'danger', title: 'Provider 503', detail: 'Зовнішній email provider тимчасово недоступний.' },
      { tone: 'warning', title: 'Retry with backoff', detail: 'Message не ACK-нуто назавжди; наступна спроба використовує той самий eventId.' },
      { tone: 'success', title: 'Notification sent', detail: 'Provider відновився, результат записано idempotently.' },
    ],
  },
};
const outboxSimulatorState = { pipeline: [] };

function resetOutboxValidation() {
  const panel = document.querySelector('#outboxValidation');
  panel.className = 'outbox-validation';
  panel.dataset.validationCode = 'not-validated';
  panel.querySelector('span').textContent = '?';
  document.querySelector('#outboxValidationTitle').textContent = 'Механізм ще не перевірено';
  document.querySelector('#outboxValidationMessage').textContent = 'Побудуй pipeline і налаштуй reliability rules.';
}

function renderOutboxPipeline() {
  const canvas = document.querySelector('#outboxCanvas');
  canvas.replaceChildren();
  if (!outboxSimulatorState.pipeline.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Додай Audit Worker';
    canvas.append(empty);
  } else {
    const flow = document.createElement('div');
    flow.className = 'outbox-component-flow';
    outboxSimulatorState.pipeline.forEach((component, index) => {
      if (index) {
        const arrow = document.createElement('i');
        arrow.textContent = '→';
        arrow.setAttribute('aria-hidden', 'true');
        flow.append(arrow);
      }
      const button = document.createElement('button');
      const badge = document.createElement('span');
      const title = document.createElement('b');
      button.type = 'button';
      button.dataset.removeOutboxComponent = component;
      button.setAttribute('aria-label', `Видалити ${component}`);
      badge.textContent = String(index + 1).padStart(2, '0');
      title.textContent = component;
      button.append(badge, title);
      flow.append(button);
    });
    canvas.append(flow);
  }
  document.querySelectorAll('[data-outbox-component]').forEach(button => {
    button.disabled = outboxSimulatorState.pipeline.includes(button.dataset.outboxComponent);
  });
}

function setOutboxEventLog(events) {
  const log = document.querySelector('#outboxEventLog');
  log.replaceChildren();
  events.forEach((event, index) => {
    const item = document.createElement('li');
    const number = document.createElement('span');
    const copy = document.createElement('p');
    const title = document.createElement('b');
    const detail = document.createElement('small');
    item.dataset.tone = event.tone;
    number.textContent = String(index + 1);
    title.textContent = event.title;
    detail.textContent = event.detail;
    copy.append(title, detail);
    item.append(number, copy);
    log.append(item);
  });
}

function validateOutboxMechanism() {
  const missingComponents = outboxSimulatorConfig.pipeline.filter(component => !outboxSimulatorState.pipeline.includes(component));
  if (missingComponents.length) return { valid: false, code: 'missing-outbox-components', message: `Додай компоненти: ${missingComponents.join(', ')}.`, affectedIds: missingComponents };
  const wrongIndex = outboxSimulatorState.pipeline.findIndex((component, index) => component !== outboxSimulatorConfig.pipeline[index]);
  if (wrongIndex >= 0) return { valid: false, code: 'wrong-outbox-flow', message: `${outboxSimulatorState.pipeline[wrongIndex]} стоїть не на своєму місці. Event має пройти Worker → DB Transaction → Relay → Broker → Notification Service.`, affectedIds: [outboxSimulatorState.pipeline[wrongIndex]] };
  const rules = [...document.querySelectorAll('[data-outbox-rule]')];
  const missingRule = rules.find(select => !select.value);
  if (missingRule) return { valid: false, code: 'missing-outbox-rule', message: 'Заповни всі reliability rules перед перевіркою.', affectedIds: [missingRule.dataset.outboxRule] };
  const transactionRule = rules.find(select => select.dataset.outboxRule === 'same-transaction');
  if (transactionRule.value === 'separate-writes') return { valid: false, code: 'dual-write-gap', message: 'Status і event мають commit-итися в одній local database transaction. Окремий publish може загубитися після commit.', affectedIds: ['same-transaction'] };
  if (transactionRule.value === 'distributed-tx') return { valid: false, code: 'distributed-transaction-coupling', message: 'Не тримай distributed transaction між PostgreSQL і broker: вона збільшує lock time та вимагає спільного 2PC. Запиши event у local outbox.', affectedIds: ['same-transaction'] };
  const invalidRule = rules.find(select => select.value !== select.dataset.outboxRule);
  if (invalidRule) {
    const error = outboxSimulatorConfig.ruleErrors[invalidRule.dataset.outboxRule];
    return { valid: false, code: error.code, message: error.message, affectedIds: [invalidRule.dataset.outboxRule] };
  }
  return { valid: true, code: 'transactional-outbox-valid', message: 'State та event commit-яться атомарно; relay безпечно конкурує й чекає broker confirm; at-least-once duplicates нейтралізує idempotent consumer.', affectedIds: [] };
}

function showOutboxValidation(result) {
  const panel = document.querySelector('#outboxValidation');
  panel.className = `outbox-validation ${result.valid ? 'valid' : 'invalid'}`;
  panel.dataset.validationCode = result.code;
  panel.querySelector('span').textContent = result.valid ? '✓' : '!';
  document.querySelector('#outboxValidationTitle').textContent = result.valid ? 'Notification delivery відновлювана' : 'Знайдено consistency gap';
  document.querySelector('#outboxValidationMessage').textContent = result.message;
}

document.querySelectorAll('[data-outbox-component]').forEach(button => button.addEventListener('click', () => {
  outboxSimulatorState.pipeline.push(button.dataset.outboxComponent);
  renderOutboxPipeline();
  resetOutboxValidation();
}));
document.querySelector('#outboxCanvas').addEventListener('click', event => {
  const button = event.target.closest('[data-remove-outbox-component]');
  if (!button) return;
  outboxSimulatorState.pipeline = outboxSimulatorState.pipeline.filter(component => component !== button.dataset.removeOutboxComponent);
  renderOutboxPipeline();
  resetOutboxValidation();
});
document.querySelector('#outboxConfigForm').addEventListener('change', event => {
  if (event.target.id === 'outboxScenario') document.querySelector('#outboxScenarioLabel').textContent = event.target.selectedOptions[0].textContent;
  resetOutboxValidation();
});
document.querySelector('#outboxExample').addEventListener('click', () => {
  outboxSimulatorState.pipeline = [...outboxSimulatorConfig.pipeline];
  document.querySelectorAll('[data-outbox-rule]').forEach(select => { select.value = select.dataset.outboxRule; });
  renderOutboxPipeline();
  resetOutboxValidation();
});
document.querySelector('#outboxReset').addEventListener('click', () => {
  outboxSimulatorState.pipeline = [];
  document.querySelector('#outboxConfigForm').reset();
  document.querySelector('#outboxScenarioLabel').textContent = document.querySelector('#outboxScenario').selectedOptions[0].textContent;
  renderOutboxPipeline();
  setOutboxEventLog([{ tone: 'idle', title: 'Очікування', detail: 'Збери й перевір механізм перед запуском.' }]);
  resetOutboxValidation();
});
document.querySelector('#validateOutbox').addEventListener('click', () => showOutboxValidation(validateOutboxMechanism()));
document.querySelector('#runOutboxScenario').addEventListener('click', () => {
  const validation = validateOutboxMechanism();
  showOutboxValidation(validation);
  if (!validation.valid) return;
  const scenario = document.querySelector('#outboxScenario').value;
  setOutboxEventLog(outboxSimulatorConfig.scenarios[scenario]);
  showOutboxValidation({ valid: true, code: `outbox-recovered-${scenario}`, message: 'Failure пережито: durable outbox зберіг event, retry відновив delivery, а eventId захистив від повторного side effect.', affectedIds: [] });
});

renderArchitectureScores();
renderAuditStatusPath();
renderAsyncPipeline();
renderRelationalSchema();
updateQueryPlanPreview();
renderStorageTopology();
renderDistributionCluster();
renderOutboxPipeline();

