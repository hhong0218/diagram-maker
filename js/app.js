const App = {
  state: {
    mode: 'flowchart',
    nodes: [],
    connections: [],
    selectedIds: [],
    selectedConnIds: []
  },

  clipboard: null,
  drag: null,
  connectDrag: null,
  resizeDrag: null,
  editor: null,
  _rendered: false,
  _styleGesture: false,

  init() {
    Canvas.init();
    this._bindUI();
    this._bindCanvas();
    this._bindKeyboard();
    this._populateTemplates();

    const urlData = Storage.decodeFromURL();
    if (urlData) {
      this._loadState(urlData);
      document.getElementById('modal-start').classList.add('hidden');
    } else {
      const saved = Storage.load();
      if (saved && saved.nodes && saved.nodes.length) {
        document.getElementById('modal-start').classList.add('hidden');
        document.getElementById('modal-resume').classList.remove('hidden');
        this._pendingResume = saved;
      } else {
        document.getElementById('modal-start').classList.remove('hidden');
        this._populateStartModal();
      }
    }

    Storage.startAutoSave(() => this._getSaveState());
    this._updateModeUI();
  },

  _getSaveState() {
    return {
      mode: this.state.mode,
      nodes: this.state.nodes,
      connections: this.state.connections,
      viewport: Canvas.getState()
    };
  },

  _loadState(data) {
    this.state.mode = data.mode || 'flowchart';
    this.state.nodes = data.nodes || [];
    this.state.connections = data.connections || [];
    this.state.selectedIds = [];
    this.state.selectedConnIds = [];
    Canvas.setState(data.viewport);
    History.reset();
    this._updateModeUI();
    this.render();
    this._checkBadge();
  },

  _snapshot() {
    return {
      mode: this.state.mode,
      nodes: Utils.deepClone(this.state.nodes),
      connections: Utils.deepClone(this.state.connections)
    };
  },

  _saveHistory() {
    History.push(this._snapshot());
  },

  _populateTemplates() {
    const list = document.getElementById('template-list');
    list.innerHTML = '';
    const templates = this.state.mode === 'flowchart' ? Templates.flowchart : Templates.mindmap;
    templates.forEach(tpl => {
      const btn = document.createElement('button');
      btn.className = 'template-btn';
      btn.textContent = tpl.name;
      btn.addEventListener('click', () => this._applyTemplate(tpl));
      list.appendChild(btn);
    });
  },

  _populateStartModal() {
    const container = document.getElementById('start-templates');
    container.innerHTML = '';
    Templates.flowchart.slice(0, 3).forEach(tpl => {
      const btn = document.createElement('button');
      btn.className = 'template-btn';
      btn.textContent = '📊 ' + tpl.name;
      btn.addEventListener('click', () => {
        this.state.mode = 'flowchart';
        this._applyTemplate(tpl);
        document.getElementById('modal-start').classList.add('hidden');
      });
      container.appendChild(btn);
    });
    Templates.mindmap.slice(0, 2).forEach(tpl => {
      const btn = document.createElement('button');
      btn.className = 'template-btn';
      btn.textContent = '🧠 ' + tpl.name;
      btn.addEventListener('click', () => {
        this.state.mode = 'mindmap';
        this._applyTemplate(tpl);
        document.getElementById('modal-start').classList.add('hidden');
        this._updateModeUI();
      });
      container.appendChild(btn);
    });
  },

  _applyTemplate(tpl) {
    let data;
    if (this.state.mode === 'flowchart') {
      data = Templates.buildFlowchart(tpl);
    } else {
      data = Templates.buildMindmap(tpl);
    }
    this.state.nodes = data.nodes;
    this.state.connections = data.connections;
    this.state.selectedIds = [];
    this.state.selectedConnIds = [];
    History.reset();
    Canvas.fitToContent(this.state.nodes);
    this.render();
    this._checkBadge();
  },

  _updateModeUI() {
    document.querySelectorAll('.mode-tab').forEach(t => {
      const active = t.dataset.mode === this.state.mode;
      t.classList.toggle('active', active);
      t.setAttribute('aria-pressed', String(active));
    });
    const isMM = this.state.mode === 'mindmap';
    document.getElementById('shape-grid').classList.toggle('hidden', isMM);
    document.getElementById('mindmap-tools').classList.toggle('hidden', !isMM);
    document.getElementById('btn-auto-align').style.display = isMM ? 'none' : 'block';
    this._populateTemplates();
  },

  async switchMode(mode) {
    if (mode === this.state.mode) return;
    const ok = await Utils.showConfirm('모드 전환', '모드 전환 시 캔버스가 초기화됩니다. 계속하시겠습니까?');
    if (!ok) return;
    this.state.mode = mode;
    this.state.nodes = [];
    this.state.connections = [];
    this.state.selectedIds = [];
    this.state.selectedConnIds = [];
    if (mode === 'mindmap') {
      Mindmap.initCenter(this.state.nodes, this.state.connections);
    }
    History.reset();
    Canvas.fitToContent(this.state.nodes);
    this._updateModeUI();
    this.render();
  },

  render() {
    const connLayer = document.getElementById('connections-layer');
    const nodeLayer = document.getElementById('nodes-layer');
    connLayer.innerHTML = '';
    nodeLayer.innerHTML = '';

    this.state.connections.forEach(c => {
      connLayer.appendChild(Connections.render(c, this.state.nodes,
        this.state.selectedConnIds.includes(c.id)));
    });
    this.state.nodes.forEach(n => {
      nodeLayer.appendChild(Nodes.render(n, this.state.selectedIds.includes(n.id)));
    });
    this._rendered = true;
    this._updateUndoButtons();
  },

  _updateUndoButtons() {
    document.getElementById('btn-undo').disabled = !History.canUndo();
    document.getElementById('btn-redo').disabled = !History.canRedo();
  },

  _checkBadge() {
    const badge = document.getElementById('complexity-badge');
    if (this.state.nodes.length >= 50) {
      badge.classList.remove('hidden');
      setTimeout(() => badge.classList.add('hidden'), 5000);
    }
  },

  _bindUI() {
    document.querySelectorAll('.mode-tab').forEach(t => {
      t.addEventListener('click', () => this.switchMode(t.dataset.mode));
    });

    document.getElementById('btn-undo').addEventListener('click', () => this.undo());
    document.getElementById('btn-redo').addEventListener('click', () => this.redo());
    document.getElementById('btn-share').addEventListener('click', () => this.shareURL());
    document.getElementById('btn-auto-align').addEventListener('click', () => {
      this._saveHistory();
      Flowchart.autoAlign(this.state.nodes, this.state.connections);
      this.render();
    });
    document.getElementById('btn-fit-view').addEventListener('click', () => Canvas.fitToContent(this.state.nodes));
    document.getElementById('btn-add-child').addEventListener('click', () => this.addMindmapChild());

    document.getElementById('toggle-grid').addEventListener('change', e => Canvas.toggleGrid(e.target.checked));

    document.getElementById('zoom-in').addEventListener('click', () => {
      const r = Canvas.svg.getBoundingClientRect();
      Canvas.setZoom(Canvas.zoom * 1.2, r.width / 2, r.height / 2);
    });
    document.getElementById('zoom-out').addEventListener('click', () => {
      const r = Canvas.svg.getBoundingClientRect();
      Canvas.setZoom(Canvas.zoom / 1.2, r.width / 2, r.height / 2);
    });

    document.querySelectorAll('.shape-btn').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.shape-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        Nodes.defaultShape = b.dataset.shape;
      });
    });

    // Color pickers fire 'input' continuously while dragging: save history
    // only once per gesture ('change' fires when the picker is dismissed).
    [['fill-color', 'fillColor'], ['stroke-color', 'strokeColor']].forEach(([id, prop]) => {
      const input = document.getElementById(id);
      input.addEventListener('input', e => this._applyStyle(prop, e.target.value));
      input.addEventListener('change', () => { this._styleGesture = false; });
    });
    const connColor = document.getElementById('conn-color');
    connColor.addEventListener('input', e => this._applyConnStyle('color', e.target.value));
    connColor.addEventListener('change', () => { this._styleGesture = false; });
    document.getElementById('conn-type').addEventListener('change', e => {
      this._applyConnStyle('type', e.target.value);
      this._styleGesture = false;
    });
    document.getElementById('conn-arrow').addEventListener('change', e => {
      const v = e.target.value;
      this._applyConnStyle('arrowEnd', v === 'end' || v === 'both');
      this._applyConnStyle('arrowStart', v === 'both');
      this._styleGesture = false;
    });

    document.getElementById('btn-export-png').addEventListener('click', () => Export.toPNG(false));
    document.getElementById('btn-export-png-full').addEventListener('click', () => Export.toPNG(true));
    document.getElementById('btn-export-svg').addEventListener('click', () => Export.toSVG(this._getSaveState()));
    document.getElementById('btn-export-json').addEventListener('click', () => Export.toJSON(this._getSaveState()));
    document.getElementById('import-json').addEventListener('change', async e => {
      if (!e.target.files[0]) return;
      try {
        const data = await Export.fromJSON(e.target.files[0]);
        this._loadState(data);
        Utils.showToast('JSON 불러오기 완료');
      } catch (err) { Utils.showToast('JSON 파싱 실패'); }
      e.target.value = '';
    });

    document.getElementById('btn-start-blank').addEventListener('click', () => {
      document.getElementById('modal-start').classList.add('hidden');
      if (!this.state.nodes.length) {
        if (this.state.mode === 'mindmap') {
          Mindmap.initCenter(this.state.nodes, this.state.connections);
        }
        History.reset();
        Canvas.fitToContent(this.state.nodes);
        this.render();
      }
    });

    document.getElementById('btn-resume-yes').addEventListener('click', () => {
      document.getElementById('modal-resume').classList.add('hidden');
      if (this._pendingResume) this._loadState(this._pendingResume);
    });
    document.getElementById('btn-resume-no').addEventListener('click', () => {
      document.getElementById('modal-resume').classList.add('hidden');
      Storage.clear();
      document.getElementById('modal-start').classList.remove('hidden');
      this._populateStartModal();
    });

    document.querySelectorAll('.mobile-toolbar button').forEach(b => {
      b.addEventListener('click', () => {
        const a = b.dataset.action;
        if (a === 'undo') this.undo();
        if (a === 'add') this._addNodeAtCenter();
        if (a === 'export') Export.toPNG(false);
        if (a === 'fit') Canvas.fitToContent(this.state.nodes);
        if (a === 'share') this.shareURL();
      });
    });

    document.getElementById('context-menu').addEventListener('click', e => {
      const action = e.target.dataset.action;
      if (!action) return;
      this._handleContextAction(action);
      this._hideContextMenu();
    });

    document.addEventListener('click', () => this._hideContextMenu());
  },

  _bindCanvas() {
    const wrap = document.getElementById('canvas-wrap');
    let lastClick = 0;

    wrap.addEventListener('mousedown', e => {
      if (Canvas.spaceHeld || e.button === 1) return;
      const target = e.target;
      const world = Canvas.screenToWorld(e.clientX, e.clientY);

      if (target.classList.contains('connect-point')) {
        const g = target.closest('.node-group');
        const nodeId = g.dataset.id;
        this.connectDrag = { fromId: nodeId, fromSide: target.dataset.side, x: world.x, y: world.y };
        e.stopPropagation();
        return;
      }

      if (target.classList.contains('resize-handle')) {
        const g = target.closest('.node-group');
        const node = this.state.nodes.find(n => n.id === g.dataset.id);
        this.resizeDrag = { node, startX: world.x, startY: world.y, origW: node.width, origH: node.height };
        this._saveHistory();
        e.stopPropagation();
        return;
      }

      const nodeG = target.closest('.node-group');
      if (nodeG) {
        const id = nodeG.dataset.id;
        if (!e.shiftKey) this.state.selectedConnIds = [];
        if (!e.shiftKey && !this.state.selectedIds.includes(id)) {
          this.state.selectedIds = [id];
        } else if (e.shiftKey) {
          this.state.selectedIds = this.state.selectedIds.includes(id)
            ? this.state.selectedIds.filter(x => x !== id) : [...this.state.selectedIds, id];
        }
        const node = this.state.nodes.find(n => n.id === id);
        this.drag = { nodes: this.state.selectedIds.map(sid => {
          const n = this.state.nodes.find(x => x.id === sid);
          return { node: n, offX: world.x - n.x, offY: world.y - n.y };
        }), startX: world.x, startY: world.y, moved: false };
        this._saveHistory();
        this.render();
        e.stopPropagation();
        return;
      }

      if (target.classList.contains('conn-path') || target.classList.contains('conn-label')) {
        const id = target.closest('g').dataset.id;
        this.state.selectedConnIds = [id];
        this.state.selectedIds = [];
        this.render();
        e.stopPropagation();
        return;
      }

      if (!Canvas.spaceHeld) {
        this.state.selectedIds = [];
        this.state.selectedConnIds = [];
        this.render();
      }
    });

    wrap.addEventListener('dblclick', e => {
      const now = Date.now();
      const world = Canvas.screenToWorld(e.clientX, e.clientY);
      const nodeG = e.target.closest('.node-group');

      if (nodeG) {
        const node = this.state.nodes.find(n => n.id === nodeG.dataset.id);
        this._startInlineEdit(node, e);
        return;
      }

      if (e.target.classList.contains('conn-path') || e.target.classList.contains('conn-label')) {
        const id = e.target.closest('g').dataset.id;
        const conn = this.state.connections.find(c => c.id === id);
        this._startConnLabelEdit(conn, e);
        return;
      }

      if (!Canvas.spaceHeld && this.state.mode === 'flowchart') {
        this._saveHistory();
        const node = Nodes.create(Nodes.defaultShape, world.x, world.y);
        this.state.nodes.push(node);
        this.state.selectedIds = [node.id];
        this.render();
        this._checkBadge();
        setTimeout(() => this._startInlineEdit(node, e), 50);
      }
    });

    wrap.addEventListener('mousemove', e => {
      const world = Canvas.screenToWorld(e.clientX, e.clientY);

      if (this.connectDrag) {
        this._drawTempLine(this.connectDrag, world);
        return;
      }

      if (this.resizeDrag) {
        const { node, startX, startY, origW, origH } = this.resizeDrag;
        this.resizeDrag.moved = true;
        node.width = Math.max(40, origW + (world.x - startX));
        node.height = Math.max(30, origH + (world.y - startY));
        this.render();
        return;
      }

      if (this.drag) {
        this.drag.moved = true;
        this.drag.nodes.forEach(({ node, offX, offY }) => {
          node.x = world.x - offX;
          node.y = world.y - offY;
        });
        this.render();
      }
    });

    wrap.addEventListener('mouseup', e => {
      if (this.connectDrag) {
        const target = e.target;
        if (target.classList.contains('connect-point')) {
          const g = target.closest('.node-group');
          const toId = g.dataset.id;
          if (toId !== this.connectDrag.fromId) {
            this._saveHistory();
            const type = this.state.mode === 'mindmap' ? 'curved' : 'orthogonal';
            this.state.connections.push(Connections.create(
              this.connectDrag.fromId, toId,
              this.connectDrag.fromSide, target.dataset.side,
              { type, arrowEnd: this.state.mode !== 'mindmap' }
            ));
          }
        }
        this.connectDrag = null;
        document.getElementById('overlay-layer').innerHTML = '';
        this.render();
      }
      // A click that never moved should not consume an undo step.
      if ((this.drag && !this.drag.moved) || (this.resizeDrag && !this.resizeDrag.moved)) {
        History.discardLast();
        this._updateUndoButtons();
      }
      this.drag = null;
      this.resizeDrag = null;
    });

    wrap.addEventListener('contextmenu', e => {
      const nodeG = e.target.closest('.node-group');
      if (nodeG) {
        e.preventDefault();
        this.state.selectedIds = [nodeG.dataset.id];
        this.render();
        this._showContextMenu(e.clientX, e.clientY);
      }
    });
  },

  _drawTempLine(drag, world) {
    const overlay = document.getElementById('overlay-layer');
    overlay.innerHTML = '';
    const from = this.state.nodes.find(n => n.id === drag.fromId);
    const p1 = Utils.getSidePoint(from, drag.fromSide);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', p1.x);
    line.setAttribute('y1', p1.y);
    line.setAttribute('x2', world.x);
    line.setAttribute('y2', world.y);
    line.setAttribute('stroke', '#63b3ed');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '6,4');
    overlay.appendChild(line);
  },

  _bindKeyboard() {
    document.addEventListener('keydown', e => {
      if (e.target.matches('input, textarea, select')) return;

      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); this.redo(); }
      if (e.ctrlKey && e.key === 'a') { e.preventDefault(); this.selectAll(); }
      if (e.ctrlKey && e.key === 'c') { e.preventDefault(); this.copy(); }
      if (e.ctrlKey && e.key === 'v') { e.preventDefault(); this.paste(); }
      if (e.ctrlKey && e.key === '0') { e.preventDefault(); Canvas.fitToContent(this.state.nodes); }
      if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        const r = Canvas.svg.getBoundingClientRect();
        Canvas.setZoom(Canvas.zoom * 1.2, r.width / 2, r.height / 2);
      }
      if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        const r = Canvas.svg.getBoundingClientRect();
        Canvas.setZoom(Canvas.zoom / 1.2, r.width / 2, r.height / 2);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') { this.deleteSelected(); }
      if (e.key === 'Tab' && this.state.mode === 'mindmap') {
        e.preventDefault();
        this.addMindmapChild();
      }
    });
  },

  _startInlineEdit(node, e) {
    if (this.editor) this.editor.remove();
    const rect = Canvas.svg.getBoundingClientRect();
    const sx = (node.x + node.width / 2) * Canvas.zoom + Canvas.pan.x + rect.left;
    const sy = (node.y + node.height / 2) * Canvas.zoom + Canvas.pan.y + rect.top;

    const ta = document.createElement('textarea');
    ta.className = 'inline-editor';
    ta.value = node.text;
    ta.style.left = (sx - node.width * Canvas.zoom / 2) + 'px';
    ta.style.top = (sy - node.height * Canvas.zoom / 2) + 'px';
    ta.style.width = (node.width * Canvas.zoom) + 'px';
    ta.style.height = (node.height * Canvas.zoom) + 'px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();

    const finish = () => {
      const newText = ta.value || '텍스트';
      if (newText !== node.text) {
        this._saveHistory();
        Nodes.updateText(node, newText);
        if (this.state.mode === 'mindmap') Nodes.autoSizeMindmap(node);
      }
      ta.remove();
      this.editor = null;
      this.render();
    };
    ta.addEventListener('blur', finish);
    ta.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); ta.blur(); }
      if (ev.key === 'Escape') { ta.value = node.text; ta.blur(); }
    });
    this.editor = ta;
  },

  _startConnLabelEdit(conn, e) {
    const label = prompt('연결선 라벨:', conn.label || '');
    if (label !== null) {
      this._saveHistory();
      conn.label = label;
      this.render();
    }
  },

  addMindmapChild() {
    if (this.state.mode !== 'mindmap') return;
    const parent = this.state.nodes.find(n => this.state.selectedIds.includes(n.id))
      || this.state.nodes.find(n => n.isCenter);
    if (!parent) return;
    this._saveHistory();
    const child = Mindmap.addChild(parent, this.state.nodes, this.state.connections);
    this.state.selectedIds = [child.id];
    this.render();
    this._checkBadge();
  },

  _addNodeAtCenter() {
    const rect = Canvas.svg.getBoundingClientRect();
    const world = Canvas.screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
    this._saveHistory();
    const node = Nodes.create(Nodes.defaultShape, world.x, world.y);
    this.state.nodes.push(node);
    this.state.selectedIds = [node.id];
    this.render();
    this._checkBadge();
  },

  _applyStyle(prop, value) {
    if (!this.state.selectedIds.length) return;
    if (!this._styleGesture) { this._saveHistory(); this._styleGesture = true; }
    this.state.selectedIds.forEach(id => {
      const n = this.state.nodes.find(x => x.id === id);
      if (n) n[prop] = value;
    });
    this.render();
  },

  _applyConnStyle(prop, value) {
    if (!this.state.selectedConnIds.length) return;
    if (!this._styleGesture) { this._saveHistory(); this._styleGesture = true; }
    this.state.selectedConnIds.forEach(id => {
      const c = this.state.connections.find(x => x.id === id);
      if (c) c[prop] = value;
    });
    this.render();
  },

  undo() {
    const snap = History.undo(this._snapshot());
    if (!snap) return;
    this.state.nodes = snap.nodes;
    this.state.connections = snap.connections;
    this.state.mode = snap.mode;
    this.state.selectedIds = [];
    this.state.selectedConnIds = [];
    this._updateModeUI();
    this.render();
  },

  redo() {
    const snap = History.redo(this._snapshot());
    if (!snap) return;
    this.state.nodes = snap.nodes;
    this.state.connections = snap.connections;
    this.state.mode = snap.mode;
    this.state.selectedIds = [];
    this.state.selectedConnIds = [];
    this._updateModeUI();
    this.render();
  },

  selectAll() {
    this.state.selectedIds = this.state.nodes.map(n => n.id);
    this.state.selectedConnIds = [];
    this.render();
  },

  copy() {
    if (!this.state.selectedIds.length) return;
    const nodes = this.state.nodes.filter(n => this.state.selectedIds.includes(n.id));
    const conns = this.state.connections.filter(c =>
      this.state.selectedIds.includes(c.fromId) && this.state.selectedIds.includes(c.toId));
    this.clipboard = { nodes: Utils.deepClone(nodes), connections: Utils.deepClone(conns) };
    Utils.showToast('복사됨');
  },

  paste() {
    if (!this.clipboard) return;
    this._saveHistory();
    const idMap = {};
    this.clipboard.nodes.forEach(n => {
      const copy = Utils.deepClone(n);
      const newId = Utils.uid();
      idMap[n.id] = newId;
      copy.id = newId;
      copy.x += 30;
      copy.y += 30;
      this.state.nodes.push(copy);
    });
    this.clipboard.connections.forEach(c => {
      const copy = Utils.deepClone(c);
      copy.id = Utils.uid();
      copy.fromId = idMap[c.fromId];
      copy.toId = idMap[c.toId];
      if (copy.fromId && copy.toId) this.state.connections.push(copy);
    });
    this.state.selectedIds = Object.values(idMap);
    this.render();
    this._checkBadge();
    Utils.showToast('붙여넣기 완료');
  },

  deleteSelected() {
    if (!this.state.selectedIds.length && !this.state.selectedConnIds.length) return;
    this._saveHistory();
    const ids = new Set(this.state.selectedIds);
    // In mindmap mode, deleting a branch removes its whole subtree so no
    // node is left orphaned with a dangling parentId.
    if (this.state.mode === 'mindmap') {
      let grew = true;
      while (grew) {
        grew = false;
        this.state.nodes.forEach(n => {
          if (n.parentId && ids.has(n.parentId) && !ids.has(n.id)) {
            ids.add(n.id);
            grew = true;
          }
        });
      }
    }
    this.state.nodes = this.state.nodes.filter(n => !ids.has(n.id));
    this.state.connections = this.state.connections.filter(c =>
      !this.state.selectedConnIds.includes(c.id) &&
      !ids.has(c.fromId) &&
      !ids.has(c.toId));
    this.state.selectedIds = [];
    this.state.selectedConnIds = [];
    this.render();
  },

  shareURL() {
    const url = Storage.encodeToURL(this._getSaveState());
    navigator.clipboard.writeText(url).then(() => {
      Utils.showToast('공유 링크가 복사되었습니다!');
    }).catch(() => {
      prompt('공유 링크:', url);
    });
  },

  _showContextMenu(x, y) {
    const menu = document.getElementById('context-menu');
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.remove('hidden');
  },

  _hideContextMenu() {
    document.getElementById('context-menu').classList.add('hidden');
  },

  _handleContextAction(action) {
    if (action === 'delete') this.deleteSelected();
    if (action === 'duplicate') {
      this.copy();
      this.paste();
    }
    if (action === 'edit') {
      const node = this.state.nodes.find(n => this.state.selectedIds.includes(n.id));
      if (node) this._startInlineEdit(node, { clientX: 0, clientY: 0 });
    }
    if (action === 'color') {
      const node = this.state.nodes.find(n => this.state.selectedIds.includes(n.id));
      if (node) {
        const c = prompt('색상 (hex):', node.fillColor);
        if (c) { this._saveHistory(); node.fillColor = c; node.strokeColor = c; this.render(); }
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());