const Connections = {
  create(fromId, toId, fromSide, toSide, opts = {}) {
    return {
      id: Utils.uid(),
      fromId, toId, fromSide, toSide,
      type: opts.type || 'orthogonal',
      arrowStart: opts.arrowStart || false,
      arrowEnd: opts.arrowEnd !== undefined ? opts.arrowEnd : true,
      color: opts.color || '#a0aec0',
      label: opts.label || ''
    };
  },

  pathD(conn, nodes) {
    const from = nodes.find(n => n.id === conn.fromId);
    const to = nodes.find(n => n.id === conn.toId);
    if (!from || !to) return '';

    const p1 = Utils.getSidePoint(from, conn.fromSide);
    const p2 = Utils.getSidePoint(to, conn.toSide);

    if (conn.type === 'straight') {
      return `M${p1.x},${p1.y} L${p2.x},${p2.y}`;
    }

    if (conn.type === 'curved') {
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      const dx = Math.abs(p2.x - p1.x);
      const dy = Math.abs(p2.y - p1.y);
      let cx1, cy1, cx2, cy2;
      if (dx > dy) {
        cx1 = (p1.x + p2.x) / 2; cy1 = p1.y;
        cx2 = (p1.x + p2.x) / 2; cy2 = p2.y;
      } else {
        cx1 = p1.x; cy1 = (p1.y + p2.y) / 2;
        cx2 = p2.x; cy2 = (p1.y + p2.y) / 2;
      }
      return `M${p1.x},${p1.y} C${cx1},${cy1} ${cx2},${cy2} ${p2.x},${p2.y}`;
    }

    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    if (Math.abs(p1.x - p2.x) > Math.abs(p1.y - p2.y)) {
      return `M${p1.x},${p1.y} L${mx},${p1.y} L${mx},${p2.y} L${p2.x},${p2.y}`;
    }
    return `M${p1.x},${p1.y} L${p1.x},${my} L${p2.x},${my} L${p2.x},${p2.y}`;
  },

  labelPos(conn, nodes) {
    const from = nodes.find(n => n.id === conn.fromId);
    const to = nodes.find(n => n.id === conn.toId);
    if (!from || !to) return { x: 0, y: 0 };
    const p1 = Utils.getSidePoint(from, conn.fromSide);
    const p2 = Utils.getSidePoint(to, conn.toSide);
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 - 8 };
  },

  render(conn, nodes, selected) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-id', conn.id);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'conn-path' + (selected ? ' selected' : ''));
    path.setAttribute('d', this.pathD(conn, nodes));
    path.setAttribute('stroke', conn.color);
    let markers = '';
    if (conn.arrowEnd) markers += 'url(#arrow-end) ';
    if (conn.arrowStart) markers += 'url(#arrow-start) ';
    if (markers) path.setAttribute('marker-end', conn.arrowEnd ? 'url(#arrow-end)' : '');
    if (conn.arrowStart) path.setAttribute('marker-start', 'url(#arrow-start)');
    g.appendChild(path);

    if (conn.label) {
      const pos = this.labelPos(conn, nodes);
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('class', 'conn-label');
      label.setAttribute('x', pos.x);
      label.setAttribute('y', pos.y);
      label.textContent = conn.label;
      g.appendChild(label);
    }

    return g;
  }
};