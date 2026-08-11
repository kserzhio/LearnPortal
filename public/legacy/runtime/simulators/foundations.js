import { showToast } from '../ui-feedback.js';

const loadForm = document.querySelector('#loadForm');
const peak = document.querySelector('#peak');
const number = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 1 });
peak.addEventListener('input', () => document.querySelector('#peakOutput').value = `${peak.value}×`);
function calculateLoad(event) {
  event?.preventDefault();
  const dau = Math.max(1, Number(document.querySelector('#dau').value));
  const actions = Math.max(1, Number(document.querySelector('#actions').value));
  const peakFactor = Number(peak.value);
  const payload = Math.max(1, Number(document.querySelector('#payload').value));
  const daily = dau * actions;
  const rps = daily / 86400 * peakFactor;
  const traffic = rps * payload / 1024;
  const servers = Math.max(2, Math.ceil(rps * 1.3 / 500));
  document.querySelector('#rpsResult').innerHTML = `${number.format(Math.round(rps))} <small>RPS</small>`;
  document.querySelector('#dailyResult').textContent = daily >= 1e6 ? `${number.format(daily / 1e6)} млн` : number.format(daily);
  document.querySelector('#trafficResult').textContent = `${number.format(traffic)} MB/s`;
  document.querySelector('#serverResult').textContent = servers;
}
loadForm.addEventListener('submit', calculateLoad);
loadForm.querySelectorAll('input').forEach(input => input.addEventListener('change', calculateLoad));

const canvas = document.querySelector('#architectureCanvas');
const svg = document.querySelector('#connections');
const emptyState = document.querySelector('#canvasEmpty');
let nodes = [];
let connections = [];
let connectMode = false;
let connectStart = null;
let selectedNode = null;
let nodeCounter = 0;
const icons = { client: '◉', loadBalancer: '⇄', app: '⌘', database: 'DB', replica: 'R', cache: '⚡', queue: '≋' };
const componentDefinitions = {
  client: { capacity: 100000, zone: 'global', hint: 'Джерело трафіку. Має вести до балансувальника, а не напряму до БД.' },
  loadBalancer: { capacity: 10000, zone: 'a', hint: 'Розподіляє трафік між App Server. Для HA потрібні екземпляри у двох зонах.' },
  app: { capacity: 500, zone: 'a', hint: 'Обробляє бізнес-логіку. Загальна потужність — сума активних App Server.' },
  database: { capacity: 1500, zone: 'a', hint: 'Основне сховище. Підключи репліку для автоматичного failover.' },
  replica: { capacity: 1200, zone: 'b', hint: 'Резерв даних. Напрямок реплікації: Database → DB Replica.' },
  cache: { capacity: 10000, zone: 'a', hint: 'Знімає read-навантаження з БД. Підключення: App Server → Cache.' },
  queue: { capacity: 5000, zone: 'a', hint: 'Буферизує асинхронну роботу. Підключення: App Server → Queue.' },
};
const scenarios = {
  ha: { target: 900, description: 'Побудуй сервіс без єдиної точки відмови у двох зонах доступності.', requireHA: true, requireCache: false, requireQueue: false, cacheFactor: 2 },
  highload: { target: 5000, description: 'Масштабуй application і data tiers так, щоб витримати 5 000 RPS із запасом 30%.', requireHA: false, requireCache: true, requireQueue: false, cacheFactor: 3 },
  analytics: { target: 2500, description: 'Read-heavy dashboard: забезпеч кешування, асинхронну чергу та відмовостійкість.', requireHA: true, requireCache: true, requireQueue: true, cacheFactor: 3 },
};
const allowedEdges = {
  client: ['loadBalancer'],
  loadBalancer: ['app'],
  app: ['database', 'cache', 'queue'],
  database: ['replica'],
  queue: ['app'],
  cache: [],
  replica: [],
};

function currentScenario() { return scenarios[document.querySelector('#scenarioSelect').value]; }

function addNode(type, label, x, y) {
  nodeCounter += 1;
  const sameTypeCount = nodes.filter(item => item.type === type).length;
  const definition = componentDefinitions[type];
  const node = {
    id: `node-${nodeCounter}`,
    type,
    label: sameTypeCount ? `${label} ${sameTypeCount + 1}` : label,
    capacity: definition.capacity,
    zone: ['loadBalancer', 'app'].includes(type) && sameTypeCount % 2 ? 'b' : definition.zone,
    failed: false,
    x: x ?? 40 + (nodes.length % 4) * 128,
    y: y ?? 42 + Math.floor(nodes.length / 4) * 105,
  };
  nodes.push(node);
  renderNode(node);
  updateEmptyState();
  updateSimulationMetrics();
  return node;
}

function renderNode(node) {
  const element = document.createElement('div');
  element.className = 'arch-node';
  element.dataset.id = node.id;
  element.style.left = `${node.x}px`;
  element.style.top = `${node.y}px`;
  element.classList.toggle('failed', node.failed);
  element.innerHTML = `<span class="node-icon">${icons[node.type]}</span><b>${node.label}</b><small>${number.format(node.capacity)} RPS · ${node.zone === 'global' ? 'Global' : `Zone ${node.zone.toUpperCase()}`}</small><button type="button" aria-label="Видалити ${node.label}">×</button>`;
  element.querySelector('button').addEventListener('click', event => {
    event.stopPropagation();
    nodes = nodes.filter(item => item.id !== node.id);
    connections = connections.filter(edge => edge.from !== node.id && edge.to !== node.id);
    if (selectedNode?.id === node.id) closeInspector();
    element.remove();
    drawConnections();
    updateEmptyState();
    updateSimulationMetrics();
  });
  element.addEventListener('pointerdown', event => startDrag(event, node, element));
  element.addEventListener('click', event => {
    if (connectMode) handleConnectClick(event, node, element);
    else if (event.target.tagName !== 'BUTTON') selectNode(node);
  });
  canvas.append(element);
}

function refreshNode(node) {
  const element = document.querySelector(`[data-id="${node.id}"]`);
  if (!element) return;
  element.classList.toggle('failed', node.failed);
  element.querySelector('b').textContent = node.label;
  element.querySelector('small').textContent = `${number.format(node.capacity)} RPS · ${node.zone === 'global' ? 'Global' : `Zone ${node.zone.toUpperCase()}`}`;
}

function startDrag(event, node, element) {
  if (connectMode || event.target.tagName === 'BUTTON') return;
  const bounds = canvas.getBoundingClientRect();
  const shiftX = event.clientX - element.getBoundingClientRect().left;
  const shiftY = event.clientY - element.getBoundingClientRect().top;
  element.setPointerCapture(event.pointerId);
  const move = e => {
    node.x = Math.max(0, Math.min(bounds.width - element.offsetWidth, e.clientX - bounds.left - shiftX));
    node.y = Math.max(0, Math.min(bounds.height - element.offsetHeight, e.clientY - bounds.top - shiftY));
    element.style.left = `${node.x}px`;
    element.style.top = `${node.y}px`;
    drawConnections();
  };
  element.addEventListener('pointermove', move);
  element.addEventListener('pointerup', () => element.removeEventListener('pointermove', move), { once: true });
}

function handleConnectClick(event, node, element) {
  if (!connectMode || event.target.tagName === 'BUTTON') return;
  if (!connectStart) {
    connectStart = node;
    element.classList.add('selected');
    showToast(`Початок: ${node.label}. Тепер обери отримувача`);
    return;
  }
  document.querySelectorAll('.arch-node').forEach(item => item.classList.remove('selected'));
  if (connectStart.id !== node.id) {
    const existingIndex = connections.findIndex(edge => edge.from === connectStart.id && edge.to === node.id);
    if (existingIndex >= 0) {
      connections.splice(existingIndex, 1);
      showToast('Зв’язок видалено');
    } else {
      connections.push({ from: connectStart.id, to: node.id });
      showToast(`${connectStart.label} → ${node.label}`);
    }
    drawConnections();
    updateSimulationMetrics();
  }
  connectStart = null;
}

function drawConnections() {
  svg.innerHTML = '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs>';
  connections.forEach(edge => {
    const from = nodes.find(node => node.id === edge.from);
    const to = nodes.find(node => node.id === edge.to);
    if (!from || !to) return;
    const fromEl = document.querySelector(`[data-id="${from.id}"]`);
    const toEl = document.querySelector(`[data-id="${to.id}"]`);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', from.x + fromEl.offsetWidth / 2);
    line.setAttribute('y1', from.y + fromEl.offsetHeight / 2);
    line.setAttribute('x2', to.x + toEl.offsetWidth / 2);
    line.setAttribute('y2', to.y + toEl.offsetHeight / 2);
    if (!isAllowedConnection(from, to)) line.classList.add('invalid-edge');
    svg.append(line);
  });
}

function isAllowedConnection(from, to) {
  return Boolean(from && to && allowedEdges[from.type]?.includes(to.type));
}

function updateEmptyState() { emptyState.style.display = nodes.length ? 'none' : 'grid'; }
document.querySelectorAll('[data-component]').forEach(button => button.addEventListener('click', () => addNode(button.dataset.component, button.dataset.label)));
document.querySelector('#selectTool').addEventListener('click', () => setConnectMode(false));
document.querySelector('#connectTool').addEventListener('click', () => setConnectMode(true));
function setConnectMode(value) {
  connectMode = value;
  connectStart = null;
  canvas.classList.toggle('connect-mode', value);
  document.querySelector('#connectTool').classList.toggle('tool-active', value);
  document.querySelector('#selectTool').classList.toggle('tool-active', !value);
  document.querySelectorAll('.arch-node').forEach(item => item.classList.remove('selected'));
}

function selectNode(node) {
  selectedNode = node;
  document.querySelectorAll('.arch-node').forEach(item => item.classList.toggle('selected', item.dataset.id === node.id));
  document.querySelector('.inspector-empty').hidden = true;
  document.querySelector('.inspector-form').hidden = false;
  document.querySelector('#inspectorIcon').textContent = icons[node.type];
  document.querySelector('#inspectorType').textContent = node.type === 'loadBalancer' ? 'Load Balancer' : node.type === 'database' ? 'Database' : node.type === 'replica' ? 'DB Replica' : node.type === 'app' ? 'App Server' : node.label;
  document.querySelector('#inspectorId').textContent = node.id;
  document.querySelector('#nodeLabel').value = node.label;
  document.querySelector('#nodeCapacity').value = node.capacity;
  document.querySelector('#nodeZone').value = node.zone;
  document.querySelector('#inspectorHint').textContent = componentDefinitions[node.type].hint;
  const failureButton = document.querySelector('#failureButton');
  failureButton.textContent = node.failed ? '↻ Відновити вузол' : '⚡ Імітувати відмову';
  failureButton.classList.toggle('restore', node.failed);
}

function closeInspector() {
  selectedNode = null;
  document.querySelector('.inspector-empty').hidden = false;
  document.querySelector('.inspector-form').hidden = true;
  document.querySelectorAll('.arch-node').forEach(item => item.classList.remove('selected'));
}

document.querySelector('#nodeLabel').addEventListener('input', event => {
  if (!selectedNode) return;
  selectedNode.label = event.target.value.trim() || selectedNode.label;
  refreshNode(selectedNode);
});
document.querySelector('#nodeCapacity').addEventListener('input', event => {
  if (!selectedNode) return;
  selectedNode.capacity = Math.max(1, Number(event.target.value) || 1);
  refreshNode(selectedNode);
  updateSimulationMetrics();
});
document.querySelector('#nodeZone').addEventListener('change', event => {
  if (!selectedNode) return;
  selectedNode.zone = event.target.value;
  refreshNode(selectedNode);
  updateSimulationMetrics();
});
document.querySelector('#failureButton').addEventListener('click', () => {
  if (!selectedNode) return;
  selectedNode.failed = !selectedNode.failed;
  refreshNode(selectedNode);
  selectNode(selectedNode);
  drawConnections();
  updateSimulationMetrics();
  showToast(selectedNode.failed ? `${selectedNode.label}: OFFLINE` : `${selectedNode.label}: відновлено`);
});

function clearCanvas() {
  nodes = [];
  connections = [];
  canvas.querySelectorAll('.arch-node').forEach(node => node.remove());
  closeInspector();
  drawConnections();
  updateEmptyState();
  updateSimulationMetrics();
  resetValidation();
}
document.querySelector('#clearButton').addEventListener('click', clearCanvas);
document.querySelector('#exampleButton').addEventListener('click', () => {
  clearCanvas();
  const client = addNode('client', 'Клієнт', 10, 205);
  const lb1 = addNode('loadBalancer', 'LB · Zone A', 135, 120);
  const lb2 = addNode('loadBalancer', 'LB · Zone B', 135, 285);
  const app1 = addNode('app', 'App · Zone A', 270, 120);
  const app2 = addNode('app', 'App · Zone B', 270, 285);
  const db = addNode('database', 'Primary DB', 405, 120);
  const replica = addNode('replica', 'DB Replica', 405, 285);
  const exampleRequiredCapacity = Math.ceil(currentScenario().target * 1.3);
  app1.capacity = Math.ceil(exampleRequiredCapacity / 2);
  app2.capacity = Math.ceil(exampleRequiredCapacity / 2);
  db.capacity = Math.ceil(exampleRequiredCapacity / (currentScenario().requireCache ? currentScenario().cacheFactor : 1));
  [app1, app2, db].forEach(refreshNode);
  connections = [
    { from: client.id, to: lb1.id }, { from: client.id, to: lb2.id },
    { from: lb1.id, to: app1.id }, { from: lb1.id, to: app2.id }, { from: lb2.id, to: app1.id }, { from: lb2.id, to: app2.id },
    { from: app1.id, to: db.id }, { from: app2.id, to: db.id }, { from: db.id, to: replica.id },
  ];
  if (currentScenario().requireCache) {
    const cache = addNode('cache', 'Redis Cache', 405, 385);
    connections.push({ from: app1.id, to: cache.id }, { from: app2.id, to: cache.id });
  }
  if (currentScenario().requireQueue) {
    const queue = addNode('queue', 'Event Queue', 270, 385);
    connections.push({ from: app1.id, to: queue.id }, { from: app2.id, to: queue.id });
  }
  drawConnections();
  updateSimulationMetrics();
});

function resetValidation() {
  const panel = document.querySelector('#validationPanel');
  panel.className = 'validation-panel';
  panel.querySelector('.validation-summary').innerHTML = '<span class="status-icon">?</span><div><b>Схема ще не перевірена</b><p>Збери архітектуру та запусти перевірку.</p></div>';
  document.querySelector('#auditReport').hidden = true;
}

function activeNodes(excludedId = null) { return nodes.filter(node => !node.failed && node.id !== excludedId); }
function countActive(type) { return activeNodes().filter(node => node.type === type).length; }
function hasEdge(fromType, toType) {
  return connections.some(edge => nodes.find(node => node.id === edge.from)?.type === fromType && nodes.find(node => node.id === edge.to)?.type === toType);
}
function canReach(startId, targetTypes, excludedId = null) {
  const activeIds = new Set(activeNodes(excludedId).map(node => node.id));
  if (!activeIds.has(startId)) return false;
  const queue = [startId];
  const visited = new Set(queue);
  while (queue.length) {
    const id = queue.shift();
    const node = nodes.find(item => item.id === id);
    if (id !== startId && targetTypes.includes(node?.type)) return true;
    connections.filter(edge => edge.from === id && activeIds.has(edge.to)).forEach(edge => {
      if (!visited.has(edge.to)) { visited.add(edge.to); queue.push(edge.to); }
    });
  }
  return false;
}
function allClientsReach(targetTypes, excludedId = null) {
  const clients = activeNodes(excludedId).filter(node => node.type === 'client');
  return clients.length > 0 && clients.every(client => canReach(client.id, targetTypes, excludedId));
}
function calculateArchitectureCapacity() {
  if (!allClientsReach(['database'])) return 0;
  const sum = type => activeNodes().filter(node => node.type === type).reduce((total, node) => total + node.capacity, 0);
  const lbCapacity = sum('loadBalancer');
  const appCapacity = sum('app');
  const databaseCapacity = sum('database');
  const cacheConnected = countActive('cache') > 0 && hasEdge('app', 'cache');
  const dataCapacity = databaseCapacity * (cacheConnected ? currentScenario().cacheFactor : 1);
  return Math.max(0, Math.min(lbCapacity, appCapacity, dataCapacity));
}
function resilienceAnalysis() {
  const critical = activeNodes().filter(node => ['loadBalancer', 'app'].includes(node.type));
  if (!critical.length) return { percent: 0, spofs: [] };
  const spofs = critical.filter(node => !allClientsReach(['app'], node.id));
  const dataSafe = countActive('database') > 0 && countActive('replica') > 0 && hasEdge('database', 'replica');
  if (!dataSafe) spofs.push({ label: 'Data tier', type: 'database' });
  const checks = critical.length + 1;
  return { percent: Math.round((checks - spofs.length) / checks * 100), spofs };
}
function analyzeArchitecture() {
  const scenario = currentScenario();
  const errors = [];
  const warnings = [];
  const invalidConnections = connections.filter(edge => !isAllowedConnection(nodes.find(node => node.id === edge.from), nodes.find(node => node.id === edge.to)));
  if (!countActive('client')) errors.push('Додай активного клієнта — джерело запитів.');
  if (!countActive('loadBalancer')) errors.push('Немає активного Load Balancer у вхідному маршруті.');
  if (!countActive('app')) errors.push('Немає активного App Server для обробки запитів.');
  if (!countActive('database')) errors.push('Немає активної основної Database.');
  if (countActive('client') && !allClientsReach(['app'])) errors.push('Немає повного напрямленого шляху Client → Load Balancer → App Server.');
  if (countActive('client') && !allClientsReach(['database'])) errors.push('Запит не доходить від Client до Database. Перевір напрямки стрілок.');
  if (invalidConnections.length) errors.push(`${invalidConnections.length} некоректних зв’язків позначено червоним. Наприклад, Client не має звертатися прямо до Database.`);
  const capacity = calculateArchitectureCapacity();
  const requiredCapacity = Math.ceil(scenario.target * 1.3);
  if (capacity < requiredCapacity) errors.push(`Capacity ${number.format(capacity)} RPS замала: для цілі ${number.format(scenario.target)} RPS потрібно щонайменше ${number.format(requiredCapacity)} RPS із 30% запасом.`);
  const resilience = resilienceAnalysis();
  if (scenario.requireHA) {
    if (countActive('loadBalancer') < 2) errors.push('Load Balancer є єдиною точкою відмови. Додай другий екземпляр.');
    if (countActive('app') < 2) errors.push('Application tier не має резервного активного екземпляра.');
    if (!countActive('replica') || !hasEdge('database', 'replica')) errors.push('Data tier не має підключеної DB Replica для failover.');
    const criticalZones = new Set(activeNodes().filter(node => ['loadBalancer', 'app'].includes(node.type)).map(node => node.zone));
    if (!criticalZones.has('a') || !criticalZones.has('b')) errors.push('Критичні вузли мають бути рознесені між Zone A та Zone B.');
    if (resilience.spofs.length) warnings.push(`Автотест відмов знайшов SPOF: ${resilience.spofs.map(node => node.label).join(', ')}.`);
  }
  if (scenario.requireCache && (!countActive('cache') || !hasEdge('app', 'cache'))) errors.push('Сценарій потребує Cache, підключений від App Server.');
  if (scenario.requireQueue && (!countActive('queue') || !hasEdge('app', 'queue'))) errors.push('Для аналітики потрібна Message Queue для асинхронних подій.');
  if (!scenario.requireCache && !countActive('cache')) warnings.push('Cache не обов’язковий у цьому сценарії, але зменшить read-навантаження на БД.');
  const routePass = allClientsReach(['database']) && !invalidConnections.length;
  const capacityPass = capacity >= requiredCapacity;
  const availabilityPass = !scenario.requireHA || (resilience.percent === 100 && countActive('loadBalancer') >= 2 && countActive('app') >= 2 && countActive('replica') > 0);
  const patternsPass = (!scenario.requireCache || (countActive('cache') && hasEdge('app', 'cache'))) && (!scenario.requireQueue || (countActive('queue') && hasEdge('app', 'queue')));
  const score = (routePass ? 25 : 0) + (capacityPass ? 25 : 0) + (availabilityPass ? 30 : 0) + (patternsPass ? 20 : 0);
  return { scenario, errors, warnings, capacity, requiredCapacity, resilience, score, routePass, capacityPass, availabilityPass, patternsPass };
}

function updateSimulationMetrics() {
  const analysis = analyzeArchitecture();
  const headroom = analysis.capacity ? Math.round((analysis.capacity / analysis.scenario.target - 1) * 100) : null;
  document.querySelector('#targetRps').textContent = `${number.format(analysis.scenario.target)} RPS`;
  document.querySelector('#capacityMetric').textContent = `${number.format(analysis.capacity)} RPS`;
  document.querySelector('#headroomMetric').textContent = headroom === null ? '—' : `${headroom >= 0 ? '+' : ''}${headroom}%`;
  document.querySelector('#resilienceMetric').textContent = `${analysis.resilience.percent}%`;
  document.querySelector('#capacityMetric').className = analysis.capacity >= analysis.requiredCapacity ? 'metric-ok' : 'metric-bad';
  document.querySelector('#headroomMetric').className = headroom !== null && headroom >= 30 ? 'metric-ok' : 'metric-bad';
  document.querySelector('#resilienceMetric').className = analysis.resilience.percent === 100 ? 'metric-ok' : 'metric-bad';
}

function renderAudit(analysis) {
  const report = document.querySelector('#auditReport');
  const items = [
    { title: 'Маршрут запиту · 25', pass: analysis.routePass, text: analysis.routePass ? 'Напрямлений шлях від клієнта до БД коректний.' : 'Побудуй валідний Client → LB → App → Database.' },
    { title: 'Пропускна здатність · 25', pass: analysis.capacityPass, text: `${number.format(analysis.capacity)} із необхідних ${number.format(analysis.requiredCapacity)} RPS.` },
    { title: 'Відмовостійкість · 30', pass: analysis.availabilityPass, text: analysis.availabilityPass ? 'Критичні вузли переживають одиничну відмову.' : `SPOF: ${analysis.resilience.spofs.map(node => node.label).join(', ') || 'перевір дублювання та зони'}.` },
    { title: 'Патерни сценарію · 20', pass: analysis.patternsPass, text: analysis.patternsPass ? 'Необхідні cache/queue патерни використано.' : 'Не всі обов’язкові компоненти сценарію підключені.' },
  ];
  report.hidden = false;
  report.innerHTML = `<div class="score-card"><strong>${analysis.score}</strong><span>балів зі 100</span></div><div class="audit-groups">${items.map(item => `<article class="audit-item ${item.pass ? 'pass' : 'fail'}"><b>${item.pass ? '✓' : '×'} ${item.title}</b><p>${item.text}</p></article>`).join('')}${analysis.warnings.map(warning => `<article class="audit-item warn"><b>△ Порада архітектора</b><p>${warning}</p></article>`).join('')}</div>`;
}

document.querySelector('#validateButton').addEventListener('click', () => {
  const analysis = analyzeArchitecture();
  const panel = document.querySelector('#validationPanel');
  const summary = panel.querySelector('.validation-summary');
  renderAudit(analysis);
  if (analysis.errors.length) {
    panel.className = 'validation-panel invalid';
    const issueWord = analysis.errors.length === 1 ? 'проблему' : analysis.errors.length < 5 ? 'проблеми' : 'проблем';
    summary.innerHTML = `<span class="status-icon">!</span><div><b>Архітектура не пройшла симуляцію · ${analysis.score}/100</b><p>Знайдено ${analysis.errors.length} ${issueWord}.</p><ul class="validation-details">${analysis.errors.map(error => `<li>→ ${error}</li>`).join('')}</ul></div>`;
  } else {
    panel.className = 'validation-panel valid';
    summary.innerHTML = `<span class="status-icon">✓</span><div><b>Симуляцію пройдено · ${analysis.score}/100</b><p>Маршрут валідний, capacity має запас, одинична відмова не зупиняє сервіс.</p></div>`;
  }
});

document.querySelector('#scenarioSelect').addEventListener('change', event => {
  const scenario = scenarios[event.target.value];
  document.querySelector('#scenarioDescription').textContent = scenario.description;
  resetValidation();
  updateSimulationMetrics();
});

const requirementsForm = document.querySelector('#requirementsForm');
const requirementsFields = requirementsForm.querySelectorAll('input, select');
function formatDowntime(totalSeconds) {
  const seconds = Math.round(totalSeconds);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds % 86400 / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const rest = seconds % 60;
  return [days ? `${days} дн` : '', hours ? `${hours} год` : '', minutes ? `${minutes} хв` : '', rest || seconds < 60 ? `${rest} с` : ''].filter(Boolean).join(' ');
}

function updateRequirementsDocument() {
  const duration = Math.max(10, Number(document.querySelector('#auditDuration').value) || 10);
  const concurrency = Math.max(1, Number(document.querySelector('#concurrentAudits').value) || 1);
  const retention = Math.max(1, Number(document.querySelector('#retentionDays').value) || 1);
  const uptime = Number(document.querySelector('#uptimeTarget').value);
  const requirements = [
    `95% accessibility-аудитів мають завершуватися не довше ніж за ${number.format(duration)} секунд.`,
    `Система має підтримувати щонайменше ${number.format(concurrency)} одночасних аудитів без порушення цільового часу перевірки.`,
    `Результати аудиту мають зберігатися ${number.format(retention)} днів, після чого автоматично видалятися.`,
    `Місячний SLO доступності становить ${uptime}%; SLI — частка успішних health checks за календарний місяць.`,
  ];
  if (document.querySelector('#encryptResults').checked) requirements.push('Результати та службові дані мають бути зашифровані під час передавання та зберігання.');
  if (document.querySelector('#wcagUi').checked) requirements.push('Користувацький інтерфейс сервісу має відповідати WCAG 2.2 Level AA.');
  if (document.querySelector('#consistentRules').checked) requirements.push('Кожен результат має містити версію набору правил, щоб аудит можна було відтворити.');
  document.querySelector('#generatedRequirements').innerHTML = requirements.map(requirement => `<li>${requirement}</li>`).join('');
  const errorRate = 1 - uptime / 100;
  document.querySelector('#monthlyDowntime').textContent = `${formatDowntime(30.44 * 86400 * errorRate)} / місяць`;
  document.querySelector('#yearlyDowntime').textContent = `${formatDowntime(365 * 86400 * errorRate)} / рік`;
  document.querySelector('#requirementsScore').textContent = '100% конкретності';
}
requirementsFields.forEach(field => field.addEventListener('input', updateRequirementsDocument));
document.querySelector('#copyRequirements').addEventListener('click', async event => {
  const text = Array.from(document.querySelectorAll('#generatedRequirements li')).map((item, index) => `${index + 1}. ${item.textContent}`).join('\n');
  await navigator.clipboard.writeText(text);
  event.currentTarget.textContent = 'Специфікацію скопійовано ✓';
  setTimeout(() => event.currentTarget.textContent = 'Копіювати специфікацію', 1700);
});

const estimatorForm = document.querySelector('#estimatorForm');
function formatDataSize(gigabytes) {
  return gigabytes >= 1000 ? `${number.format(gigabytes / 1000)} TB` : `${number.format(gigabytes)} GB`;
}
function updateEstimator() {
  const users = Math.max(1, Number(document.querySelector('#estimateUsers').value) || 1);
  const auditsPerUser = Math.max(.1, Number(document.querySelector('#auditsPerUser').value) || .1);
  const readRatio = Number(document.querySelector('#readRatio').value) / 100;
  const requestKb = Math.max(1, Number(document.querySelector('#averageRequestKb').value) || 1);
  const reportMb = Math.max(.1, Number(document.querySelector('#reportSizeMb').value) || .1);
  const duration = Math.max(1, Number(document.querySelector('#auditTimeSeconds').value) || 1);
  const peakFactor = Number(document.querySelector('#estimatePeak').value);
  const dailyAudits = users * auditsPerUser;
  const averageRps = dailyAudits / 86400;
  const peakRps = averageRps * peakFactor;
  const workers = Math.ceil(peakRps * duration * 1.3);
  const yearlyStorageGb = dailyAudits * 365 * reportMb / 1000;
  const dailyNetworkGb = dailyAudits * (requestKb / 1000 + reportMb) / 1000;
  document.querySelector('#readRatioOutput').value = `${Math.round(readRatio * 100)}%`;
  document.querySelector('#estimatePeakOutput').value = `${peakFactor}×`;
  document.querySelector('#checksPerDay').textContent = number.format(dailyAudits);
  document.querySelector('#averageAuditRps').textContent = `${number.format(averageRps)} audit RPS у середньому`;
  document.querySelector('#peakAuditRps').textContent = number.format(peakRps);
  document.querySelector('#workersNeeded').textContent = number.format(workers);
  document.querySelector('#yearlyStorage').textContent = formatDataSize(yearlyStorageGb);
  document.querySelector('#dailyNetwork').textContent = formatDataSize(dailyNetworkGb);
  document.querySelector('#readWriteRps').textContent = `${number.format(peakRps * readRatio)} / ${number.format(peakRps * (1 - readRatio))}`;
}
estimatorForm.querySelectorAll('input').forEach(input => input.addEventListener('input', updateEstimator));

const expectedPipeline = ['Next.js Client', 'API Gateway', 'Audit Service', 'Queue', 'Audit Workers', 'PostgreSQL / Object Storage'];
let designPipeline = [];
const pipelineIcons = { 'Next.js Client': 'UI', 'API Gateway': 'API', 'Audit Service': 'SVC', Queue: 'Q', 'Audit Workers': 'W', 'PostgreSQL / Object Storage': 'DB' };
function renderDesignPipeline() {
  const container = document.querySelector('#designPipeline');
  container.innerHTML = designPipeline.length ? designPipeline.map((component, index) => `${index ? '<i class="pipeline-arrow">→</i>' : ''}<button class="pipeline-node" data-pipeline-index="${index}" type="button" title="Видалити компонент"><span>${pipelineIcons[component]}</span><b>${component}</b></button>`).join('') : '<p>Додай перший компонент</p>';
  container.querySelectorAll('.pipeline-node').forEach(button => button.addEventListener('click', () => {
    designPipeline.splice(Number(button.dataset.pipelineIndex), 1);
    renderDesignPipeline();
    resetPipelineValidation();
  }));
  document.querySelectorAll('[data-design-component]').forEach(button => button.disabled = designPipeline.includes(button.dataset.designComponent));
}
function resetPipelineValidation() {
  const panel = document.querySelector('#pipelineValidation');
  panel.className = 'pipeline-validation';
  panel.querySelector('div').innerHTML = '<span>?</span><p><b>Схема ще не перевірена</b><small>Побудуй request flow із шести компонентів.</small></p>';
}
document.querySelectorAll('[data-design-component]').forEach(button => button.addEventListener('click', () => {
  designPipeline.push(button.dataset.designComponent);
  renderDesignPipeline();
  resetPipelineValidation();
}));
document.querySelector('#designClear').addEventListener('click', () => { designPipeline = []; renderDesignPipeline(); resetPipelineValidation(); });
document.querySelector('#designExample').addEventListener('click', () => { designPipeline = [...expectedPipeline]; renderDesignPipeline(); resetPipelineValidation(); });
document.querySelector('#validatePipeline').addEventListener('click', () => {
  const panel = document.querySelector('#pipelineValidation');
  const mismatch = expectedPipeline.findIndex((component, index) => designPipeline[index] !== component);
  if (mismatch === -1 && designPipeline.length === expectedPipeline.length) {
    panel.className = 'pipeline-validation valid';
    panel.querySelector('div').innerHTML = '<span>✓</span><p><b>Request flow побудовано правильно</b><small>Queue відокремлює прийом запиту від важкої роботи Audit Workers.</small></p>';
    return;
  }
  const expected = expectedPipeline[mismatch] || 'кінець схеми';
  const actual = designPipeline[mismatch] || 'компонент відсутній';
  panel.className = 'pipeline-validation invalid';
  panel.querySelector('div').innerHTML = `<span>!</span><p><b>Помилка на кроці ${mismatch + 1}</b><small>Очікується «${expected}», зараз — «${actual}».</small></p>`;
});

const requiredMonolithModules = ['audits', 'users', 'reports', 'notifications', 'billing'];
let monolithModules = [];
function renderMonolithTree() {
  const tree = document.querySelector('#monolithTree');
  tree.innerHTML = monolithModules.length ? `<div class="tree-root"><b>src/</b>${monolithModules.map(module => `<article class="tree-module"><button type="button" data-remove-module="${module}" title="Видалити модуль"><span>▾ 📁 ${module}/</span><i>×</i></button><div><code>├── ${module}.controller.ts</code><code>├── ${module}.service.ts</code><code>├── ${module}.repository.ts</code><code>├── ${module}.types.ts</code><code>└── index.ts</code></div></article>`).join('')}</div>` : '<p>src/ поки порожня</p>';
  document.querySelector('#moduleCount').textContent = `${monolithModules.length} / ${requiredMonolithModules.length} modules`;
  document.querySelectorAll('[data-monolith-module]').forEach(button => button.disabled = monolithModules.includes(button.dataset.monolithModule));
  tree.querySelectorAll('[data-remove-module]').forEach(button => button.addEventListener('click', () => {
    monolithModules = monolithModules.filter(module => module !== button.dataset.removeModule);
    renderMonolithTree();
    resetMonolithValidation();
  }));
}
function resetMonolithValidation() {
  const panel = document.querySelector('#monolithValidation');
  panel.className = 'monolith-validation';
  panel.querySelector('div').innerHTML = '<span>?</span><p><b>Моноліт ще не перевірено</b><small>Додай п’ять модулів і дай відповіді про залежності.</small></p>';
}
document.querySelectorAll('[data-monolith-module]').forEach(button => button.addEventListener('click', () => {
  monolithModules.push(button.dataset.monolithModule);
  renderMonolithTree();
  resetMonolithValidation();
}));
document.querySelector('#monolithExample').addEventListener('click', () => { monolithModules = [...requiredMonolithModules]; renderMonolithTree(); resetMonolithValidation(); });
document.querySelector('#monolithClear').addEventListener('click', () => { monolithModules = []; renderMonolithTree(); resetMonolithValidation(); });
document.querySelectorAll('[data-dependency-answer]').forEach(select => select.addEventListener('change', resetMonolithValidation));
document.querySelector('#validateMonolith').addEventListener('click', () => {
  const panel = document.querySelector('#monolithValidation');
  const missing = requiredMonolithModules.filter(module => !monolithModules.includes(module));
  const selects = Array.from(document.querySelectorAll('[data-dependency-answer]'));
  const unanswered = selects.filter(select => !select.value);
  const wrong = selects.filter(select => select.value && select.value !== select.dataset.dependencyAnswer);
  if (!missing.length && !unanswered.length && !wrong.length) {
    panel.className = 'monolith-validation valid';
    panel.querySelector('div').innerHTML = '<span>✓</span><p><b>Модульний моноліт структуровано правильно</b><small>Шари спрямовані всередину модуля, а repository інших доменів не імпортуються напряму.</small></p>';
    return;
  }
  let message = missing.length ? `Не вистачає модулів: ${missing.join(', ')}.` : unanswered.length ? `Дай відповідь ще для ${unanswered.length} залежностей.` : 'Repository одного домену не має напряму залежати від repository або таблиць іншого домену.';
  panel.className = 'monolith-validation invalid';
  panel.querySelector('div').innerHTML = `<span>!</span><p><b>Структура потребує виправлення</b><small>${message}</small></p>`;
});

const requiredMicroservices = ['User Service', 'Audit Service', 'Worker Service', 'Report Service', 'Notification Service'];
let microservices = [];
function resetMicroValidation() {
  const panel = document.querySelector('#microValidation');
  panel.className = 'micro-validation';
  panel.querySelector('div').innerHTML = '<span>?</span><p><b>Схема ще не перевірена</b><small>Додай сервіси й прийми шість архітектурних рішень.</small></p>';
}
function renderMicroservices() {
  const canvas = document.querySelector('#microCanvas');
  const codes = { 'User Service': 'USR', 'Audit Service': 'AUD', 'Worker Service': 'WRK', 'Report Service': 'RPT', 'Notification Service': 'NTF' };
  canvas.innerHTML = microservices.length ? `<div class="service-map">${microservices.map((service, index) => `<article class="micro-node"><button type="button" data-remove-service="${service}" title="Видалити ${service}"><span>${codes[service]}</span><b>${service}</b><small>${service === 'Worker Service' ? 'stateless compute' : 'owns its data'}</small><i>×</i></button>${index < microservices.length - 1 ? '<em>→</em>' : ''}</article>`).join('')}</div>` : '<p>Додай перший bounded context</p>';
  document.querySelector('#microServiceCount').textContent = `${microservices.length} / ${requiredMicroservices.length} services`;
  document.querySelectorAll('[data-micro-service]').forEach(button => button.disabled = microservices.includes(button.dataset.microService));
  canvas.querySelectorAll('[data-remove-service]').forEach(button => button.addEventListener('click', () => {
    microservices = microservices.filter(service => service !== button.dataset.removeService);
    renderMicroservices();
    resetMicroValidation();
  }));
}
document.querySelectorAll('[data-micro-service]').forEach(button => button.addEventListener('click', () => {
  microservices.push(button.dataset.microService);
  renderMicroservices();
  resetMicroValidation();
}));
document.querySelector('#microExample').addEventListener('click', () => { microservices = [...requiredMicroservices]; renderMicroservices(); resetMicroValidation(); });
document.querySelector('#microClear').addEventListener('click', () => { microservices = []; renderMicroservices(); resetMicroValidation(); });
document.querySelectorAll('#microservicesLab select').forEach(select => select.addEventListener('change', resetMicroValidation));
document.querySelector('#validateMicroservices').addEventListener('click', () => {
  const panel = document.querySelector('#microValidation');
  const missing = requiredMicroservices.filter(service => !microservices.includes(service));
  const database = document.querySelector('#microDatabase').value;
  const discovery = document.querySelector('#microDiscovery').value;
  const rules = Array.from(document.querySelectorAll('[data-micro-rule]'));
  const unansweredRules = rules.filter(select => !select.value);
  const wrongRules = rules.filter(select => select.value && select.value !== select.dataset.microRule);
  let message = '';
  if (missing.length) message = `Не вистачає: ${missing.join(', ')}.`;
  else if (!database || !discovery || unansweredRules.length) message = 'Заповни всі рішення про дані, комунікацію та discovery.';
  else if (database === 'shared') message = 'Спільна база створює distributed monolith: сервіси не володіють даними незалежно.';
  else if (wrongRules.length) message = 'Довгі етапи Audit → Worker → Report → Notification краще зв’язати подіями; User → Audit потребує синхронної відповіді.';
  else if (discovery === 'hardcoded') message = 'Hardcoded IP ламається під час scaling і restart. Використай registry або платформний DNS.';
  if (message) {
    panel.className = 'micro-validation invalid';
    panel.querySelector('div').innerHTML = `<span>!</span><p><b>Архітектура має сильний coupling</b><small>${message}</small></p>`;
    return;
  }
  panel.className = 'micro-validation valid';
  panel.querySelector('div').innerHTML = '<span>✓</span><p><b>Сервіси можуть розвиватися незалежно</b><small>Bounded contexts мають власні дані, async pipeline поглинає піки, а discovery знаходить здорові instances.</small></p>';
});

window.addEventListener('resize', drawConnections);
calculateLoad();
updateSimulationMetrics();
updateRequirementsDocument();
updateEstimator();
renderDesignPipeline();
renderMonolithTree();
renderMicroservices();

