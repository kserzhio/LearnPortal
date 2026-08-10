const courseModules = [
  { number: 1, title: 'Основи високих навантажень', lessons: [
    { number: 1, title: 'Що таке високонавантажена система' },
    { number: 2, title: 'Функціональні та нефункціональні вимоги' },
    { number: 3, title: 'Оцінка навантаження' },
  ] },
  { number: 2, title: 'Архітектурний дизайн', lessons: [
    { number: 4, title: 'Як проєктувати систему' },
    { number: 5, title: 'Монолітна архітектура' },
    { number: 6, title: 'Мікросервісна архітектура' },
    { number: 7, title: 'Архітектурні стилі' },
  ] },
  { number: 3, title: 'API та взаємодія сервісів', lessons: [
    { number: 8, title: 'Проєктування API' },
    { number: 9, title: 'Синхронна та асинхронна обробка' },
  ] },
  { number: 4, title: 'Робота з даними', lessons: [
    { number: 10, title: 'Реляційні бази даних' },
    { number: 11, title: 'NoSQL та вибір бази' },
    { number: 12, title: 'Реплікація, партиціювання та шардинг' },
    { number: 13, title: 'Консистентність даних' },
  ] },
  { number: 5, title: 'Масштабування та продуктивність', lessons: [
    { number: 14, title: 'Вертикальне масштабування' },
    { number: 15, title: 'Горизонтальне масштабування' },
    { number: 16, title: 'Кешування' },
    { number: 17, title: 'CDN та робота зі статичними файлами' },
  ] },
  { number: 6, title: 'Надійність та спостережуваність', lessons: [
    { number: 18, title: 'Моніторинг, логування та алертинг' },
    { number: 19, title: 'Підсумковий System Design' },
  ] },
];

const courseNavigation = document.querySelector('#courseNavigation');
courseModules.forEach(module => {
  const section = document.createElement('section');
  section.className = 'nav-module';
  section.innerHTML = `<div class="nav-heading"><span>Модуль ${module.number}</span><small>${module.lessons[0].number}–${module.lessons.at(-1).number}</small></div><p class="module-name">${module.title}</p><ol class="lesson-list"></ol>`;
  const list = section.querySelector('.lesson-list');
  module.lessons.forEach(lesson => {
    const item = document.createElement('li');
    item.innerHTML = `<button class="${lesson.number === 1 ? 'active' : ''}" data-lesson="${lesson.number}" type="button" title="${lesson.title}"><span>${String(lesson.number).padStart(2, '0')}</span><b>${lesson.title}</b></button>`;
    item.querySelector('button').addEventListener('click', () => showLesson(lesson.number));
    list.append(item);
  });
  courseNavigation.append(section);
});

function showLesson(number, shouldScroll = true) {
  document.querySelectorAll('.lesson-view').forEach((view, index) => view.hidden = index + 1 !== number);
  const module = courseModules.find(item => item.lessons.some(lesson => lesson.number === number));
  document.querySelector('#breadcrumbModule').textContent = `Модуль ${module.number}`;
  document.querySelector('#breadcrumbLesson').textContent = `Заняття ${number}`;
  document.querySelector('footer > span').textContent = `Заняття ${String(number).padStart(2, '0')} / 19`;
  document.querySelectorAll('[data-lesson]').forEach(button => button.classList.toggle('active', Number(button.dataset.lesson) === number));
  history.replaceState(null, '', `#lesson-${number}`);
  if (shouldScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}

const menuButton = document.querySelector('#menuButton');
const sidebar = document.querySelector('#sidebar');
menuButton.addEventListener('click', () => sidebar.classList.toggle('open'));
document.querySelectorAll('.sidebar a').forEach(link => link.addEventListener('click', () => sidebar.classList.remove('open')));

const themeButton = document.querySelector('#themeButton');
const savedTheme = localStorage.getItem('systema-theme');
if (savedTheme === 'dark') document.body.classList.add('dark');
themeButton.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('systema-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

document.querySelectorAll('[data-copy]').forEach(button => {
  button.addEventListener('click', async () => {
    const text = document.querySelector(`#${button.dataset.copy}`).innerText;
    await navigator.clipboard.writeText(text);
    button.textContent = 'Скопійовано ✓';
    setTimeout(() => button.textContent = 'Копіювати', 1500);
  });
});

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
    return { valid: false, code: 'missing-final-component', message: `Додай ${component.label}: без цього component один із required user journeys не має повного path.`, affectedIds: [missingComponent] };
  }
  const missingRule = state.rules.find(rule => !rule.value);
  if (missingRule) return { valid: false, code: 'missing-final-policy', message: 'Заповни всі scale, resilience та disaster recovery policies.', affectedIds: [missingRule.id] };
  const invalidRule = state.rules.find(rule => rule.value !== rule.id);
  if (invalidRule) {
    const error = finalDesignConfig.rules[invalidRule.id];
    return { valid: false, code: error.code, message: error.message, affectedIds: [invalidRule.id] };
  }
  return { valid: true, code: 'final-system-design-valid', message: 'Design підтримує 10 000 audits/hour через durable queue та independently scaled workers, live status через shared Pub/Sub, 99.9% через Multi-AZ failover і regional recovery з RPO≤15m / RTO≤60m.', affectedIds: [] };
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
  panel.className = `final-design-validation ${result.valid ? 'valid' : 'invalid'}`;
  panel.dataset.validationCode = result.code;
  panel.querySelector('span').textContent = result.valid ? '✓' : '!';
  document.querySelector('#finalDesignValidationTitle').textContent = result.valid ? 'Production design пройшов review' : 'У фінальному дизайні є reliability gap';
  document.querySelector('#finalDesignValidationMessage').textContent = result.message;
  document.querySelectorAll('.final-design-problem').forEach(element => element.classList.remove('final-design-problem'));
  result.affectedIds.forEach(id => {
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
    const deleteButton = document.createElement('button');

    title.textContent = architecture.title;
    metadata.textContent = `${new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(architecture.updatedAt))} · ${architecture.synchronized ? 'Supabase' : 'цей пристрій'}`;
    loadButton.type = 'button';
    loadButton.dataset.architectureAction = 'load';
    loadButton.dataset.architectureId = architecture.id;
    loadButton.textContent = 'Відкрити';
    deleteButton.type = 'button';
    deleteButton.dataset.architectureAction = 'delete';
    deleteButton.dataset.architectureId = architecture.id;
    deleteButton.textContent = 'Видалити';
    copy.append(title, metadata);
    actions.append(loadButton, deleteButton);
    item.append(copy, actions);
    architectureList.append(item);
  });
}

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

const lessonProgress = window.SystemaProgress.createProgressService({
  courseId: 'high-load-architecture',
  lessonCount: 19,
});

function completionButton(number) {
  return document.querySelector(number === 1 ? '#completeButton' : `#completeLesson${number}`);
}

function markLessonComplete(number) {
  const button = completionButton(number);
  button.classList.add('done');
  const icon = document.createElement('span');
  icon.textContent = '✓';
  button.replaceChildren(icon, ' Заняття завершено');
}

function renderLessonProgress() {
  const completedLessons = new Set(lessonProgress.completedLessonNumbers());
  completedLessons.forEach(markLessonComplete);
  updateCourseProgress();
}

function setupLessonCompletion(number) {
  completionButton(number).addEventListener('click', async () => {
    const completion = lessonProgress.complete(number);
    renderLessonProgress();
    const result = await completion;
    renderLessonProgress();
    showToast(result.synchronized
      ? `Заняття ${number} завершено та синхронізовано!`
      : `Заняття ${number} збережено на цьому пристрої.`);
  });
}

Array.from({ length: 19 }, (_, index) => index + 1).forEach(setupLessonCompletion);
renderLessonProgress();
lessonProgress.initialize().then(renderLessonProgress);

function updateCourseProgress() {
  const completed = lessonProgress.completedLessonNumbers().length;
  const percent = Math.round(completed / 19 * 100);
  document.querySelector('.progress-copy b').textContent = `${percent}%`;
  document.querySelector('.progress-track i').style.width = `${percent}%`;
  document.querySelector('.sidebar-footer p').textContent = `${completed} з 19 занять завершено`;
}

const toast = document.querySelector('#toast');
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

window.addEventListener('resize', drawConnections);
calculateLoad();
updateSimulationMetrics();
updateRequirementsDocument();
updateEstimator();
renderDesignPipeline();
renderMonolithTree();
renderMicroservices();
renderArchitectureScores();
renderAuditStatusPath();
renderAsyncPipeline();
renderRelationalSchema();
updateQueryPlanPreview();
renderStorageTopology();
renderDistributionCluster();
renderOutboxPipeline();
renderScalingDecision();
renderHorizontalTopology();
renderCacheMetrics();
renderEdgeTopology();
renderObservabilityDashboard();
renderFinalArchitecture();
updateCourseProgress();
const initialLesson = Number(location.hash.match(/^#lesson-(1[0-9]|[1-9])$/)?.[1] || 1);
showLesson(initialLesson, false);
