// Page controller for org-chart.html / en/org-chart.html. A focused peer to
// js/app.js: reuses the same Canvas/History/Storage/Export/Utils/I18n
// singletons for pan/zoom/undo/save/export, but implements its own
// (smaller) interaction surface since org-chart nodes are created via
// toolbar buttons (add-child/add-peer) and auto-layout, not free-form
// double-click-to-place or connection-dragging like the flowchart tool.
const OrgApp = {
  state: {
    nodes: [],
    connections: [],
    selectedIds: []
  },

  drag: null,
  editor: null,
  _rendered: false,
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

    const urlData = Storage.decodeFromURL();
    if (urlData && urlData.nodes && urlData.nodes.length) {
      this._loadState(urlData);
    } else {
      const saved = Storage.load();
      if (saved && saved.nodes && saved.nodes.length) {
        this._loadState(saved);
      } else {
        this._startFresh();
      }
    }

    Storage.startAutoSave(() => this._getSaveState());
    this._updateToolbar();
  },

  _startFresh() {
    this.state.nodes = [];
    this.state.connections = [];
    const root = Orgchart.initRoot(this.state.nodes, this.state.connections);
    this.state.selectedIds = [root.id];
    History.reset();
    Canvas.fitToContent(this.state.nodes);
    this.render();
  },

  _getSaveState() {
    return {
      mode: 'orgchart',
      nodes: this.state.nodes,
      connections: this.state.connections,
      viewport: Canvas.getState()
    };
  },

  _loadState(data) {
    this.state.nodes = data.nodes || [];
    this.state.connections = data.connections || [];
    this.state.selectedIds = [];
    if (!this.state.nodes.length) {
      this._startFresh();
      return;
    }
    Canvas.setState(data.viewport);
    History.reset();
    this.render();
  },

  _snapshot() {
    return {
      nodes: Utils.deepClone(this.state.nodes),
      connections: Utils.deepClone(this.state.connections)
    };
  },

  _saveHistory() {
    History.push(this._snapshot());
  },

  render() {
    const connLayer = document.getElementById('connections-layer');
    const nodeLayer = document.getElementById('nodes-layer');
    connLayer.innerHTML = '';
    nodeLayer.innerHTML = '';

    this.state.connections.forEach(c => {
      connLayer.appendChild(Connections.render(c, this.state.nodes, false));
    });
    this.state.nodes.forEach(n => {
      nodeLayer.appendChild(Nodes.render(n, this.state.selectedIds.includes(n.id)));
    });
    this._rendered = true;
    this._updateUndoButtons();
    this._updateToolbar();
  },

  _updateUndoButtons() {
    document.getElementById('btn-undo').disabled = !History.canUndo();
    document.getElementById('btn-redo').disabled = !History.canRedo();
  },

  _selectedNode() {
    return this.state.nodes.find(n => this.state.selectedIds.includes(n.id)) || null;
  },

  _updateToolbar() {
    const node = this._selectedNode();
    const addChildBtn = document.getElementById('btn-add-child');
    const addPeerBtn = document.getElementById('btn-add-peer');
    if (addChildBtn) addChildBtn.disabled = !node;
    if (addPeerBtn) addPeerBtn.disabled = !node || !node.parentId;
  },

  addChild() {
    const parent = this._selectedNode();
    if (!parent) { Utils.showToast(I18n.t('orgSelectFirst')); return; }
    this._saveHistory();
    const child = Orgchart.addChild(parent, this.state.nodes, this.state.connections);
    this.state.selectedIds = [child.id];
    this.render();
    Canvas.fitToContent(this.state.nodes);
  },

  addPeer() {
    const sibling = this._selectedNode();
    if (!sibling) { Utils.showToast(I18n.t('orgSelectFirst')); return; }
    if (!sibling.parentId) { Utils.showToast(I18n.t('orgPeerNeedsParent')); return; }
    this._saveHistory();
    const peer = Orgchart.addPeer(sibling, this.state.nodes, this.state.connections);
    if (!peer) { History.discardLast(); return; }
    this.state.selectedIds = [peer.id];
    this.render();
    Canvas.fitToContent(this.state.nodes);
  },

  async deleteSelected() {
    const node = this._selectedNode();
    if (!node) return;
    const ok = await Utils.showConfirm(I18n.t('orgDeleteConfirmTitle'), I18n.t('orgDeleteConfirmMsg'));
    if (!ok) return;
    this._saveHistory();
    const ids = new Set([node.id]);
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
    this.state.nodes = this.state.nodes.filter(n => !ids.has(n.id));
    this.state.connections = this.state.connections.filter(c => !ids.has(c.fromId) && !ids.has(c.toId));
    this.state.selectedIds = [];
    if (!this.state.nodes.length) {
      this._startFresh();
      return;
    }
    Orgchart.relayout(this.state.nodes, this.state.connections);
    this.render();
  },

  _bindUI() {
    document.getElementById('btn-undo').addEventListener('click', () => this.undo());
    document.getElementById('btn-redo').addEventListener('click', () => this.redo());
    document.getElementById('btn-share').addEventListener('click', () => this.shareURL());
    document.getElementById('btn-add-child').addEventListener('click', () => this.addChild());
    document.getElementById('btn-add-peer').addEventListener('click', () => this.addPeer());
    document.getElementById('btn-fit-view').addEventListener('click', () => Canvas.fitToContent(this.state.nodes));
    document.getElementById('toggle-grid').addEventListener('change', e => Canvas.toggleGrid(e.target.checked));

    document.getElementById('zoom-in').addEventListener('click', () => {
      const r = Canvas.svg.getBoundingClientRect();
      Canvas.setZoom(Canvas.zoom * 1.2, r.width / 2, r.height / 2);
    });
    document.getElementById('zoom-out').addEventListener('click', () => {
      const r = Canvas.svg.getBoundingClientRect();
      Canvas.setZoom(Canvas.zoom / 1.2, r.width / 2, r.height / 2);
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

    document.querySelectorAll('.mobile-toolbar button').forEach(b => {
      b.addEventListener('click', () => {
        const a = b.dataset.action;
        if (a === 'undo') this.undo();
        if (a === 'add-child') this.addChild();
        if (a === 'edit') {
          const node = this._selectedNode();
          if (node) this._startInlineEdit(node);
          else Utils.showToast(I18n.t('orgSelectFirst'));
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
      if (Date.now() < this._suppressClickUntil) return;
      this._hideContextMenu();
    });
  },

  // Pointer Events cover mouse, touch and pen with one code path, matching
  // the pattern used in js/app.js. Org-chart nodes are not resizable and
  // are not connection-drag sources (all edges come from add-child/add-peer),
  // so this is a trimmed version of app.js's canvas binding: select + drag
  // to reposition (auto-layout re-snaps on next add/delete, but a manual
  // nudge for readability is still allowed) + pan/zoom via Canvas.
  _bindCanvas() {
    const wrap = document.getElementById('canvas-wrap');

    wrap.addEventListener('pointerdown', e => {
      if (Canvas.spaceHeld || e.button === 1) return;
      if (this._gesturePointer !== null) return;
      if (Canvas.isPanning && e.pointerId !== Canvas.panPointerId) return;
      const target = e.target;
      const world = Canvas.screenToWorld(e.clientX, e.clientY);
      if (e.pointerType !== 'mouse') {
        this._touchDown = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId };
      }

      const nodeG = target.closest('.node-group');
      if (nodeG) {
        const id = nodeG.dataset.id;
        this.state.selectedIds = [id];
        this._beginGesture(e, wrap);
        const node = this.state.nodes.find(x => x.id === id);
        this.drag = { node, offX: world.x - node.x, offY: world.y - node.y, moved: false };
        this._saveHistory();
        this.render();
        if (e.pointerType !== 'mouse') this._armLongPress(e);
        e.stopPropagation();
        return;
      }

      if (!Canvas.spaceHeld) {
        this.state.selectedIds = [];
        this.render();
      }
    });

    wrap.addEventListener('dblclick', e => {
      if (Date.now() - (this._touchDblAt || 0) < 700) return;
      this._onDoublePoint(e);
    });

    wrap.addEventListener('pointermove', e => {
      if (this._gesturePointer !== null && e.pointerId !== this._gesturePointer) return;
      if (this._longPress && Utils.dist(e.clientX, e.clientY, this._longPress.x, this._longPress.y) > 10) {
        this._cancelLongPress();
      }
      const world = Canvas.screenToWorld(e.clientX, e.clientY);

      if (this.drag) {
        if (!this.drag.moved && e.pointerType !== 'mouse' && this._touchDown
            && Utils.dist(e.clientX, e.clientY, this._touchDown.x, this._touchDown.y) < 6) {
          return;
        }
        this.drag.moved = true;
        this.drag.node.x = world.x - this.drag.offX;
        this.drag.node.y = world.y - this.drag.offY;
        this.render();
      }
    });

    wrap.addEventListener('pointerup', e => {
      if (this._gesturePointer !== null && e.pointerId !== this._gesturePointer) return;
      this._cancelLongPress();
      if (this._menuPointer === e.pointerId) {
        this._suppressClickUntil = Date.now() + 400;
        this._menuPointer = null;
      }
      if (this.drag && !this.drag.moved) {
        History.discardLast();
        this._updateUndoButtons();
      }
      this.drag = null;
      this._gesturePointer = null;
      if (e.pointerType !== 'mouse') this._detectDoubleTap(e);
    });

    wrap.addEventListener('pointercancel', e => {
      if (this._gesturePointer !== null && e.pointerId !== this._gesturePointer) return;
      this._cancelLongPress();
      if (this.drag && !this.drag.moved) {
        History.discardLast();
        this._updateUndoButtons();
      }
      this.drag = null;
      this._gesturePointer = null;
      this._touchDown = null;
      this._lastTap = null;
    });

    wrap.addEventListener('contextmenu', e => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
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

  _onDoublePoint(e) {
    const els = document.elementsFromPoint(e.clientX, e.clientY);
    const nodeG = els.map(el => el.closest ? el.closest('.node-group') : null).find(g => g);
    if (nodeG) {
      const node = this.state.nodes.find(n => n.id === nodeG.dataset.id);
      if (node) { this.state.selectedIds = [node.id]; this.render(); this._startInlineEdit(node, e); }
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

  _bindKeyboard() {
    document.addEventListener('keydown', e => {
      if (e.target.matches('input, textarea, select')) return;
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); this.redo(); }
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
      if (e.key === 'Tab') { e.preventDefault(); this.addChild(); }
    });
  },

  // Two stacked inputs (name, title) instead of the flowchart's single
  // textarea, since orgchart nodes store name/title as separate fields.
  _startInlineEdit(node, e) {
    if (this.editor) { this.editor.remove(); this.editor = null; }
    const rect = Canvas.svg.getBoundingClientRect();
    const sx = (node.x + node.width / 2) * Canvas.zoom + Canvas.pan.x + rect.left;
    const sy = (node.y + node.height / 2) * Canvas.zoom + Canvas.pan.y + rect.top;
    const w = Math.max(node.width * Canvas.zoom, 120);

    const wrap = document.createElement('div');
    wrap.className = 'inline-editor org-inline-editor';
    wrap.style.left = (sx - w / 2) + 'px';
    wrap.style.top = (sy - 20) + 'px';
    wrap.style.width = w + 'px';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = node.name;
    nameInput.placeholder = I18n.t('orgNamePlaceholder');
    nameInput.className = 'org-inline-name';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = node.title;
    titleInput.placeholder = I18n.t('orgTitlePlaceholder');
    titleInput.className = 'org-inline-title';

    wrap.appendChild(nameInput);
    wrap.appendChild(titleInput);
    document.body.appendChild(wrap);
    nameInput.focus();
    nameInput.select();

    let done = false;
    const finish = commit => {
      if (done) return;
      done = true;
      if (commit) {
        const newName = nameInput.value.trim() || I18n.t('orgDefaultName');
        const newTitle = titleInput.value.trim() || I18n.t('orgDefaultTitle');
        if (newName !== node.name || newTitle !== node.title) {
          this._saveHistory();
          Nodes.updateOrgchartText(node, newName, newTitle);
          // Text edits can change a card's width; re-run layout so a long
          // name/title never overlaps a sibling subtree.
          Orgchart.relayout(this.state.nodes, this.state.connections);
        }
      }
      wrap.remove();
      this.editor = null;
      this.render();
    };

    const onBlurCheck = () => {
      // Only finish once both inputs have lost focus (not when tabbing
      // from name -> title within the same editor).
      setTimeout(() => {
        if (!wrap.contains(document.activeElement)) finish(true);
      }, 0);
    };
    nameInput.addEventListener('blur', onBlurCheck);
    titleInput.addEventListener('blur', onBlurCheck);
    [nameInput, titleInput].forEach(inp => {
      inp.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
        if (ev.key === 'Escape') { finish(false); }
        if (ev.key === 'Tab' && inp === nameInput && !ev.shiftKey) {
          ev.preventDefault();
          titleInput.focus();
          titleInput.select();
        }
      });
    });
    this.editor = wrap;
  },

  _applyStyle(prop, value) {
    if (!this.state.selectedIds.length) return;
    this._saveHistory();
    this.state.selectedIds.forEach(id => {
      const n = this.state.nodes.find(x => x.id === id);
      if (n) n[prop] = value;
    });
    this.render();
  },

  undo() {
    const snap = History.undo(this._snapshot());
    if (!snap) return;
    this.state.nodes = snap.nodes;
    this.state.connections = snap.connections;
    this.state.selectedIds = [];
    this.render();
  },

  redo() {
    const snap = History.redo(this._snapshot());
    if (!snap) return;
    this.state.nodes = snap.nodes;
    this.state.connections = snap.connections;
    this.state.selectedIds = [];
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
    if (action === 'add-child') this.addChild();
    if (action === 'add-peer') this.addPeer();
    if (action === 'edit') {
      const node = this._selectedNode();
      if (node) this._startInlineEdit(node, { clientX: 0, clientY: 0 });
    }
    if (action === 'color') {
      const node = this._selectedNode();
      if (node) this._pickColor(node);
    }
  },

  _pickColor(node) {
    if (this._colorInput) { this._colorInput.remove(); this._colorInput = null; }
    const orig = { fill: node.fillColor, stroke: node.strokeColor };
    const input = document.createElement('input');
    input.type = 'color';
    input.value = /^#[0-9a-fA-F]{6}$/.test(node.strokeColor) ? node.strokeColor : '#63b3ed';
    input.className = 'hidden-color-input';
    document.body.appendChild(input);
    this._colorInput = input;

    input.addEventListener('input', () => {
      node.strokeColor = input.value;
      this.render();
    });
    input.addEventListener('change', () => {
      const v = input.value;
      if (v !== orig.stroke) {
        node.strokeColor = orig.stroke;
        this._saveHistory();
        node.strokeColor = v;
        this.render();
      }
      input.remove();
      if (this._colorInput === input) this._colorInput = null;
    });
    input.click();
  }
};

document.addEventListener('DOMContentLoaded', () => OrgApp.init());
