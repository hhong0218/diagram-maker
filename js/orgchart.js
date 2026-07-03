const Orgchart = {
  DEFAULT_NAME_KEY: 'orgRootName',
  ROOT_COLOR: '#63b3ed',
  NODE_FILL: '#2d3748',
  NODE_STROKE: '#718096',

  initRoot(nodes, connections, name, title) {
    const root = Nodes.create('orgchart', 0, 0, null, {
      fillColor: this.NODE_FILL,
      strokeColor: this.ROOT_COLOR,
      level: 0,
      isRoot: true
    });
    root.name = name || I18n.t('orgDefaultName');
    root.title = title || I18n.t('orgDefaultTitle');
    this._syncText(root);
    Nodes.autoSizeOrgchart(root);
    root.x = -root.width / 2;
    root.y = -root.height / 2;
    nodes.push(root);
    return root;
  },

  addChild(parent, nodes, connections) {
    const level = (parent.level || 0) + 1;
    const child = Nodes.create('orgchart', 0, 0, null, {
      fillColor: this.NODE_FILL,
      strokeColor: this.NODE_STROKE,
      level,
      parentId: parent.id,
      isRoot: false
    });
    child.name = I18n.t('orgDefaultName');
    child.title = I18n.t('orgDefaultTitle');
    this._syncText(child);
    Nodes.autoSizeOrgchart(child);

    nodes.push(child);
    connections.push(Connections.create(parent.id, child.id, 'bottom', 'top', {
      type: 'orthogonal', arrowStart: false, arrowEnd: false, color: '#718096'
    }));

    this.relayout(nodes, connections);
    return child;
  },

  addPeer(sibling, nodes, connections) {
    if (!sibling.parentId) return null; // root has no parent to attach a peer to
    const parent = nodes.find(n => n.id === sibling.parentId);
    if (!parent) return null;
    return this.addChild(parent, nodes, connections);
  },

  // Level-based top-down tree layout, structurally adapted from
  // Mindmap.relayout(): same subtree-sizing recursion, axis-swapped.
  // Mindmap stacks children vertically and branches left/right from a
  // center; here children stack horizontally and branch downward only
  // from a single root. Deliberately simple (no contour-tracking, no
  // edge-crossing minimization) - sufficient for typical org trees.
  relayout(nodes, connections) {
    const root = nodes.find(n => n.isRoot);
    if (!root) return;
    root.x = -root.width / 2;
    root.y = 0;

    const gapX = 40;
    const levelGap = 90;
    const childrenOf = parentId => nodes.filter(n => n.parentId === parentId);

    // Width a node's subtree needs so sibling branches never overlap.
    const subtreeWidth = node => {
      const children = childrenOf(node.id);
      if (!children.length) return node.width;
      const total = children.reduce((s, c) => s + subtreeWidth(c), 0) + gapX * (children.length - 1);
      return Math.max(node.width, total);
    };

    const layout = (node, centerX, depth) => {
      node.x = centerX - node.width / 2;
      node.y = depth * levelGap;
      const children = childrenOf(node.id);
      if (!children.length) return;
      const widths = children.map(subtreeWidth);
      const total = widths.reduce((s, w) => s + w, 0) + gapX * (children.length - 1);
      let cursor = centerX - total / 2;
      children.forEach((child, i) => {
        const w = widths[i];
        layout(child, cursor + w / 2, depth + 1);
        cursor += w + gapX;
      });
    };

    layout(root, root.x + root.width / 2, 0);
  },

  _syncText(node) {
    node.text = node.name + '\n' + node.title;
  }
};
