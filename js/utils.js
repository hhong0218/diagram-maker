const Utils = {
  uid() {
    return 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  },

  clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  },

  dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  },

  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  getNodeCenter(node) {
    return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
  },

  getSidePoint(node, side) {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    switch (side) {
      case 'top': return { x: cx, y: node.y };
      case 'bottom': return { x: cx, y: node.y + node.height };
      case 'left': return { x: node.x, y: cy };
      case 'right': return { x: node.x + node.width, y: cy };
      default: return { x: cx, y: cy };
    }
  },

  nearestSide(node, px, py) {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const dx = px - cx;
    const dy = py - cy;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'bottom' : 'top';
  },

  measureText(text, fontSize = 13) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${fontSize}px sans-serif`;
    const lines = text.split('\n');
    let maxW = 0;
    lines.forEach(l => { maxW = Math.max(maxW, ctx.measureText(l).width); });
    return { width: maxW + 24, height: lines.length * (fontSize + 4) + 16 };
  },

  MINDMAP_COLORS: ['#4299e1', '#48bb78', '#ed8936', '#9f7aea', '#f56565', '#38b2ac', '#ecc94b'],

  showToast(msg, duration = 2500) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(Utils._toastTimer);
    Utils._toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
  },

  showConfirm(title, message) {
    return new Promise(resolve => {
      const modal = document.getElementById('modal-confirm');
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-message').textContent = message;
      modal.classList.remove('hidden');
      const yes = document.getElementById('confirm-yes');
      const no = document.getElementById('confirm-no');
      const cleanup = (result) => {
        modal.classList.add('hidden');
        yes.removeEventListener('click', onYes);
        no.removeEventListener('click', onNo);
        resolve(result);
      };
      const onYes = () => cleanup(true);
      const onNo = () => cleanup(false);
      yes.addEventListener('click', onYes);
      no.addEventListener('click', onNo);
    });
  }
};