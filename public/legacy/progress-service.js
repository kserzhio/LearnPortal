(function exposeProgressService() {
  const STORAGE_KEY = 'systema-progress-v2';
  const STORAGE_VERSION = 2;

  function createProgressService({ courseId, lessonCount }) {
    let authenticated = false;
    let records = readLocalRecords();
    let initialization;

    function lessonId(number) {
      return `high-load-${String(number).padStart(2, '0')}`;
    }

    function readLocalRecords() {
      let storedRecords = [];
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (stored.version === STORAGE_VERSION && Array.isArray(stored.records)) storedRecords = stored.records;
      } catch {
        storedRecords = [];
      }

      const migratedRecords = Array.from({ length: lessonCount }, (_, index) => index + 1)
        .filter(number => localStorage.getItem(`systema-lesson-${number}`) === 'done')
        .map(number => ({
          courseId,
          lessonId: lessonId(number),
          completed: true,
          position: 1,
          updatedAt: new Date(0).toISOString(),
        }));

      return mergeRecords(storedRecords.filter(record => record.courseId === courseId), migratedRecords);
    }

    function mergeRecords(...sources) {
      const merged = new Map();
      sources.flat().forEach(record => {
        if (!record || record.courseId !== courseId || typeof record.lessonId !== 'string') return;
        const current = merged.get(record.lessonId);
        if (!current) {
          merged.set(record.lessonId, record);
          return;
        }
        const latest = Date.parse(record.updatedAt) >= Date.parse(current.updatedAt) ? record : current;
        merged.set(record.lessonId, {
          ...latest,
          completed: Boolean(current.completed || record.completed),
          position: Math.max(Number(current.position) || 0, Number(record.position) || 0),
        });
      });
      return [...merged.values()];
    }

    function persistLocal() {
      let otherCourses = [];
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (stored.version === STORAGE_VERSION && Array.isArray(stored.records)) {
          otherCourses = stored.records.filter(record => record.courseId !== courseId);
        }
      } catch {
        otherCourses = [];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, records: [...otherCourses, ...records] }));
      records.filter(record => record.completed).forEach(record => {
        const number = Number(record.lessonId.split('-').at(-1));
        if (number >= 1 && number <= lessonCount) localStorage.setItem(`systema-lesson-${number}`, 'done');
      });
    }

    async function synchronize(progressRecords) {
      const response = await fetch('/api/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: progressRecords }),
      });
      if (!response.ok) throw new Error('progress-sync-failed');
    }

    async function initialize() {
      if (initialization) return initialization;
      initialization = (async () => {
        persistLocal();
        try {
          const response = await fetch(`/api/progress?courseId=${encodeURIComponent(courseId)}`, { cache: 'no-store' });
          if (!response.ok) return { authenticated: false, synchronized: false };
          const payload = await response.json();
          authenticated = payload.authenticated === true;
          if (!authenticated) return { authenticated: false, synchronized: false };

          records = mergeRecords(records, Array.isArray(payload.records) ? payload.records : []);
          persistLocal();
          const completedRecords = records.filter(record => record.completed);
          if (completedRecords.length > 0) await synchronize(completedRecords);
          return { authenticated: true, synchronized: true };
        } catch {
          return { authenticated, synchronized: false };
        }
      })();
      return initialization;
    }

    async function complete(number) {
      const record = {
        courseId,
        lessonId: lessonId(number),
        completed: true,
        position: 1,
        updatedAt: new Date().toISOString(),
      };
      records = mergeRecords(records, [record]);
      persistLocal();

      await initialize();
      if (!authenticated) return { synchronized: false };
      try {
        await synchronize([record]);
        return { synchronized: true };
      } catch {
        return { synchronized: false };
      }
    }

    function completedLessonNumbers() {
      return records
        .filter(record => record.completed)
        .map(record => Number(record.lessonId.split('-').at(-1)))
        .filter(number => Number.isInteger(number) && number >= 1 && number <= lessonCount);
    }

    return { initialize, complete, completedLessonNumbers };
  }

  window.SystemaProgress = { createProgressService };
})();
