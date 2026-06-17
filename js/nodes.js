const Nodes = {
  defaultShape: 'rectangle',

  create(type, x, y, text, opts = {}) {
    if (text == null) text = I18n.t('defaultText');
    const size = Utils.measureText(text);
    const w = opts.width || Math.max(size.width, type === 'circle' ? 60 : 100);
    const h = opts.height || Math.max(size.height, type === 'circle' ? 60 : 44);
    return {
      id: Utils.uid(),
      type: type || this.defaultShape,
      x: x - w / 2, y: y - h / 2,
      width: w, height: h,
      text,
      fillColor: opts.fillColor || '#2d3748',
      strokeColor: opts.strokeColor || '#a0aec0',
      level: opts.level || 0,
      parentId: opts.parentId || null,
      side: opts.side || null,
      isCenter: opts.isCenter || false
    };
  },

  shapePath(node) {
    const { x, y, width: w, height: h, type } = node;
    switch (type) {
      case 'rounded':
        return `M${x + 12},${y} H${x + w - 12} Q${x + w},${y} ${x + w},${y + 12} V${y + h - 12} Q${x + w},${y + h} ${x + w - 12},${y + h} H${x + 12} Q${x},${y + h} ${x},${y + h - 12} V${y + 12} Q${x},${y} ${x + 12},${y} Z`;
      case 'diamond': {
        const cx = x + w / 2, cy = y + h / 2;
        return `M${cx},${y} L${x + w},${cy} L${cx},${y + h} L${x},${cy} Z`;
      }
      case 'circle': {
        const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
        return `M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy}`;
      }
      case 'parallelogram':
        return `M${x + 15},${y} L${x + w},${y} L${x + w - 15},${y + h} L${x},${y + h} Z`;
      case 'document':
        return `M${x},${y} H${x + w - 15} L${x + w},${y + 15} V${y + h} H${x} Z M${x + w - 15},${y} V${y + 15} H${x + w}`;
      case 'mindmap':
        return `M${x + 8},${y} H${x + w - 8} Q${x + w},${y} ${x + w},${y + 8} V${y + h - 8} Q${x + w},${y + h} ${x + w - 8},${y + h} H${x + 8} Q${x},${y + h} ${x},${y + h - 8} V${y + 8} Q${x},${y} ${x + 8},${y} Z`;
      default:
        return `M${x},${y} H${x + w} V${y + h} H${x} Z`;
    }
  },

  render(node, selected) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'node-group' + (selected ? ' selected' : ''));
    g.setAttribute('data-id', node.id);

    const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    shape.setAttribute('class', 'node-shape');
    shape.setAttribute('d', this.shapePath(node));
    shape.setAttribute('fill', node.fillColor);
    shape.setAttribute('stroke', node.strokeColor);
    shape.setAttribute('stroke-width', '2');
    g.appendChild(shape);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', 'node-text');
    text.setAttribute('x', node.x + node.width / 2);
    text.setAttribute('y', node.y + node.height / 2);
    const lines = node.text.split('\n');
    if (lines.length === 1) {
      text.textContent = node.text;
    } else {
      lines.forEach((line, i) => {
        const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tspan.setAttribute('x', node.x + node.width / 2);
        tspan.setAttribute('dy', i === 0 ? -(lines.length - 1) * 8 : 16);
        tspan.textContent = line;
        text.appendChild(tspan);
      });
    }
    g.appendChild(text);

    ['top', 'right', 'bottom', 'left'].forEach(side => {
      const pt = Utils.getSidePoint(node, side);
      const cp = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      cp.setAttribute('class', 'connect-point');
      cp.setAttribute('data-side', side);
      cp.setAttribute('cx', pt.x);
      cp.setAttribute('cy', pt.y);
      cp.setAttribute('r', 5);
      g.appendChild(cp);
    });

    const rh = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rh.setAttribute('class', 'resize-handle');
    rh.setAttribute('x', node.x + node.width - 6);
    rh.setAttribute('y', node.y + node.height - 6);
    rh.setAttribute('width', 10);
    rh.setAttribute('height', 10);
    g.appendChild(rh);

    // Invisible, larger hit area so the resize handle is grabbable on touch.
    const rhHit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rhHit.setAttribute('class', 'resize-handle resize-hit');
    rhHit.setAttribute('x', node.x + node.width - 13);
    rhHit.setAttribute('y', node.y + node.height - 13);
    rhHit.setAttribute('width', 26);
    rhHit.setAttribute('height', 26);
    g.appendChild(rhHit);

    return g;
  },

  updateText(node, text) {
    node.text = text;
    const size = Utils.measureText(text);
    node.width = Math.max(size.width, node.type === 'circle' ? 60 : 80);
    node.height = Math.max(size.height, node.type === 'circle' ? 60 : 36);
  },

  autoSizeMindmap(node) {
    const size = Utils.measureText(node.text, node.isCenter ? 15 : 13);
    node.width = Math.max(size.width, node.isCenter ? 140 : 80);
    node.height = Math.max(size.height, node.isCenter ? 50 : 36);
  }
};