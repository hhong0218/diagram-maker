const Mindmap = {
  addChild(parent, nodes, connections) {
    const children = nodes.filter(n => n.parentId === parent.id);
    const side = parent.isCenter
      ? (children.filter(c => c.side === 'left').length <= children.filter(c => c.side === 'right').length ? 'right' : 'left')
      : (parent.side || 'right');
    const level = (parent.level || 0) + 1;
    const color = Utils.MINDMAP_COLORS[level % Utils.MINDMAP_COLORS.length];
    const spread = children.length * 70;
    const xOff = side === 'right' ? 200 : -200;

    const child = Nodes.create('mindmap', parent.x + xOff, parent.y + spread - 30, '새 노드', {
      fillColor: color, strokeColor: color, level, parentId: parent.id, side
    });
    Nodes.autoSizeMindmap(child);
    child.x = parent.x + xOff - child.width / 2;
    child.y = parent.y + spread;

    nodes.push(child);
    connections.push(Connections.create(parent.id, child.id,
      side === 'right' ? 'right' : 'left',
      side === 'right' ? 'left' : 'right',
      { type: 'curved', arrowEnd: false, arrowStart: false, color }
    ));

    this.relayout(nodes, connections);
    return child;
  },

  relayout(nodes, connections) {
    const center = nodes.find(n => n.isCenter);
    if (!center) return;
    center.x = 0;
    center.y = 0;

    const spacing = 70;
    const gapX = 60;
    const childrenOf = (parentId, side) =>
      nodes.filter(n => n.parentId === parentId && (n.side === side || (!n.side && side === 'right')));

    // Height a node's subtree needs so sibling branches never overlap.
    const subtreeHeight = (node, side) => {
      const children = childrenOf(node.id, side);
      if (!children.length) return spacing;
      return Math.max(spacing, children.reduce((s, c) => s + subtreeHeight(c, side), 0));
    };

    const layoutSide = (parent, side) => {
      const children = childrenOf(parent.id, side);
      if (!children.length) return;
      const parentCY = parent.y + parent.height / 2;
      const total = children.reduce((s, c) => s + subtreeHeight(c, side), 0);
      let cursor = parentCY - total / 2;
      children.forEach(child => {
        Nodes.autoSizeMindmap(child);
        const h = subtreeHeight(child, side);
        child.x = side === 'right' ? parent.x + parent.width + gapX : parent.x - gapX - child.width;
        child.y = cursor + h / 2 - child.height / 2;
        cursor += h;
        layoutSide(child, side);
      });
    };

    layoutSide(center, 'left');
    layoutSide(center, 'right');
  },

  initCenter(nodes, connections) {
    const center = Nodes.create('mindmap', 0, 0, '중심 주제', {
      fillColor: Utils.MINDMAP_COLORS[0],
      strokeColor: Utils.MINDMAP_COLORS[0],
      level: 0, isCenter: true
    });
    Nodes.autoSizeMindmap(center);
    center.x = -center.width / 2;
    center.y = -center.height / 2;
    nodes.push(center);
    return center;
  }
};