const scalingDecisionConfig = {
  scenarios: {
    'cpu-ha': {
      label: 'CPU-bound · stateless · HA required',
      answer: 'scale-out',
      guardrail: 'lb-health',
      requiredChecks: ['scalingProfile', 'scalingConnections'],
      wrongCode: 'single-node-ha-risk',
      wrongMessage: '1×16 CPU може дати capacity, але залишає один failure domain. Для stateless API з SLO 99.9% обери 4×4 CPU за load balancer.',
      success: '4×4 CPU зберігають 16 total cores, додають чотири failure domains і дозволяють rolling deployment. Connection budget не дає чотирьом pools перевантажити database.',
    },
    'memory-stateful': {
      label: 'Memory-heavy · stateful process',
      answer: 'scale-up',
      guardrail: 'standby-plan',
      requiredChecks: ['scalingProfile', 'scalingMemory'],
      wrongCode: 'working-set-duplication',
      wrongMessage: 'Чотири маленькі вузли не дадуть одному stateful process 48 GB contiguous memory. Спочатку виключи leak, потім обери більший instance зі standby plan.',
      success: '1×16 CPU з 64 GB RAM вміщує working set без distributed state. Heap audit підтверджує, що це capacity need, а standby і rollback plan зменшують single-node risk.',
    },
    'database-limit': {
      label: 'Database-bound · API має запас',
      answer: 'optimize-first',
      guardrail: 'query-pool',
      requiredChecks: ['scalingProfile', 'scalingConnections', 'scalingQueryPlan'],
      wrongCode: 'scaling-wrong-tier',
      wrongMessage: 'Application CPU має 65% запасу, а PostgreSQL уже на 95%. Нові API cores збільшать тиск. Спочатку виправ query plan та connection pool.',
      success: 'EXPLAIN ANALYZE, потрібний index і bounded pool прибирають database bottleneck. Повторний load test покаже, чи capacity взагалі треба додавати.',
    },
  },
  topologies: {
    'scale-up': { label: '1 × 16 CPU', cpu: '16 cores', nodes: '1', failures: '1', connections: 'MEDIUM', nodeCount: 1 },
    'scale-out': { label: '4 × 4 CPU', cpu: '16 cores', nodes: '4', failures: '4', connections: 'HIGH → BUDGET', nodeCount: 4 },
    'optimize-first': { label: 'Current 1 × 4 CPU', cpu: '4 cores', nodes: '1', failures: '1', connections: 'REDUCE WITH POOL', nodeCount: 1 },
  },
};

function getScalingDecision() {
  return document.querySelector('input[name="scalingDecision"]:checked')?.value || '';
}

function resetScalingValidation() {
  const panel = document.querySelector('#scalingValidation');
  panel.className = 'scaling-validation';
  panel.dataset.validationCode = 'not-validated';
  panel.querySelector('span').textContent = '?';
  document.querySelector('#scalingValidationTitle').textContent = 'Рішення ще не перевірено';
  document.querySelector('#scalingValidationMessage').textContent = 'Обери topology, diagnostics і production guardrail.';
}

function renderScalingDecision() {
  const decision = getScalingDecision();
  const canvas = document.querySelector('#scalingTopology');
  canvas.replaceChildren();
  if (!decision) {
    const empty = document.createElement('p');
    empty.textContent = 'Обери архітектурне рішення';
    canvas.append(empty);
  } else {
    const topology = scalingDecisionConfig.topologies[decision];
    const flow = document.createElement('div');
    flow.className = `scaling-node-flow ${decision}`;
    if (decision === 'scale-out') {
      const balancer = document.createElement('article');
      const label = document.createElement('span');
      const title = document.createElement('b');
      label.textContent = 'LB';
      title.textContent = 'Load Balancer';
      balancer.append(label, title);
      flow.append(balancer);
      const arrow = document.createElement('i');
      arrow.textContent = '→';
      arrow.setAttribute('aria-hidden', 'true');
      flow.append(arrow);
    }
    const nodes = document.createElement('div');
    for (let index = 0; index < topology.nodeCount; index += 1) {
      const node = document.createElement('article');
      const badge = document.createElement('span');
      const title = document.createElement('b');
      const detail = document.createElement('small');
      badge.textContent = decision === 'scale-out' ? `N${index + 1}` : decision === 'scale-up' ? 'XL' : 'FIX';
      title.textContent = decision === 'scale-out' ? '4 CPU' : decision === 'scale-up' ? '16 CPU · 64 GB' : 'Profile + optimize';
      detail.textContent = decision === 'optimize-first' ? 'same capacity' : 'application node';
      node.append(badge, title, detail);
      nodes.append(node);
    }
    flow.append(nodes);
    canvas.append(flow);
  }
  const topology = scalingDecisionConfig.topologies[decision];
  document.querySelector('#scalingCpuMetric').textContent = topology?.cpu || '—';
  document.querySelector('#scalingNodeMetric').textContent = topology?.nodes || '—';
  document.querySelector('#scalingFailureMetric').textContent = topology?.failures || '—';
  document.querySelector('#scalingConnectionMetric').textContent = topology?.connections || '—';
}

function resetScalingForm() {
  document.querySelectorAll('input[name="scalingDecision"]').forEach(input => { input.checked = false; });
  ['scalingProfile', 'scalingMemory', 'scalingConnections', 'scalingQueryPlan'].forEach(id => { document.querySelector(`#${id}`).checked = false; });
  document.querySelector('#scalingGuardrail').value = '';
  renderScalingDecision();
  resetScalingValidation();
}

function validateScalingDecision() {
  const scenarioId = document.querySelector('#scalingScenario').value;
  const scenario = scalingDecisionConfig.scenarios[scenarioId];
  const decision = getScalingDecision();
  if (!decision) return { valid: false, code: 'missing-scaling-decision', message: 'Обери scale up, scale out або optimize first.', affectedIds: ['scalingDecision'] };
  if (decision !== scenario.answer) return { valid: false, code: scenario.wrongCode, message: scenario.wrongMessage, affectedIds: ['scalingDecision'] };
  const missingCheck = scenario.requiredChecks.find(id => !document.querySelector(`#${id}`).checked);
  if (missingCheck) {
    const checkMessages = {
      scalingProfile: ['profiling-required', 'Підтвердь CPU/heap profiling під реальним load. Без baseline scaling буде здогадкою.'],
      scalingMemory: ['memory-leak-not-excluded', 'Зроби heap snapshot: більша RAM не лікує retained objects і лише відкладає crash.'],
      scalingConnections: ['connection-budget-missing', 'Порахуй загальний connection budget: кількість instances множиться на pool size.'],
      scalingQueryPlan: ['database-plan-not-measured', 'Запусти EXPLAIN ANALYZE для slow queries перед додаванням application capacity.'],
    };
    const [code, message] = checkMessages[missingCheck];
    return { valid: false, code, message, affectedIds: [missingCheck] };
  }
  if (document.querySelector('#scalingGuardrail').value !== scenario.guardrail) return { valid: false, code: 'wrong-scaling-guardrail', message: `Для цього сценарію production guardrail має бути: ${document.querySelector(`#scalingGuardrail option[value="${scenario.guardrail}"]`).textContent}.`, affectedIds: ['scalingGuardrail'] };
  return { valid: true, code: `scaling-decision-valid-${scenarioId}`, message: scenario.success, affectedIds: [] };
}

function showScalingValidation(result) {
  const panel = document.querySelector('#scalingValidation');
  panel.className = `scaling-validation ${result.valid ? 'valid' : 'invalid'}`;
  panel.dataset.validationCode = result.code;
  panel.querySelector('span').textContent = result.valid ? '✓' : '!';
  document.querySelector('#scalingValidationTitle').textContent = result.valid ? 'Наступний крок обґрунтовано' : 'Рішення масштабує не ту проблему';
  document.querySelector('#scalingValidationMessage').textContent = result.message;
}

document.querySelector('#scalingDecisionForm').addEventListener('change', event => {
  if (event.target.id === 'scalingScenario') {
    document.querySelector('#scalingScenarioLabel').textContent = scalingDecisionConfig.scenarios[event.target.value].label;
    resetScalingForm();
    return;
  }
  renderScalingDecision();
  resetScalingValidation();
});
document.querySelector('#scalingExample').addEventListener('click', () => {
  const scenario = scalingDecisionConfig.scenarios[document.querySelector('#scalingScenario').value];
  document.querySelector(`input[name="scalingDecision"][value="${scenario.answer}"]`).checked = true;
  ['scalingProfile', 'scalingMemory', 'scalingConnections', 'scalingQueryPlan'].forEach(id => { document.querySelector(`#${id}`).checked = scenario.requiredChecks.includes(id); });
  document.querySelector('#scalingGuardrail').value = scenario.guardrail;
  renderScalingDecision();
  resetScalingValidation();
});
document.querySelector('#scalingReset').addEventListener('click', resetScalingForm);
document.querySelector('#validateScalingDecision').addEventListener('click', () => showScalingValidation(validateScalingDecision()));

const horizontalScalingConfig = {
  minimumReplicas: 3,
  rules: {
    'external-session': { code: 'local-session-state', message: 'Local session прив’язує користувача до instance. Використай signed token або shared Redis, щоб будь-яка replica обробила request.' },
    'object-storage': { code: 'local-file-state', message: 'Файл на local disk API-1 недоступний API-2 і зникне після replacement. Використай Object Storage.' },
    'durable-queue': { code: 'in-process-job-loss', message: 'Background job у process memory загубиться під час restart. Передай роботу в durable Queue окремим Workers.' },
    'readiness-liveness': { code: 'incomplete-health-checks', message: 'Readiness керує traffic, liveness — restart. Потрібні обидві перевірки з різними відповідальностями.' },
    'multi-signal-hpa': { code: 'unsafe-autoscaling-signal', message: 'Налаштуй HPA з min/max та signal, що відповідає попиту: CPU разом з in-flight requests або RPS.' },
    kubernetes: { code: 'single-host-orchestration', message: 'Для conceptual production topology використай Deployment, Service та HPA замість ручного запуску containers на одному host.' },
    'connection-budget': { code: 'database-connection-storm', message: 'Кожна replica множить pool. Обмеж суму connections global budget-ом і за потреби додай pooler.' },
  },
};
const horizontalScalingState = { unhealthyReplica: null };

function getHorizontalScalingState() {
  return {
    replicaCount: Number(document.querySelector('#horizontalReplicaCount').value),
    algorithm: document.querySelector('#horizontalAlgorithm').value,
    rules: [...document.querySelectorAll('[data-horizontal-rule]')].map(select => ({ id: select.dataset.horizontalRule, value: select.value })),
  };
}

function resetHorizontalValidation() {
  const panel = document.querySelector('#horizontalValidation');
  panel.className = 'horizontal-validation';
  panel.dataset.validationCode = 'not-validated';
  panel.querySelector('span').textContent = '?';
  document.querySelector('#horizontalValidationTitle').textContent = 'Deployment ще не перевірено';
  document.querySelector('#horizontalValidationMessage').textContent = 'Налаштуй replicas, stateless state та orchestration.';
}

function renderHorizontalTopology() {
  const state = getHorizontalScalingState();
  const canvas = document.querySelector('#horizontalTopology');
  canvas.replaceChildren();
  if (!state.replicaCount) {
    const empty = document.createElement('p');
    empty.textContent = 'Обери кількість replicas';
    canvas.append(empty);
  } else {
    const flow = document.createElement('div');
    flow.className = 'horizontal-node-flow';
    const balancer = document.createElement('article');
    const balancerBadge = document.createElement('span');
    const balancerTitle = document.createElement('b');
    const balancerDetail = document.createElement('small');
    balancerBadge.textContent = 'LB';
    balancerTitle.textContent = 'Load Balancer';
    balancerDetail.textContent = state.algorithm ? state.algorithm.replace('-', ' ') : 'algorithm?';
    balancer.append(balancerBadge, balancerTitle, balancerDetail);
    const arrow = document.createElement('i');
    arrow.textContent = '→';
    arrow.setAttribute('aria-hidden', 'true');
    const replicas = document.createElement('div');
    for (let index = 1; index <= state.replicaCount; index += 1) {
      const node = document.createElement('article');
      const badge = document.createElement('span');
      const title = document.createElement('b');
      const detail = document.createElement('small');
      const isUnhealthy = horizontalScalingState.unhealthyReplica === index;
      node.className = isUnhealthy ? 'unhealthy-api-node' : 'healthy-api-node';
      badge.textContent = `A${index}`;
      title.textContent = `API-${index}`;
      detail.textContent = isUnhealthy ? 'UNREADY · removed' : 'READY · traffic';
      node.append(badge, title, detail);
      replicas.append(node);
    }
    flow.append(balancer, arrow, replicas);
    canvas.append(flow);
  }
  const healthyCount = Math.max(0, state.replicaCount - (horizontalScalingState.unhealthyReplica ? 1 : 0));
  document.querySelector('#horizontalNodeCount').textContent = `${healthyCount} healthy ${healthyCount === 1 ? 'replica' : 'replicas'}`;
  const status = document.querySelector('#horizontalTrafficStatus');
  const detail = document.querySelector('#horizontalTrafficDetail');
  if (!state.replicaCount) {
    status.textContent = 'Не налаштовано';
    detail.textContent = 'Load balancer ще не має endpoints.';
  } else if (horizontalScalingState.unhealthyReplica && healthyCount > 0) {
    status.textContent = 'Degraded, але доступно';
    detail.textContent = `API-${horizontalScalingState.unhealthyReplica} прибрано з rotation; traffic розподіляється між ${healthyCount} ready replicas.`;
  } else {
    status.textContent = 'Усі replicas ready';
    detail.textContent = `${state.replicaCount} endpoints доступні для load balancer.`;
  }
}

function validateHorizontalScaling() {
  const state = getHorizontalScalingState();
  if (!state.replicaCount) return { valid: false, code: 'missing-api-replicas', message: 'Обери кількість API replicas.', affectedIds: ['horizontalReplicaCount'] };
  if (state.replicaCount < horizontalScalingConfig.minimumReplicas) return { valid: false, code: 'insufficient-api-replicas', message: 'Для практики потрібні щонайменше три replicas: одна може впасти без втрати redundancy під час deployment.', affectedIds: ['horizontalReplicaCount'] };
  if (!state.algorithm) return { valid: false, code: 'missing-balancing-algorithm', message: 'Обери load balancing algorithm для healthy endpoints.', affectedIds: ['horizontalAlgorithm'] };
  if (state.algorithm === 'sticky') return { valid: false, code: 'sticky-sessions-hide-state', message: 'Sticky sessions маскують local state і створюють imbalance. Для нового API обери round robin або least connections.', affectedIds: ['horizontalAlgorithm'] };
  const missingRule = state.rules.find(rule => !rule.value);
  if (missingRule) return { valid: false, code: 'missing-horizontal-rule', message: 'Заповни всі рішення для state, health, autoscaling та connections.', affectedIds: [missingRule.id] };
  const invalidRule = state.rules.find(rule => rule.value !== rule.id);
  if (invalidRule) {
    const error = horizontalScalingConfig.rules[invalidRule.id];
    return { valid: false, code: error.code, message: error.message, affectedIds: [invalidRule.id] };
  }
  return { valid: true, code: 'horizontal-api-valid', message: `${state.replicaCount} stateless replicas за load balancer готові до replacement і autoscaling. Shared state, readiness та global connection budget усувають залежність від конкретного API instance.`, affectedIds: [] };
}

function showHorizontalValidation(result) {
  const panel = document.querySelector('#horizontalValidation');
  panel.className = `horizontal-validation ${result.valid ? 'valid' : 'invalid'}`;
  panel.dataset.validationCode = result.code;
  panel.querySelector('span').textContent = result.valid ? '✓' : '!';
  document.querySelector('#horizontalValidationTitle').textContent = result.valid ? 'API готовий до horizontal scaling' : 'Replica ще не є disposable';
  document.querySelector('#horizontalValidationMessage').textContent = result.message;
}

document.querySelector('#horizontalScalingForm').addEventListener('change', () => {
  horizontalScalingState.unhealthyReplica = null;
  renderHorizontalTopology();
  resetHorizontalValidation();
});
document.querySelector('#horizontalExample').addEventListener('click', () => {
  document.querySelector('#horizontalReplicaCount').value = '3';
  document.querySelector('#horizontalAlgorithm').value = 'round-robin';
  document.querySelectorAll('[data-horizontal-rule]').forEach(select => { select.value = select.dataset.horizontalRule; });
  horizontalScalingState.unhealthyReplica = null;
  renderHorizontalTopology();
  resetHorizontalValidation();
});
document.querySelector('#horizontalReset').addEventListener('click', () => {
  document.querySelector('#horizontalScalingForm').reset();
  horizontalScalingState.unhealthyReplica = null;
  renderHorizontalTopology();
  resetHorizontalValidation();
});
document.querySelector('#validateHorizontalScaling').addEventListener('click', () => showHorizontalValidation(validateHorizontalScaling()));
document.querySelector('#simulateApiFailure').addEventListener('click', () => {
  const validation = validateHorizontalScaling();
  showHorizontalValidation(validation);
  if (!validation.valid) return;
  horizontalScalingState.unhealthyReplica = 2;
  renderHorizontalTopology();
  showHorizontalValidation({ valid: true, code: 'api-failure-tolerated', message: 'API-2 став unready і виключений із Service endpoints. Requests продовжують обробляти API-1 та API-3 без sticky state.', affectedIds: [] });
});

const cacheStrategyConfig = {
  policies: {
    'audit-list': { label: 'Список аудитів', layer: 'redis', pattern: 'cache-aside', ttl: '60s', invalidation: 'audit-events', savings: 280 },
    dashboard: { label: 'Статистика dashboard', layer: 'redis', pattern: 'cache-aside', ttl: '60s', invalidation: 'stats-events', savings: 220 },
    reports: { label: 'Готові звіти', layer: 'cdn', pattern: 'immutable', ttl: '1d', invalidation: 'versioned-url', savings: 250 },
    settings: { label: 'Налаштування користувача', layer: 'redis', pattern: 'cache-aside', ttl: '5m', invalidation: 'settings-update', savings: 120 },
  },
  fields: {
    layer: { code: 'wrong-cache-layer', message: 'Обраний layer не відповідає способу доступу до цих даних.' },
    pattern: { code: 'unsafe-cache-pattern', message: 'Pattern створює зайвий ризик dual write або не використовує властивість immutable artifact.' },
    ttl: { code: 'ttl-freshness-mismatch', message: 'TTL не відповідає freshness budget: потрібне обмежене життя key та jitter для гарячих даних.' },
    invalidation: { code: 'missing-cache-invalidation', message: 'Одного TTL недостатньо. Прив’яжи invalidation до події зміни або versioned URL.' },
  },
};

function getCacheStrategyState() {
  const policies = [...document.querySelectorAll('[data-cache-policy]')].map(fieldset => ({
    id: fieldset.dataset.cachePolicy,
    values: Object.fromEntries([...fieldset.querySelectorAll('[data-cache-field]')].map(select => [select.dataset.cacheField, select.value])),
  }));
  return {
    policies,
    stampede: document.querySelector('#cacheStampede').value,
    lock: document.querySelector('#cacheLock').value,
    outage: document.querySelector('#cacheOutage').value,
  };
}

function isCachePolicySafe(policy) {
  const expected = cacheStrategyConfig.policies[policy.id];
  return Object.entries(policy.values).every(([field, value]) => expected[field] === value);
}

function renderCacheMetrics() {
  const safePolicies = getCacheStrategyState().policies.filter(isCachePolicySafe);
  const savings = safePolicies.reduce((total, policy) => total + cacheStrategyConfig.policies[policy.id].savings, 0);
  document.querySelector('#cacheDbAfter').textContent = `${new Intl.NumberFormat('uk-UA').format(1000 - savings)}/s`;
  document.querySelector('#cacheReduction').textContent = `${Math.round(savings / 10)}%`;
  document.querySelector('#cacheSafePolicies').textContent = `${safePolicies.length} / 4`;
}

function validateCacheStrategy() {
  const state = getCacheStrategyState();
  for (const policy of state.policies) {
    const expected = cacheStrategyConfig.policies[policy.id];
    const missing = Object.entries(policy.values).find(([, value]) => !value);
    if (missing) return { valid: false, code: 'missing-cache-policy', message: `${expected.label}: заповни поле «${missing[0]}».`, affectedIds: [policy.id] };
    const mismatch = Object.entries(policy.values).find(([field, value]) => expected[field] !== value);
    if (mismatch) {
      const error = cacheStrategyConfig.fields[mismatch[0]];
      return { valid: false, code: error.code, message: `${expected.label}: ${error.message}`, affectedIds: [policy.id] };
    }
  }
  if (!state.stampede) return { valid: false, code: 'missing-stampede-policy', message: 'Обери поведінку для одночасних cache misses.', affectedIds: ['cacheStampede'] };
  if (state.stampede !== 'single-flight') return { valid: false, code: 'cache-stampede-unprotected', message: 'Однаковий TTL або прямий DB fallback створять herd. Використай single-flight, stale value та TTL jitter.', affectedIds: ['cacheStampede'] };
  if (!state.lock) return { valid: false, code: 'missing-lock-policy', message: 'Налаштуй lifecycle distributed lock.', affectedIds: ['cacheLock'] };
  if (state.lock !== 'token-expiry') return { valid: false, code: 'unsafe-distributed-lock', message: 'Lock без expiry може зависнути, а звичайний DEL — видалити чужий lock. Потрібні owner token, expiry і atomic compare-delete.', affectedIds: ['cacheLock'] };
  if (!state.outage) return { valid: false, code: 'missing-cache-outage-policy', message: 'Визнач поведінку application під час Redis outage.', affectedIds: ['cacheOutage'] };
  if (state.outage !== 'degrade') return { valid: false, code: 'cache-outage-no-fallback', message: 'Cache не повинен бути single point of failure. Дозволь bounded DB fallback, але захисти database rate limit-ом.', affectedIds: ['cacheOutage'] };
  return { valid: true, code: 'cache-strategy-valid', message: 'Чотири workloads мають відповідний layer, freshness budget та invalidation. Single-flight обмежує recompute одним loader-ом, а bounded fallback зберігає availability.', affectedIds: [] };
}

function resetCacheValidation() {
  const panel = document.querySelector('#cacheValidation');
  panel.className = 'cache-validation';
  panel.dataset.validationCode = 'not-validated';
  panel.querySelector('span').textContent = '?';
  document.querySelector('#cacheValidationTitle').textContent = 'Cache strategy ще не перевірено';
  document.querySelector('#cacheValidationMessage').textContent = 'Налаштуй чотири policies та resilience controls.';
  document.querySelectorAll('.cache-policy-problem').forEach(element => element.classList.remove('cache-policy-problem'));
}

function showCacheValidation(result) {
  const panel = document.querySelector('#cacheValidation');
  panel.className = `cache-validation ${result.valid ? 'valid' : 'invalid'}`;
  panel.dataset.validationCode = result.code;
  panel.querySelector('span').textContent = result.valid ? '✓' : '!';
  document.querySelector('#cacheValidationTitle').textContent = result.valid ? 'Cache strategy готова до навантаження' : 'Політика потребує виправлення';
  document.querySelector('#cacheValidationMessage').textContent = result.message;
  document.querySelectorAll('.cache-policy-problem').forEach(element => element.classList.remove('cache-policy-problem'));
  result.affectedIds.forEach(id => {
    const target = document.querySelector(`[data-cache-policy="${id}"]`) || document.querySelector(`#${id}`);
    target?.classList.add('cache-policy-problem');
  });
}

function resetCacheRun() {
  document.querySelector('#cacheRunTitle').textContent = 'Cache stampede ще не запущено';
  document.querySelector('#cacheRunMessage').textContent = 'Спочатку перевір безпечну cache strategy.';
  const log = document.querySelector('#cacheEventLog');
  log.replaceChildren();
  const item = document.createElement('li');
  item.dataset.tone = 'idle';
  const number = document.createElement('span');
  const copy = document.createElement('p');
  const title = document.createElement('b');
  const detail = document.createElement('small');
  number.textContent = '0';
  title.textContent = 'Очікування';
  detail.textContent = 'Valid strategy відкриє failure simulation.';
  copy.append(title, detail);
  item.append(number, copy);
  log.append(item);
}

function renderCacheRun() {
  const events = [
    ['TTL expired', 'dashboard:weekly переходить у stale state.'],
    ['500 concurrent misses', 'Усі requests бачать той самий missing key.'],
    ['Lock acquired', 'Один owner token отримує право читати PostgreSQL.'],
    ['499 requests protected', 'Callers отримують stale value або bounded wait.'],
    ['Cache refreshed', 'Нове значення записано з TTL jitter; lock видалено через compare-delete.'],
  ];
  const log = document.querySelector('#cacheEventLog');
  log.replaceChildren();
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
    log.append(item);
  });
  document.querySelector('#cacheRunTitle').textContent = 'Stampede локалізовано';
  document.querySelector('#cacheRunMessage').textContent = '500 misses створили один DB read, а не 500.';
}

document.querySelector('#cacheStrategyForm').addEventListener('change', () => {
  renderCacheMetrics();
  resetCacheValidation();
  resetCacheRun();
});
document.querySelector('#cacheExample').addEventListener('click', () => {
  document.querySelectorAll('[data-cache-policy]').forEach(fieldset => {
    const expected = cacheStrategyConfig.policies[fieldset.dataset.cachePolicy];
    fieldset.querySelectorAll('[data-cache-field]').forEach(select => { select.value = expected[select.dataset.cacheField]; });
  });
  document.querySelector('#cacheStampede').value = 'single-flight';
  document.querySelector('#cacheLock').value = 'token-expiry';
  document.querySelector('#cacheOutage').value = 'degrade';
  renderCacheMetrics();
  resetCacheValidation();
  resetCacheRun();
});
document.querySelector('#cacheReset').addEventListener('click', () => {
  document.querySelector('#cacheStrategyForm').reset();
  renderCacheMetrics();
  resetCacheValidation();
  resetCacheRun();
});
document.querySelector('#validateCacheStrategy').addEventListener('click', () => showCacheValidation(validateCacheStrategy()));
document.querySelector('#simulateCacheStampede').addEventListener('click', () => {
  const validation = validateCacheStrategy();
  showCacheValidation(validation);
  if (!validation.valid) return;
  renderCacheRun();
  showCacheValidation({ valid: true, code: 'cache-stampede-contained', message: 'Single-flight допустив один DB loader; stale response, owner token і TTL jitter захистили availability.', affectedIds: [] });
});

const edgeDeliveryConfig = {
  rules: {
    'object-storage': { code: 'binary-on-application-server', message: 'Screenshots і PDF не повинні жити на local disk або в PostgreSQL BLOB. Використай private Object Storage.' },
    'metadata-db': { code: 'missing-file-metadata', message: 'Збережи owner, object key, status і checksum у PostgreSQL, щоб authorization не залежала від filename.' },
    'direct-presigned': { code: 'api-file-proxy-bottleneck', message: 'Upload через API споживає його bandwidth і memory. Видай короткоживучий presigned multipart PUT для прямого upload.' },
    'signed-cdn': { code: 'unsafe-file-delivery', message: 'Приватний file не має бути public і не повинен stream-итися кожного разу через API. Використай signed CDN URL.' },
    'responsive-images': { code: 'unoptimized-screenshot-delivery', message: 'Original PNG марнує bandwidth на mobile. Створи AVIF/WebP variants і responsive srcset.' },
    'immutable-range': { code: 'mutable-report-cache-key', message: 'Готовий PDF має отримати versioned immutable key і підтримувати byte ranges.' },
    'segmented-video': { code: 'large-video-monolith', message: 'Для великих відео потрібні resumable multipart upload та HLS/DASH segments, а не один API request.' },
    'text-compression': { code: 'incorrect-compression-scope', message: 'Brotli/gzip застосовуй до text assets. Повторне compression image, PDF і video витрачає CPU майже без вигоди.' },
    'modern-http': { code: 'transport-fallback-missing', message: 'Увімкни HTTP/3 для QUIC clients та HTTP/2 fallback для сумісності.' },
    'hashed-immutable': { code: 'next-static-cache-mismatch', message: 'Next.js build assets мають content hash, тому їх безпечно кешувати як immutable.' },
    'bounded-revalidation': { code: 'dynamic-content-staleness', message: 'Dynamic dashboard потребує обмеженої revalidation policy, а не річного immutable cache.' },
    'private-origin': { code: 'public-storage-origin', message: 'Закрий public bucket access і дозволь origin fetch лише CDN identity.' },
  },
};

function getEdgeDeliveryState() {
  return [...document.querySelectorAll('[data-edge-rule]')].map(select => ({ id: select.dataset.edgeRule, value: select.value }));
}

function getEdgeSafeCount() {
  return getEdgeDeliveryState().filter(rule => rule.value === rule.id).length;
}

function createEdgeNode(badgeText, titleText, detailText, safe) {
  const node = document.createElement('article');
  const badge = document.createElement('span');
  const title = document.createElement('b');
  const detail = document.createElement('small');
  node.className = safe ? 'edge-node-safe' : 'edge-node-warning';
  badge.textContent = badgeText;
  title.textContent = titleText;
  detail.textContent = detailText;
  node.append(badge, title, detail);
  return node;
}

function renderEdgeTopology() {
  const state = Object.fromEntries(getEdgeDeliveryState().map(rule => [rule.id, rule.value]));
  const canvas = document.querySelector('#edgeTopology');
  canvas.replaceChildren();
  const flow = document.createElement('div');
  flow.className = 'edge-node-flow';
  const uploadSafe = state['direct-presigned'] === 'direct-presigned';
  const storageSafe = state['object-storage'] === 'object-storage' && state['private-origin'] === 'private-origin';
  const deliverySafe = state['signed-cdn'] === 'signed-cdn';
  const client = createEdgeNode('C', 'Client', uploadSafe ? 'direct upload' : 'upload path?', uploadSafe);
  const uploadArrow = document.createElement('i');
  uploadArrow.textContent = '→';
  uploadArrow.setAttribute('aria-hidden', 'true');
  const storage = createEdgeNode('S3', 'Object Storage', storageSafe ? 'private origin' : 'storage/security?', storageSafe);
  const deliveryArrow = document.createElement('i');
  deliveryArrow.textContent = '→';
  deliveryArrow.setAttribute('aria-hidden', 'true');
  const cdn = createEdgeNode('CDN', 'Edge Delivery', deliverySafe ? 'signed URL' : 'delivery path?', deliverySafe);
  flow.append(client, uploadArrow, storage, deliveryArrow, cdn);
  canvas.append(flow);
  const safeCount = getEdgeSafeCount();
  const ratio = safeCount / Object.keys(edgeDeliveryConfig.rules).length;
  document.querySelector('#edgeSafeDecisionCount').textContent = `${safeCount} / 12 safe decisions`;
  document.querySelector('#edgeApiEgress').textContent = `${Math.round(900 - 810 * ratio)} GB/day`;
  document.querySelector('#edgeOriginRequests').textContent = `${Math.round(100 - 94 * ratio)}%`;
  document.querySelector('#edgeOffload').textContent = `${Math.round(90 * ratio)}%`;
}

function validateEdgeDelivery() {
  const state = getEdgeDeliveryState();
  const missing = state.find(rule => !rule.value);
  if (missing) return { valid: false, code: 'missing-edge-decision', message: 'Заповни всі рішення для storage, delivery, assets і transport.', affectedIds: [missing.id] };
  const invalid = state.find(rule => rule.value !== rule.id);
  if (invalid) {
    const error = edgeDeliveryConfig.rules[invalid.id];
    return { valid: false, code: error.code, message: error.message, affectedIds: [invalid.id] };
  }
  return { valid: true, code: 'edge-delivery-valid', message: 'API зберігає authorization і metadata, але не file bytes. Private Object Storage приймає direct multipart uploads, а CDN доставляє versioned optimized assets з edge.', affectedIds: [] };
}

function resetEdgeValidation() {
  const panel = document.querySelector('#edgeValidation');
  panel.className = 'edge-validation';
  panel.dataset.validationCode = 'not-validated';
  panel.querySelector('span').textContent = '?';
  document.querySelector('#edgeValidationTitle').textContent = 'Delivery architecture ще не перевірено';
  document.querySelector('#edgeValidationMessage').textContent = 'Налаштуй дванадцять рішень для storage, assets і CDN.';
  document.querySelectorAll('.edge-decision-problem').forEach(element => element.classList.remove('edge-decision-problem'));
}

function showEdgeValidation(result) {
  const panel = document.querySelector('#edgeValidation');
  panel.className = `edge-validation ${result.valid ? 'valid' : 'invalid'}`;
  panel.dataset.validationCode = result.code;
  panel.querySelector('span').textContent = result.valid ? '✓' : '!';
  document.querySelector('#edgeValidationTitle').textContent = result.valid ? 'Edge delivery готова' : 'У delivery path є bottleneck';
  document.querySelector('#edgeValidationMessage').textContent = result.message;
  document.querySelectorAll('.edge-decision-problem').forEach(element => element.classList.remove('edge-decision-problem'));
  result.affectedIds.forEach(id => document.querySelector(`[data-edge-rule="${id}"]`)?.classList.add('edge-decision-problem'));
}

function resetEdgeRun() {
  document.querySelector('#edgeRunTitle').textContent = '20 GB upload ще не запущено';
  document.querySelector('#edgeRunMessage').textContent = 'Спочатку перевір architecture.';
  const log = document.querySelector('#edgeEventLog');
  log.replaceChildren();
  const item = document.createElement('li');
  item.dataset.tone = 'idle';
  const number = document.createElement('span');
  const copy = document.createElement('p');
  const title = document.createElement('b');
  const detail = document.createElement('small');
  number.textContent = '0';
  title.textContent = 'Очікування';
  detail.textContent = 'Valid architecture відкриє simulation.';
  copy.append(title, detail);
  item.append(number, copy);
  log.append(item);
}

function renderEdgeRun() {
  const events = [
    ['Authorization', 'API перевірив owner і підписав PUT на 10 хвилин.'],
    ['Multipart upload', '20 GB передано Client → Object Storage без API memory.'],
    ['Integrity check', 'ObjectCreated worker перевірив size, type і checksum.'],
    ['Metadata ready', 'PostgreSQL отримав object key та status ready.'],
    ['Edge delivery', 'Signed CDN URL віддав file; private origin залишився закритим.'],
  ];
  const log = document.querySelector('#edgeEventLog');
  log.replaceChildren();
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
    log.append(item);
  });
  document.querySelector('#edgeRunTitle').textContent = '20 GB upload завершено';
  document.querySelector('#edgeRunMessage').textContent = 'API передав лише authorization metadata; його egress для file дорівнює нулю.';
}

document.querySelector('#edgeDeliveryForm').addEventListener('change', () => {
  renderEdgeTopology();
  resetEdgeValidation();
  resetEdgeRun();
});
document.querySelector('#edgeExample').addEventListener('click', () => {
  document.querySelectorAll('[data-edge-rule]').forEach(select => { select.value = select.dataset.edgeRule; });
  renderEdgeTopology();
  resetEdgeValidation();
  resetEdgeRun();
});
document.querySelector('#edgeReset').addEventListener('click', () => {
  document.querySelector('#edgeDeliveryForm').reset();
  renderEdgeTopology();
  resetEdgeValidation();
  resetEdgeRun();
});
document.querySelector('#validateEdgeDelivery').addEventListener('click', () => showEdgeValidation(validateEdgeDelivery()));
document.querySelector('#simulateLargeUpload').addEventListener('click', () => {
  const validation = validateEdgeDelivery();
  showEdgeValidation(validation);
  if (!validation.valid) return;
  renderEdgeRun();
  showEdgeValidation({ valid: true, code: 'large-upload-bypassed-api', message: '20 GB file пройшов напряму в Object Storage; API не став bandwidth bottleneck, а signed CDN URL зберіг приватний доступ.', affectedIds: [] });
});

renderScalingDecision();
renderHorizontalTopology();
renderCacheMetrics();
renderEdgeTopology();

