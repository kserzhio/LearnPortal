const previewModules = [
  {
    id: 'high-load-foundations',
    position: 1,
    title: 'Основи високих навантажень',
    lessons: [{
      id: 'high-load-01',
      position: 1,
      title: 'Що таке високонавантажена система',
      legacyAnchor: '#lesson-1',
    }],
  },
];

const courseNavigation = document.querySelector('#courseNavigation');
let courseModules = previewModules;
let accessibleLessonCount = 1;
let totalLessonCount = 19;
let progressService;

function lessonByPosition(position) {
  return courseModules.flatMap(courseModule => courseModule.lessons)
    .find(lesson => lesson.position === position);
}

function moduleByLesson(position) {
  return courseModules.find(courseModule => courseModule.lessons.some(lesson => lesson.position === position));
}

function renderCourseNavigation() {
  courseNavigation.replaceChildren();
  courseModules.forEach(courseModule => {
    const section = document.createElement('section');
    const heading = document.createElement('div');
    const moduleNumber = document.createElement('span');
    const range = document.createElement('small');
    const title = document.createElement('p');
    const list = document.createElement('ol');
    const firstLesson = courseModule.lessons[0].position;
    const lastLesson = courseModule.lessons.at(-1).position;

    section.className = 'nav-module';
    heading.className = 'nav-heading';
    moduleNumber.textContent = `Модуль ${courseModule.position}`;
    range.textContent = `${firstLesson}–${lastLesson}`;
    title.className = 'module-name';
    title.textContent = courseModule.title;
    list.className = 'lesson-list';
    heading.append(moduleNumber, range);

    courseModule.lessons.forEach(lesson => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      const lessonNumber = document.createElement('span');
      const lessonTitle = document.createElement('b');
      button.type = 'button';
      button.dataset.lesson = String(lesson.position);
      button.title = lesson.title;
      button.classList.toggle('active', lesson.position === 1);
      lessonNumber.textContent = String(lesson.position).padStart(2, '0');
      lessonTitle.textContent = lesson.title;
      button.append(lessonNumber, lessonTitle);
      button.addEventListener('click', () => showLesson(lesson.position));
      item.append(button);
      list.append(item);
    });

    section.append(heading, title, list);
    courseNavigation.append(section);
  });
}

export function configureCourseShell({ lessonProgress }) {
  progressService = lessonProgress;
}

export function showLesson(position, shouldScroll = true, shouldTrack = true) {
  const accessiblePosition = Math.min(Math.max(Number(position) || 1, 1), accessibleLessonCount);
  const lesson = lessonByPosition(accessiblePosition) || lessonByPosition(1);
  const courseModule = moduleByLesson(lesson.position);
  document.querySelectorAll('.lesson-view').forEach((view, index) => {
    view.hidden = index + 1 !== lesson.position;
  });
  document.querySelector('#breadcrumbModule').textContent = `Модуль ${courseModule.position}`;
  document.querySelector('#breadcrumbLesson').textContent = `Заняття ${lesson.position}`;
  document.querySelector('footer > span').textContent = `Заняття ${String(lesson.position).padStart(2, '0')} / ${totalLessonCount}`;
  document.querySelectorAll('[data-lesson]').forEach(button => {
    button.classList.toggle('active', Number(button.dataset.lesson) === lesson.position);
  });
  history.replaceState(null, '', lesson.legacyAnchor);
  if (shouldTrack && progressService) void progressService.visit(lesson.position);
  if (shouldScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderCourseAccessNotice(requestedLesson) {
  document.querySelector('#courseAccessNotice')?.remove();
  const notice = document.createElement('aside');
  const title = document.createElement('h2');
  const copy = document.createElement('p');
  const signInLink = document.createElement('a');
  notice.id = 'courseAccessNotice';
  notice.className = 'course-access-notice';
  title.textContent = `Гостьовий доступ: заняття 1 із ${totalLessonCount}`;
  copy.textContent = 'Увійди через Google або GitHub, щоб відкрити повний курс, синхронізацію прогресу та збережені архітектури.';
  signInLink.href = `/auth/sign-in?next=${encodeURIComponent(`/legacy/index.html#lesson-${requestedLesson}`)}`;
  signInLink.textContent = 'Увійти й відкрити весь курс →';
  notice.append(title, copy, signInLink);
  document.querySelector('#top').prepend(notice);
}

export async function initializeCourseAccess(requestedLesson) {
  try {
    const response = await fetch('/api/course-access', { cache: 'no-store' });
    const access = response.ok ? await response.json() : null;
    if (Array.isArray(access?.modules) && access.modules.length > 0) {
      courseModules = access.modules;
      accessibleLessonCount = access.accessibleLessonCount;
      totalLessonCount = access.totalLessonCount;
      renderCourseNavigation();
      if (access.authenticated === true) {
        document.body.classList.remove('course-preview');
        document.querySelector('#courseAccessNotice')?.remove();
        showLesson(requestedLesson, false);
        return;
      }
    }
  } catch {
    // Network or session failures retain the safe preview payload.
  }
  document.body.classList.add('course-preview');
  renderCourseNavigation();
  renderCourseAccessNotice(requestedLesson);
  showLesson(1, false);
}

export function initializeShellControls() {
  renderCourseNavigation();
  const menuButton = document.querySelector('#menuButton');
  const sidebar = document.querySelector('#sidebar');
  menuButton.addEventListener('click', () => sidebar.classList.toggle('open'));
  document.querySelectorAll('.sidebar a').forEach(link => {
    link.addEventListener('click', () => sidebar.classList.remove('open'));
  });

  const themeButton = document.querySelector('#themeButton');
  if (localStorage.getItem('systema-theme') === 'dark') document.body.classList.add('dark');
  themeButton.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('systema-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  });

  document.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const text = document.querySelector(`#${button.dataset.copy}`).innerText;
      await navigator.clipboard.writeText(text);
      button.textContent = 'Скопійовано ✓';
      setTimeout(() => { button.textContent = 'Копіювати'; }, 1500);
    });
  });
}
