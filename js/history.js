const History = {
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

  undo() {
    if (this.index <= 0) return null;
    this.index--;
    return Utils.deepClone(this.stack[this.index]);
  },

  redo() {
    if (this.index >= this.stack.length - 1) return null;
    this.index++;
    return Utils.deepClone(this.stack[this.index]);
  },

  reset(state) {
    this.stack = [Utils.deepClone(state)];
    this.index = 0;
  },

  canUndo() { return this.index > 0; },
  canRedo() { return this.index < this.stack.length - 1; }
};