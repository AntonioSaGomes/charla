// Renders the app icon at each size the iPhone and the manifest need.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFA048"/><stop offset=".52" stop-color="#FF4F6A"/><stop offset="1" stop-color="#D23C8E"/></linearGradient>
<radialGradient id="h" cx=".85" cy=".1" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
<rect width="1024" height="1024" fill="url(#g)"/><rect width="1024" height="1024" fill="url(#h)"/>
<g transform="translate(512 500) scale(${pad}) translate(-512 -500)">
<path d="M300 268h424c66 0 120 54 120 120v196c0 66-54 120-120 120H520l-150 112c-12 9-29 0-28-15l6-97h-48c-66 0-120-54-120-120V388c0-66 54-120 120-120z" fill="#fff"/>
<g fill="url(#g)"><rect x="366" y="436" width="44" height="104" rx="22"/><rect x="446" y="386" width="44" height="204" rx="22"/><rect x="526" y="356" width="44" height="264" rx="22"/><rect x="606" y="406" width="44" height="164" rx="22"/><rect x="686" y="446" width="44" height="84" rx="22"/></g>
</g></svg>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const p = await b.newPage();
for (const [name, size, pad] of [['apple-touch-icon', 180, 1], ['icon-192', 192, 1], ['icon-512', 512, 1], ['icon-maskable-512', 512, .78], ['preview', 256, 1]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<html><body style="margin:0">${svg(pad).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await p.screenshot({ path: `src/icons/${name}.png`, omitBackground: false });
}
await b.close();
console.log('icons done');
