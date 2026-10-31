import { expect, setHelp, test } from './fixtures';

const when = {
	pl: {
		iudica:
			'opuszcza się we Mszach za zmarłych oraz we Mszach okresowych (de Tempore) od I Niedzieli Męki Pańskiej do Wielkiego Czwartku włącznie — wraz z doksologią i powtórzoną antyfoną',
		introit:
			'Glória Patri opuszcza się we Mszach za zmarłych oraz we Mszach okresowych (de Tempore) od I Niedzieli Męki Pańskiej do Wielkiego Czwartku włącznie. W Wigilię Paschalną nie ma Introitu.',
		lavabo:
			'Chwały Ojcu nie odmawia się we Mszach za zmarłych ani we Mszach okresowych (de Tempore) od I Niedzieli Męki Pańskiej do Wielkiego Czwartku włącznie. W Wigilię Paschalną odmawia się Chwała Ojcu.'
	},
	en: {
		iudica:
			'omitted at Masses for the Dead and at Masses of the season (de Tempore) from the First Sunday of the Passion through Holy Thursday inclusive — with its doxology and the repeated antiphon',
		introit:
			'the Glória Patri is omitted at Masses for the Dead and at Masses of the season (de Tempore) from the First Sunday of the Passion through Holy Thursday inclusive. There is no Introit at the Easter Vigil',
		lavabo:
			'the Glória Patri is omitted at Masses for the Dead and at Masses of the season (de Tempore) from the First Sunday of the Passion through Holy Thursday inclusive. It is said at the Easter Vigil'
	}
} as const;

for (const language of ['pl', 'en'] as const) {
	test(`@reader ${language} prayer directions avoid unsupported totals and individual Amen claims`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordo/catechumenorum?dies=2026-04-04`);
		const proper = page.locator('[id="vigilia-paschalis-collecta.w001"]');
		await expect(proper).toBeVisible();
		await expect(
			page.locator('section.part').filter({ has: proper }).locator('.part-note')
		).toHaveText(
			language === 'pl'
				? 'Kapłan pozdrawia wiernych, wzywa Orémus i odmawia modlitwę dnia — czasem także modlitwy przypadających wspomnień.'
				: 'The priest greets the people, calls Orémus, and says the day’s prayer, adding the prayers of any commemorations prescribed.'
		);
		await page.goto(`/app/${language}/ordo/offertorium?dies=2026-04-04`);
		const folded = page.locator('section.part').filter({
			has: page.locator('.unfold-title', { hasText: 'Súscipe, sancte Pater' })
		});
		await expect(folded).toHaveCount(1);
		await folded.locator('button.unfold').click();
		const section = page.locator('section.part').filter({
			has: page.locator('a.part-title[href$="/ordinarium/suscipe-sancte-pater"]')
		});
		await expect(section.locator('.part-note')).toHaveText(
			language === 'pl'
				? 'Kapłan unosi patenę z hostią i ofiaruje ją po cichu.'
				: 'The priest raises the paten with the host and offers it silently.'
		);
	});

	test(`@reader ${language} Communion guidance distinguishes the Vigil from Easter Sunday`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordo/conclusio?dies=2026-04-04`);
		await expect(page.locator('[id="vigilia-paschalis-laudes-psalmus.w001"]')).toBeVisible();
		const section = page.locator('section.part').filter({
			has: page.locator('.part-title', { hasText: /^Commúnio$/ })
		});
		await expect(section).toHaveCount(1);
		await expect(section.locator('.part-note')).toHaveText(
			language === 'pl'
				? 'W Wigilię Paschalną nie ma antyfony na Komunię. Po Komunii i ablucjach następują laudesy.'
				: 'At the Easter Vigil, there is no Communion antiphon. Lauds follows Communion and the ablutions.'
		);
		await expect(section.locator('.part-text')).toHaveCount(0);
		await page.goto(`/app/${language}/ordo/conclusio?dies=2026-04-05`);
		await expect(section.locator('[id="dominica-resurrectionis-communio.w001"]')).toBeVisible();
		await expect(section.locator('.part-note')).toHaveText(
			language === 'pl'
				? 'Antyfona z formularza dnia, odczytana po stronie lekcji. We Mszy śpiewanej chór śpiewa ją już podczas rozdawania Komunii.'
				: 'The day’s antiphon, read at the Epistle side. At a sung Mass the choir has already sung it during the distribution of Communion.'
		);
	});

	test(`@reader ${language} offering directions describe the actual chalice prayer`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordo/offertorium?dies=2026-04-04`);
		const cases = [
			{
				id: 'deus-qui-humanae',
				title: 'Deus, qui humánæ substántiæ',
				note:
					language === 'pl'
						? 'Do wina dolewa się kroplę wody. Modlitwa nad nią jest starą kolektą Bożego Narodzenia.'
						: 'A drop of water goes into the wine. The prayer said over it is an old Christmas collect.'
			},
			{
				id: 'offerimus-tibi',
				title: 'Offérimus tibi, Dómine',
				note:
					language === 'pl'
						? 'Kapłan bierze kielich i ofiaruje go, prosząc o zbawienie nasze i całego świata.'
						: 'The priest takes the chalice and offers it, praying for our salvation and that of the whole world.'
			}
		];
		for (const entry of cases) {
			const folded = page.locator('section.part').filter({
				has: page.locator('.unfold-title', { hasText: entry.title })
			});
			await expect(folded).toHaveCount(1);
			await folded.locator('button.unfold').click();
			const section = page.locator('section.part').filter({
				has: page.locator(`a.part-title[href$="/ordinarium/${entry.id}"]`)
			});
			await expect(section.locator('.part-note')).toContainText(entry.note);
		}
	});

	test(`@reader ${language} the dated Mass for the Dead has no unrestricted self-crossing instruction`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordo/catechumenorum?dies=2026-11-02`);
		const proper = page.locator(
			'[id="commemoratio-omnium-fidelium-defunctorum-missa-i-introitus.w001"]'
		);
		await expect(proper).toBeVisible();
		await setHelp(page, 0);
		const section = page.locator('section.part').filter({ has: proper });
		const note = section.locator('.part-note');
		await expect(note).toContainText(
			language === 'pl'
				? 'Kapłan po stronie lekcji czyta Introit — antyfonę na wejście z wersetem psalmu, zwykle także z Glória Patri, po czym powtarza antyfonę.'
				: 'At the Epistle side, the priest reads the Introit antiphon with its psalm verse, usually also the Glória Patri, then repeats the antiphon.'
		);
		await expect(note).not.toContainText(language === 'pl' ? 'żegna się' : 'signs himself');
		await expect(section.locator('.when')).toHaveText(when[language].introit);
	});

	test(`@reader ${language} Iudica condition appears on the dated preparation page`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordo/praeparatio?dies=2026-03-22`);
		const section = page
			.locator('section.part')
			.filter({ has: page.locator('a.part-title[href$="/ordinarium/iudica-me"]') });
		await expect(section.locator('.when')).toHaveText(when[language].iudica);
		// This tests guidance, not a claim that the date already removes the psalm.
	});

	test(`@reader ${language} Palm note is qualified while the actual proper stays without Gloria Patri`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordo/catechumenorum?dies=2026-03-29`);
		const proper = page.locator('[id="dominica-ii-passionis-introitus.w001"]');
		await expect(proper).toBeVisible();
		await setHelp(page, 0);
		const section = page.locator('section.part').filter({ has: proper });
		await expect(section.locator('.when')).toHaveText(when[language].introit);
		await expect(section.locator('.part-note')).toContainText(
			language === 'pl' ? 'zwykle także z Glória Patri' : 'usually also the Glória Patri'
		);
		await expect(section.locator('.word').filter({ hasText: /^Glória$/ })).toHaveCount(0);
		await expect(section.locator('[id="dominica-ii-passionis-introitus.w024"]')).toHaveText(
			'Deus,'
		);
		await expect(section.locator('[id="dominica-ii-passionis-introitus.w040"]')).toHaveText(
			'Dómine,'
		);
	});

	test(`@reader ${language} the Annunciation within Passiontide retains its Introit doxology`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordo/catechumenorum?dies=2026-03-25`);
		const prefix = 'annuntiatio-beatae-mariae-virginis-extra-tempus-paschale-introitus';
		const proper = page.locator(`[id="${prefix}.w001"]`);
		await expect(proper).toBeVisible();
		await setHelp(page, 0);
		const section = page.locator('section.part').filter({ has: proper });
		await expect(section.locator('.when')).toHaveText(when[language].introit);
		await expect(section.locator(`[id="${prefix}.w030"]`)).toHaveText('Glória');
		await expect(section.locator(`[id="${prefix}.w031"]`)).toHaveText('Patri,');
		await expect(section.locator(`[id="${prefix}.w050"]`)).toHaveText('Vultum');
	});

	test(`@reader ${language} Vigil Lavabo doxology and exception note remain readable after unfolding`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordo/offertorium?dies=2026-04-04`);
		const folded = page
			.locator('section.part')
			.filter({ has: page.locator('.unfold-title', { hasText: 'Lavábo' }) });
		await expect(folded).toHaveCount(1);
		await folded.locator('button.unfold').click();
		const section = page.locator('section.part').filter({
			has: page.locator('a.part-title[href$="/ordinarium/lavabo"]')
		});
		await setHelp(page, 0);
		await expect(section.locator('.when')).toHaveText(when[language].lavabo);
		await expect(
			section.locator('.verse').filter({ has: page.locator('.word', { hasText: /^Glória$/ }) })
		).toBeVisible();
		await expect(
			section.locator('.verse').filter({ has: page.locator('.word', { hasText: /^Sicut$/ }) })
		).toBeVisible();
	});

	test(`@reader ${language} Vigil has no Introit body or generic condition, and its contextual note is exact`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordo/catechumenorum?dies=2026-04-04`);
		await expect(page.locator('[id="vigilia-paschalis-collecta.w001"]')).toBeVisible();
		const section = page
			.locator('section.part')
			.filter({ has: page.locator('.part-title', { hasText: /^Intróitus$/ }) });
		await expect(section).toHaveCount(1);
		await expect(section.locator('.part-note')).toHaveText(
			language === 'pl'
				? 'W Wigilię Paschalną nie ma antyfony Introitu ani jej wersetu psalmu i Gloria Patri.'
				: 'At the Easter Vigil, there is no Introit antiphon, psalm verse, or Gloria Patri.'
		);
		await expect(section.locator('.when')).toHaveCount(0);
		await expect(section.locator('.part-text')).toHaveCount(0);
	});
}

// The current Mass carries the closed omission. Its full canonical study page is unchanged.
for (const language of ['pl', 'en'] as const) {
	for (const form of ['lecta', 'cantu'] as const) {
		test(`@reader ${language} ${form} Lavabo follows only the settled source prescription`, async ({
			page
		}) => {
			await page.addInitScript((form) => {
				localStorage.setItem('scrutabor-role', 'sacerdos');
				localStorage.setItem('scrutabor-mass-form', form);
			}, form);
			for (const [date, mass, omitted] of [
				['2026-03-15', 'dominica-iv-in-quadragesima', false],
				['2026-03-22', 'dominica-i-passionis', true],
				['2026-03-25', 'annuntiatio-beatae-mariae-virginis', false],
				['2026-03-29', 'dominica-ii-passionis', true],
				['2026-04-02', 'feria-v-in-cena-domini', true],
				['2026-04-04', 'vigilia-paschalis', false],
				['2026-04-05', 'dominica-resurrectionis', false],
				['2026-11-02', 'commemoratio-omnium-fidelium-defunctorum', true],
				['2026-11-02', 'commemoratio-omnium-fidelium-defunctorum-missa-ii', true],
				['2026-11-02', 'commemoratio-omnium-fidelium-defunctorum-missa-iii', true]
			] as const) {
				await page.goto(`/app/${language}/ordo/offertorium?dies=${date}&missa=${mass}`);
				await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
				await expect(page.locator('[id="lavabo.w074"]')).toBeVisible();
				const section = page.locator('section.part').filter({
					has: page.locator('[id="lavabo.w074"]')
				});
				for (const level of [0, 1, 2] as const) {
					await setHelp(page, level);
					await expect(section.locator('.ordinary-segment-omission')).toHaveCount(omitted ? 1 : 0);
					await expect(section.locator('[id="lavabo.w075"], [id="lavabo.w094"]')).toHaveCount(
						omitted ? 0 : 2
					);
					await expect(section.locator('[id="lavabo-s09"], [id="lavabo-s10"]')).toHaveCount(
						omitted ? 0 : 2
					);
				}
				if (omitted) {
					await expect(section.locator('.ordinary-segment-omission a')).toHaveAttribute(
						'href',
						`/app/${language}/ordinarium/lavabo`
					);
					await page.emulateMedia({ media: 'print' });
					await expect(section.locator('[id="lavabo-s08"]')).toBeVisible();
					await expect(section.locator('[id="lavabo-s09"]')).toHaveCount(0);
					await page.emulateMedia({ media: 'screen' });
				}
			}
		});
	}

	for (const kind of ['word', 'segment', 'range'] as const) {
		test(`@reader ${language} omitted Lavabo ${kind} intent opens only the canonical study page`, async ({
			page
		}) => {
			await page.setViewportSize({ width: 320, height: 740 });
			await page.addInitScript(() => {
				localStorage.setItem('scrutabor-role', 'populus');
				localStorage.setItem(
					'scrutabor-pos:ordo/offertorium',
					JSON.stringify({ y: 4800, t: Date.now() })
				);
			});
			const selected = kind === 'segment' ? 's09' : 's08-s10';
			const param = kind === 'word' ? 'w=lavabo.w075' : `s=lavabo.${selected}`;
			const local = kind === 'word' ? 'w=w075' : `s=${selected}`;
			await page.goto(`/app/${language}/ordo/offertorium?dies=2026-03-29&${param}`);
			const note = page.locator('.ordinary-segment-omission');
			await expect(note).toBeVisible();
			await expect(note).toHaveAttribute('id', 'ordinary-omission-lavabo');
			await expect(note).toBeInViewport();
			await expect
				.poll(() =>
					note.evaluate((element) => {
						const box = element.getBoundingClientRect();
						return Math.abs(box.top + box.height / 2 - innerHeight / 2);
					})
				)
				.toBeLessThan(12);
			await expect(page.locator('[id="lavabo.w075"]')).toHaveCount(0);
			await expect(page.getByRole('dialog')).toHaveCount(0);
			await expect
				.poll(() => {
					const url = new URL(page.url());
					return url.protocol === 'file:' ? url.hash : url.search;
				})
				.toContain(param);
			await expect(note.locator('a')).toHaveAttribute(
				'href',
				`/app/${language}/ordinarium/lavabo?${local}`
			);
			await page.evaluate(() => {
				window.scrollTo(0, 0);
				window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
			});
			await page.evaluate(
				() =>
					new Promise<void>((resolve) =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
					)
			);
			expect(await page.evaluate(() => scrollY)).toBe(0);
			await note.locator('a').click();
			await expect(page.locator('[id="w075"]')).toBeVisible();
			if (kind === 'word')
				await expect(page.locator('aside .form').first()).toContainText('Glória');
			await page.goto(`/app/${language}/ordo/offertorium?dies=2026-03-25&${param}`);
			await expect(page.locator('[id="lavabo.w075"]')).toBeVisible();
			await expect(page.locator('.ordinary-segment-omission')).toHaveCount(0);
			if (kind === 'word')
				await expect(page.locator('aside .form').first()).toContainText('Glória');
			else await expect(page.locator('[id="lavabo-s09"]')).toHaveClass(/segment-selected/);
			await page.setViewportSize({ width: 320, height: 740 });
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
		});
	}

	test(`@reader ${language} an omitted Lavabo word lands even when a zero-delay timer runs late`, async ({
		page
	}) => {
		await page.setViewportSize({ width: 320, height: 740 });
		await page.addInitScript(() => {
			localStorage.setItem('scrutabor-role', 'populus');
			// Nothing orders a zero-delay timer before the next two frames, and WebKit ran
			// one after them. Run each such timer late here, and keep the ones still waiting.
			const timer = window.setTimeout.bind(window);
			const clear = window.clearTimeout.bind(window);
			const waiting = new Set<number>();
			Object.assign(window, { lateTimers: waiting });
			window.setTimeout = ((handler: () => void, delay?: number, ...rest: unknown[]) => {
				if (delay) return timer(handler, delay, ...rest);
				const id = timer(() => {
					waiting.delete(id);
					handler(...(rest as []));
				}, 60);
				waiting.add(id);
				return id;
			}) as typeof window.setTimeout;
			window.clearTimeout = ((id?: number) => {
				if (id !== undefined) waiting.delete(id);
				clear(id);
			}) as typeof window.clearTimeout;
		});
		await page.goto(`/app/${language}/ordo/offertorium?dies=2026-03-29&w=lavabo.w075`);
		const note = page.locator('#ordinary-omission-lavabo');
		await expect(note).toBeVisible();
		await expect
			.poll(() =>
				page.evaluate(() => (window as unknown as { lateTimers: Set<number> }).lateTimers.size)
			)
			.toBe(0);
		await page.evaluate(
			() =>
				new Promise<void>((resolve) =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
				)
		);
		await expect(note).toBeInViewport();
		expect(
			await note.evaluate((element) => {
				const box = element.getBoundingClientRect();
				return Math.abs(box.top + box.height / 2 - innerHeight / 2);
			})
		).toBeLessThan(12);
		await expect(page.getByRole('dialog')).toHaveCount(0);
	});

	test(`${language} a failed dated payload keeps full Lavabo and recovers its prescribed view @online`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-role', 'sacerdos'));
		const pattern = `**/artifacts/proprium/${language}/pack-*.json`;
		await page.route(pattern, (route) => route.fulfill({ status: 503, body: 'unavailable' }));
		await page.goto(`/app/${language}/ordo/offertorium?dies=2026-03-29`);
		await expect(page.locator('section.part [role="status"]').first()).toBeVisible();
		await expect(page.locator('[id="lavabo.w094"]')).toBeVisible();
		await expect(page.locator('.ordinary-segment-omission')).toHaveCount(0);
		await page.unroute(pattern);
		await page.reload();
		await expect(page.locator('.ordinary-segment-omission')).toBeVisible();
		await expect(page.locator('[id="lavabo.w094"]')).toHaveCount(0);
	});
}

// A gesture while the selected payload is pending ends that same landing window.
test.describe('pending omitted citations', () => {
	test.use({ serviceWorkers: 'block' });
	for (const language of ['pl', 'en'] as const) {
		test(`${language} a pending omitted citation lands once and yields to gestures and a newer Mass @online`, async ({
			page
		}) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-role', 'sacerdos'));
			for (const action of [
				'landing',
				'gesture',
				'explicit-gesture',
				'implicit-gesture',
				'navigation'
			] as const) {
				let release!: () => void;
				let requested!: () => void;
				let held = false;
				const gate = new Promise<void>((resolve) => {
					release = resolve;
				});
				const arrived = new Promise<void>((resolve) => {
					requested = resolve;
				});
				const pattern = `**/artifacts/proprium/${language}/pack-*.json*`;
				await page.route(pattern, async (route) => {
					if (!held) {
						held = true;
						requested();
						await gate;
					}
					await route.continue();
				});
				try {
					const implicit = action === 'implicit-gesture';
					// Reuse the preceding real picker's remembered row, without a test clock guess.
					if (implicit)
						expect(
							await page.evaluate(() => JSON.parse(localStorage.getItem('scrutabor-day')!))
						).toMatchObject({ date: '2026-03-29', mass: 'dominica-ii-passionis' });
					const mass = action === 'explicit-gesture' ? '&missa=dominica-ii-passionis' : '';
					const query = implicit ? 'w=lavabo.w075' : `dies=2026-03-29${mass}&w=lavabo.w075`;
					await page.goto(`/app/${language}/ordo/offertorium?${query}`);
					await arrived;
					await expect(page.locator('main')).toHaveAttribute('aria-busy', 'true');
					if (action === 'explicit-gesture' || implicit)
						await expect.poll(() => new URL(page.url()).searchParams.get('missa')).toBeNull();
					if (implicit)
						await expect
							.poll(() => new URL(page.url()).searchParams.get('dies'))
							.toBe('2026-03-29');
					await expect(page.locator('aside .form').first()).toContainText('Glória');
					if (action === 'gesture' || action === 'explicit-gesture' || implicit) {
						// The held load's notice changes the header height once it is slow. Let it
						// appear first: a shift during the animated Home scroll moves its rest.
						await expect(page.locator('.picker .state')).toHaveText(
							language === 'pl' ? 'wczytywanie' : 'loading'
						);
						await page.keyboard.press('Home');
						await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
					} else if (action === 'navigation') {
						await page.evaluate(() => {
							const url = new URL(location.href);
							url.searchParams.set('dies', '2026-03-25');
							history.replaceState(history.state, '', url);
							window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
						});
					}
					release();
					await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
					await page.evaluate(
						() =>
							new Promise<void>((resolve) =>
								requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
							)
					);
					if (action === 'landing') {
						const note = page.locator('#ordinary-omission-lavabo');
						await expect(note).toBeInViewport();
						await expect
							.poll(() =>
								note.evaluate((element) => {
									const box = element.getBoundingClientRect();
									return Math.abs(box.top + box.height / 2 - innerHeight / 2);
								})
							)
							.toBeLessThan(12);
						await expect(page.getByRole('dialog')).toHaveCount(0);
					} else if (action === 'gesture' || action === 'explicit-gesture' || implicit) {
						await expect(page.locator('#ordinary-omission-lavabo')).toBeVisible();
						await expect(page.locator('#ordinary-omission-lavabo')).not.toBeInViewport();
						expect(await page.evaluate(() => scrollY)).toBe(0);
						await expect(page.locator('[id="lavabo.w075"]')).toHaveCount(0);
					} else {
						await expect(page.locator('#ordinary-omission-lavabo')).toHaveCount(0);
						await expect(page.locator('[id="lavabo.w075"]')).toBeVisible();
					}
				} finally {
					release();
					await page.unroute(pattern);
				}
			}
		});
	}
});
