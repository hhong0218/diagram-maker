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
  _gesturePointer: null,
  _touchDown: null,
  _lastTap: null,
  _touchDblAt: 0,
  _longPress: null,
  _menuPointer: null,
  _suppressClickUntil: 0,
  _colorInput: null,

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
    const ok = await Utils.showConfirm(I18n.t('modeSwitchTitle'), I18n.t('modeSwitchMsg'));
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
        Utils.showToast(I18n.t('jsonImported'));
      } catch (err) { Utils.showToast(I18n.t('jsonParseFail')); }
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
        if (a === 'edit') {
          const node = this.state.nodes.find(n => this.state.selectedIds.includes(n.id));
          if (node) this._startInlineEdit(node);
          else Utils.showToast(I18n.t('selectNodeFirst'));
        }
        if (a === 'export') Export.toPNG(false);
        if (a === 'fit') Canvas.fitToContent(this.state.nodes);
        if (a === 'share') this.shareURL();
      });
    });

    document.getElementById('context-menu').addEventListener('click', e => {
      if (Date.now() < this._suppressClickUntil) return;
      const action = e.target.dataset.action;
      if (!action) return;
      this._handleContextAction(action);
      this._hideContextMenu();
    });

    document.addEventListener('click', () => {
      // Ignore the synthetic click fired right after a long-press opened
      // the menu, so the menu does not close itself immediately.
      if (Date.now() < this._suppressClickUntil) return;
      this._hideContextMenu();
    });
  },

  // Pointer Events (pointerdown/move/up/cancel) replace the old mouse
  // listeners so mouse, touch and pen all share one code path. The active
  // gesture pointer is captured to the canvas wrapper, which keeps fast
  // drags working and makes re-renders mid-drag safe on touch.
  _bindCanvas() {
    const wrap = document.getElementById('canvas-wrap');

    wrap.addEventListener('pointerdown', e => {
      if (Canvas.spaceHeld || e.button === 1) return;
      if (this._gesturePointer !== null) return; // one gesture at a time
      if (Canvas.isPanning && e.pointerId !== Canvas.panPointerId) return;
      const target = e.target;
      const world = Canvas.screenToWorld(e.clientX, e.clientY);
      if (e.pointerType !== 'mouse') {
        this._touchDown = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId };
      }

      if (target.classList.contains('connect-point')) {
        const g = target.closest('.node-group');
        const nodeId = g.dataset.id;
        this._beginGesture(e, wrap);
        this.connectDrag = { fromId: nodeId, fromSide: target.dataset.side, x: world.x, y: world.y };
        e.stopPropagation();
        return;
      }

      if (target.classList.contains('resize-handle')) {
        const g = target.closest('.node-group');
        const node = this.state.nodes.find(n => n.id === g.dataset.id);
        this._beginGesture(e, wrap);
        this.resizeDrag = { node, startX: world.x, startY: world.y, origW: node.width, origH: node.height };
        this._saveHistory();
        e.stopPropagation();
        return;
      }

      const nodeG = target.closest('.node-group');
      if (nodeG) {
        const id = nodeG.dataset.id;

        // Touch has no hover: when a node is already selected, a drag that
        // starts near one of its side points creates a connection instead
        // of moving the node.
        if (e.pointerType !== 'mouse' && this.state.selectedIds.includes(id)) {
          const side = this._sideNearPointer(id, e.clientX, e.clientY, 24);
          if (side) {
            this._beginGesture(e, wrap);
            this.connectDrag = { fromId: id, fromSide: side, x: world.x, y: world.y };
            e.stopPropagation();
            return;
          }
        }

        if (!e.shiftKey) this.state.selectedConnIds = [];
        if (!e.shiftKey && !this.state.selectedIds.includes(id)) {
          this.state.selectedIds = [id];
        } else if (e.shiftKey) {
          this.state.selectedIds = this.state.selectedIds.includes(id)
            ? this.state.selectedIds.filter(x => x !== id) : [...this.state.selectedIds, id];
        }
        this._beginGesture(e, wrap);
        this.drag = { nodes: this.state.selectedIds.map(sid => {
          const n = this.state.nodes.find(x => x.id === sid);
          return { node: n, offX: world.x - n.x, offY: world.y - n.y };
        }), startX: world.x, startY: world.y, moved: false };
        this._saveHistory();
        this.render();
        if (e.pointerType !== 'mouse') this._armLongPress(e);
        e.stopPropagation();
        return;
      }

      if (target.classList.contains('conn-path') || target.classList.contains('conn-hit') || target.classList.contains('conn-label')) {
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
      // Skip if our own touch double-tap just handled this position.
      if (Date.now() - (this._touchDblAt || 0) < 700) return;
      this._onDoublePoint(e);
    });

    wrap.addEventListener('pointermove', e => {
      if (this._gesturePointer !== null && e.pointerId !== this._gesturePointer) return;
      if (this._longPress && Utils.dist(e.clientX, e.clientY, this._longPress.x, this._longPress.y) > 10) {
        this._cancelLongPress();
      }
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
        // Touch jitters a few px on a plain tap: require a small slop
        // before treating it as a real move (mouse keeps old behavior).
        if (!this.drag.moved && e.pointerType !== 'mouse' && this._touchDown
            && Utils.dist(e.clientX, e.clientY, this._touchDown.x, this._touchDown.y) < 6) {
          return;
        }
        this.drag.moved = true;
        this.drag.nodes.forEach(({ node, offX, offY }) => {
          node.x = world.x - offX;
          node.y = world.y - offY;
        });
        this.render();
      }
    });

    wrap.addEventListener('pointerup', e => {
      if (this._gesturePointer !== null && e.pointerId !== this._gesturePointer) return;
      this._cancelLongPress();
      if (this._menuPointer === e.pointerId) {
        // The tap that opened the long-press menu fires a click on release;
        // do not let that click close (or activate) the menu instantly.
        this._suppressClickUntil = Date.now() + 400;
        this._menuPointer = null;
      }

      if (this.connectDrag) {
        const drop = this._findDropTarget(e.clientX, e.clientY);
        if (drop && drop.toId !== this.connectDrag.fromId) {
          this._saveHistory();
          const type = this.state.mode === 'mindmap' ? 'curved' : 'orthogonal';
          this.state.connections.push(Connections.create(
            this.connectDrag.fromId, drop.toId,
            this.connectDrag.fromSide, drop.toSide,
            { type, arrowEnd: this.state.mode !== 'mindmap' }
          ));
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
      this._gesturePointer = null;

      if (e.pointerType !== 'mouse') this._detectDoubleTap(e);
    });

    wrap.addEventListener('pointercancel', e => {
      if (this._gesturePointer !== null && e.pointerId !== this._gesturePointer) return;
      this._cancelLongPress();
      if (this.connectDrag) {
        this.connectDrag = null;
        document.getElementById('overlay-layer').innerHTML = '';
        this.render();
      }
      if ((this.drag && !this.drag.moved) || (this.resizeDrag && !this.resizeDrag.moved)) {
        History.discardLast();
        this._updateUndoButtons();
      }
      this.drag = null;
      this.resizeDrag = null;
      this._gesturePointer = null;
      this._touchDown = null;
      this._lastTap = null;
    });

    wrap.addEventListener('contextmenu', e => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        // Touch long-press is handled by our own timer (with drag cleanup);
        // suppress the native menu/selection UI.
        e.preventDefault();
        return;
      }
      const nodeG = e.target.closest('.node-group');
      if (nodeG) {
        e.preventDefault();
        this.state.selectedIds = [nodeG.dataset.id];
        this.render();
        this._showContextMenu(e.clientX, e.clientY);
      }
    });
  },

  _beginGesture(e, wrap) {
    this._gesturePointer = e.pointerId;
    try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* pointer gone */ }
  },

  // Double click / double tap share one handler. Uses elementsFromPoint
  // because pointer capture retargets touch events to the wrapper.
  _onDoublePoint(e) {
    const els = document.elementsFromPoint(e.clientX, e.clientY);
    const world = Canvas.screenToWorld(e.clientX, e.clientY);

    const nodeG = els.map(el => el.closest ? el.closest('.node-group') : null).find(g => g);
    if (nodeG) {
      const node = this.state.nodes.find(n => n.id === nodeG.dataset.id);
      if (node) { this._startInlineEdit(node, e); return; }
    }

    const connEl = els.find(el => el.classList &&
      (el.classList.contains('conn-path') || el.classList.contains('conn-hit') || el.classList.contains('conn-label')));
    if (connEl) {
      const conn = this.state.connections.find(c => c.id === connEl.closest('g').dataset.id);
      if (conn) { this._startConnLabelEdit(conn); return; }
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
  },

  _detectDoubleTap(e) {
    const down = this._touchDown;
    this._touchDown = null;
    if (!down || down.id !== e.pointerId) return;
    if (Utils.dist(e.clientX, e.clientY, down.x, down.y) > 12 || Date.now() - down.t > 400) {
      this._lastTap = null;
      return;
    }
    const now = Date.now();
    const prev = this._lastTap;
    if (prev && now - prev.t < 350 && Utils.dist(e.clientX, e.clientY, prev.x, prev.y) < 30) {
      this._lastTap = null;
      this._touchDblAt = now;
      this._onDoublePoint(e);
    } else {
      this._lastTap = { x: e.clientX, y: e.clientY, t: now };
    }
  },

  // Long-press on a node (touch) opens the context menu, replacing
  // desktop right-click.
  _armLongPress(e) {
    this._cancelLongPress();
    const x = e.clientX, y = e.clientY, pointerId = e.pointerId;
    this._longPress = {
      x, y,
      timer: setTimeout(() => {
        this._longPress = null;
        if (this.drag && !this.drag.moved) {
          History.discardLast();
          this._updateUndoButtons();
          this.drag = null;
          this._gesturePointer = null;
          this._menuPointer = pointerId;
          this._suppressClickUntil = Date.now() + 900;
          this._showContextMenu(x, y);
        }
      }, 550)
    };
  },

  _cancelLongPress() {
    if (this._longPress) {
      clearTimeout(this._longPress.timer);
      this._longPress = null;
    }
  },

  // Distance (in screen px) from the pointer to a node's side connect
  // points; gives touch a generous grab radius without changing the
  // precise mouse hit areas.
  _sideNearPointer(nodeId, clientX, clientY, threshold) {
    const node = this.state.nodes.find(n => n.id === nodeId);
    if (!node) return null;
    // Cap the radius by node size: on small nodes the center is close to
    // the side points, and a body tap must still drag the node.
    const cap = Math.min(node.width, node.height) * Canvas.zoom * 0.35;
    const rect = Canvas.svg.getBoundingClientRect();
    let best = null, bestD = Math.min(threshold, cap);
    ['top', 'right', 'bottom', 'left'].forEach(side => {
      const p = Utils.getSidePoint(node, side);
      const sx = p.x * Canvas.zoom + Canvas.pan.x + rect.left;
      const sy = p.y * Canvas.zoom + Canvas.pan.y + rect.top;
      const d = Utils.dist(clientX, clientY, sx, sy);
      if (d <= bestD) { bestD = d; best = side; }
    });
    return best;
  },

  // Where did a connection drag end? Pointer capture means e.target is the
  // wrapper, so hit-test under the pointer instead. Falls back from an
  // exact connect-point to "any node, nearest side" which makes dropping
  // with a finger forgiving.
  _findDropTarget(clientX, clientY) {
    const els = document.elementsFromPoint(clientX, clientY);
    for (const el of els) {
      if (el.classList && el.classList.contains('connect-point')) {
        const g = el.closest('.node-group');
        if (g) return { toId: g.dataset.id, toSide: el.dataset.side };
      }
    }
    for (const el of els) {
      const g = el.closest ? el.closest('.node-group') : null;
      if (g) {
        const node = this.state.nodes.find(n => n.id === g.dataset.id);
        if (node) {
          const w = Canvas.screenToWorld(clientX, clientY);
          return { toId: node.id, toSide: Utils.nearestSide(node, w.x, w.y) };
        }
      }
    }
    return null;
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
      const newText = ta.value || I18n.t('defaultText');
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

  // Inline overlay input replaces window.prompt(), which blocks the page
  // and is unusable on mobile.
  _startConnLabelEdit(conn) {
    if (this.editor) { this.editor.remove(); this.editor = null; }
    const pos = Connections.labelPos(conn, this.state.nodes);
    const rect = Canvas.svg.getBoundingClientRect();
    const sx = pos.x * Canvas.zoom + Canvas.pan.x + rect.left;
    const sy = pos.y * Canvas.zoom + Canvas.pan.y + rect.top;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-editor inline-editor-label';
    input.value = conn.label || '';
    input.placeholder = I18n.t('labelPlaceholder');
    const w = 160;
    input.style.width = w + 'px';
    input.style.left = Utils.clamp(sx - w / 2, 8, window.innerWidth - w - 8) + 'px';
    input.style.top = Math.max(8, sy - 18) + 'px';
    document.body.appendChild(input);
    input.focus();
    input.select();

    let done = false;
    const finish = commit => {
      if (done) return;
      done = true;
      const v = input.value.trim();
      if (commit && v !== (conn.label || '')) {
        this._saveHistory();
        conn.label = v;
        this.render();
      }
      input.remove();
      this.editor = null;
    };
    input.addEventListener('blur', () => finish(true));
    input.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
      if (ev.key === 'Escape') { finish(false); }
    });
    this.editor = input;
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
    Utils.showToast(I18n.t('copied'));
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
    Utils.showToast(I18n.t('pasted'));
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
    const ok = () => Utils.showToast(I18n.t('shareCopied'));
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const copied = document.execCommand('copy');
        ta.remove();
        if (copied) { ok(); return; }
      } catch (e) { /* fall through to manual copy */ }
      Utils.showConfirm(I18n.t('shareTitle'), url + I18n.t('shareFailSuffix'));
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(ok).catch(fallback);
    } else {
      fallback();
    }
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
      if (node) this._pickColor(node);
    }
  },

  // Native <input type="color"> replaces the old hex prompt(): it gives a
  // real picker on both desktop and mobile.
  _pickColor(node) {
    if (this._colorInput) { this._colorInput.remove(); this._colorInput = null; }
    const orig = { fill: node.fillColor, stroke: node.strokeColor };
    const input = document.createElement('input');
    input.type = 'color';
    input.value = /^#[0-9a-fA-F]{6}$/.test(node.fillColor) ? node.fillColor : '#2d3748';
    input.className = 'hidden-color-input';
    document.body.appendChild(input);
    this._colorInput = input;

    input.addEventListener('input', () => {
      // Live preview without flooding the history stack.
      node.fillColor = input.value;
      node.strokeColor = input.value;
      this.render();
    });
    input.addEventListener('change', () => {
      const v = input.value;
      if (v !== orig.fill || v !== orig.stroke) {
        // Restore the pre-picker state so the undo snapshot is correct,
        // then commit the final color as one history step.
        node.fillColor = orig.fill;
        node.strokeColor = orig.stroke;
        this._saveHistory();
        node.fillColor = v;
        node.strokeColor = v;
        this.render();
      }
      input.remove();
      if (this._colorInput === input) this._colorInput = null;
    });
    input.click();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());