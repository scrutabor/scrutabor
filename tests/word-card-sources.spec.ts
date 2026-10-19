import type { Locator, Page, Route } from '@playwright/test';
import { expect, test } from './fixtures';

test.use({ viewport: { width: 320, height: 800 } });

const scope = {
	pl: 'Źródła do wybranych objaśnień znaczenia i gramatyki.',
	en: 'References for selected explanations of meaning and grammar.'
};

const sourceLabels = {
	pl: 'źródła hasła',
	en: 'dictionary sources'
};

const expectedCitations = {
	veneror: [
		{
			title: 'A Latin Dictionary',
			locator: 'Perseus TEI entry n50434',
			url: 'https://github.com/PerseusDL/lexica/blob/40038e40937fa639639802e73dac15e6c938496b/CTS_XML_TEI/perseus/pdllex/lat/ls/lat.ls.perseus-eng1.xml'
		},
		{
			title: "Allen and Greenough's New Latin Grammar for Schools and Colleges",
			locator: '§190 and §190d · pp. 103–105 · Physical PDF pages 121–123 (one-based)',
			url: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Allen_and_Greenough%27s_New_Latin_grammar_for_schools_and_colleges%2C_founded_on_comparative_grammar%3B_%28IA_allengreenoughsn00alleiala%29.pdf#page=123'
		}
	],
	in: [
		{
			title: 'A Latin Dictionary',
			locator: 'Perseus TEI entry n22111',
			url: 'https://github.com/PerseusDL/lexica/blob/40038e40937fa639639802e73dac15e6c938496b/CTS_XML_TEI/perseus/pdllex/lat/ls/lat.ls.perseus-eng1.xml'
		}
	]
};

async function expectClosedSources(sources: Locator, lang: 'pl' | 'en') {
	await expect(sources.locator('details')).toHaveCount(1);
	await expect(sources.locator('details')).toHaveJSProperty('open', false);
	await expect(sources.locator('.source-scope')).not.toBeVisible();
	await expect(sources.locator('summary')).toHaveText(sourceLabels[lang]);
}

async function expectExactCitations(sources: Locator, lemma: keyof typeof expectedCitations) {
	await expect(sources.locator('ol > li')).toHaveCount(expectedCitations[lemma].length);
	for (const citation of expectedCitations[lemma]) {
		const link = sources.getByRole('link', { name: citation.title, exact: true });
		await expect(link).toHaveCount(1);
		await expect(link).toHaveAttribute('href', citation.url);
		await expect(link.locator('..')).toHaveText(`${citation.title}, ${citation.locator}`);
	}
}

for (const host of ['', ' @static-host']) {
	for (const lang of ['pl', 'en'] as const) {
		test(`dictionary sources stay at the entry level in ${lang}${host}`, async ({ page }) => {
			await page.goto(`/app/${lang}/orationes/te-deum?w=w065`);
			const sources = page.locator('aside .lemma-sources[data-lemma="veneror"]');
			await expect(page.locator('aside .construction-card')).toHaveCount(lang === 'en' ? 6 : 0);
			const entry =
				lang === 'en'
					? page
							.locator('aside .construction-card')
							.filter({ has: page.locator('.lemma-sources[data-lemma="veneror"]') })
					: page.locator('aside');
			await expect(sources.locator('details')).toHaveCount(1);
			await expect(sources.locator('.source-scope')).not.toBeVisible();
			await expectClosedSources(sources, lang);
			await sources.locator('summary').click();
			await expect(sources.locator('.source-scope')).toHaveText(scope[lang]);
			await expect(sources.locator('ol')).toContainText('Perseus TEI entry n50434');
			await expect(sources.locator('ol a', { hasText: 'A Latin Dictionary' })).toHaveAttribute(
				'href',
				/^https:/
			);
			await expectExactCitations(sources, 'veneror');
			await expect(entry.locator('.morph')).toBeVisible();
			await expect(page.locator('aside .gloss')).toBeVisible();
			await expect(page.locator('aside .context-layer .lemma-sources')).toHaveCount(0);
		});

		test(`each grouped member keeps its own dictionary sources in ${lang}${host}`, async ({
			page
		}) => {
			await page.goto(`/app/${lang}/orationes/te-deum?w=w192`);
			await expect(page.locator('aside .construction-card')).toHaveCount(4);
			const member = page.locator('aside .construction-card').filter({
				has: page.locator(`.head a[href="/app/${lang}/lemma?l=in"]`)
			});
			const sources = member.locator('.lemma-sources[data-lemma="in"]');
			await expect(sources.locator('summary')).toBeVisible();
			await expectClosedSources(sources, lang);
			await sources.locator('summary').click();
			await expect(sources.locator('ol')).toContainText('Perseus TEI entry n22111');
			await expect(sources.locator('.source-scope')).toHaveText(scope[lang]);
			await expectExactCitations(sources, 'in');
			await expect(page.locator('aside .construction-context .lemma-sources')).toHaveCount(0);
		});
	}

	test(`a lemma without lexical/grammatical support does not acquire a source${host}`, async ({
		page
	}) => {
		await page.goto('/app/en/orationes/te-deum?w=w078');
		await expect(page.locator('aside .form')).toHaveText('Christe');
		const sources = page.locator('aside .lemma-sources[data-lemma="Christus"]');
		await expect(sources.locator('[data-source-state="loaded"]')).toHaveCount(1);
		await expect(sources.locator('[role="status"]')).toHaveCount(0);
		await expect(sources.locator('[role="alert"]')).toHaveCount(0);
		await expect(sources.locator('details')).toHaveCount(0);
		await expect(page.locator('aside .head')).toContainText('Christ');
	});

	// Match the real emitted neutral index, not a substitute success payload.
	// A control that reaches no matching module must fail. Other requests fall
	// through to the suite's existing local-only network guard.
	async function controlNeutralIndex(page: Page, failOnce = false) {
		let release!: () => void;
		const held = new Promise<void>((resolve) => (release = resolve));
		let matched = 0;
		const receipts: { url: string; owner: string; status: number; outcome: string }[] = [];
		const handle = async (route: Route) => {
			const request = route.request();
			const url = new URL(request.url());
			const worker = request.serviceWorker();
			const workerFetch =
				failOnce &&
				worker !== null &&
				request.resourceType() === 'fetch' &&
				url.pathname.startsWith('/_app/immutable/corpus/');
			if (
				!['localhost', '127.0.0.1'].includes(url.hostname) ||
				(request.resourceType() !== 'script' && !workerFetch)
			) {
				return route.fallback();
			}
			const response = await route.fetch({ maxRedirects: 0, timeout: 15_000 });
			const body = await response.text();
			const neutral =
				body.includes('source_groups') &&
				body.includes('latin_textual_sources') &&
				body.includes('Perseus TEI entry n50434') &&
				!body.includes('wording_witnesses');
			let receipt: (typeof receipts)[number] | undefined;
			if (neutral) {
				matched++;
				receipt = {
					url: request.url(),
					owner: worker ? 'worker-fetch' : 'page-script',
					status: response.status(),
					outcome: 'held'
				};
				receipts.push(receipt);
				if (failOnce && matched === 1) {
					receipt.outcome = 'aborted';
					return route.abort('failed');
				}
				await held;
			}
			await route.fulfill({ response });
			if (receipt) receipt.outcome = 'fulfilled';
		};
		await page.route('**/*', handle);
		if (failOnce) {
			// Page routing cannot see a fetch owned by the worker after Reload.
			// Keep the original page guard; add only the worker's corpus network path.
			await page.context().route('**/_app/immutable/corpus/*', async (route) => {
				if (!route.request().serviceWorker()) return route.fallback();
				return handle(route);
			});
		}
		return { release, matches: () => matched, receipts: () => receipts.map((r) => ({ ...r })) };
	}

	test(`a held source request cannot blank the card or repaint an earlier lemma @online${host}`, async ({
		page
	}) => {
		const control = await controlNeutralIndex(page);
		try {
			await page.goto('/app/en/orationes/te-deum?w=w065', { waitUntil: 'domcontentloaded' });
			const old = page.locator('aside .lemma-sources[data-lemma="veneror"]');
			const entry = page
				.locator('aside .construction-card')
				.filter({ has: page.locator('.lemma-sources[data-lemma="veneror"]') });
			await expect(old.locator('[role="status"]')).toBeVisible();
			await expect(page.locator('aside .construction-card')).toHaveCount(6);
			await expect(entry.locator('.head')).toContainText('véneror');
			await expect(entry.locator('.morph')).toBeVisible();
			await expect.poll(control.matches).toBe(1);
			await page.locator('#w192').click();
			await expect(page.locator('aside .construction-card')).toHaveCount(4);
			const current = page.locator('aside .lemma-sources[data-lemma="in"]');
			await expect(current.locator('[role="status"]')).toBeVisible();
			await expect(old).toHaveCount(0);
			expect(control.matches()).toBe(1);
			const pending = await current.boundingBox();
			control.release();
			await expect(current.locator('summary')).toBeVisible();
			const loaded = await current.boundingBox();
			expect(pending).not.toBeNull();
			expect(loaded).not.toBeNull();
			expect(Math.abs(loaded!.height - pending!.height)).toBeLessThanOrEqual(1);
			await expectClosedSources(current, 'en');
			await current.locator('summary').click();
			await expect(current.locator('ol')).toContainText('Perseus TEI entry n22111');
			await expect(current.locator('ol')).not.toContainText('n50434');
			await expectExactCitations(current, 'in');
			expect(control.matches()).toBe(1);
		} finally {
			control.release();
		}
	});

	test(`source failure stays explicit and reload retries the same selection @online${host}`, async ({
		page
	}) => {
		const control = await controlNeutralIndex(page, true);
		control.release();
		await page.goto('/app/en/orationes/te-deum?w=w065', { waitUntil: 'domcontentloaded' });
		const sources = page.locator('aside .lemma-sources[data-lemma="veneror"]');
		const entry = page
			.locator('aside .construction-card')
			.filter({ has: page.locator('.lemma-sources[data-lemma="veneror"]') });
		await expect(sources.locator('[role="alert"]')).toContainText('Sources unavailable.');
		await expect(sources.locator('details')).toHaveCount(0);
		await expect(page.locator('aside .construction-card')).toHaveCount(6);
		await expect(entry.locator('.morph')).toBeVisible();
		await expect(entry.locator('.head')).toContainText('véneror');
		const failed = await sources.evaluate((element) => ({
			height: element.getBoundingClientRect().height,
			reserved: parseFloat(getComputedStyle(element).minBlockSize)
		}));
		expect(Math.abs(failed.height - failed.reserved)).toBeLessThanOrEqual(1);
		// Exercise the real production worker, not a cache/controller spoof.
		await expect
			.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null))
			.toMatch(/\/service-worker\.js$/);
		const moduleUrl = control.receipts()[0].url;
		const recoveredModule = page.waitForResponse(
			(response) =>
				response.url() === moduleUrl &&
				response.request().resourceType() === 'script' &&
				response.ok()
		);
		await sources.getByRole('button', { name: 'Reload', exact: true }).click();
		expect((await recoveredModule).fromServiceWorker()).toBe(true);
		await expect(page).toHaveURL(/w=w065/);
		await expect(sources.locator('summary')).toBeVisible();
		expect(control.matches()).toBe(2);
		await expect.poll(control.receipts).toEqual([
			{
				url: moduleUrl,
				owner: expect.stringMatching(/^(page-script|worker-fetch)$/),
				status: 200,
				outcome: 'aborted'
			},
			{ url: moduleUrl, owner: 'worker-fetch', status: 200, outcome: 'fulfilled' }
		]);
		await expect(sources.locator('[role="alert"]')).toHaveCount(0);
		await expect(page.locator('aside .construction-card')).toHaveCount(6);
		await expect(entry.locator('.morph')).toBeVisible();
		await expectClosedSources(sources, 'en');
		await sources.locator('summary').click();
		await expect(sources.locator('ol')).toContainText('Perseus TEI entry n50434');
		await expectExactCitations(sources, 'veneror');
	});
}
