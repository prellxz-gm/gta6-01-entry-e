// Marisol Heat — main game: loop, HUD, wanted, crew, garage, save, pause.
import * as THREE from 'three';
import { CONFIG, MISSIONS, GARAGE_UPGRADES, CREW, WEAPONS, districtAt } from './config.js';
import { makeRng } from './random.js';
import { Input } from './input.js';
import { World } from './world.js';
import { Renderer, drawMinimap } from './render.js';
import { Player } from './player.js';
import { Police } from './police.js';
import { MissionSys } from './missions.js';
import { AudioSys } from './audio.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(location.search);
const SEED = parseInt(params.get('seed') || '1', 10) || 1;
const SHOT = params.get('shot') || '';

const rng = makeRng(SEED);
const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const world = new World(rng);
renderer.scene.add(world.group);
const input = new Input();
const audio = new AudioSys();
const player = new Player(renderer.scene, world, rng);
const police = new Police(renderer.scene, world, rng);
const missions = new MissionSys();

const game = {
  phase: 'title', // title | playing | paused | garage | gameover
  tick: 0,
  time: 0,
  player, police, missions, world, renderer,
  cameraAngle: 0.6,
  banner: '', bannerUntil: 0,
  crewCooldown: 0,
  crewCar: null,
  garageOpen: false,
  showBanner(text) { this.banner = text; this.bannerUntil = this.time + 4; },
  startMission() {
    const m = missions.start();
    if (m) this.showBanner(`MISSION ${m.id}/9 — ${m.title}: ${m.brief}`);
  },
};
window.__game = game; // playtest hook

// ---- HUD ----
const $ = (id) => document.getElementById(id);
const hud = {
  cash: $('hud-cash'), health: $('hud-health'), wanted: $('hud-wanted'),
  objective: $('hud-objective'), speed: $('hud-speed'), weapon: $('hud-weapon'),
  standing: $('hud-standing'), banner: $('hud-banner'), minimap: $('minimap'),
  title: $('title-screen'), pause: $('pause-screen'), garage: $('garage-screen'),
  end: $('end-screen'), help: $('hud-help'),
};
const mapCtx = hud.minimap.getContext('2d');
try { if (!localStorage.getItem('marisol-heat-save')) $('btn-continue').style.display = 'none'; } catch (e) {}

function saveGame() {
  try {
    localStorage.setItem('marisol-heat-save', JSON.stringify({
      cash: player.cash, health: player.health, missionIdx: missions.idx,
      completed: missions.completed, upgrades: player.upgrades,
      standing: missions.standing, x: player.x, z: player.z,
    }));
  } catch (e) {}
}
function loadGame() {
  try {
    const s = JSON.parse(localStorage.getItem('marisol-heat-save') || 'null');
    if (!s) return false;
    player.cash = s.cash; player.health = s.health;
    missions.idx = s.missionIdx; missions.completed = s.completed;
    player.upgrades = s.upgrades || player.upgrades;
    if (s.standing) missions.standing = s.standing;
    player.x = s.x; player.z = s.z;
    return true;
  } catch (e) { return false; }
}

function startGame() {
  audio.ensure();
  game.phase = 'playing';
  hud.title.style.display = 'none';
  hud.end.style.display = 'none';
  if (missions.state === 'idle') game.startMission();
  game.showBanner(missions.current() ? `MISSION ${missions.current().id}/9 — ${missions.current().title}` : 'Free roam — Marisol is yours');
}

$('btn-start').addEventListener('click', startGame);
$('btn-continue').addEventListener('click', () => { loadGame(); startGame(); });
$('btn-resume').addEventListener('click', () => { game.phase = 'playing'; hud.pause.style.display = 'none'; });
$('btn-restart').addEventListener('click', () => location.reload());
$('btn-garage-close').addEventListener('click', () => { game.phase = 'playing'; hud.garage.style.display = 'none'; });
document.querySelectorAll('[data-buy]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const [id, lvl] = btn.dataset.buy.split(':');
    const up = GARAGE_UPGRADES.find((u) => u.id === id);
    const level = parseInt(lvl, 10);
    if (player.upgrades[id] !== level - 1) return;
    const cost = up.costs[level - 1];
    if (player.cash < cost) { game.showBanner('Not enough cash for ' + up.name); return; }
    player.cash -= cost;
    player.upgrades[id] = level;
    player.health = Math.min(player.maxHealth, player.health + (id === 'armor' ? 40 : 0));
    game.showBanner(`${up.name} Lv${level} installed — $${cost}`);
    audio.pickup(); saveGame(); renderGarage();
  });
});

function renderGarage() {
  const el = $('garage-list');
  el.innerHTML = '';
  for (const up of GARAGE_UPGRADES) {
    const lvl = player.upgrades[up.id];
    const row = document.createElement('div');
    row.className = 'garage-row';
    const next = lvl < up.levels ? `<button data-buy="${up.id}:${lvl + 1}">Buy Lv${lvl + 1} — $${up.costs[lvl]}</button>` : '<span class="maxed">MAX</span>';
    row.innerHTML = `<b>${up.name}</b> <span>Lv ${lvl}/${up.levels} — ${up.desc}</span> ${next}`;
    el.appendChild(row);
  }
  el.querySelectorAll('[data-buy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [id, lvl] = btn.dataset.buy.split(':');
      const up = GARAGE_UPGRADES.find((u) => u.id === id);
      const level = parseInt(lvl, 10);
      if (player.upgrades[id] !== level - 1) return;
      const cost = up.costs[level - 1];
      if (player.cash < cost) { game.showBanner('Not enough cash for ' + up.name); return; }
      player.cash -= cost; player.upgrades[id] = level;
      player.health = Math.min(player.maxHealth, player.health + (id === 'armor' ? 40 : 0));
      game.showBanner(`${up.name} Lv${level} installed — $${cost}`);
      audio.pickup(); saveGame(); renderGarage();
    });
  });
}

function openGarage() {
  game.phase = 'garage';
  renderGarage();
  hud.garage.style.display = 'flex';
}

function callCrew() {
  if (game.crewCooldown > 0) { game.showBanner(`Rico is busy — ${Math.ceil(game.crewCooldown)}s`); return; }
  game.crewCooldown = CREW.rico.cooldownSec;
  const car = world.makeCar(0x34c759, rng);
  car.mesh.position.set(player.x + 12, 0, player.z + 8);
  renderer.scene.add(car.mesh);
  game.crewCar = car.mesh;
  game.showBanner('Rico is on his way with a getaway car!');
  audio.pickup();
}

// ---- events from subsystems ----
const events = {
  engine(rpm) { audio.engine(rpm); },
  siren() { audio.sirenBlip(); },
  carEnter(kind) {
    audio.pickup();
    if (kind === 'stolen') {
      police.addHeat(15);
      game.showBanner('Car stolen! Cops are on to you.');
    } else game.showBanner('Your car — garage upgrades applied.');
  },
  fire(w) {
    audio.shoot();
    if (w.id === 'fists') return;
    // hitscan: nearest cop/ped/traffic within range and forward cone
    const fx = Math.sin(player.angle), fz = Math.cos(player.angle);
    const targets = [];
    for (const c of police.cops) targets.push({ x: c.x, z: c.z, cop: c });
    for (const p of world.peds) if (p.alive) targets.push({ x: p.x, z: p.z, ped: p });
    let best = null, bd = w.range;
    for (const t of targets) {
      const dx = t.x - player.x, dz = t.z - player.z;
      const d = Math.hypot(dx, dz);
      if (d > bd) continue;
      const dot = (dx * fx + dz * fz) / (d || 1);
      if (dot > 0.86) { bd = d; best = t; }
    }
    if (best) {
      if (best.cop) {
        best.cop.hp -= w.damage;
        if (best.cop.hp <= 0) {
          renderer.scene.remove(best.cop.mesh);
          police.cops.splice(police.cops.indexOf(best.cop), 1);
          player.cash += 50; game.showBanner('Cop down! +$50');
        }
        police.addHeat(10);
      } else if (best.ped) {
        best.ped.alive = false; best.ped.mesh.visible = false;
        police.addHeat(20);
      }
    }
  },
  checkpoint() { audio.pickup(); },
  busted(dmg) {
    player.health -= dmg;
    audio.crash();
    game.showBanner('RAMMED by police! -$ health');
    if (player.health <= 0) {
      game.phase = 'gameover';
      hud.end.style.display = 'flex';
      $('end-title').textContent = 'BUSTED';
      $('end-text').textContent = `The Marisol PD got you. Missions completed: ${missions.completed}/9 — Cash: $${player.cash}`;
    }
  },
};

// ---- fixed-timestep loop ----
let last = 0, acc = 0;
function frame(t) {
  requestAnimationFrame(frame);
  if (!last) last = t;
  let dt = Math.min(0.1, (t - last) / 1000);
  last = t;
  acc += dt;
  let steps = 0;
  while (acc >= CONFIG.timestep) {
    step(CONFIG.timestep);
    acc -= CONFIG.timestep;
    steps++;
  }
  renderer.render();
  updateHud();
  input.endFrame(steps);
}

function step(dt) {
  game.tick++;
  game.time += dt;
  world.update(dt, game.tick);
  game.crewCooldown = Math.max(0, game.crewCooldown - dt);
  audio.musicTick(game.tick);

  if (game.phase === 'playing') {
    if (game.autoDrive) input.keys.add('KeyW');
    player.update(dt, input, game.tick, events);
    police.update(dt, game.tick, player.x, player.z, Math.abs(player.speed), events, player.angle);
    const res = missions.update(dt, player.x, player.z, police.wanted, {
      paintBonus: player.upgrades.paint > 0,
      checkpoint: () => events.checkpoint(),
    });
    if (res && res.cash) {
      player.cash += res.cash;
      audio.missionDone();
      game.showBanner(`MISSION COMPLETE — ${res.mission.title}  +$${res.cash}`);
      saveGame();
      if (missions.idx >= MISSIONS.length - 1) {
        game.phase = 'gameover';
        hud.end.style.display = 'flex';
        $('end-title').textContent = 'KING OF MARISOL';
        $('end-text').textContent = `All 9 missions done! Final cash: $${player.cash}. You own the night.`;
      } else {
        missions.next();
        game.showBanner(`MISSION ${missions.current().id}/9 — ${missions.current().title}: ${missions.current().brief}`);
      }
    } else if (res && res.failed) {
      audio.crash();
      game.showBanner(res.mission ? 'Mission failed — press M to retry' : '');
    }
    // Keys
    if (input.wasPressed('KeyM')) {
      if (missions.state === 'idle') { game.startMission(); }
      else if (missions.state === 'done') { /* next auto-started */ }
    }
    if (input.wasPressed('KeyQ')) callCrew();
    if (input.wasPressed('KeyG')) {
      const d = Math.hypot(player.x - world.garagePos[0], player.z - world.garagePos[1]);
      if (d < 16) openGarage();
      else game.showBanner('Garage is at the pink marker on the Strip — drive there and press G.');
    }
    if (input.wasPressed('Escape') || input.wasPressed('KeyP')) {
      game.phase = 'paused'; hud.pause.style.display = 'flex';
    }
    // Crew car pickup: walk near it to take it
    if (game.crewCar && !player.driving) {
      const c = game.crewCar;
      if (Math.hypot(c.position.x - player.x, c.position.z - player.z) < 4) {
        player.enterCar(c); game.crewCar = null;
        game.showBanner("Rico's ride — go!");
      }
    }
    // Passive cash trickle for style? No — cash only from missions/cops.
  } else if (game.phase === 'paused') {
    if (input.wasPressed('Escape') || input.wasPressed('KeyP')) {
      game.phase = 'playing'; hud.pause.style.display = 'none';
    }
  } else if (game.phase === 'title') {
    // slow cinematic orbit around the beachfront
    game.cameraAngle += dt * 0.05;
    player.angle = game.cameraAngle;
    if (input.wasPressed('Enter')) startGame();
  }

  // Camera
  const camAngle = game.phase === 'title' ? game.cameraAngle : player.angle;
  const camX = game.phase === 'title' ? 150 + Math.sin(game.cameraAngle) * 40 : player.x;
  const camZ = game.phase === 'title' ? 100 + Math.cos(game.cameraAngle) * 40 : player.z;
  renderer.follow(camX, camZ, camAngle, !!player.driving, game.tick);
  renderer.setMarker(...(missions.targetPos() ? [...missions.targetPos(), true, game.tick] : [0, 0, false, game.tick]));
  renderer.setHeadlight(player.x, player.z, player.angle, !!player.driving);
}

function updateHud() {
  if (game.phase === 'title') return;
  hud.cash.textContent = `$${player.cash}`;
  hud.health.textContent = `HP ${Math.max(0, Math.round(player.health))}/${player.maxHealth}`;
  hud.health.style.color = player.health < 30 ? '#ff4444' : '#fff';
  hud.wanted.textContent = '★'.repeat(police.wanted) + '☆'.repeat(5 - police.wanted);
  hud.wanted.style.color = police.wanted >= 3 ? '#ff4444' : '#ffd60a';
  const m = missions.current();
  hud.objective.textContent = m
    ? (missions.state === 'active'
      ? `M${m.id}/9 ${m.title} — ${m.type === 'race' ? Math.ceil(missions.timer) + 's — ' : ''}${m.brief}`
      : missions.state === 'done' ? 'Mission complete!' : 'Press M to start: ' + m.title)
    : 'All missions complete — free roam!';
  hud.speed.textContent = player.driving ? `${Math.round(Math.abs(player.speed) * 3.6)} km/h` : '';
  const w = WEAPONS[player.weaponIdx];
  hud.weapon.textContent = `⚔ ${w.name} [1/2/3]`;
  const d = districtAt(player.x, player.z);
  const s = missions.standing[d.id];
  hud.standing.textContent = `${d.name}: ${missions.rankName(d.id)} (${s.rep}/3)`;
  hud.banner.textContent = game.time < game.bannerUntil ? game.banner : '';
  // minimap
  drawMinimap(mapCtx, 150, {
    px: player.x, pz: player.z, angle: player.angle,
    marker: missions.targetPos(),
    cops: police.cops.map((c) => ({ x: c.x, z: c.z })),
  });
}

// Shot scenes apply after first frame setup
if (SHOT) {
  applyShot(game, SHOT);
  if (SHOT === 'play' || SHOT === 'chase' || SHOT === 'end') {
    hud.title.style.display = 'none';
  }
  // settle world a few ticks so traffic/peds are placed
  for (let i = 0; i < 30; i++) { world.update(CONFIG.timestep, i); }
}
requestAnimationFrame(frame);
