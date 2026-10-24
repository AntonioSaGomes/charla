import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';

const out = 'docs';
rmSync(out, { recursive: true, force: true });
mkdirSync(out + '/icons', { recursive: true });
const common = { bundle: true, external: ['https://*'], format: 'esm', minify: true, target: ['safari16'], platform: 'browser', legalComments: 'none', logLevel: 'warning' };
await build({ ...common, entryPoints: ['src/app.js'], outfile: `${out}/app.js` });
await build({ ...common, entryPoints: ['src/stt-worker.js'], outfile: `${out}/stt-worker.js` });
const stamp = Date.now().toString(36);
for (const f of ['styles.css', 'manifest.webmanifest']) cpSync(`src/${f}`, `${out}/${f}`);
writeFileSync(`${out}/index.html`, readFileSync('src/index.html', 'utf8').replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<meta name="build" content="${stamp}">`));
cpSync('src/icons', `${out}/icons`, { recursive: true });
writeFileSync(`${out}/sw.js`, readFileSync('src/sw.js', 'utf8').replace('__BUILD__', stamp));
writeFileSync(`${out}/.nojekyll`, '');
console.log('built', stamp);
