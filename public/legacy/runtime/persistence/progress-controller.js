import { showToast } from '../ui-feedback.js';
import { trackLegacyEvent } from '../analytics.js?v=20260812-1';

function completionButton(lessonNumber) {
  return document.querySelector(lessonNumber === 1 ? '#completeButton' : `#completeLesson${lessonNumber}`);
}

function markLessonComplete(lessonNumber) {
  const button = completionButton(lessonNumber);
  if (!button || button.classList.contains('done')) return;
  const icon = document.createElement('span');
  icon.textContent = '✓';
  button.classList.add('done');
  button.replaceChildren(icon, ' Заняття завершено');
}

function renderCourseProgress(progressService, lessonCount) {
  const completedLessons = progressService.completedLessonNumbers();
  completedLessons.forEach(markLessonComplete);
  const percent = Math.round(completedLessons.length / lessonCount * 100);
  document.querySelector('.progress-copy b').textContent = `${percent}%`;
  document.querySelector('.progress-track i').style.width = `${percent}%`;
  document.querySelector('.sidebar-footer p').textContent = `${completedLessons.length} з ${lessonCount} занять завершено`;
  renderCourseCompletion(completedLessons.length, lessonCount);
}

function renderCourseCompletion(completedCount, lessonCount) {
  if (completedCount !== lessonCount || document.querySelector('#courseCompletionCallout')) return;
  const finalButton = completionButton(lessonCount);
  if (!finalButton) return;

  const callout = document.createElement('aside');
  callout.id = 'courseCompletionCallout';
  callout.className = 'course-completion-callout';
  callout.setAttribute('aria-labelledby', 'courseCompletionHeading');
  callout.setAttribute('role', 'status');
  const eyebrow = document.createElement('span');
  eyebrow.textContent = `${completedCount}/${lessonCount} · КУРС ЗАВЕРШЕНО`;
  const heading = document.createElement('h2');
  heading.id = 'courseCompletionHeading';
  heading.textContent = 'Твій підсумок і Certificate of Completion готові';
  const copy = document.createElement('p');
  copy.textContent = 'Переглянь результати навчання, Knowledge Checks і підтвердження завершення курсу.';
  const link = document.createElement('a');
  link.href = '/courses/high-load-architecture/completion';
  link.textContent = 'Відкрити підсумок курсу →';
  callout.append(eyebrow, heading, copy, link);
  finalButton.after(callout);
}

export function initializeLessonProgress({ courseId, lessonCount }) {
  const progressService = window.SystemaProgress.createProgressService({ courseId, lessonCount });

  Array.from({ length: lessonCount }, (_, index) => index + 1).forEach(lessonNumber => {
    completionButton(lessonNumber)?.addEventListener('click', async () => {
      if (completionButton(lessonNumber)?.classList.contains('done')) return;
      const completion = progressService.complete(lessonNumber);
      renderCourseProgress(progressService, lessonCount);
      const result = await completion;
      trackLegacyEvent('lesson_completed', { course_id: courseId, content_id: `high-load-${String(lessonNumber).padStart(2, '0')}` });
      if (progressService.completedLessonNumbers().length === lessonCount) {
        trackLegacyEvent('course_completed', { course_id: courseId, lesson_count: lessonCount });
      }
      renderCourseProgress(progressService, lessonCount);
      showToast(result.synchronized
        ? `Заняття ${lessonNumber} завершено та синхронізовано!`
        : `Заняття ${lessonNumber} збережено на цьому пристрої.`);
    });
  });

  renderCourseProgress(progressService, lessonCount);
  progressService.initialize().then(() => renderCourseProgress(progressService, lessonCount));
  return progressService;
}
