// Marisol Heat — build entrypoint: copies the game + screenshots into the
// output dir and writes dossier.json via the kit's buildDossier helper.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const root = new URL('.', import.meta.url).pathname;

mkdirSync(out, { recursive: true });

const gameSrc = join(root, 'game');
const shotsSrc = join(root, 'screenshots');
if (!existsSync(gameSrc)) throw new Error('game/ directory missing');
if (!existsSync(shotsSrc)) throw new Error('screenshots/ directory missing');

cpSync(gameSrc, join(out, 'game'), { recursive: true });
cpSync(shotsSrc, join(out, 'screenshots'), { recursive: true });

const dossier = await buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

// buildDossier returns the dossier bytes (Uint8Array); write them out.
const bytes = dossier instanceof Uint8Array
  ? dossier
  : typeof dossier === 'string'
    ? new TextEncoder().encode(dossier)
    : new TextEncoder().encode(JSON.stringify(dossier));
writeFileSync(join(out, 'dossier.json'), bytes);

console.log('Marisol Heat dossier built in ' + out);
