// The social cards: what a shared link unfurls into.
//
// Every page names its language's card (og:image in the two [lang=lang]
// layouts), and a card is a designed thing, not a screenshot: the mark, the
// wordmark and the tagline in the edition's own face and palette. Rendered
// here with the repo's committed EB Garamond subsets so the card and the
// site cannot drift apart in type, and committed as static/social-{lang}.png
// — regenerate by running this script, the same convention as the font
// subsets (scripts/subset-fonts.py).
//
//   node scripts/social-card.mjs
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fonts = join(root, 'src', 'lib', 'fonts');

// The site's own light palette (src/app.css :root). The mark is NOT drawn
// here: it is the shipped app icon itself (static/icon-512.png), so the
// card's tile is pixel-identical to the favicon family — a hand-drawn CSS
// copy sat the S too small and off its optical centre (owner, 2026-08-20).
const BG = '#f7f1e6';
const INK = '#251e12';
const SOFT = '#70624a';

// The shipped app icon, inlined: a file:// subresource is blocked from a
// setContent page, and a data URI cannot be.
const ICON = `data:image/png;base64,${readFileSync(join(root, 'static', 'icon-512.png')).toString('base64')}`;

// Dotless on display, as the landing prints them.
const TAGLINE = {
	pl: 'Modlitwa po łacinie ze zrozumieniem',
	en: 'Prayer in Latin with understanding'
};

const page_ = (lang) => `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><style>
	@font-face {
		font-family: 'EB Garamond';
		src: url('file://${fonts}/eb-garamond-latin-wght-normal.woff2') format('woff2-variations');
		font-weight: 400 800;
	}
	@font-face {
		font-family: 'EB Garamond';
		src: url('file://${fonts}/eb-garamond-latin-ext-wght-normal.woff2') format('woff2-variations');
		font-weight: 400 800;
		unicode-range: U+0100-024F, U+1E00-1EFF;
	}
	* { margin: 0; }
	body {
		width: 1200px; height: 630px;
		background: ${BG};
		font-family: 'EB Garamond', serif;
		display: flex; flex-direction: column;
		align-items: center; justify-content: center;
		gap: 0;
	}
	.mark {
		width: 132px; height: 132px;
	}
	h1 {
		margin-top: 34px;
		color: ${INK}; font-size: 116px; font-weight: 540;
		letter-spacing: 0.01em; line-height: 1;
	}
	p {
		margin-top: 22px;
		color: ${SOFT}; font-size: 42px; font-weight: 440;
	}
</style></head>
<body>
	<img class="mark" src="${ICON}" alt="" />
	<h1>Scrutabor</h1>
	<p>${TAGLINE[lang]}</p>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({
	viewport: { width: 1200, height: 630 },
	deviceScaleFactor: 2
});
for (const lang of ['pl', 'en']) {
	await page.setContent(page_(lang));
	await page.evaluate(() => document.fonts.ready);
	const out = join(root, 'static', `social-${lang}.png`);
	await page.screenshot({ path: out });
	console.log('wrote', out);
}
await browser.close();
