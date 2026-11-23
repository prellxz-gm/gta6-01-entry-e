// Marisol Heat — missions: 9 story missions, district standing, race checkpoints.
import { MISSIONS, DISTRICTS } from './config.js';

export class MissionSys {
  constructor() {
    this.idx = 0;
    this.state = 'idle'; // idle | active | done
    this.timer = 0;
    this.checkpoints = [];
    this.cpIdx = 0;
    this.takedownLeft = 0;
    this.message = '';
    this.standing = {}; // districtId -> {rep, rank}
    for (const d of DISTRICTS) this.standing[d.id] = { rep: 0, rank: 0 };
    this.completed = 0;
  }

  current() { return MISSIONS[this.idx] || null; }

  start() {
    const m = this.current();
    if (!m) return null;
    this.state = 'active';
    this.timer = m.type === 'race' ? (m.id === 8 ? 150 : 75) : 0;
    this.checkpoints = [];
    this.cpIdx = 0;
    if (m.type === 'race') {
      const [tx, tz] = m.target;
      this.checkpoints = [
        [tx - 60, tz + 40], [tx + 40, tz - 60], [tx, tz],
      ];
    }
    if (m.type === 'takedown') this.takedownLeft = 3;
    if (m.type === 'escape') this.message = 'Wanted level raised! Lose the cops, then reach the safehouse.';
    return m;
  }

  targetPos() {
    const m = this.current();
    if (!m || this.state !== 'active') return null;
    if (m.type === 'race') return this.checkpoints[this.cpIdx] || m.target;
    return m.target;
  }

  rankName(districtId) {
    const d = DISTRICTS.find((x) => x.id === districtId);
    const s = this.standing[districtId];
    return d.rankNames[Math.min(s.rank, d.rankNames.length - 1)];
  }

  complete(events) {
    const m = this.current();
    this.state = 'done';
    this.completed++;
    const s = this.standing[m.district];
    s.rep += 1 + (events.paintBonus ? 1 : 0);
    if (s.rep >= 3 && s.rank < 3) { s.rank++; s.rep = 0; this.message = `Respect up in ${m.district}! New rank: ${this.rankName(m.district)}`; }
    return { cash: m.reward, mission: m };
  }

  update(dt, px, pz, wanted, events) {
    const m = this.current();
    if (!m || this.state !== 'active') return null;
    if (m.type === 'race') {
      this.timer -= dt;
      if (this.timer <= 0) { this.state = 'idle'; this.message = 'Race lost — too slow. Press M to retry.'; return { failed: true, mission: m }; }
      const cp = this.checkpoints[this.cpIdx];
      if (cp && Math.hypot(px - cp[0], pz - cp[1]) < 8) {
        this.cpIdx++;
        events.checkpoint();
        if (this.cpIdx >= this.checkpoints.length) return this.complete(events);
        this.message = `Checkpoint ${this.cpIdx + 1}/${this.checkpoints.length}`;
      }
      return null;
    }
    if (m.type === 'escape') {
      if (wanted === 0 && Math.hypot(px - m.target[0], pz - m.target[1]) < 8) return this.complete(events);
      return null;
    }
    if (Math.hypot(px - m.target[0], pz - m.target[1]) < 7) {
      if (m.type === 'takedown') {
        if (this.takedownLeft > 0) { this.message = `Take out the rivals: ${this.takedownLeft} left`; return null; }
        return this.complete(events);
      }
      return this.complete(events);
    }
    return null;
  }

  retry() { if (this.state === 'idle') this.start(); }
  next() { this.idx++; this.state = 'idle'; this.message = ''; return this.start(); }
}
