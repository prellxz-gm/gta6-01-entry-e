// Marisol Heat — render: three.js night scene, camera rig, minimap, markers.
import * as THREE from 'three';

export class Renderer {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050510);
    this.scene.fog = new THREE.Fog(0x070714, 90, 320);
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
    // Night lighting: dim moon + warm ambient + neon-ish hemisphere
    this.scene.add(new THREE.AmbientLight(0x334, 0.7));
    const moon = new THREE.DirectionalLight(0x8fb4ff, 0.9);
    moon.position.set(-120, 180, -60); this.scene.add(moon);
    const hemi = new THREE.HemisphereLight(0x2a1a4a, 0x05050a, 0.8);
    this.scene.add(hemi);
    // Moon disc
    const moonMesh = new THREE.Mesh(new THREE.CircleGeometry(14, 24), new THREE.MeshBasicMaterial({ color: 0xe8f0ff }));
    moonMesh.position.set(-220, 170, -260); moonMesh.lookAt(0, 0, 0); this.scene.add(moonMesh);
    // Objective marker: floating gold beacon
    const markerGeo = new THREE.CylinderGeometry(0.2, 0.2, 26, 8);
    this.marker = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0xffd60a, transparent: true, opacity: 0.55 }));
    this.marker.visible = false; this.scene.add(this.marker);
    this.markerRing = new THREE.Mesh(new THREE.TorusGeometry(3, 0.25, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd60a }));
    this.markerRing.rotation.x = Math.PI / 2; this.markerRing.visible = false; this.scene.add(this.markerRing);
    // Headlight for the player car
    this.headlight = new THREE.SpotLight(0xfff2c0, 60, 70, 0.6, 0.5, 1.2);
    this.scene.add(this.headlight);
    this.headlightTarget = new THREE.Object3D(); this.scene.add(this.headlightTarget);
    this.headlight.target = this.headlightTarget;
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  follow(px, pz, angle, driving, tick) {
    const dist = driving ? 13 : 9;
    const h = driving ? 5.5 : 4.5;
    const bx = px - Math.sin(angle) * dist;
    const bz = pz - Math.cos(angle) * dist;
    this.camera.position.set(bx, h, bz);
    this.camera.lookAt(px + Math.sin(angle) * 6, 1.5, pz + Math.cos(angle) * 6);
    // subtle bob while on foot
    if (!driving) this.camera.position.y += Math.sin(tick * 0.1) * 0.05;
  }

  setMarker(x, z, visible, tick) {
    this.marker.visible = visible; this.markerRing.visible = visible;
    if (!visible) return;
    this.marker.position.set(x, 13, z);
    this.markerRing.position.set(x, 0.3, z);
    this.markerRing.scale.setScalar(1 + Math.sin(tick * 0.08) * 0.15);
    this.marker.material.opacity = 0.4 + Math.sin(tick * 0.08) * 0.15;
  }

  setHeadlight(x, z, angle, on) {
    this.headlight.visible = on;
    if (!on) return;
    this.headlight.position.set(x, 2.2, z);
    this.headlightTarget.position.set(x + Math.sin(angle) * 20, 0.5, z + Math.cos(angle) * 20);
  }

  render() { this.renderer.render(this.scene, this.camera); }
}

// 2D minimap drawn on a canvas: streets, districts, player, cops, marker.
export function drawMinimap(ctx, size, state) {
  const S = size, W = 440;
  const toMap = (x, z) => [(x + W / 2) / W * S, (z + W / 2) / W * S];
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = 'rgba(8,8,18,0.85)'; ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(120,120,160,0.5)'; ctx.lineWidth = 1;
  for (let i = -5; i <= 5; i++) {
    const p = toMap(i * 42, 0)[0];
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, S); ctx.stroke();
    const q = toMap(0, i * 42)[1];
    ctx.beginPath(); ctx.moveTo(0, q); ctx.lineTo(S, q); ctx.stroke();
  }
  // ocean
  ctx.fillStyle = 'rgba(10,60,100,0.8)';
  const ox = toMap(210, 0)[0]; ctx.fillRect(ox, 0, S - ox, S);
  // objective marker
  if (state.marker) {
    const [mx, mz] = toMap(state.marker[0], state.marker[1]);
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath(); ctx.arc(mx, mz, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd60a'; ctx.beginPath(); ctx.arc(mx, mz, 9, 0, Math.PI * 2); ctx.stroke();
  }
  // cops (blue/red dots)
  ctx.fillStyle = '#3b82f6';
  for (const c of state.cops || []) { const [cx, cz] = toMap(c.x, c.z); ctx.fillRect(cx - 2, cz - 2, 4, 4); }
  // player arrow
  const [px, pz] = toMap(state.px, state.pz);
  ctx.save(); ctx.translate(px, pz); ctx.rotate(-state.angle + Math.PI);
  ctx.fillStyle = '#fff'; ctx.beginPath();
  ctx.moveTo(0, -6); ctx.lineTo(4, 5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
}
