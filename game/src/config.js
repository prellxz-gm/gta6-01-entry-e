// Marisol Heat — config: constants, districts, missions, upgrades, crew.
// Night neon coastal open-world crime game. All values deterministic.
export const CONFIG = {
  seed: 1,
  timestep: 1 / 60,
  worldSize: 420,          // city spans -210..210
  blockSize: 42,
  streetWidth: 10,
  playerWalkSpeed: 7,
  playerRunSpeed: 11,
  carBaseSpeed: 26,
  carMaxSpeed: 46,
  copSpeed: 30,
  maxWanted: 5,
  startCash: 250,
  startHealth: 100,
};

export const DISTRICTS = [
  { id: 'beach',  name: 'Marisol Beach', color: 0x19c2ff, center: [150, 0, 120],  rankNames: ['Beach Bum', 'Boardwalk Runner', 'Surf King', 'Beach Kingpin'] },
  { id: 'strip',  name: 'Neon Strip',    color: 0xff2fb3, center: [-40, 0, -60], rankNames: ['Strip Tourist', 'Neon Runner', 'Strip Made', 'Neon Kingpin'] },
  { id: 'port',   name: 'Old Port',      color: 0xffb020, center: [-150, 0, 130], rankNames: ['Dock Hand', 'Port Runner', 'Harbor Made', 'Port Kingpin'] },
  { id: 'heights',name: 'Vice Heights',  color: 0x9d4dff, center: [60, 0, -160], rankNames: ['Hill Climber', 'Heights Runner', 'Summit Made', 'Heights Kingpin'] },
];

export function districtAt(x, z) {
  // nearest district center
  let best = DISTRICTS[0], bd = Infinity;
  for (const d of DISTRICTS) {
    const dx = x - d.center[0], dz = z - d.center[2];
    const q = dx * dx + dz * dz;
    if (q < bd) { bd = q; best = d; }
  }
  return best;
}

// 9 story missions. type: goto | pickup | deliver | race | escape | takedown
export const MISSIONS = [
  { id: 1, title: 'Welcome to Marisol', district: 'beach',  type: 'goto',     target: [150, 120], reward: 300,  brief: 'Meet Rico on the boardwalk. Follow the gold marker.' },
  { id: 2, title: 'Hot Wheels',         district: 'strip',  type: 'pickup',   target: [-60, -40], reward: 450,  brief: 'Steal the pink Comet parked on the Strip. Press E near it.' },
  { id: 3, title: 'Midnight Delivery',  district: 'port',   type: 'deliver',  target: [-150, 130], reward: 600, brief: 'Drive the package to the Old Port docks. No cops.' },
  { id: 4, title: 'Boardwalk Sprint',   district: 'beach',  type: 'race',     target: [170, 60],  reward: 800,  brief: 'Beat the rival racer to the pier checkpoint. 75 seconds.' },
  { id: 5, title: 'Neon Heist',         district: 'strip',  type: 'pickup',   target: [-20, -90], reward: 1100, brief: 'Grab the neon stash from the casino roof garage.' },
  { id: 6, title: 'Heat Escape',        district: 'heights',type: 'escape',   target: [60, -160], reward: 1400, brief: 'Lose a 3-star wanted level, then reach the Heights safehouse.' },
  { id: 7, title: 'Dockside Takedown',  district: 'port',   type: 'takedown', target: [-170, 150], reward: 1800, brief: 'Take out the rival crew guarding the container yard.' },
  { id: 8, title: 'Grand Prix Marisol', district: 'beach',  type: 'race',     target: [120, 170], reward: 2500, brief: 'Win the 3-checkpoint grand prix around the beachfront.' },
  { id: 9, title: 'King of the Night',  district: 'strip',  type: 'deliver',  target: [-40, -60], reward: 4000, brief: 'Final run: deliver the crown jewel to the Strip penthouse. 5-star heat.' },
];

export const GARAGE_UPGRADES = [
  { id: 'engine', name: 'Engine Mk I–III', levels: 3, costs: [500, 1200, 2500], desc: '+20% top speed per level' },
  { id: 'armor',  name: 'Armor Plating',   levels: 3, costs: [400, 1000, 2200], desc: '+40 max health per level' },
  { id: 'paint',  name: 'Neon Paint',      levels: 3, costs: [300, 800, 1500], desc: 'Hotter paint, +respect per mission' },
];

export const CREW = {
  rico: { name: 'Rico', role: 'Getaway Driver', key: 'KeyQ', cooldownSec: 45, desc: 'Calls a getaway car to your position.' },
};

export const WEAPONS = [
  { id: 'fists', name: 'Fists',  damage: 10, range: 2.5, rate: 0.35, auto: false },
  { id: 'pistol', name: 'Pistol', damage: 34, range: 55, rate: 0.45, auto: false },
  { id: 'smg',    name: 'SMG',    damage: 16, range: 45, rate: 0.09, auto: true },
];
