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

    const layoutSide = (parentId, side, depth) => {
      const children = nodes.filter(n => n.parentId === parentId && (n.side === side || (!n.side && side === 'right')));
      const spacing = 70;
      const totalH = children.length * spacing;
      children.forEach((child, i) => {
        Nodes.autoSizeMindmap(child);
        const xOff = (side === 'right' ? 1 : -1) * (180 + depth * 40);
        child.x = center.x + xOff + (side === 'right' ? 0 : -child.width);
        child.y = center.y + (i - (children.length - 1) / 2) * spacing;
        layoutSide(child.id, side, depth + 1);
      });
    };

    layoutSide(center.id, 'left', 0);
    layoutSide(center.id, 'right', 0);
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