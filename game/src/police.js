// Marisol Heat — police: wanted 0–5, cop chase/ram, heli at 3+, roadblocks at 4+.
import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Police {
  constructor(scene, world, rng) {
    this.scene = scene; this.world = world; this.rng = rng;
    this.wanted = 0;
    this.heat = 0; // 0..100, drives wanted
    this.cops = [];
    this.heli = null;
    this.roadblocks = [];
    this.cooldown = 0;
    this.sirenTick = 0;
  }

  addHeat(n) {
    this.heat = Math.min(100, this.heat + n);
    this.wanted = this.heat <= 0 ? 0 : Math.min(5, 1 + Math.floor(this.heat / 20));
  }

  spawnCop(px, pz) {
    const car = this.world.makeCar(0x1a1a1a, this.rng);
    const a = this.rng.range(0, Math.PI * 2);
    const d = this.rng.range(30, 55);
    car.mesh.position.set(Math.max(-205, Math.min(205, px + Math.cos(a) * d)), 0,
      Math.max(-205, Math.min(205, pz + Math.sin(a) * d)));
    // police light bar
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    bar.position.y = 1.55; car.mesh.add(bar);
    this.scene.add(car.mesh);
    this.cops.push({ mesh: car.mesh, bar, x: car.mesh.position.x, z: car.mesh.position.z, speed: 0, hp: 60 });
  }

  spawnHeli() {
    if (this.heli) return;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 5),
      new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.5, metalness: 0.5 }));
    g.add(body);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x333344 }));
    rotor.position.y = 1; g.add(rotor);
    const spot = new THREE.SpotLight(0xffffff, 120, 90, 0.35, 0.4, 1);
    spot.position.set(0, -1, 0);
    const tgt = new THREE.Object3D(); tgt.position.set(0, -30, 0); g.add(tgt);
    spot.target = tgt; g.add(spot);
    g.position.set(0, 45, 0);
    this.scene.add(g);
    this.heli = { mesh: g, rotor, spot, tgt };
  }

  spawnRoadblock(px, pz, angle = 0) {
    const g = new THREE.Group();
    for (let i = -1; i <= 1; i++) {
      const car = this.world.makeCar(0x1a1a1a, this.rng);
      car.mesh.position.set(i * 4, 0, 0);
      car.mesh.rotation.y = Math.PI / 2;
      g.add(car.mesh);
    }
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 0.6),
      new THREE.MeshBasicMaterial({ color: 0xff6600 }));
    barrier.position.y = 1; g.add(barrier);
    g.position.set(px + Math.sin(angle) * 30, 0, pz + Math.cos(angle) * 30);
    g.rotation.y = angle;
    this.scene.add(g);
    this.roadblocks.push({ mesh: g, x: g.position.x, z: g.position.z });
  }

  clearRoadblocks() {
    for (const r of this.roadblocks) this.scene.remove(r.mesh);
    this.roadblocks = [];
  }

  update(dt, tick, px, pz, playerSpeed, events, playerAngle = 0) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    // Wanted decay when slow & no recent crime
    if (this.cooldown <= 0 && this.wanted > 0) {
      this.heat = Math.max(0, this.heat - dt * (playerSpeed < 2 ? 1.6 : 0.5));
      this.wanted = this.heat <= 0 ? 0 : Math.min(5, 1 + Math.floor(this.heat / 20));
    }
    const wantCops = this.wanted === 0 ? 0 : Math.min(2 + this.wanted, 7);
    while (this.cops.length < wantCops) this.spawnCop(px, pz);
    while (this.cops.length > wantCops) {
      const c = this.cops.pop(); this.scene.remove(c.mesh);
    }
    if (this.wanted >= 3) this.spawnHeli();
    else if (this.heli) { this.scene.remove(this.heli.mesh); this.heli = null; }
    if (this.wanted >= 4 && this.roadblocks.length === 0) this.spawnRoadblock(px, pz, playerAngle);
    if (this.wanted < 4) this.clearRoadblocks();
    // Cop chase + ram
    for (const c of this.cops) {
      const dx = px - c.x, dz = pz - c.z;
      const d = Math.hypot(dx, dz) || 1;
      const targetAngle = Math.atan2(dx, dz);
      const cur = c.mesh.rotation.y;
      let diff = targetAngle - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      c.mesh.rotation.y = cur + Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
      c.speed = Math.min(CONFIG.copSpeed, c.speed + 14 * dt);
      c.x += Math.sin(c.mesh.rotation.y) * c.speed * dt;
      c.z += Math.cos(c.mesh.rotation.y) * c.speed * dt;
      c.mesh.position.set(c.x, 0, c.z);
      c.bar.material.color.setHex((tick >> 3) % 2 === 0 ? 0xff2222 : 0x2244ff);
      if (d < 3.2 && this.cooldown <= 0) {
        this.cooldown = 1.2;
        events.busted(12);
      }
    }
    // Heli follows + spotlight
    if (this.heli) {
      const h = this.heli.mesh;
      h.position.x += (px - h.position.x) * 0.5 * dt;
      h.position.z += (pz - h.position.z) * 0.5 * dt;
      h.position.y = 45 + Math.sin(tick * 0.03) * 2;
      this.heli.rotor.rotation.y += dt * 20;
      this.heli.tgt.position.set(px - h.position.x, -45, pz - h.position.z);
      if (tick % 45 === 0) events.siren();
    }
  }
}
