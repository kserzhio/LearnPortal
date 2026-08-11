import { showToast } from '../ui-feedback.js';

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
}

export function initializeLessonProgress({ courseId, lessonCount }) {
  const progressService = window.SystemaProgress.createProgressService({ courseId, lessonCount });

  Array.from({ length: lessonCount }, (_, index) => index + 1).forEach(lessonNumber => {
    completionButton(lessonNumber)?.addEventListener('click', async () => {
      const completion = progressService.complete(lessonNumber);
      renderCourseProgress(progressService, lessonCount);
      const result = await completion;
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
