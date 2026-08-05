// Renders the installable-app icons from the brand mark.
//
// Two shapes, because a launcher needs both: the plain icon keeps the
// rounded square of the favicon, the maskable one bleeds the red to the
// edges and keeps the S inside the safe circle (the launcher applies its
// own silhouette and would otherwise clip a rounded corner).
//
// Run after any change to the mark:  node scripts/make-icons.mjs
// Chromium comes from the dev dependency that already runs the e2e suite,
// so this adds nothing to the dependency budget.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'static');

const RED = '#9e2b1e';
const PAPER = '#f7f1e6';
const FONT = "Georgia, 'Times New Roman', serif";

// baseline/size are in a 64-unit box, matching src/lib/assets/favicon.svg
const plain = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
	<rect width="64" height="64" rx="13" fill="${RED}"/>
	<text x="32" y="54.7" text-anchor="middle" font-family="${FONT}" font-weight="bold"
		font-size="65.8" fill="${PAPER}">S</text>
</svg>`;

// The safe zone is the inner 80% circle: the S shrinks to ~72% of the
// box so no launcher mask can bite into it.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
	<rect width="64" height="64" fill="${RED}"/>
	<text x="32" y="49.5" text-anchor="middle" font-family="${FONT}" font-weight="bold"
		font-size="47" fill="${PAPER}">S</text>
</svg>`;

const targets = [
	{ svg: plain, size: 192, file: 'icon-192.png' },
	{ svg: plain, size: 512, file: 'icon-512.png' },
	{ svg: maskable, size: 512, file: 'icon-maskable-512.png' }
];

const browser = await chromium.launch();
const page = await browser.newPage();
mkdirSync(OUT, { recursive: true });

for (const { svg, size, file } of targets) {
	await page.setViewportSize({ width: size, height: size });
	await page.setContent(
		`<style>html,body{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`
	);
	writeFileSync(join(OUT, file), await page.locator('svg').screenshot({ omitBackground: true }));
	console.log(`${file} — ${size}×${size}`);
}

await browser.close();
