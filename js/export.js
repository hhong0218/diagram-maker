const Export = {
  download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
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
            nodes: data.nodes || [],
            connections: data.connections || [],
            viewport: data.viewport || { x: 0, y: 0, zoom: 1 }
          });
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },

  toSVG(state) {
    const bounds = Canvas.getBounds(state.nodes);
    const pad = 40;
    const w = bounds.width + pad * 2;
    const h = bounds.height + pad * 2;
    const offX = -bounds.x + pad;
    const offY = -bounds.y + pad;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
    svg += `<defs>
      <marker id="arrow-end" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="context-stroke"/></marker>
      <marker id="arrow-start" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto"><polygon points="10 0, 0 3.5, 10 7" fill="context-stroke"/></marker>
    </defs>`;
    svg += `<g transform="translate(${offX},${offY})">`;

    state.connections.forEach(c => {
      const d = Connections.pathD(c, state.nodes);
      let attrs = `stroke="${c.color}" fill="none" stroke-width="2"`;
      if (c.arrowEnd) attrs += ' marker-end="url(#arrow-end)"';
      if (c.arrowStart) attrs += ' marker-start="url(#arrow-start)"';
      svg += `<path d="${d}" ${attrs}/>`;
      if (c.label) {
        const pos = Connections.labelPos(c, state.nodes);
        svg += `<text x="${pos.x}" y="${pos.y}" fill="#a0aec0" font-size="11" text-anchor="middle">${c.label}</text>`;
      }
    });

    state.nodes.forEach(n => {
      const d = Nodes.shapePath(n);
      svg += `<path d="${d}" fill="${n.fillColor}" stroke="${n.strokeColor}" stroke-width="2"/>`;
      svg += `<text x="${n.x + n.width / 2}" y="${n.y + n.height / 2}" fill="#f7fafc" font-size="13" text-anchor="middle" dominant-baseline="central">${n.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`;
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
      await new Promise(r => setTimeout(r, 100));
      await this._capture(wrap, 'diagram-full.png');
      Canvas.pan = savedPan;
      Canvas.zoom = savedZoom;
      Canvas.applyTransform();
    } else {
      await this._capture(wrap, 'diagram.png');
    }
  },

  async _capture(el, filename) {
    if (typeof html2canvas === 'undefined') {
      Utils.showToast('PNG 저장을 위해 html2canvas를 로드 중입니다...');
      return;
    }
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#1a202c',
        scale: 2,
        ignoreElements: el2 => el2.classList && (el2.classList.contains('zoom-controls') || el2.classList.contains('badge'))
      });
      canvas.toBlob(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
        Utils.showToast('PNG 저장 완료!');
      });
    } catch (e) {
      Utils.showToast('PNG 저장 실패: ' + e.message);
    }
  }
};