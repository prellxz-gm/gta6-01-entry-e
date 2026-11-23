// Marisol Heat — world: seeded coastal night city.
// Grid streets, neon buildings, palms, beach + ocean, traffic, pedestrians.
import * as THREE from 'three';
import { CONFIG, DISTRICTS } from './config.js';

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function windowsTexture(rng, lit) {
  return canvasTexture(64, 128, (g, w, h) => {
    g.fillStyle = '#0a0a14'; g.fillRect(0, 0, w, h);
    for (let y = 6; y < h - 6; y += 12) {
      for (let x = 6; x < w - 6; x += 10) {
        if (rng.chance(lit)) {
          g.fillStyle = rng.pick(['#ffd76a', '#7df9ff', '#ff9de2', '#fff2b0']);
          g.globalAlpha = 0.5 + rng.next() * 0.5;
        } else { g.fillStyle = '#101018'; g.globalAlpha = 1; }
        g.fillRect(x, y, 6, 8);
      }
    }
    g.globalAlpha = 1;
  });
}

export class World {
  constructor(rng) {
    this.rng = rng;
    this.group = new THREE.Group();
    this.buildings = [];
    this.traffic = [];
    this.peds = [];
    this.streetPoints = [];
    this.garagePos = [-20, 40];
    this.build();
  }

  build() {
    const rng = this.rng;
    // Ocean to the east (x > 210)
    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(260, 460),
      new THREE.MeshStandardMaterial({ color: 0x06283d, roughness: 0.15, metalness: 0.7, emissive: 0x04121f })
    );
    ocean.rotation.x = -Math.PI / 2; ocean.position.set(340, -0.4, 0);
    this.group.add(ocean);
    // Beach sand strip
    const sand = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 460),
      new THREE.MeshStandardMaterial({ color: 0x8a6f4d, roughness: 1 })
    );
    sand.rotation.x = -Math.PI / 2; sand.position.set(228, -0.2, 0);
    this.group.add(sand);
    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(480, 480),
      new THREE.MeshStandardMaterial({ color: 0x0b0b12, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.5;
    this.group.add(ground);

    // Streets: grid every blockSize, asphalt strips + center dashes
    const streetMat = new THREE.MeshStandardMaterial({ color: 0x17171f, roughness: 0.9 });
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8c95a });
    for (let i = -5; i <= 5; i++) {
      const c = i * CONFIG.blockSize;
      const h = new THREE.Mesh(new THREE.PlaneGeometry(440, CONFIG.streetWidth), streetMat);
      h.rotation.x = -Math.PI / 2; h.position.set(0, -0.3, c); this.group.add(h);
      const v = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.streetWidth, 440), streetMat);
      v.rotation.x = -Math.PI / 2; v.position.set(c, -0.3, 0); this.group.add(v);
      for (let k = -200; k <= 200; k += 16) {
        const d1 = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.5), dashMat);
        d1.rotation.x = -Math.PI / 2; d1.position.set(k, -0.25, c); this.group.add(d1);
        const d2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 6), dashMat);
        d2.rotation.x = -Math.PI / 2; d2.position.set(c, -0.25, k); this.group.add(d2);
      }
      this.streetPoints.push([c, 0]);
    }

    // Buildings per block (skip streets + beach)
    const winTexA = windowsTexture(rng, 0.55);
    const winTexB = windowsTexture(rng, 0.4);
    const neonColors = [0xff2fb3, 0x19c2ff, 0xffb020, 0x9d4dff, 0x2bff88];
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.9 });
    for (let gx = -5; gx <= 4; gx++) {
      for (let gz = -5; gz <= 4; gz++) {
        const bx = gx * CONFIG.blockSize + CONFIG.blockSize / 2;
        const bz = gz * CONFIG.blockSize + CONFIG.blockSize / 2;
        if (bx > 195) continue; // beach / ocean side
        if (rng.chance(0.18)) continue; // plaza / parking
        const w = rng.range(16, 26), d = rng.range(16, 26);
        const hgt = rng.chance(0.22) ? rng.range(38, 70) : rng.range(10, 30);
        const mat = new THREE.MeshStandardMaterial({
          map: rng.chance(0.5) ? winTexA : winTexB, roughness: 0.85,
          emissive: 0x222233, emissiveIntensity: 0.4,
        });
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), mat);
        b.position.set(bx, hgt / 2 - 0.5, bz);
        this.group.add(b);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.6, d + 0.6), roofMat);
        roof.position.set(bx, hgt - 0.2, bz); this.group.add(roof);
        this.buildings.push(b);
        // Neon sign strip on some buildings
        if (rng.chance(0.45)) {
          const nc = rng.pick(neonColors);
          const sign = new THREE.Mesh(
            new THREE.BoxGeometry(Math.min(w, 14), 1.1, 0.4),
            new THREE.MeshBasicMaterial({ color: nc })
          );
          sign.position.set(bx, rng.range(6, Math.max(7, hgt - 4)), bz + d / 2 + 0.3);
          this.group.add(sign);
          const sign2 = sign.clone();
          sign2.position.z = bz - d / 2 - 0.3; this.group.add(sign2);
        }
      }
    }

    // Palms along the beachfront avenue (x = 189)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 1 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x0d5c2e, roughness: 0.9, emissive: 0x062b16 });
    for (let z = -200; z <= 200; z += 21) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 9, 6), trunkMat);
      trunk.position.set(193, 4, z + rng.range(-3, 3));
      this.group.add(trunk);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2.6, 7), leafMat);
      crown.position.set(193, 9.6, trunk.position.z);
      this.group.add(crown);
    }

    // Street lamps (emissive heads, no per-lamp light for perf)
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x222228, roughness: 0.8 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    for (let i = -5; i <= 5; i++) {
      for (let j = -5; j <= 5; j += 2) {
        const x = i * CONFIG.blockSize + 6, z = j * CONFIG.blockSize + 6;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 5), poleMat);
        pole.position.set(x, 3, z); this.group.add(pole);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampMat);
        head.position.set(x, 6.2, z); this.group.add(head);
      }
    }

    // Garage marker building (player garage, Strip edge)
    const garage = new THREE.Mesh(
      new THREE.BoxGeometry(24, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x1c1c2e, roughness: 0.8, emissive: 0x301040, emissiveIntensity: 0.6 })
    );
    garage.position.set(this.garagePos[0], 3.5, this.garagePos[1]);
    this.group.add(garage);
    const gsign = new THREE.Mesh(new THREE.BoxGeometry(16, 1.6, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2fb3 }));
    gsign.position.set(this.garagePos[0], 8.6, this.garagePos[1] + 8.2);
    this.group.add(gsign);

    // Traffic cars: seeded routes along streets
    const carColors = [0xff3b30, 0x19c2ff, 0xffd60a, 0x34c759, 0xbf5af2, 0xffffff, 0xff9f0a];
    for (let i = 0; i < 16; i++) {
      const car = this.makeCar(rng.pick(carColors), rng);
      const horizontal = rng.chance(0.5);
      const street = rng.int(-5, 5) * CONFIG.blockSize;
      car.mesh.position.set(horizontal ? rng.range(-200, 200) : street + rng.pick([-3, 3]),
        0, horizontal ? street + rng.pick([-3, 3]) : rng.range(-200, 200));
      car.horizontal = horizontal; car.street = street;
      car.speed = rng.range(6, 11); car.dir = rng.pick([-1, 1]);
      car.mesh.rotation.y = horizontal ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      this.group.add(car.mesh);
      this.traffic.push(car);
    }

    // Pedestrians on sidewalks
    const pedColors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0xa78bfa, 0xf472b6, 0x93c5fd];
    for (let i = 0; i < 22; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 0.4),
        new THREE.MeshStandardMaterial({ color: rng.pick(pedColors), roughness: 0.9 }));
      body.position.y = 1.05; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.9 }));
      head.position.y = 2.05; g.add(head);
      const bx = rng.int(-5, 5) * CONFIG.blockSize + rng.range(-18, 18);
      const bz = rng.int(-5, 5) * CONFIG.blockSize + rng.range(-18, 18);
      g.position.set(bx, 0, bz);
      this.group.add(g);
      this.peds.push({ mesh: g, x: bx, z: bz, angle: rng.range(0, Math.PI * 2), speed: rng.range(0.8, 1.6), alive: true });
    }
  }

  makeCar(color, rng) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.4), bodyMat);
    body.position.y = 0.55; g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x0a0a18, roughness: 0.15, metalness: 0.8 }));
    cabin.position.set(0, 1.15, -0.2); g.add(cabin);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
    for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), wheelMat);
      w.rotation.z = Math.PI / 2; w.position.set(wx, 0.42, wz); g.add(w);
    }
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
    for (const hx of [-0.6, 0.6]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.15), lightMat);
      hl.position.set(hx, 0.6, 2.25); g.add(hl);
    }
    return { mesh: g, color };
  }

  update(dt, tick) {
    // Traffic loops along streets, wraps at edges
    for (const c of this.traffic) {
      const s = c.speed * c.dir * dt;
      if (c.horizontal) {
        c.mesh.position.x += s;
        if (c.mesh.position.x > 205) c.mesh.position.x = -205;
        if (c.mesh.position.x < -205) c.mesh.position.x = 205;
      } else {
        c.mesh.position.z += s;
        if (c.mesh.position.z > 205) c.mesh.position.z = -205;
        if (c.mesh.position.z < -205) c.mesh.position.z = 205;
      }
    }
    // Peds wander sidewalks
    for (const p of this.peds) {
      if (!p.alive) continue;
      p.angle += Math.sin(tick * 0.01 + p.x) * 0.002;
      p.x += Math.cos(p.angle) * p.speed * dt;
      p.z += Math.sin(p.angle) * p.speed * dt;
      if (p.x > 205) p.x = -205; if (p.x < -205) p.x = 205;
      if (p.z > 205) p.z = -205; if (p.z < -205) p.z = 205;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = -p.angle;
      p.mesh.position.y = Math.abs(Math.sin(tick * 0.15 + p.z)) * 0.06;
    }
  }
}
