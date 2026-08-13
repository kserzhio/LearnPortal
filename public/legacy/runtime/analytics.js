const allowedEvents = new Set(['course_started', 'lesson_viewed', 'lesson_started', 'lesson_completed', 'knowledge_check_submitted', 'hint_opened', 'question_created', 'lesson_feedback_submitted', 'simulator_run', 'cta_clicked']);

export function trackLegacyEvent(name, properties) {
  if (!allowedEvents.has(name) || !properties || typeof properties !== 'object') return;
  window.dispatchEvent(new CustomEvent('systema:analytics:tracked', { detail: { name, properties } }));
  void fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, properties }),
    keepalive: true,
  }).catch(() => undefined);
}
