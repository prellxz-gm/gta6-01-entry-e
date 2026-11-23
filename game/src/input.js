// Marisol Heat — input: keyboard + mouse, edge-triggered actions.
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set(); // edge: consumed once per frame
    this.mouseDown = false;
    this.mousePressed = false;
    this.mouseX = 0; this.mouseY = 0;
    this.enabled = true;
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('mousedown', (e) => {
      if (e.target && (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT')) return;
      this.mouseDown = true; this.mousePressed = true;
      this.mouseX = e.clientX; this.mouseY = e.clientY;
    });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseDown = false; });
  }
  down(code) { return this.keys.has(code); }
  // Edge trigger, consumed on first read: with several fixed steps per
  // rendered frame, a press must fire exactly once, not once per step
  // (otherwise P would pause+resume and E would enter+exit in one frame).
  wasPressed(code) {
    if (this.pressed.has(code)) { this.pressed.delete(code); return true; }
    return false;
  }
  wasMousePressed() {
    if (this.mousePressed) { this.mousePressed = false; return true; }
    return false;
  }
  axis(neg, pos) { return (this.keys.has(pos) ? 1 : 0) - (this.keys.has(neg) ? 1 : 0); }
  endFrame(stepsRan = 1) {
    // Only drop unconsumed presses when at least one fixed step ran and
    // had its chance to read them; otherwise the press waits for the
    // next frame instead of being lost on a fast (0-step) frame.
    if (stepsRan > 0) { this.pressed.clear(); this.mousePressed = false; }
  }
}
