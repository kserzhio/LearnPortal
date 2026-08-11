import { renderValidationPanel } from '../renderers/validation-panel.js';
import { validationResult } from '../validators/validation-result.js';

const observabilityConfig = {
  metrics: {
    audit_queue_size: { label: 'Queue size', normal: '420', incident: '1 320', unit: 'jobs' },
    audit_processing_duration: { label: 'Processing duration', normal: '42 s', incident: '96 s', unit: 'p95' },
    audit_failure_rate: { label: 'Failure rate', normal: '1.2%', incident: '6.2%', unit: '5m rate' },
    api_response_time: { label: 'API response', normal: '640 ms', incident: '1.4 s', unit: 'p95' },
    database_connection_count: { label: 'DB connections', normal: '58 / 100', incident: '100 / 100', unit: 'pool' },
    worker_cpu_usage: { label: 'Worker CPU', normal: '54%', incident: '88%', unit: 'average' },
  },
  rules: {
    'otel-sdk': { code: 'telemetry-vendor-coupling', message: 'Інструментуй services через OpenTelemetry SDK і збирай signals у Collector перед export.' },
    'structured-json': { code: 'unstructured-production-logs', message: 'Plain text важко корелювати й агрегувати. Використай structured JSON зі stable fields і рівнем severity.' },
    'propagated-context': { code: 'broken-correlation-context', message: 'Один trace/correlation ID має проходити через API, queue і worker. Не використовуй персональні дані як identifier.' },
    prometheus: { code: 'metrics-backend-missing', message: 'Operational metrics мають бути time series у Prometheus, а не числами, витягнутими з logs або PostgreSQL.' },
    'grafana-apm': { code: 'observability-ui-missing', message: 'Використай Grafana для dashboards і alerts та APM/trace backend для пошуку повільних spans.' },
    'adaptive-sampling': { code: 'unsafe-trace-sampling', message: 'Зберігай errors і slow traces, а normal traffic sample-уй відповідно до бюджету. 100% назавжди дорого, 0% забирає causality.' },
    'failure-5': { code: 'failure-alert-threshold-mismatch', message: 'Практична вимога: alert, коли audit_failure_rate перевищує 5%.' },
    'queue-1000': { code: 'queue-alert-threshold-mismatch', message: 'Практична вимога: alert, коли audit_queue_size перевищує 1 000 jobs.' },
    'p95-1s': { code: 'latency-alert-percentile-mismatch', message: 'Практична вимога: alert на p95 API понад 1 секунду. Average приховає slow tail.' },
    'window-5m': { code: 'alert-window-mismatch', message: 'Вимагай порушення протягом 5 хвилин, щоб одиничний spike не створював page.' },
    'owner-runbook': { code: 'alert-owner-missing', message: 'Alert має містити service owner, severity і runbook, інакше сигнал не веде до конкретної дії.' },
    'group-deduplicate': { code: 'alert-fatigue-risk', message: 'Групуй пов’язані alerts, deduplicate повтори та inhibit downstream symptoms під час одного incident.' },
  },
  alertRuleIds: ['failure-5', 'queue-1000', 'p95-1s'],
};
const observabilityState = { incidentActive: false };

function getObservabilityState() {
  return {
    rules: [...document.querySelectorAll('[data-observability-rule]')].map(select => ({ id: select.dataset.observabilityRule, value: select.value })),
    metrics: [...document.querySelectorAll('.dashboard-metric-picker input:checked')].map(input => input.value),
  };
}

function createDashboardMetric(metricId) {
  const metric = observabilityConfig.metrics[metricId];
  const card = document.createElement('article');
  const heading = document.createElement('div');
  const label = document.createElement('span');
  const unit = document.createElement('small');
  const value = document.createElement('b');
  const chart = document.createElement('div');
  card.className = observabilityState.incidentActive ? 'metric-panel incident' : 'metric-panel';
  label.textContent = metric.label;
  unit.textContent = metric.unit;
  value.textContent = observabilityState.incidentActive ? metric.incident : metric.normal;
  heading.append(label, unit);
  for (let index = 0; index < 8; index += 1) {
    const bar = document.createElement('i');
    bar.setAttribute('aria-hidden', 'true');
    chart.append(bar);
  }
  const code = document.createElement('code');
  code.textContent = metricId;
  card.append(heading, value, chart, code);
  return card;
}

function renderObservabilityDashboard() {
  const state = getObservabilityState();
  const dashboard = document.querySelector('#observabilityDashboard');
  dashboard.replaceChildren();
  if (!state.metrics.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Обери metrics для dashboard';
    dashboard.append(empty);
  } else {
    state.metrics.forEach(metricId => dashboard.append(createDashboardMetric(metricId)));
  }
  const validAlerts = state.rules.filter(rule => observabilityConfig.alertRuleIds.includes(rule.id) && rule.value === rule.id).length;
  document.querySelector('#observabilityCoverage').textContent = `${state.metrics.length} / 6 metrics · ${validAlerts} / 3 alerts`;
  document.querySelector('#observabilityDashboardStatus').textContent = observabilityState.incidentActive ? 'INCIDENT' : state.metrics.length ? 'LIVE' : 'NO PANELS';
}

function validateObservability() {
  const state = getObservabilityState();
  const missingRule = state.rules.find(rule => !rule.value);
  if (missingRule) return { valid: false, code: 'missing-observability-decision', message: 'Заповни всі рішення для telemetry pipeline та alerting.', affectedIds: [missingRule.id] };
  const invalidRule = state.rules.find(rule => rule.value !== rule.id);
  if (invalidRule) {
    const error = observabilityConfig.rules[invalidRule.id];
    return { valid: false, code: error.code, message: error.message, affectedIds: [invalidRule.id] };
  }
  const missingMetric = Object.keys(observabilityConfig.metrics).find(metricId => !state.metrics.includes(metricId));
  if (missingMetric) return { valid: false, code: 'dashboard-metric-missing', message: `Додай ${missingMetric}: без цієї panel dashboard не показує один із ключових сигналів audit platform.`, affectedIds: [missingMetric] };
  return { valid: true, code: 'observability-control-room-valid', message: 'Metrics, logs і traces корелюються через OpenTelemetry context. Dashboard покриває backlog, latency, errors і saturation, а три alerts мають thresholds, window, owner та noise control.', affectedIds: [] };
}

function resetObservabilityValidation() {
  const panel = document.querySelector('#observabilityValidation');
  panel.className = 'observability-validation';
  panel.dataset.validationCode = 'not-validated';
  panel.querySelector('span').textContent = '?';
  document.querySelector('#observabilityValidationTitle').textContent = 'Control room ще не перевірено';
  document.querySelector('#observabilityValidationMessage').textContent = 'Налаштуй telemetry, dashboard panels та alerts.';
  document.querySelectorAll('.observability-decision-problem').forEach(element => element.classList.remove('observability-decision-problem'));
}

function showObservabilityValidation(result) {
  const panel = document.querySelector('#observabilityValidation');
  panel.className = `observability-validation ${result.valid ? 'valid' : 'invalid'}`;
  panel.dataset.validationCode = result.code;
  panel.querySelector('span').textContent = result.valid ? '✓' : '!';
  document.querySelector('#observabilityValidationTitle').textContent = result.valid ? 'Control room готова' : 'У спостережуваності є сліпа зона';
  document.querySelector('#observabilityValidationMessage').textContent = result.message;
  document.querySelectorAll('.observability-decision-problem').forEach(element => element.classList.remove('observability-decision-problem'));
  result.affectedIds.forEach(id => {
    const target = document.querySelector(`[data-observability-rule="${id}"]`) || document.querySelector(`.dashboard-metric-picker input[value="${id}"]`)?.closest('label');
    target?.classList.add('observability-decision-problem');
  });
}

function resetObservabilityIncident() {
  observabilityState.incidentActive = false;
  document.querySelector('#incidentRunTitle').textContent = 'Система працює нормально';
  document.querySelector('#incidentRunMessage').textContent = 'Valid configuration відкриє incident.';
  const timeline = document.querySelector('#incidentTimeline');
  timeline.replaceChildren();
  const item = document.createElement('li');
  item.dataset.tone = 'idle';
  const number = document.createElement('span');
  const copy = document.createElement('p');
  const title = document.createElement('b');
  const detail = document.createElement('small');
  number.textContent = '0';
  title.textContent = 'Очікування';
  detail.textContent = 'Налаштуй і перевір control room.';
  copy.append(title, detail);
  item.append(number, copy);
  timeline.append(item);
  renderObservabilityDashboard();
}

function renderObservabilityIncident() {
  observabilityState.incidentActive = true;
  renderObservabilityDashboard();
  const events = [
    ['Prometheus threshold', 'failure=6.2%, queue=1 320, API p95=1.4 s протягом 5m.'],
    ['Grafana grouping', 'Три symptoms об’єднано в один incident для Audit Platform.'],
    ['Trace selected', 'Slow span показує db.pool.acquire = 820 ms.'],
    ['Log correlated', 'trace_id знаходить database_connection_count=100 та timeout.'],
    ['Owner action', 'Runbook: зменшити pool pressure, перевірити slow queries, scale workers після DB recovery.'],
  ];
  const timeline = document.querySelector('#incidentTimeline');
  timeline.replaceChildren();
  events.forEach((event, index) => {
    const item = document.createElement('li');
    item.dataset.tone = index === events.length - 1 ? 'success' : 'active';
    const number = document.createElement('span');
    const copy = document.createElement('p');
    const title = document.createElement('b');
    const detail = document.createElement('small');
    number.textContent = String(index + 1);
    title.textContent = event[0];
    detail.textContent = event[1];
    copy.append(title, detail);
    item.append(number, copy);
    timeline.append(item);
  });
  document.querySelector('#incidentRunTitle').textContent = 'DB connection pool saturated';
  document.querySelector('#incidentRunMessage').textContent = 'Три alerts стали одним incident; trace і log визначили dependency.';
}

document.querySelector('#observabilityForm').addEventListener('change', () => {
  resetObservabilityIncident();
  resetObservabilityValidation();
});
document.querySelector('#observabilityExample').addEventListener('click', () => {
  document.querySelectorAll('[data-observability-rule]').forEach(select => { select.value = select.dataset.observabilityRule; });
  document.querySelectorAll('.dashboard-metric-picker input').forEach(input => { input.checked = true; });
  resetObservabilityIncident();
  resetObservabilityValidation();
});
document.querySelector('#observabilityReset').addEventListener('click', () => {
  document.querySelector('#observabilityForm').reset();
  resetObservabilityIncident();
  resetObservabilityValidation();
});
document.querySelector('#validateObservability').addEventListener('click', () => showObservabilityValidation(validateObservability()));
document.querySelector('#runObservabilityIncident').addEventListener('click', () => {
  const validation = validateObservability();
  showObservabilityValidation(validation);
  if (!validation.valid) return;
  renderObservabilityIncident();
  showObservabilityValidation({ valid: true, code: 'observability-incident-diagnosed', message: 'Alert grouping прибрав шум, p95 trace локалізував очікування connection pool, а structured log підтвердив saturation.', affectedIds: [] });
});

const finalDesignConfig = {
  components: {
    cdn: { label: 'CDN', badge: 'CDN', tier: 'edge' },
    frontend: { label: 'Next.js Frontend', badge: 'UI', tier: 'edge' },
    'load-balancer': { label: 'Load Balancer', badge: 'LB', tier: 'edge' },
    'api-cluster': { label: 'API Service Cluster', badge: 'API', tier: 'services' },
    redis: { label: 'Redis', badge: 'R', tier: 'services' },
    postgres: { label: 'PostgreSQL', badge: 'DB', tier: 'data' },
    'read-replicas': { label: 'Read Replicas', badge: 'RR', tier: 'data' },
    'job-queue': { label: 'Job Queue', badge: 'Q', tier: 'async' },
    'worker-cluster': { label: 'Worker Cluster', badge: 'W', tier: 'async' },
    puppeteer: { label: 'Puppeteer', badge: 'P', tier: 'processing' },
    'axe-core': { label: 'axe-core', badge: 'AX', tier: 'processing' },
    'object-storage': { label: 'Object Storage / Reports', badge: 'S3', tier: 'delivery' },
    notification: { label: 'Notification Service', badge: 'N', tier: 'delivery' },
    'status-stream': { label: 'Live Status Stream', badge: 'LIVE', tier: 'services' },
  },
  tiers: [
    { id: 'edge', label: 'EDGE & CLIENT' },
    { id: 'services', label: 'ONLINE SERVICES' },
    { id: 'data', label: 'DATA' },
    { id: 'async', label: 'ASYNC EXECUTION' },
    { id: 'processing', label: 'AUDIT ENGINE' },
    { id: 'delivery', label: 'REPORTS & EVENTS' },
  ],
  rules: {
    'api-independent': { code: 'api-scaling-coupled', message: 'API має бути stateless окремим autoscaling pool, інакше online traffic залежить від worker capacity.' },
    'workers-independent': { code: 'worker-scaling-coupled', message: 'Workers масштабуються за queue depth незалежно від API. In-process jobs зникають під час restart.' },
    'retry-dlq': { code: 'failed-job-recovery-missing', message: 'Невдалі jobs потребують bounded retry з exponential backoff, jitter та DLQ для ручного recovery.' },
    'realtime-pubsub': { code: 'live-status-not-scalable', message: 'Live status має використовувати SSE/WebSocket gateway зі shared Pub/Sub, а не memory одного API instance.' },
    'async-reports': { code: 'report-generation-blocks-api', message: 'PDF і VPAT генеруй асинхронно та зберігай в Object Storage, не всередині HTTP request або database BLOB.' },
    'multi-az-failover': { code: 'single-failure-domain', message: 'Для 99.9% рознеси replicas по availability zones і автоматизуй health-based failover.' },
    'resilience-guards': { code: 'cascading-failure-risk', message: 'Remote calls потребують deadline, bounded backoff з jitter і circuit breaker, щоб dependency failure не виснажив platform.' },
    'degraded-mode': { code: 'graceful-degradation-missing', message: 'Secondary failure не має зупиняти core audit. Queue notification/report work і показуй чесний degraded status.' },
    'pitr-rpo-rto': { code: 'disaster-recovery-objectives-missing', message: 'Налаштуй PITR, cross-region backup, restore tests та числові цілі RPO 15m / RTO 60m.' },
    'warm-standby': { code: 'regional-failover-missing', message: 'Multi-AZ захищає від zone failure; warm standby region дає recovery path після regional disaster без складності unplanned active-active.' },
  },
  chaos: {
    'db-primary': { title: 'Database primary failed', events: [
      ['Steady state', 'API success 99.95%, replication lag 2 s, queue age 18 s.'],
      ['Failure injected', 'Primary PostgreSQL process недоступний.'],
      ['Failover', 'Health monitor promoted Multi-AZ standby; clients reconnect через pooler.'],
      ['Safe retry', 'Idempotent writes повторено з backoff; duplicate jobs deduplicated.'],
      ['Recovered', 'Critical journey restored, RPO≈0; old primary quarantined.'],
    ] },
    'api-instance': { title: 'API-2 instance failed', events: [
      ['Steady state', 'Three stateless API replicas serve traffic.'],
      ['Failure injected', 'API-2 stops responding to readiness probe.'],
      ['Traffic shift', 'Load Balancer removes API-2 from healthy endpoints.'],
      ['Capacity held', 'API-1 and API-3 autoscale; sessions remain external.'],
      ['Recovered', 'Replacement replica joins after readiness succeeds.'],
    ] },
    'redis-outage': { title: 'Redis unavailable', events: [
      ['Steady state', 'Cache hit ratio 87%; live status uses shared Pub/Sub.'],
      ['Failure injected', 'Redis connections time out within bounded deadline.'],
      ['Circuit open', 'Fast-fail stops connection storm and retry amplification.'],
      ['Degraded mode', 'Rate-limited DB fallback serves critical reads; status uses polling fallback.'],
      ['Recovered', 'Cache warms with jitter; circuit half-open probe succeeds.'],
    ] },
    'region-outage': { title: 'Primary region unavailable', events: [
      ['Steady state', 'Warm standby receives WAL and object replicas.'],
      ['Failure injected', 'Regional health checks fail from multiple locations.'],
      ['Global failover', 'Traffic manager activates standby API and Workers.'],
      ['Data recovery', 'Database promoted within RPO≤15m; queues resume idempotently.'],
      ['Recovered', 'Critical journey verified within RTO≤60m before full traffic.'],
    ] },
  },
};
const finalDesignState = { components: new Set(), chaosActive: false };

function getFinalDesignState() {
  return {
    components: [...finalDesignState.components],
    rules: [...document.querySelectorAll('[data-final-rule]')].map(select => ({ id: select.dataset.finalRule, value: select.value })),
    scenario: document.querySelector('#finalChaosScenario').value,
  };
}

function applyFinalDesignState(state) {
  const knownComponents = new Set(Object.keys(finalDesignConfig.components));
  finalDesignState.components = new Set((state.components || []).filter(id => knownComponents.has(id)));
  const savedRules = new Map((state.rules || []).map(rule => [rule.id, rule.value]));
  document.querySelectorAll('[data-final-rule]').forEach(select => {
    const value = savedRules.get(select.dataset.finalRule) || '';
    select.value = [...select.options].some(option => option.value === value) ? value : '';
  });
  const scenario = document.querySelector('#finalChaosScenario');
  if ([...scenario.options].some(option => option.value === state.scenario)) scenario.value = state.scenario;
  resetFinalChaos();
  resetFinalValidation();
  renderFinalArchitecture();
}
function createFinalComponentNode(componentId) {
  const component = finalDesignConfig.components[componentId];
  const button = document.createElement('button');
  const badge = document.createElement('span');
  const label = document.createElement('b');
  button.type = 'button';
  button.dataset.removeFinalComponent = componentId;
  button.setAttribute('aria-label', `Видалити ${component.label}`);
  badge.textContent = component.badge;
  label.textContent = component.label;
  button.append(badge, label);
  return button;
}

function renderFinalArchitecture() {
  const canvas = document.querySelector('#finalArchitectureCanvas');
  canvas.replaceChildren();
  if (!finalDesignState.components.size) {
    const empty = document.createElement('p');
    empty.textContent = 'Додай CDN як перший edge component';
    canvas.append(empty);
  } else {
    const topology = document.createElement('div');
    topology.className = 'final-tier-topology';
    finalDesignConfig.tiers.forEach(tier => {
      const tierComponents = Object.entries(finalDesignConfig.components).filter(([id, component]) => component.tier === tier.id && finalDesignState.components.has(id));
      if (!tierComponents.length) return;
      const section = document.createElement('section');
      const heading = document.createElement('span');
      const nodes = document.createElement('div');
      heading.textContent = tier.label;
      tierComponents.forEach(([id]) => nodes.append(createFinalComponentNode(id)));
      section.append(heading, nodes);
      topology.append(section);
    });
    canvas.append(topology);
  }
  document.querySelectorAll('[data-final-component]').forEach(button => {
    const selected = finalDesignState.components.has(button.dataset.finalComponent);
    button.disabled = selected;
    button.setAttribute('aria-pressed', String(selected));
  });
  renderFinalAnalysis();
}

function renderFinalAnalysis() {
  const state = getFinalDesignState();
  const validPolicies = state.rules.filter(rule => rule.value === rule.id).length;
  const componentCount = state.components.length;
  const complete = componentCount === Object.keys(finalDesignConfig.components).length && validPolicies === Object.keys(finalDesignConfig.rules).length;
  document.querySelector('#finalDesignCoverage').textContent = `${componentCount} / 14 components · ${validPolicies} / 10 policies`;
  document.querySelector('#finalAnalysisStatus').textContent = complete ? 'All critical paths covered' : `${14 - componentCount} components · ${10 - validPolicies} policies remaining`;
  document.querySelector('#finalAvailabilityBadge').textContent = complete ? 'NO KNOWN SPOF' : 'SPOF POSSIBLE';
  document.querySelector('#finalAvailabilityMetric').textContent = complete ? '99.9%' : '—';
  document.querySelector('#finalRpoMetric').textContent = state.rules.some(rule => rule.id === 'pitr-rpo-rto' && rule.value === rule.id) ? '≤15m' : '—';
  document.querySelector('#finalRtoMetric').textContent = state.rules.some(rule => rule.id === 'pitr-rpo-rto' && rule.value === rule.id) ? '≤60m' : '—';
}

function validateFinalDesign() {
  const state = getFinalDesignState();
  const missingComponent = Object.keys(finalDesignConfig.components).find(id => !finalDesignState.components.has(id));
  if (missingComponent) {
    const component = finalDesignConfig.components[missingComponent];
    return validationResult(false, 'missing-final-component', `Додай ${component.label}: без цього component один із required user journeys не має повного path.`, [missingComponent]);
  }
  const missingRule = state.rules.find(rule => !rule.value);
  if (missingRule) return validationResult(false, 'missing-final-policy', 'Заповни всі scale, resilience та disaster recovery policies.', [missingRule.id]);
  const invalidRule = state.rules.find(rule => rule.value !== rule.id);
  if (invalidRule) {
    const error = finalDesignConfig.rules[invalidRule.id];
    return validationResult(false, error.code, error.message, [invalidRule.id]);
  }
  return validationResult(true, 'final-system-design-valid', 'Design підтримує 10 000 audits/hour через durable queue та independently scaled workers, live status через shared Pub/Sub, 99.9% через Multi-AZ failover і regional recovery з RPO≤15m / RTO≤60m.');
}

function resetFinalValidation() {
  const panel = document.querySelector('#finalDesignValidation');
  panel.className = 'final-design-validation';
  panel.dataset.validationCode = 'not-validated';
  panel.querySelector('span').textContent = '?';
  document.querySelector('#finalDesignValidationTitle').textContent = 'Фінальний дизайн ще не перевірено';
  document.querySelector('#finalDesignValidationMessage').textContent = 'Збери 14 components і налаштуй 10 reliability policies.';
  document.querySelectorAll('.final-design-problem').forEach(element => element.classList.remove('final-design-problem'));
}

function showFinalValidation(result) {
  const panel = document.querySelector('#finalDesignValidation');
  const safeResult = renderValidationPanel({
    result,
    panel,
    title: document.querySelector('#finalDesignValidationTitle'),
    message: document.querySelector('#finalDesignValidationMessage'),
    validTitle: 'Production design пройшов review',
    invalidTitle: 'У фінальному дизайні є reliability gap',
  });
  document.querySelectorAll('.final-design-problem').forEach(element => element.classList.remove('final-design-problem'));
  safeResult.affectedIds.forEach(id => {
    const target = document.querySelector(`[data-final-rule="${id}"]`) || document.querySelector(`[data-final-component="${id}"]`);
    target?.classList.add('final-design-problem');
  });
}

function resetFinalChaos() {
  finalDesignState.chaosActive = false;
  document.querySelector('#finalChaosTitle').textContent = 'Failure не запущено';
  document.querySelector('#finalChaosMessage').textContent = 'Перевір architecture перед experiment.';
  const log = document.querySelector('#finalChaosLog');
  log.replaceChildren();
  const item = document.createElement('li');
  item.dataset.tone = 'idle';
  const number = document.createElement('span');
  const copy = document.createElement('p');
  const title = document.createElement('b');
  const detail = document.createElement('small');
  number.textContent = '0';
  title.textContent = 'Steady state';
  detail.textContent = 'Очікування valid architecture.';
  copy.append(title, detail);
  item.append(number, copy);
  log.append(item);
}

function renderFinalChaos() {
  const scenario = finalDesignConfig.chaos[document.querySelector('#finalChaosScenario').value];
  finalDesignState.chaosActive = true;
  document.querySelector('#finalChaosTitle').textContent = scenario.title;
  document.querySelector('#finalChaosMessage').textContent = 'Blast radius обмежено, abort conditions не порушено, critical journey відновлено.';
  const log = document.querySelector('#finalChaosLog');
  log.replaceChildren();
  scenario.events.forEach((event, index) => {
    const item = document.createElement('li');
    item.dataset.tone = index === scenario.events.length - 1 ? 'success' : index === 1 ? 'danger' : 'active';
    const number = document.createElement('span');
    const copy = document.createElement('p');
    const title = document.createElement('b');
    const detail = document.createElement('small');
    number.textContent = String(index + 1);
    title.textContent = event[0];
    detail.textContent = event[1];
    copy.append(title, detail);
    item.append(number, copy);
    log.append(item);
  });
}

const architectureService = window.SystemaArtifacts.createArchitectureService();
const architectureList = document.querySelector('#architectureList');
const artifactStatus = document.querySelector('#artifactStatus');

function setArtifactStatus(message, tone = 'neutral') {
  artifactStatus.textContent = message;
  artifactStatus.dataset.tone = tone;
}

function renderArchitectureLibrary() {
  const architectures = architectureService.listArchitectures();
  architectureList.replaceChildren();
  if (!architectures.length) {
    setArtifactStatus('Збережених схем поки немає.');
    return;
  }

  architectures.forEach(architecture => {
    const item = document.createElement('li');
    const copy = document.createElement('div');
    const title = document.createElement('b');
    const metadata = document.createElement('small');
    const actions = document.createElement('div');
    const loadButton = document.createElement('button');
    const exportButton = document.createElement('button');
    const deleteButton = document.createElement('button');

    title.textContent = architecture.title;
    metadata.textContent = `${new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(architecture.updatedAt))} · ${architecture.synchronized ? 'Supabase' : 'цей пристрій'}`;
    loadButton.type = 'button';
    loadButton.dataset.architectureAction = 'load';
    loadButton.dataset.architectureId = architecture.id;
    loadButton.textContent = 'Відкрити';
    exportButton.type = 'button';
    exportButton.dataset.architectureAction = 'export';
    exportButton.dataset.architectureId = architecture.id;
    exportButton.textContent = 'JSON';
    deleteButton.type = 'button';
    deleteButton.dataset.architectureAction = 'delete';
    deleteButton.dataset.architectureId = architecture.id;
    deleteButton.textContent = 'Видалити';
    copy.append(title, metadata);
    actions.append(loadButton, exportButton, deleteButton);
    item.append(copy, actions);
    architectureList.append(item);
  });
}

function downloadArchitecture(title, state) {
  const exportDocument = window.SystemaArchitectureFormat.createDocument(title, state);
  const blob = new Blob([`${JSON.stringify(exportDocument, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `systema-architecture-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

document.querySelector('#exportCurrentArchitecture').addEventListener('click', () => {
  const title = document.querySelector('#architectureTitle').value.trim() || 'Systema architecture';
  try {
    downloadArchitecture(title, getFinalDesignState());
    setArtifactStatus('Versioned JSON підготовлено до завантаження.', 'success');
  } catch {
    setArtifactStatus('Не вдалося експортувати architecture state.', 'error');
  }
});

document.querySelector('#importArchitectureFile').addEventListener('change', async event => {
  const input = event.currentTarget;
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 262144) {
    setArtifactStatus('JSON перевищує максимальний розмір 256 KB.', 'error');
    input.value = '';
    return;
  }
  const result = window.SystemaArchitectureFormat.parse(await file.text());
  if (!result.valid) {
    setArtifactStatus(result.message, 'error');
    input.value = '';
    return;
  }
  applyFinalDesignState(result.architecture.state);
  document.querySelector('#architectureTitle').value = result.architecture.title;
  showFinalValidation(validateFinalDesign());
  setArtifactStatus(`Імпортовано «${result.architecture.title}». Перевір і збережи схему.`, 'success');
  input.value = '';
});

architectureService.subscribe(renderArchitectureLibrary);
renderArchitectureLibrary();
architectureService.initialize().then(result => {
  renderArchitectureLibrary();
  if (result.authenticated && result.synchronized) setArtifactStatus('Схеми синхронізовано з профілем.', 'success');
});

document.querySelector('#saveFinalArchitecture').addEventListener('click', async () => {
  const titleInput = document.querySelector('#architectureTitle');
  const title = titleInput.value.trim();
  if (!title) {
    setArtifactStatus('Додай назву, щоб зберегти схему.', 'error');
    titleInput.focus();
    return;
  }

  const result = await architectureService.saveArchitecture(title, getFinalDesignState());
  titleInput.value = '';
  setArtifactStatus(result.synchronized
    ? 'Архітектуру збережено в Supabase.'
    : 'Архітектуру збережено на цьому пристрої.', 'success');
});

architectureList.addEventListener('click', async event => {
  const button = event.target.closest('[data-architecture-action]');
  if (!button) return;
  const architecture = architectureService.listArchitectures().find(item => item.id === button.dataset.architectureId);
  if (!architecture) return;

  if (button.dataset.architectureAction === 'load') {
    applyFinalDesignState(architecture.state);
    showFinalValidation(validateFinalDesign());
    setArtifactStatus(`Відкрито схему «${architecture.title}».`, 'success');
    return;
  }

  if (button.dataset.architectureAction === 'export') {
    try {
      downloadArchitecture(architecture.title, architecture.state);
      setArtifactStatus(`Експортовано «${architecture.title}».`, 'success');
    } catch {
      setArtifactStatus('Не вдалося експортувати збережену схему.', 'error');
    }
    return;
  }

  if (button.dataset.confirmDelete !== 'true') {
    button.dataset.confirmDelete = 'true';
    button.textContent = 'Підтвердити видалення';
    setArtifactStatus(`Повторно натисни кнопку, щоб видалити «${architecture.title}».`, 'error');
    return;
  }

  const result = await architectureService.deleteArchitecture(architecture.id);
  setArtifactStatus(result.deleted ? 'Архітектуру видалено.' : 'Не вдалося видалити архітектуру.', result.deleted ? 'success' : 'error');
});

document.querySelector('#finalComponentPalette').addEventListener('click', event => {
  const button = event.target.closest('[data-final-component]');
  if (!button) return;
  finalDesignState.components.add(button.dataset.finalComponent);
  resetFinalChaos();
  resetFinalValidation();
  renderFinalArchitecture();
});
document.querySelector('#finalArchitectureCanvas').addEventListener('click', event => {
  const button = event.target.closest('[data-remove-final-component]');
  if (!button) return;
  finalDesignState.components.delete(button.dataset.removeFinalComponent);
  resetFinalChaos();
  resetFinalValidation();
  renderFinalArchitecture();
});
document.querySelector('#finalReliabilityForm').addEventListener('change', () => {
  resetFinalChaos();
  resetFinalValidation();
  renderFinalAnalysis();
});
document.querySelector('#finalDesignExample').addEventListener('click', () => {
  finalDesignState.components = new Set(Object.keys(finalDesignConfig.components));
  document.querySelectorAll('[data-final-rule]').forEach(select => { select.value = select.dataset.finalRule; });
  resetFinalChaos();
  resetFinalValidation();
  renderFinalArchitecture();
});
document.querySelector('#finalDesignReset').addEventListener('click', () => {
  finalDesignState.components.clear();
  document.querySelector('#finalReliabilityForm').reset();
  resetFinalChaos();
  resetFinalValidation();
  renderFinalArchitecture();
});
document.querySelector('#validateFinalDesign').addEventListener('click', () => {
  const state = getFinalDesignState();
  showFinalValidation(validateFinalDesign());
  architectureService.recordAttempt(state);
});
document.querySelector('#runFinalChaos').addEventListener('click', () => {
  const validation = validateFinalDesign();
  showFinalValidation(validation);
  if (!validation.valid) return;
  renderFinalChaos();
  showFinalValidation({ valid: true, code: 'chaos-experiment-survived', message: `${finalDesignConfig.chaos[document.querySelector('#finalChaosScenario').value].title}: system зберіг critical journey і виконав перевірений recovery path.`, affectedIds: [] });
});

renderObservabilityDashboard();
renderFinalArchitecture();
