const Storage = {
  KEY: 'diagrammaker_autosave',
  INTERVAL: 30 * 1000,

  save(state) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify({
        ...state,
        savedAt: Date.now()
      }));
    } catch (e) { /* quota exceeded */ }
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      const data = raw ? JSON.parse(raw) : null;
      if (!data || !Array.isArray(data.nodes)) return null;
      if (!Array.isArray(data.connections)) data.connections = [];
      return data;
    } catch (e) { return null; }
  },

  clear() {
    localStorage.removeItem(this.KEY);
  },

  encodeToURL(state) {
    const data = { m: state.mode, n: state.nodes, c: state.connections, v: state.viewport };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    const url = new URL(window.location.href);
    url.searchParams.set('d', encoded);
    return url.toString();
  },

  decodeFromURL() {
    const params = new URLSearchParams(window.location.search);
    const d = params.get('d');
    if (!d) return null;
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(d))));
      return {
        mode: data.m || 'flowchart',
        nodes: Array.isArray(data.n) ? data.n : [],
        connections: Array.isArray(data.c) ? data.c : [],
        viewport: data.v || { x: 0, y: 0, zoom: 1 }
      };
    } catch (e) { return null; }
  },

  startAutoSave(getState) {
    setInterval(() => Storage.save(getState()), this.INTERVAL);
    window.addEventListener('beforeunload', () => Storage.save(getState()));
    // beforeunload does not fire reliably on mobile browsers
    window.addEventListener('pagehide', () => Storage.save(getState()));
  }
};