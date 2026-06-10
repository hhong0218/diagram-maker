const Canvas = {
  svg: null,
  viewport: null,
  wrap: null,
  pan: { x: 0, y: 0 },
  zoom: 1,
  isPanning: false,
  panStart: null,
  spaceHeld: false,

  init() {
    this.svg = document.getElementById('diagram-svg');
    this.viewport = document.getElementById('viewport');
    this.wrap = document.getElementById('canvas-wrap');
    this._bindEvents();
  },

  applyTransform() {
    this.viewport.setAttribute('transform', `translate(${this.pan.x},${this.pan.y}) scale(${this.zoom})`);
    document.getElementById('zoom-level').textContent = Math.round(this.zoom * 100) + '%';
  },

  screenToWorld(sx, sy) {
    const rect = this.svg.getBoundingClientRect();
    return {
      x: (sx - rect.left - this.pan.x) / this.zoom,
      y: (sy - rect.top - this.pan.y) / this.zoom
    };
  },

  setZoom(z, cx, cy) {
    const old = this.zoom;
    this.zoom = Utils.clamp(z, 0.1, 3);
    if (cx !== undefined) {
      this.pan.x = cx - (cx - this.pan.x) * (this.zoom / old);
      this.pan.y = cy - (cy - this.pan.y) * (this.zoom / old);
    }
    this.applyTransform();
  },

  fitToContent(nodes) {
    if (!nodes.length) {
      this.pan = { x: 0, y: 0 };
      this.zoom = 1;
      this.applyTransform();
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });
    const rect = this.svg.getBoundingClientRect();
    const pad = 60;
    const cw = maxX - minX + pad * 2;
    const ch = maxY - minY + pad * 2;
    const scaleX = rect.width / cw;
    const scaleY = rect.height / ch;
    this.zoom = Utils.clamp(Math.min(scaleX, scaleY), 0.1, 2);
    this.pan.x = (rect.width - cw * this.zoom) / 2 - minX * this.zoom + pad * this.zoom;
    this.pan.y = (rect.height - ch * this.zoom) / 2 - minY * this.zoom + pad * this.zoom;
    this.applyTransform();
  },

  toggleGrid(show) {
    document.getElementById('grid-bg').classList.toggle('hidden', !show);
  },

  getBounds(nodes) {
    if (!nodes.length) return { x: 0, y: 0, width: 100, height: 100 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  },

  _bindEvents() {
    this.wrap.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = this.svg.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.setZoom(this.zoom * delta, cx, cy);
    }, { passive: false });

    window.addEventListener('keydown', e => {
      if (e.code === 'Space' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        this.spaceHeld = true;
        this.wrap.classList.add('panning');
      }
    });
    window.addEventListener('keyup', e => {
      if (e.code === 'Space') {
        this.spaceHeld = false;
        this.wrap.classList.remove('panning');
      }
    });

    this.wrap.addEventListener('mousedown', e => {
      if (this.spaceHeld || e.button === 1) {
        e.preventDefault();
        this.isPanning = true;
        this.panStart = { x: e.clientX - this.pan.x, y: e.clientY - this.pan.y };
        this.wrap.classList.add('panning');
      }
    });

    window.addEventListener('mousemove', e => {
      if (this.isPanning && this.panStart) {
        this.pan.x = e.clientX - this.panStart.x;
        this.pan.y = e.clientY - this.panStart.y;
        this.applyTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      this.isPanning = false;
      this.panStart = null;
      if (!this.spaceHeld) this.wrap.classList.remove('panning');
    });
  },

  getState() {
    return { x: this.pan.x, y: this.pan.y, zoom: this.zoom };
  },

  setState(v) {
    if (!v) return;
    this.pan = { x: v.x || 0, y: v.y || 0 };
    this.zoom = v.zoom || 1;
    this.applyTransform();
  }
};