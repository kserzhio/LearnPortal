(function exposeArchitectureFormat(root) {
  const FORMAT = 'systema.architecture';
  const VERSION = 1;
  const COURSE_ID = 'high-load-architecture';
  const LESSON_ID = 'high-load-19';
  const SIMULATOR_ID = 'final-system-design';
  const ARCHITECTURE_SCHEMA_VERSION = 1;
  const safeValue = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const componentIds = new Set([
    'cdn', 'frontend', 'load-balancer', 'api-cluster', 'redis', 'postgres', 'read-replicas',
    'job-queue', 'worker-cluster', 'puppeteer', 'axe-core', 'object-storage', 'notification', 'status-stream',
  ]);
  const ruleIds = new Set([
    'api-independent', 'workers-independent', 'retry-dlq', 'realtime-pubsub', 'async-reports',
    'multi-az-failover', 'resilience-guards', 'degraded-mode', 'pitr-rpo-rto', 'warm-standby',
  ]);
  const scenarioIds = new Set(['db-primary', 'api-instance', 'redis-outage', 'region-outage']);

  function normalizeState(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    if (!Array.isArray(value.components) || !Array.isArray(value.rules) || typeof value.scenario !== 'string') return null;
    if (value.components.length > componentIds.size || value.rules.length > ruleIds.size || !scenarioIds.has(value.scenario)) return null;

    const components = value.components.filter(item => typeof item === 'string' && componentIds.has(item));
    if (components.length !== value.components.length || new Set(components).size !== components.length) return null;

    const rules = value.rules.filter(item => item && typeof item === 'object'
      && typeof item.id === 'string' && ruleIds.has(item.id)
      && typeof item.value === 'string' && (item.value === '' || safeValue.test(item.value)));
    if (rules.length !== value.rules.length || new Set(rules.map(rule => rule.id)).size !== rules.length) return null;

    return { components, rules: rules.map(rule => ({ id: rule.id, value: rule.value })), scenario: value.scenario };
  }

  function createDocument(title, state) {
    const normalizedTitle = typeof title === 'string' ? title.trim() : '';
    const normalizedState = normalizeState(state);
    if (!normalizedTitle || normalizedTitle.length > 120 || !normalizedState) throw new Error('invalid-architecture-export');
    return {
      format: FORMAT,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      architecture: {
        title: normalizedTitle,
        courseId: COURSE_ID,
        lessonId: LESSON_ID,
        simulatorId: SIMULATOR_ID,
        schemaVersion: ARCHITECTURE_SCHEMA_VERSION,
        state: normalizedState,
      },
    };
  }

  function parse(text) {
    let document;
    try {
      document = typeof text === 'string' ? JSON.parse(text) : text;
    } catch {
      return { valid: false, code: 'invalid-json', message: 'Файл не є коректним JSON.' };
    }

    if (!document || document.format !== FORMAT || document.version !== VERSION || !document.architecture) {
      return { valid: false, code: 'unsupported-format', message: 'Формат або версія файлу не підтримується.' };
    }
    const architecture = document.architecture;
    if (architecture.courseId !== COURSE_ID || architecture.lessonId !== LESSON_ID || architecture.simulatorId !== SIMULATOR_ID || architecture.schemaVersion !== ARCHITECTURE_SCHEMA_VERSION) {
      return { valid: false, code: 'architecture-mismatch', message: 'Файл створено для іншого курсу, заняття або simulator-а.' };
    }
    const title = typeof architecture.title === 'string' ? architecture.title.trim() : '';
    const state = normalizeState(architecture.state);
    if (!title || title.length > 120 || !state) {
      return { valid: false, code: 'invalid-architecture-state', message: 'Architecture state не пройшов перевірку.' };
    }
    return { valid: true, architecture: { title, state, schemaVersion: architecture.schemaVersion } };
  }

  root.SystemaArchitectureFormat = { FORMAT, VERSION, createDocument, parse };
})(globalThis);
