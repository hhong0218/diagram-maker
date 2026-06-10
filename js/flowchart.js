const Flowchart = {
  autoAlign(nodes, connections) {
    if (!nodes.length) return;

    const adj = {};
    const inDeg = {};
    nodes.forEach(n => { adj[n.id] = []; inDeg[n.id] = 0; });
    connections.forEach(c => {
      if (adj[c.fromId]) adj[c.fromId].push(c.toId);
      if (inDeg[c.toId] !== undefined) inDeg[c.toId]++;
    });

    const layers = {};
    const queue = nodes.filter(n => inDeg[n.id] === 0).map(n => n.id);
    const visited = new Set();

    while (queue.length) {
      const id = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);
      const layer = layers[id] || 0;
      (adj[id] || []).forEach(childId => {
        layers[childId] = Math.max(layers[childId] || 0, layer + 1);
        inDeg[childId]--;
        if (inDeg[childId] <= 0) queue.push(childId);
      });
    }

    nodes.forEach(n => {
      if (!visited.has(n.id)) layers[n.id] = 0;
    });

    const byLayer = {};
    nodes.forEach(n => {
      const l = layers[n.id] || 0;
      if (!byLayer[l]) byLayer[l] = [];
      byLayer[l].push(n);
    });

    const gapX = 180, gapY = 100, startX = 100, startY = 80;
    Object.keys(byLayer).sort((a, b) => a - b).forEach(layer => {
      const group = byLayer[layer];
      const totalW = group.reduce((s, n) => s + n.width, 0) + (group.length - 1) * gapX;
      let cx = startX - totalW / 2 + 400;
      group.forEach(n => {
        n.x = cx;
        n.y = startY + layer * gapY;
        cx += n.width + gapX;
      });
    });
  }
};