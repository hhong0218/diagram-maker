const History = {
  // Stack of past states. App pushes a snapshot BEFORE each mutation,
  // so stack[index] is always the state to restore on undo. undo/redo
  // receive the current live state so it can be re-entered for redo.
  stack: [],
  index: -1,
  maxSize: 50,

  push(state) {
    const snapshot = Utils.deepClone(state);
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(snapshot);
    if (this.stack.length > this.maxSize) this.stack.shift();
    this.index = this.stack.length - 1;
  },

  // Drop the last pushed snapshot (e.g. a drag that never moved).
  discardLast() {
    if (this.index >= 0 && this.index === this.stack.length - 1) {
      this.stack.pop();
      this.index--;
    }
  },

  undo(current) {
    if (this.index < 0) return null;
    const snap = this.stack[this.index];
    this.stack[this.index] = Utils.deepClone(current);
    this.index--;
    return Utils.deepClone(snap);
  },

  redo(current) {
    if (this.index >= this.stack.length - 1) return null;
    this.index++;
    const snap = this.stack[this.index];
    this.stack[this.index] = Utils.deepClone(current);
    return Utils.deepClone(snap);
  },

  reset() {
    this.stack = [];
    this.index = -1;
  },

  canUndo() { return this.index >= 0; },
  canRedo() { return this.index < this.stack.length - 1; }
};
