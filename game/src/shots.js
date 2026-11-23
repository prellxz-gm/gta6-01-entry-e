// Marisol Heat — deterministic screenshot scenes (?shot=start|play|chase|end&seed=1).
// Each scene sets exact game state so captures are reproducible.
export function applyShot(game, shot) {
  const g = game;
  if (shot === 'start') {
    g.phase = 'title';
    g.player.x = 150; g.player.z = 100; g.player.angle = 0.6;
    g.cameraAngle = 0.6;
    return;
  }
  if (shot === 'play') {
    g.phase = 'playing';
    g.startMission();
    g.autoDrive = true;
    // beachfront avenue street x=168, driving -z
    g.player.x = 168; g.player.z = 60; g.player.angle = Math.PI;
    const car = g.player.ownedCar.mesh;
    car.position.set(168, 0, 60);
    g.player.enterCar(car);
    g.player.speed = 22;
    return;
  }
  if (shot === 'chase') {
    g.phase = 'playing';
    g.startMission();
    g.autoDrive = true;
    // Strip street x=-42, driving +z so the car stays on the road
    g.player.x = -42; g.player.z = -120; g.player.angle = 0;
    g.player.upgrades.armor = 3;
    g.player.health = g.player.maxHealth;
    const car = g.player.ownedCar.mesh;
    car.position.set(-42, 0, -120);
    g.player.enterCar(car);
    g.player.speed = 26;
    g.police.addHeat(85); // wanted 5: cops + heli + roadblock
    for (let i = 0; i < 5; i++) g.police.spawnCop(g.player.x, g.player.z);
    g.police.spawnHeli();
    g.police.spawnRoadblock(g.player.x, g.player.z, 0);
    g.police.wanted = 5; g.police.heat = 95;
    return;
  }
  if (shot === 'end') {
    g.phase = 'playing';
    g.missions.idx = 8; g.missions.completed = 8;
    g.missions.start();
    g.player.cash += 4000;
    g.player.x = -40; g.player.z = -60; g.player.angle = 0;
    g.showBanner('MISSION COMPLETE — King of the Night  +$4000');
    g.missions.state = 'done';
    return;
  }
  g.phase = 'title';
}
