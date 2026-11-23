// Marisol Heat — audio: WebAudio synth SFX + night-drive music loop. Lazy init on gesture.
export class AudioSys {
  constructor() {
    this.ctx = null; this.master = null; this.musicTimer = 0; this.muted = false;
    this.step = 0;
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  }
  tone(freq, dur, type = 'square', vol = 0.2, slideTo = 0) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur);
    } catch (e) {}
  }
  noise(dur, vol = 0.15) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      let n = 1234567 + len;
      for (let i = 0; i < len; i++) { n = (Math.imul(n, 1103515245) + 12345) & 0x7fffffff; d[i] = (n / 0x40000000 - 1) * (1 - i / len); }
      const s = this.ctx.createBufferSource(); s.buffer = buf;
      const g = this.ctx.createGain(); g.gain.value = vol;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
      s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
    } catch (e) {}
  }
  shoot() { this.noise(0.12, 0.25); this.tone(180, 0.08, 'square', 0.15, 60); }
  sirenBlip() { this.tone(880, 0.18, 'sine', 0.08, 660); }
  pickup() { this.tone(660, 0.1, 'sine', 0.2); this.tone(990, 0.15, 'sine', 0.2); }
  missionDone() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.22), i * 110)); }
  crash() { this.noise(0.3, 0.3); this.tone(90, 0.25, 'sawtooth', 0.2, 40); }
  engine(rpm) { if (!this.ctx || this.muted) return; this.tone(50 + rpm * 60, 0.08, 'sawtooth', 0.03); }
  // Deterministic 8-step bassline; tick is the fixed-step counter, no wall clock.
  musicTick(tick) {
    if (!this.ctx || this.muted) return;
    if (tick % 30 !== 0) return;
    const bass = [55, 55, 65.4, 49, 55, 55, 73.4, 82.4];
    const lead = [220, 0, 277, 0, 330, 0, 294, 0];
    const i = Math.floor(tick / 30) % 8;
    this.tone(bass[i], 0.5, 'triangle', 0.12);
    if (lead[i]) this.tone(lead[i], 0.3, 'sine', 0.05);
  }
}
