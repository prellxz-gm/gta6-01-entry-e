// Marisol Heat — player: on-foot movement + driving, car steal (E), weapons fire.
import * as THREE from 'three';
import { CONFIG, WEAPONS } from './config.js';

export class Player {
  constructor(scene, world, rng) {
    this.world = world;
    this.x = 150; this.z = 100; this.angle = 0; // facing +z
    this.speed = 0;
    this.health = CONFIG.startHealth;
    this.cash = CONFIG.startCash;
    this.driving = null; // car object {mesh,color,owned,speed}
    this.weaponIdx = 1; // pistol default
    this.fireCooldown = 0;
    this.ownedCar = null; // player's own car (garage upgrades apply)
    this.upgrades = { engine: 0, armor: 0, paint: 0 };
    this.group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xff2fb3, roughness: 0.7 }));
    body.position.y = 1.0; this.group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.8 }));
    head.position.y = 2.0; this.group.add(head);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.9 }));
    legs.position.y = 0.3; this.group.add(legs);
    scene.add(this.group);
    // Player's own car spawns at the garage
    this.ownedCar = world.makeCar(0xff2fb3, rng);
    this.ownedCar.owned = true;
    this.ownedCar.mesh.position.set(-20, 0, 52);
    scene.add(this.ownedCar.mesh);
  }

  get maxHealth() { return CONFIG.startHealth + this.upgrades.armor * 40; }
  get carTopSpeed() { return CONFIG.carMaxSpeed * (1 + this.upgrades.engine * 0.2); }

  nearestCar(maxDist) {
    let best = null, bd = maxDist;
    const cars = [...this.world.traffic.map((c) => c.mesh), this.ownedCar.mesh];
    for (const m of cars) {
      const dx = m.position.x - this.x, dz = m.position.z - this.z;
      const d = Math.hypot(dx, dz);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  enterCar(mesh) {
    this.driving = { mesh, owned: mesh === this.ownedCar.mesh };
    this.group.visible = false;
    return this.driving.owned ? 'own' : 'stolen';
  }
  exitCar() {
    if (!this.driving) return;
    const m = this.driving.mesh;
    this.x = m.position.x - Math.sin(this.angle) * 3;
    this.z = m.position.z - Math.cos(this.angle) * 3;
    this.driving = null;
    this.group.visible = true;
  }

  update(dt, input, tick, events) {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    const fwd = input.axis('KeyS', 'KeyW') || input.axis('ArrowDown', 'ArrowUp');
    const turn = input.axis('KeyA', 'KeyD') || input.axis('ArrowLeft', 'ArrowRight');
    const run = input.down('ShiftLeft') || input.down('ShiftRight');
    if (this.driving) {
      const m = this.driving.mesh;
      const top = this.driving.owned ? this.carTopSpeed : CONFIG.carBaseSpeed + 8;
      this.speed += fwd * 22 * dt;
      this.speed *= Math.pow(0.4, dt); // drag
      if (fwd === 0) this.speed *= Math.pow(0.2, dt);
      this.speed = Math.max(-10, Math.min(top, this.speed));
      const dir = this.speed >= 0 ? 1 : -1;
      this.angle += turn * 1.6 * dt * dir * Math.min(1, Math.abs(this.speed) / 8);
      m.position.x += Math.sin(this.angle) * this.speed * dt;
      m.position.z += Math.cos(this.angle) * this.speed * dt;
      m.position.x = Math.max(-208, Math.min(208, m.position.x));
      m.position.z = Math.max(-208, Math.min(208, m.position.z));
      m.rotation.y = this.angle;
      this.x = m.position.x; this.z = m.position.z;
      if (Math.abs(this.speed) > 3 && tick % 20 === 0) events.engine(Math.abs(this.speed) / top);
      if (input.wasPressed('KeyE') || input.wasPressed('KeyF')) this.exitCar();
    } else {
      const sp = run ? CONFIG.playerRunSpeed : CONFIG.playerWalkSpeed;
      this.angle += turn * 2.6 * dt;
      this.x += Math.sin(this.angle) * fwd * sp * dt;
      this.z += Math.cos(this.angle) * fwd * sp * dt;
      this.x = Math.max(-208, Math.min(228, this.x));
      this.z = Math.max(-208, Math.min(208, this.z));
      this.speed = Math.abs(fwd) * sp;
      this.group.position.set(this.x, 0, this.z);
      this.group.rotation.y = this.angle;
      if (input.wasPressed('KeyE')) {
        const car = this.nearestCar(4.5);
        if (car) {
          const kind = this.enterCar(car);
          events.carEnter(kind);
        }
      }
    }
    // Weapon select
    if (input.wasPressed('Digit1')) this.weaponIdx = 0;
    if (input.wasPressed('Digit2')) this.weaponIdx = 1;
    if (input.wasPressed('Digit3')) this.weaponIdx = 2;
    if (input.wasPressed('Tab')) this.weaponIdx = (this.weaponIdx + 1) % WEAPONS.length;
    // Fire (mouse or Space when on foot)
    const w = WEAPONS[this.weaponIdx];
    const wantFire = (!this.driving) && (input.wasMousePressed() || (w.auto && input.mouseDown) || input.down('Space'));
    if (wantFire && this.fireCooldown <= 0) {
      this.fireCooldown = w.rate;
      events.fire(w);
    }
  }
}
