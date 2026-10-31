import { expect, setHelp, test } from './fixtures';
import type { Locator, Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });
const masses = [
	'commemoratio-omnium-fidelium-defunctorum',
	'commemoratio-omnium-fidelium-defunctorum-missa-ii',
	'commemoratio-omnium-fidelium-defunctorum-missa-iii'
];
const part = (page: Page, id: string) => page.locator(`section.part[data-part="${id}"]`);
const activeCues =
	'.who-name, .who-all, .who-join, .who-voice, .mark, .verse.yours, .verse.quiet, .verse.answer, button.unfold, .aside-mark';
const referenceNote = (lang: string) => (lang === 'pl' ? /wglądu/ : /reference only/);

async function prepare(page: Page) {
	await page.addInitScript(() => {
		localStorage.setItem('scrutabor-role', 'sacerdos');
		localStorage.setItem('scrutabor-mass-form', 'lecta');
	});
}
async function neutralDismissal(page: Page, lang: string) {
	const section = part(page, 'ite-missa-est');
	await expect(section.locator('.part-title')).toHaveText(
		lang === 'pl' ? 'Rozesłanie' : 'Dismissal'
	);
	await expect(section.locator('.part-title')).toHaveAttribute('lang', lang);
	await expect(section.locator('.part-note').first()).toContainText(referenceNote(lang));
	await expect(section.locator('.part-note').first()).not.toContainText(
		/Ite, missa est|Deo grátias|turns to the people|zwraca się do ludu/
	);
	await expect(section.locator('.when')).toHaveCount(0);
	await expect(section.locator(activeCues)).toHaveCount(0);
	return section;
}
async function referenceBody(section: Locator, id: string, lang: string) {
	await expect(section.locator('.part-note').first()).toContainText(referenceNote(lang));
	await expect(section.locator(`[id="${id}.w001"]`)).toBeVisible();
	await expect(section.locator('.part-title')).toHaveAttribute(
		'href',
		new RegExp(`/ordinarium/${id}$`)
	);
	await expect(section.locator(activeCues)).toHaveCount(0);
}
// A held day load shows its notice 400 ms in, and the notice widens the centred settings
// table. Let it appear before a mode click, so the radios do not move under the pointer.
async function heldNotice(page: Page, lang: string) {
	await expect(page.locator('.picker .state')).toHaveText(
		lang === 'pl' ? 'wczytywanie' : 'loading'
	);
}
async function retrySameIntent(page: Page) {
	await page.evaluate(() =>
		window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
	);
}

for (const lang of ['pl', 'en'] as const) {
	for (const dependency of ['day', 'dismissal'] as const) {
		test(
			`${lang} ${dependency} held and failed selection never asserts ordinary dismissal and retries exact intent @online`,
			{ tag: '@reader' },
			async ({ page }) => {
				await prepare(page);
				const pattern =
					dependency === 'day'
						? `**/artifacts/proprium/${lang}/pack-*.json*`
						: `**/artifacts/dismissal/${lang}.json*`;
				for (const mass of masses) {
					let release!: () => void;
					let requested!: () => void;
					const wait = new Promise<void>((resolve) => {
						release = resolve;
					});
					const arrived = new Promise<void>((resolve) => {
						requested = resolve;
					});
					await page.route(pattern, async (route) => {
						requested();
						await wait;
						await route.fulfill({ status: 503, body: 'unavailable' });
					});
					try {
						await page.goto(
							`/app/${lang}/ordo/conclusio?dies=2026-11-02&missa=${mass}&w=ite-missa-est-defunctorum.w007`
						);
						await arrived;
						await expect(page.locator('main')).toHaveAttribute('aria-busy', 'true');
						const section = await neutralDismissal(page, lang);
						await expect(section.locator('.part-loading')).toHaveCount(1);
						await referenceBody(part(page, 'benedictio'), 'benedictio', lang);
						release();
						await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
						await expect(section.locator('[role="status"]')).toBeVisible();
						await expect(page.locator('.picker .state')).toContainText(
							lang === 'pl' ? /nie udało/ : /could/
						);
						await neutralDismissal(page, lang);
						await referenceBody(part(page, 'benedictio'), 'benedictio', lang);
						await expect(page).toHaveURL(/w=ite-missa-est-defunctorum\.w007/);
						await page.unroute(pattern);
						await retrySameIntent(page);
						await expect(section.locator('[id="ite-missa-est-defunctorum.w007"]')).toBeVisible();
						await expect(section.locator('.part-title')).toHaveText('Requiéscant in pace');
						await expect(section.locator('.part-title')).toHaveAttribute('lang', 'la');
						await expect(section.locator('.part-note').first()).not.toContainText(
							referenceNote(lang)
						);
						await expect(section.locator('[id^="ite-missa-est.w"]')).toHaveCount(0);
						await expect(part(page, 'benedictio').locator('[id="benedictio.w001"]')).toHaveCount(0);
						await expect(page).toHaveURL(/w=ite-missa-est-defunctorum\.w007/);
					} finally {
						release();
						await page.unroute(pattern);
					}
				}
			}
		);
	}

	for (const [movement, id, retained] of [
		['praeparatio', 'iudica-me', 'introibo'],
		['communio', 'qui-dixisti', 'pax-domini']
	] as const) {
		test(
			`${lang} ${id} remains unconfirmed reference until actual omission and preserves canonical word intent @online`,
			{ tag: '@reader' },
			async ({ page }) => {
				await prepare(page);
				const pattern = `**/artifacts/dismissal/${lang}.json*`;
				for (const mass of masses) {
					let release!: () => void;
					const wait = new Promise<void>((resolve) => {
						release = resolve;
					});
					await page.route(pattern, async (route) => {
						await wait;
						await route.fulfill({ status: 503, body: 'unavailable' });
					});
					try {
						await page.goto(
							`/app/${lang}/ordo/${movement}?dies=2026-11-02&missa=${mass}&w=${id}.w001`
						);
						const section = part(page, id);
						await heldNotice(page, lang);
						for (const level of [0, 1, 2] as const) {
							await setHelp(page, level);
							await referenceBody(section, id, lang);
						}
						await expect(page.locator(`[id="${retained}.w001"]`)).toBeVisible();
						release();
						await expect(page.locator('.picker .state')).toContainText(
							lang === 'pl' ? /nie udało/ : /could/
						);
						await referenceBody(section, id, lang);
						await page.unroute(pattern);
						await retrySameIntent(page);
						await expect(section.locator(`[id="${id}.w001"]`)).toHaveCount(0);
						await expect(section.locator('.part-title')).toHaveAttribute(
							'href',
							`/app/${lang}/ordinarium/${id}?w=w001`
						);
						await expect(section.locator('.part-note').first()).not.toContainText(
							referenceNote(lang)
						);
						await expect(page).toHaveURL(new RegExp(`w=${id}\\.w001`));
						await section.locator('.part-title').click();
						await expect(page.locator('[id="w001"]')).toBeVisible();
					} finally {
						release();
						await page.unroute(pattern);
					}
				}
			}
		);
	}

	test(
		`${lang} unresolved water instructions precede the unaltered rubric and recover the actual exception @online`,
		{ tag: '@reader' },
		async ({ page }) => {
			await prepare(page);
			const pattern = `**/artifacts/dismissal/${lang}.json*`;
			let release!: () => void;
			const wait = new Promise<void>((resolve) => {
				release = resolve;
			});
			await page.route(pattern, async (route) => {
				await wait;
				await route.fulfill({ status: 503, body: 'unavailable' });
			});
			try {
				await page.goto(`/app/${lang}/ordo/offertorium?dies=2026-11-02&w=deus-qui-humanae.w001`);
				const section = part(page, 'deus-qui-humanae');
				await heldNotice(page, lang);
				for (const level of [0, 1, 2] as const) {
					await setHelp(page, level);
					await referenceBody(section, 'deus-qui-humanae', lang);
					await expect(section.locator('.rubric-context')).toContainText(referenceNote(lang));
					expect(
						await section
							.locator('.rubric')
							.first()
							.evaluate((rubric) => {
								const note = rubric.querySelector('.rubric-context')!;
								const latin = rubric.querySelector('.rubric-la')!;
								return !!(note.compareDocumentPosition(latin) & Node.DOCUMENT_POSITION_FOLLOWING);
							})
					).toBe(true);
					await expect(section.locator('[id="deus-qui-humanae-s03"] .rubric-la')).toBeVisible();
				}
				release();
				await expect(page.locator('.picker .state')).toContainText(
					lang === 'pl' ? /nie udało/ : /could/
				);
				await referenceBody(section, 'deus-qui-humanae', lang);
				await page.unroute(pattern);
				await retrySameIntent(page);
				await expect(section.locator('.rubric-context')).toContainText(
					lang === 'pl' ? 'wody się nie błogosławi' : 'water is not blessed'
				);
				await expect(section.locator('.rubric-context')).not.toContainText(referenceNote(lang));
				await expect(section.locator('[id="deus-qui-humanae.w001"]')).toBeVisible();
			} finally {
				release();
				await page.unroute(pattern);
			}
		}
	);

	test(
		`${lang} wrong-language dismissal is rejected visibly and the same intent recovers @online`,
		{ tag: '@reader' },
		async ({ page }) => {
			await prepare(page);
			const pattern = `**/artifacts/dismissal/${lang}.json*`;
			await page.route(pattern, async (route) => {
				const response = await route.fetch();
				const body = await response.json();
				body.lang = lang === 'pl' ? 'en' : 'pl';
				await route.fulfill({ response, json: body });
			});
			await page.goto(
				`/app/${lang}/ordo/conclusio?dies=2026-11-02&w=ite-missa-est-defunctorum.w007`
			);
			const section = await neutralDismissal(page, lang);
			await expect(section.locator('[role="status"]')).toBeVisible();
			await referenceBody(part(page, 'benedictio'), 'benedictio', lang);
			await page.unroute(pattern);
			await retrySameIntent(page);
			await expect(section.locator('.part-title')).toHaveText('Requiéscant in pace');
			await expect(section.locator('[id="ite-missa-est-defunctorum.w007"]')).toBeVisible();
		}
	);

	test(
		`${lang} superseded Requiem cannot overwrite the settled ordinary title, note or actors @online`,
		{ tag: '@reader' },
		async ({ page }) => {
			await prepare(page);
			const pattern = `**/artifacts/dismissal/${lang}.json*`;
			let release!: () => void;
			const wait = new Promise<void>((resolve) => {
				release = resolve;
			});
			await page.route(pattern, async (route) => {
				await wait;
				await route.continue();
			});
			try {
				await page.goto(`/app/${lang}/ordo/conclusio?dies=2026-11-02`);
				await neutralDismissal(page, lang);
				await page.evaluate(() => {
					const url = new URL(location.href);
					url.searchParams.set('dies', '2026-04-12');
					url.searchParams.delete('missa');
					history.replaceState(history.state, '', url);
					window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
				});
				const section = part(page, 'ite-missa-est');
				await expect(section.locator('[id="ite-missa-est.w001"]')).toBeVisible();
				await expect(section.locator('.part-title')).toHaveText('Ite, missa est');
				// The settled note as rendered; the comparison below reads rendered text as well.
				const confirmedNote = await section.locator('.part-note').first().innerText();
				await expect(section.locator('.who-name').first()).toBeVisible();
				const lateResponse = page.waitForResponse((response) =>
					response.url().includes(`/artifacts/dismissal/${lang}.json`)
				);
				release();
				await (await lateResponse).finished();
				await page.evaluate(
					() =>
						new Promise<void>((resolve) =>
							requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
						)
				);
				await page.unroute(pattern);
				await expect(section.locator('.part-title')).toHaveText('Ite, missa est');
				await expect(section.locator('.part-note').first()).toHaveText(confirmedNote, {
					useInnerText: true
				});
				await expect(section.locator('[id^="ite-missa-est-defunctorum.w"]')).toHaveCount(0);
				await page.evaluate(() => {
					const url = new URL(location.href);
					url.searchParams.set('dies', '2026-11-02');
					history.replaceState(history.state, '', url);
					window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
				});
				await expect(section.locator('[id="ite-missa-est-defunctorum.w007"]')).toBeVisible();
				await expect(section.locator('.part-title')).toHaveText('Requiéscant in pace');
			} finally {
				release();
				await page.unroute(pattern);
			}
		}
	);

	test(`${lang} genuine resolved ordinary, Paschal and Requiem keep their own titles and visible body states @reader`, async ({
		page
	}) => {
		await prepare(page);
		// The Paschal body names its singers for a sung Mass only; at this low Mass it names nobody.
		for (const [date, slug, title, count, named] of [
			['2026-04-12', 'ite-missa-est', 'Ite, missa est', 11, true],
			['2026-04-04', 'ite-missa-est-paschale', 'Ite, missa est, allelúia, allelúia', 15, false],
			['2026-11-02', 'ite-missa-est-defunctorum', 'Requiéscant in pace', 10, true]
		] as const) {
			await page.goto(`/app/${lang}/ordo/conclusio?dies=${date}`);
			const section = part(page, 'ite-missa-est');
			await expect(section.locator(`[id^="${slug}.w"]`)).toHaveCount(count);
			await expect(section.locator('.part-title')).toHaveText(title);
			await expect(section.locator('.part-title')).toHaveAttribute('lang', 'la');
			await expect(section.locator('.part-note').first()).not.toContainText(referenceNote(lang));
			if (named) await expect(section.locator('.who-name').first()).toBeVisible();
			else await expect(section.locator('.who-name')).toHaveCount(0);
			if (slug === 'ite-missa-est-defunctorum') {
				await expect(section.locator('[id="ite-missa-est-defunctorum.w010"]')).toContainText(
					'Amen'
				);
				await expect(part(page, 'benedictio').locator('.word')).toHaveCount(0);
			} else {
				await expect(section.locator('.part-note').first()).toContainText(
					date === '2026-04-04'
						? lang === 'pl'
							? 'De Tempore'
							: 'temporal Masses'
						: lang === 'pl'
							? 'zwraca się do ludu'
							: 'turns to the people'
				);
				await expect(part(page, 'benedictio').locator('[id="benedictio.w001"]')).toBeVisible();
			}
		}
	});
}

const genericEntries = [
	{
		movement: 'praeparatio',
		id: 'iudica-me',
		title: 'Psalmus Júdica me',
		note: {
			pl: 'Psalm 42 odmawiany na przemian z usługującym, zakończony Chwała Ojcu i powtórzoną antyfoną.',
			en: 'Psalm 42, said in alternation with the server, closed by the Glória Patri and the antiphon again.'
		}
	},
	{
		movement: 'communio',
		id: 'qui-dixisti',
		title: 'Dómine Iesu Christe, qui dixísti',
		note: {
			pl: 'Pierwsza z trzech cichych modlitw przed Komunią — o pokój dla Kościoła. We Mszy uroczystej po niej następuje pocałunek pokoju.',
			en: 'The first of three silent prayers before Communion, for the peace of the Church. At solemn Mass the kiss of peace follows it.'
		}
	},
	{
		movement: 'offertorium',
		id: 'deus-qui-humanae',
		title: 'Deus, qui humánæ substántiæ',
		note: {
			pl: 'Do wina dolewa się kroplę wody. Modlitwa nad nią jest starą kolektą Bożego Narodzenia.',
			en: 'A drop of water goes into the wine. The prayer said over it is an old Christmas collect.'
		}
	},
	{
		movement: 'conclusio',
		id: 'ite-missa-est',
		title: 'Ite, missa est',
		note: {
			pl: 'Kapłan zwraca się do ludu i odsyła go słowami Ite, missa est. Usługujący odpowiada Deo grátias.',
			en: 'The priest turns to the people and dismisses them with Ite, missa est. The server answers Deo grátias.'
		}
	},
	{
		movement: 'conclusio',
		id: 'benedictio',
		title: 'Benedícat vos',
		note: {
			pl: 'Kapłan podnosi oczy, wyciąga ręce i błogosławi lud jednym znakiem krzyża.',
			en: 'The priest raises his eyes, extends his hands, and blesses the people with one sign of the cross.'
		}
	}
] as const;

async function genericGuide(page: Page, lang: 'pl' | 'en', movement: string) {
	for (const row of genericEntries.filter((entry) => entry.movement === movement)) {
		const section = part(page, row.id);
		await expect(section.locator('.part-title')).toHaveText(row.title);
		await expect(section.locator('.part-title')).toHaveAttribute('lang', 'la');
		await expect(section.locator('.part-note').first()).toContainText(row.note[lang]);
		await expect(section.locator('.when')).toBeVisible();
		await expect(section.locator('.part-note').first()).not.toContainText(referenceNote(lang));
		await expect(section.locator(`[id="${row.id}.w001"]`)).toBeVisible();
		// Deus, qui humánæ is said by the priest alone: the guide names its voice, not a speaker.
		await expect(
			section.locator(row.id === 'deus-qui-humanae' ? '.who-voice' : '.who-name').first()
		).toBeVisible();
		await expect(section.locator('.part-title')).toHaveAttribute(
			'href',
			`/app/${lang}/ordinarium/${row.id}`
		);
	}
}
async function unconfirmedGuide(page: Page, lang: 'pl' | 'en', movement: string) {
	for (const row of genericEntries.filter((entry) => entry.movement === movement)) {
		if (row.id === 'ite-missa-est') await neutralDismissal(page, lang);
		else await referenceBody(part(page, row.id), row.id, lang);
	}
}
async function selectGuideMode(page: Page, requiem: boolean) {
	await page.evaluate((requiem) => {
		const url = new URL(location.href);
		url.searchParams.set('dies', requiem ? '2026-11-02' : '2026-04-04');
		url.searchParams.set('missa', requiem ? 'commemoratio-omnium-fidelium-defunctorum' : 'none');
		history.replaceState(history.state, '', url);
		window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
	}, requiem);
}

for (const lang of ['pl', 'en'] as const) {
	test(
		`${lang} explicit Ordinary guide survives cold hydration, held selection and real failure @online`,
		{ tag: '@reader' },
		async ({ page, browser, baseURL }) => {
			await prepare(page);
			// The cold page is the prerendered document before any script runs. Scripting is
			// off rather than held: a held script request is not a cold page in every engine
			// (WebKit showed the hydrated guide while the scripts were held).
			const cold = await browser.newPage({ baseURL, javaScriptEnabled: false });
			const away: string[] = [];
			await cold.route(/^(?!http:\/\/localhost:\d+\/)/, (route) => {
				away.push(route.request().url());
				return route.abort();
			});
			for (const movement of ['praeparatio', 'communio', 'offertorium', 'conclusio']) {
				const address = `/app/${lang}/ordo/${movement}?dies=2026-04-04&missa=none`;
				await cold.goto(address);
				await unconfirmedGuide(cold, lang, movement);
				await page.goto(address);
				await genericGuide(page, lang, movement);

				const pattern = `**/artifacts/dismissal/${lang}.json*`;
				let release!: () => void;
				let requested!: () => void;
				const wait = new Promise<void>((resolve) => {
					release = resolve;
				});
				const arrived = new Promise<void>((resolve) => {
					requested = resolve;
				});
				await page.route(pattern, async (route) => {
					requested();
					await wait;
					await route.fulfill({ status: 503, body: 'unavailable' });
				});
				try {
					await selectGuideMode(page, true);
					await arrived;
					await unconfirmedGuide(page, lang, movement);
					await selectGuideMode(page, false);
					await genericGuide(page, lang, movement);
					const late = page.waitForResponse((response) =>
						response.url().includes(`/artifacts/dismissal/${lang}.json`)
					);
					release();
					await (await late).finished();
					await page.evaluate(
						() =>
							new Promise<void>((resolve) =>
								requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
							)
					);
					await genericGuide(page, lang, movement);
					await expect(page.locator('.picker .state')).toHaveCount(0);
					await selectGuideMode(page, true);
					await expect(page.locator('.picker .state')).toContainText(
						lang === 'pl' ? /nie udało/ : /could/
					);
					await unconfirmedGuide(page, lang, movement);
					await selectGuideMode(page, false);
					await genericGuide(page, lang, movement);
					await expect(page.locator('.picker .state')).toHaveCount(0);
				} finally {
					release();
					await page.unroute(pattern);
				}
			}
			await cold.close();
			expect(away, 'the cold page tried to reach the network').toEqual([]);
		}
	);
}
