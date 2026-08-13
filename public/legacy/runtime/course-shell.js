import { trackLegacyEvent } from './analytics.js?v=20260812-1';

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
const viewedLessons = new Set();
const startedLessons = new Set();
let courseStartTracked = false;

function trackCourseStart(access) {
  if (courseStartTracked) return;
  courseStartTracked = true;
  trackLegacyEvent('course_started', { course_id: 'high-load-architecture', access });
}

function learningDayLabel(days) {
  const remainder10 = days % 10;
  const remainder100 = days % 100;
  if (remainder10 === 1 && remainder100 !== 11) return 'день';
  if ([2, 3, 4].includes(remainder10) && ![12, 13, 14].includes(remainder100)) return 'дні';
  return 'днів';
}

function renderLearnerContext(access) {
  const profileLink = document.querySelector('#courseProfileLink');
  const learningDays = document.querySelector('#learningDays');
  const profile = access?.profile;
  profileLink.href = access?.authenticated ? '/profile' : '/auth/sign-in?next=%2Fprofile';
  profileLink.textContent = profile?.initials || '?';
  profileLink.setAttribute('aria-label', access?.authenticated ? 'Відкрити профіль' : 'Увійти до профілю');

  const day = Math.max(1, Number(access?.learningDay) || 1);
  const label = learningDayLabel(day);
  learningDays.querySelector('b').textContent = String(day);
  learningDays.querySelector('small').textContent = label;
  if (access?.learningStartedAt) {
    const start = new Intl.DateTimeFormat('uk-UA', { dateStyle: 'long' }).format(new Date(access.learningStartedAt));
    learningDays.setAttribute('aria-label', `Навчання розпочато ${start}. Сьогодні ${day}-й день навчання.`);
    learningDays.title = `Навчання розпочато ${start}`;
  } else {
    learningDays.setAttribute('aria-label', 'Перший день навчання');
    learningDays.removeAttribute('title');
  }
}

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
      if (lesson.position === 1) button.setAttribute('aria-current', 'page');
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
  document.querySelector('#breadcrumbModule').href = courseModule.lessons[0].legacyAnchor;
  document.querySelector('#breadcrumbLesson').textContent = `Заняття ${lesson.position}`;
  document.querySelector('footer > span').textContent = `Заняття ${String(lesson.position).padStart(2, '0')} / ${totalLessonCount}`;
  document.querySelectorAll('[data-lesson]').forEach(button => {
    const isActive = Number(button.dataset.lesson) === lesson.position;
    button.classList.toggle('active', isActive);
    if (isActive) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  history.replaceState(null, '', lesson.legacyAnchor);
  if (shouldTrack && progressService) void progressService.visit(lesson.position);
  if (shouldTrack && !startedLessons.has(lesson.id)) {
    startedLessons.add(lesson.id);
    trackLegacyEvent('lesson_started', { course_id: 'high-load-architecture', content_id: lesson.id });
  }
  document.dispatchEvent(new CustomEvent('systema:lesson-change', { detail: { lesson } }));
  if (!viewedLessons.has(lesson.id)) {
    viewedLessons.add(lesson.id);
    trackLegacyEvent('lesson_viewed', { course_id: 'high-load-architecture', content_id: lesson.id });
  }
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
      renderLearnerContext(access);
      renderCourseNavigation();
      if (access.authenticated === true) {
        trackCourseStart('authenticated');
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
  trackCourseStart('guest');
  renderCourseNavigation();
  renderCourseAccessNotice(requestedLesson);
  showLesson(1, false);
}

export function initializeShellControls() {
  renderCourseNavigation();
  const appShell = document.querySelector('.app-shell');
  const menuButton = document.querySelector('#menuButton');
  const sidebar = document.querySelector('#sidebar');
  const closeButton = document.querySelector('#sidebarCloseButton');
  const backdrop = document.querySelector('#sidebarBackdrop');
  const mobileViewport = window.matchMedia('(max-width: 48.75rem)');

  function setSidebarOpen(isOpen, { restoreFocus = false, focusClose = false } = {}) {
    const isMobile = mobileViewport.matches;
    sidebar.classList.toggle('open', isMobile && isOpen);
    appShell.classList.toggle('sidebar-overlay-open', isMobile && isOpen);
    appShell.classList.toggle('sidebar-collapsed', !isMobile && !isOpen);
    document.body.classList.toggle('sidebar-open', isMobile && isOpen);
    sidebar.toggleAttribute('inert', !isOpen);
    backdrop.setAttribute('aria-hidden', String(!(isMobile && isOpen)));
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Закрити меню' : 'Відкрити меню');
    if (isOpen && focusClose) closeButton.focus();
    else if (restoreFocus) menuButton.focus();
  }

  setSidebarOpen(!mobileViewport.matches);
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    setSidebarOpen(!isOpen, { restoreFocus: isOpen, focusClose: !isOpen });
  });
  closeButton.addEventListener('click', () => setSidebarOpen(false, { restoreFocus: true }));
  backdrop.addEventListener('click', () => setSidebarOpen(false, { restoreFocus: true }));
  document.querySelectorAll('.sidebar a').forEach(link => {
    link.addEventListener('click', () => {
      if (mobileViewport.matches) setSidebarOpen(false);
    });
  });
  courseNavigation.addEventListener('click', event => {
    if (mobileViewport.matches && event.target.closest('[data-lesson]')) {
      setSidebarOpen(false, { restoreFocus: true });
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setSidebarOpen(false, { restoreFocus: true });
    }
  });
  mobileViewport.addEventListener('change', event => setSidebarOpen(!event.matches));

  document.querySelector('#breadcrumbModule').addEventListener('click', event => {
    const position = Number(event.currentTarget.getAttribute('href').match(/#lesson-(\d+)/)?.[1]);
    if (!position) return;
    event.preventDefault();
    showLesson(position);
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
