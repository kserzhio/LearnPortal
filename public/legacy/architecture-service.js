(function exposeArchitectureService() {
  const STORAGE_KEY = 'systema-artifacts-v1';
  const STORAGE_VERSION = 1;
  const MAX_ARCHITECTURES = 20;
  const MAX_PENDING_ATTEMPTS = 100;

  function createArchitectureService() {
    let authenticated = false;
    let initialization;
    let state = readState();
    const listeners = new Set();

    function readState() {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (stored.version === STORAGE_VERSION && Array.isArray(stored.architectures) && Array.isArray(stored.attempts)) {
          return { architectures: stored.architectures, attempts: stored.attempts };
        }
      } catch {
        // Corrupt guest data falls back to a clean, versioned state.
      }
      return { architectures: [], attempts: [] };
    }

    function persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ...state }));
      listeners.forEach(listener => listener());
    }

    async function postJson(url, body) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('artifact-sync-failed');
      return response.json();
    }

    async function synchronizeArchitecture(architecture) {
      const payload = await postJson('/api/architectures', architecture);
      state.architectures = state.architectures
        .filter(item => item.id !== architecture.id)
        .concat({ ...payload.architecture, synchronized: true });
      persist();
    }

    async function synchronizeAttempt(attempt) {
      await postJson('/api/simulator-attempts', attempt);
      state.attempts = state.attempts.filter(item => item.id !== attempt.id);
      persist();
    }

    async function initialize() {
      if (initialization) return initialization;
      initialization = (async () => {
        try {
          const response = await fetch('/api/architectures', { cache: 'no-store' });
          if (!response.ok) return { authenticated: false, synchronized: false };
          const payload = await response.json();
          authenticated = payload.authenticated === true;
          if (!authenticated) return { authenticated: false, synchronized: false };

          const remote = Array.isArray(payload.architectures)
            ? payload.architectures.map(item => ({ ...item, synchronized: true }))
            : [];
          const localOnly = state.architectures.filter(item => !item.synchronized);
          const remoteIds = new Set(remote.map(item => item.id));
          state.architectures = [...localOnly.filter(item => !remoteIds.has(item.id)), ...remote];
          persist();

          for (const architecture of localOnly) {
            try { await synchronizeArchitecture(architecture); } catch { /* Keep local copy for retry. */ }
          }
          for (const attempt of [...state.attempts]) {
            try { await synchronizeAttempt(attempt); } catch { /* Keep pending attempt for retry. */ }
          }
          return { authenticated: true, synchronized: state.architectures.every(item => item.synchronized) && state.attempts.length === 0 };
        } catch {
          return { authenticated, synchronized: false };
        }
      })();
      return initialization;
    }

    function listArchitectures() {
      return [...state.architectures]
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
        .slice(0, MAX_ARCHITECTURES);
    }

    function subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    async function saveArchitecture(title, designState) {
      const timestamp = new Date().toISOString();
      const architecture = {
        id: crypto.randomUUID(),
        title: title.trim(),
        state: designState,
        schemaVersion: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        synchronized: false,
      };
      state.architectures = [architecture, ...state.architectures].slice(0, MAX_ARCHITECTURES);
      persist();
      await initialize();
      if (!authenticated) return { architecture, synchronized: false };
      try {
        await synchronizeArchitecture(architecture);
        return { architecture, synchronized: true };
      } catch {
        return { architecture, synchronized: false };
      }
    }

    async function deleteArchitecture(id) {
      const architecture = state.architectures.find(item => item.id === id);
      if (!architecture) return { deleted: false, synchronized: false };
      state.architectures = state.architectures.filter(item => item.id !== id);
      persist();
      if (!architecture.synchronized || !authenticated) return { deleted: true, synchronized: false };

      try {
        const response = await fetch(`/api/architectures/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('architecture-delete-failed');
        return { deleted: true, synchronized: true };
      } catch {
        state.architectures.push(architecture);
        persist();
        return { deleted: false, synchronized: false };
      }
    }

    async function recordAttempt(designState) {
      const attempt = { id: crypto.randomUUID(), state: designState };
      state.attempts = [...state.attempts, attempt].slice(-MAX_PENDING_ATTEMPTS);
      persist();
      await initialize();
      if (!authenticated) return { synchronized: false };
      try {
        await synchronizeAttempt(attempt);
        return { synchronized: true };
      } catch {
        return { synchronized: false };
      }
    }

    return { initialize, listArchitectures, subscribe, saveArchitecture, deleteArchitecture, recordAttempt };
  }

  window.SystemaArtifacts = { createArchitectureService };
})();
