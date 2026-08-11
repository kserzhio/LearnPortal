import {
  configureCourseShell,
  initializeCourseAccess,
  initializeShellControls,
  showLesson,
} from './runtime/course-shell.js';
import { initializeLessonProgress } from './runtime/persistence/progress-controller.js';
import './runtime/simulators/foundations.js';
import './runtime/simulators/api-and-data.js';
import './runtime/simulators/scaling-and-delivery.js';
import './runtime/simulators/reliability.js';

const LESSON_COUNT = 19;

initializeShellControls();

const lessonProgress = initializeLessonProgress({
  courseId: 'high-load-architecture',
  lessonCount: LESSON_COUNT,
});

configureCourseShell({ lessonProgress });

const initialLesson = Number(location.hash.match(/^#lesson-(1[0-9]|[1-9])$/)?.[1] || 1);
showLesson(1, false, false);
initializeCourseAccess(initialLesson);
