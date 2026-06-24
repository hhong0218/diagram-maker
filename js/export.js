const Export = {
  download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    if (typeof gtag === 'function') {
      const fmt = (filename.split('.').pop() || '').toLowerCase();
      gtag('event', 'diagram_export', { format: fmt });
    }
  },

  toJSON(state) {
    const data = {
      version: 1,
      mode: state.mode,
      nodes: state.nodes,
      connections: state.connections,
      viewport: state.viewport,
      exportedAt: new Date().toISOString()
    };
    this.download('diagram.json', JSON.stringify(data, null, 2), 'application/json');
  },

  fromJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target.result);
          resolve({
            mode: data.mode || 'flowchart',
            nodes: Array.isArray(data.nodes) ? data.nodes : [],
            connections: Array.isArray(data.connections) ? data.connections : [],
            viewport: data.viewport || { x: 0, y: 0, zoom: 1 }
          });
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },

  toSVG(state) {
    const esc = Utils.escapeXML;
    const bounds = Canvas.getBounds(state.nodes);
    const pad = 40;
    const w = bounds.width + pad * 2;
    const h = bounds.height + pad * 2;
    const offX = -bounds.x + pad;
    const offY = -bounds.y + pad;

    // One marker per arrow color: context-stroke is not supported by
    // most external viewers (PowerPoint, Inkscape 등).
    const markerIds = {};
    let defs = '';
    state.connections.forEach(c => {
      if ((c.arrowEnd || c.arrowStart) && !(c.color in markerIds)) {
        const idx = Object.keys(markerIds).length;
        markerIds[c.color] = idx;
        defs += `<marker id="ae${idx}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${esc(c.color)}"/></marker>`;
        defs += `<marker id="as${idx}" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto"><polygon points="10 0, 0 3.5, 10 7" fill="${esc(c.color)}"/></marker>`;
      }
    });

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="sans-serif">`;
    svg += `<defs>${defs}</defs>`;
    svg += `<g transform="translate(${offX},${offY})">`;

    state.connections.forEach(c => {
      const d = Connections.pathD(c, state.nodes);
      let attrs = `stroke="${esc(c.color)}" fill="none" stroke-width="2"`;
      if (c.arrowEnd) attrs += ` marker-end="url(#ae${markerIds[c.color]})"`;
      if (c.arrowStart) attrs += ` marker-start="url(#as${markerIds[c.color]})"`;
      svg += `<path d="${d}" ${attrs}/>`;
      if (c.label) {
        const pos = Connections.labelPos(c, state.nodes);
        svg += `<text x="${pos.x}" y="${pos.y}" fill="#a0aec0" font-size="11" text-anchor="middle">${esc(c.label)}</text>`;
      }
    });

    state.nodes.forEach(n => {
      const d = Nodes.shapePath(n);
      const cx = n.x + n.width / 2;
      const cy = n.y + n.height / 2;
      svg += `<path d="${d}" fill="${esc(n.fillColor)}" stroke="${esc(n.strokeColor)}" stroke-width="2"/>`;
      const lines = String(n.text).split('\n');
      let content;
      if (lines.length === 1) {
        content = esc(n.text);
      } else {
        // Same multi-line layout as the live renderer (js/nodes.js)
        content = lines.map((line, i) =>
          `<tspan x="${cx}" dy="${i === 0 ? -(lines.length - 1) * 8 : 16}">${esc(line)}</tspan>`).join('');
      }
      svg += `<text x="${cx}" y="${cy}" fill="#f7fafc" font-size="13" text-anchor="middle" dominant-baseline="central">${content}</text>`;
    });

    svg += '</g></svg>';
    this.download('diagram.svg', svg, 'image/svg+xml');
  },

  async toPNG(fullView) {
    const svg = document.getElementById('diagram-svg');
    const wrap = document.getElementById('canvas-wrap');

    if (fullView && typeof App !== 'undefined') {
      const savedPan = { ...Canvas.pan };
      const savedZoom = Canvas.zoom;
      Canvas.fitToContent(App.state.nodes);
      // Two animation frames guarantee the new transform is painted before
      // capture — deterministic, unlike the old hardcoded setTimeout(100).
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      await this._capture(wrap, 'diagram-full.png');
      Canvas.pan = savedPan;
      Canvas.zoom = savedZoom;
      Canvas.applyTransform();
    } else {
      await this._capture(wrap, 'diagram.png');
    }
  },

  _h2cPromise: null,

  // html2canvas is only needed for PNG export: load it on demand so the
  // page itself never blocks on (or breaks from) the CDN.
  _loadHtml2Canvas() {
    if (typeof html2canvas !== 'undefined') return Promise.resolve();
    if (this._h2cPromise) return this._h2cPromise;
    this._h2cPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload = resolve;
      s.onerror = () => {
        this._h2cPromise = null;
        s.remove();
        reject(new Error('html2canvas CDN load failed'));
      };
      document.head.appendChild(s);
    });
    return this._h2cPromise;
  },

  async _capture(el, filename) {
    try {
      await this._loadHtml2Canvas();
    } catch (e) {
      Utils.showToast(I18n.t('pngModuleFail'), 4000);
      return;
    }
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#1a202c',
        scale: 2,
        ignoreElements: el2 => el2.classList && (el2.classList.contains('zoom-controls') || el2.classList.contains('badge'))
      });
      canvas.toBlob(blob => {
        if (!blob) { Utils.showToast(I18n.t('pngFail')); return; }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
        if (typeof gtag === 'function') { gtag('event', 'diagram_export', { format: 'png' }); }
        Utils.showToast(I18n.t('pngDone'));
      });
    } catch (e) {
      Utils.showToast(I18n.t('pngFailMsg') + e.message);
    }
  }
};