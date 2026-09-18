// The reading experience: help ladder, panel layers, cross-reference jumps.
import { setHelp, atRoute, expect, settled, test } from './fixtures';

const AVE = '/app/pl/orationes/ave-maria';
const CONFITEOR = '/app/pl/ordinarium/confiteor';

test('the control walks the three reading modes', async ({ page }) => {
	await page.goto(CONFITEOR);

	// default (interlinearnie): glosses and rubric narratives, no
	// translations
	await expect(page.locator('rt').first()).toBeVisible();
	await expect(page.locator('.rubric-narrative').first()).toBeVisible();
	await expect(page.locator('.translation')).toHaveCount(0);

	// łacina: the prayers bare of language help — the narrative layer
	// stays, in every mode (owner, 2026-08-21)
	await setHelp(page, 0);
	await expect(page.locator('rt')).toHaveCount(0);
	await expect(page.locator('.rubric-narrative').first()).toBeVisible();

	// przekład: the bilingual view — translations and narratives, and the
	// interlinear yields (it is the interlinearnie mode's own layer; the word panel keeps
	// the word-by-word one tap away in every mode)
	await setHelp(page, 2);
	await expect(page.locator('.translation').first()).toBeVisible();
	await expect(page.locator('.rubric-narrative').first()).toBeVisible();
	await expect(page.locator('rt')).toHaveCount(0);
});

test('one target gloss spans a multiword Latin construction', async ({ page }) => {
	for (const [language, target] of [
		['pl', 'będzie'],
		['en', 'shall be']
	] as const) {
		await page.goto(`/app/${language}/formularium/commemoratio-omnium-fidelium-defunctorum`);
		await setHelp(page, 1);
		const group = page.locator('.token-group', { hasText: 'est futúrus' });
		await expect(group).toHaveCount(1);
		const targetButton = group.locator(':scope > button.word-construction');
		await expect(targetButton).toHaveCount(1);
		await expect(group.locator('button.word')).toHaveCount(1);
		await expect(group.locator('rt')).toHaveText(target);
		await page.evaluate(() => document.fonts.ready.then(() => true));

		const geometry = () =>
			group.evaluate((element) => {
				const shared = element.querySelector('rt')!;
				const verse = element.closest('.verse')!;
				const verseTop = verse.getBoundingClientRect().top;
				const annotations = [...verse.querySelectorAll('rt')];
				const at = annotations.indexOf(shared);
				const round = (value: number) => Math.round(value * 100) / 100;
				const rect = (node: Element) => node.getBoundingClientRect();
				return {
					sharedTop: round(rect(shared).top - verseTop),
					beforeTop: round(rect(annotations[at - 1]).top - verseTop),
					afterTop: round(rect(annotations[at + 1]).top - verseTop),
					groupHeight: round(rect(element).height),
					verseHeight: round(rect(verse).height),
					nextVerseTop: round(rect(verse.nextElementSibling!).top - verseTop)
				};
			});

		const before = await geometry();
		expect(Math.abs(before.sharedTop - before.beforeTop)).toBeLessThan(0.75);
		expect(Math.abs(before.sharedTop - before.afterTop)).toBeLessThan(0.75);
		await targetButton.hover();
		expect(await geometry(), 'hover changes no line or annotation geometry').toEqual(before);
		const wash = await group.evaluate((element) => {
			const shared = element.querySelector('rt')!;
			const source = element.querySelector('.token')!;
			const groupStyle = getComputedStyle(element, '::before');
			const sourceStyle = getComputedStyle(source, '::before');
			const groupBox = element.getBoundingClientRect();
			const washBottom = groupBox.bottom - parseFloat(groupStyle.bottom);
			return {
				background: groupStyle.backgroundColor,
				borderRadius: groupStyle.borderRadius,
				childDisplay: sourceStyle.display,
				glossClearance: washBottom - shared.getBoundingClientRect().bottom
			};
		});
		expect(wash.background).not.toBe('rgba(0, 0, 0, 0)');
		expect(wash.borderRadius).not.toBe('0px');
		expect(wash.childDisplay, 'the alignment has one wash, not one per word').toBe('none');
		expect(wash.glossClearance, 'the wash ends just below the shared gloss').toBeGreaterThan(1);
		expect(wash.glossClearance).toBeLessThan(6);

		await setHelp(page, 0);
		await expect(page.locator('rt')).toHaveCount(0);
		await expect(page.locator('button.word', { hasText: 'futúrus' })).toBeVisible();
	}
});

test('standalone Ordinary prayers omit process rubrics but keep textual directions', async ({
	page
}) => {
	// The catalogue is a shelf of prayers, not a second walk through Mass.
	// Opening rubrics depend on the preceding action ("then", "when the
	// Preface is finished") and belong in Ordo Missæ. Directions attached
	// to words within a prayer still help when that prayer is opened alone.
	for (const slug of ['kyrie', 'gloria', 'sanctus']) {
		await page.goto(`/app/pl/ordinarium/${slug}`);
		await expect(page.locator('main > .rubric')).toHaveCount(0);
	}

	await page.goto('/app/pl/ordinarium/confiteor');
	await expect(page.locator('main > .rubric')).toHaveCount(1);
	await expect(page.locator('main > .rubric')).toContainText('Percutiunt sibi pectus ter');

	await page.goto('/app/pl/ordinarium/credo');
	await expect(page.locator('main > .rubric')).toHaveCount(1);
	await expect(page.locator('main > .rubric')).toContainText('Hic genuflectitur');

	await page.goto('/app/pl/ordinarium/agnus-dei');
	await expect(page.locator('main > .rubric')).toHaveCount(1);
	await expect(page.locator('main > .rubric')).toContainText('In Missis Defunctorum');

	// The continuous Ordo retains the complete ritual context.
	await page.goto('/app/pl/ordo/catechumenorum');
	await expect(
		page.locator('.rubric-la', {
			hasText: 'Qua finita, iunctis manibus, et alternatim cum Ministris, dicit'
		})
	).toBeVisible();
});

test('the standalone Kyrie does not contradict its participation label', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/kyrie');
	await expect(page.locator('.rubric-narrative')).toHaveCount(0);
	await expect(page.locator('.who-name')).toHaveText('wierni');
});

test('a suppressed opening rubric leaves no empty ritual step', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/kyrie');
	const gap = await page.evaluate(() => {
		const header = document.querySelector('header')!.getBoundingClientRect();
		const first = document.querySelector('main > :not(.rubric-anchor)')!.getBoundingClientRect();
		return first.top - header.bottom;
	});
	expect(gap).toBeLessThan(8);
});

test('a speaker label clears the raised initial below it', async ({ page }) => {
	for (const width of [390, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/app/pl/ordinarium/confiteor');

		for (const help of [0, 1] as const) {
			await setHelp(page, help);
			const clearance = await page.evaluate(() => {
				const label = document.querySelector('main .who')!.getBoundingClientRect();
				const initial = document.querySelector('main .initial')!.getBoundingClientRect();
				return initial.top - label.bottom;
			});
			expect(clearance, `${width}px viewport, help ${help}`).toBeGreaterThan(1.5);
		}
	}
});

test('a prayer identifies its translation sources once after the text', async ({ page }) => {
	await page.goto('/app/pl/orationes/pater-noster');
	await setHelp(page, 2);
	await expect(page.locator('.seg-extra details.source-notes')).toHaveCount(0);
	const sources = page.locator('main .translation-sources details.source-notes');
	await expect(sources).toHaveCount(1);
	await expect(sources.getByText('źródła', { exact: true })).toBeVisible();
	await sources.locator('summary').click();
	await expect(sources).toContainText('Droga do Nieba');
	await expect(sources).toContainText('druk. s. 10 · PDF s. 12');
	await expect(sources.getByRole('link', { name: 'pełna bibliografia' })).toHaveAttribute(
		'href',
		'/app/pl/bibliographia'
	);
});

test('a cited translation states how its wording relates to the historical source', async ({
	page
}) => {
	await page.goto('/app/pl/orationes/benedic-domine');
	await setHelp(page, 2);
	const translations = page.locator('main .translation');
	await expect(translations.nth(0)).toHaveText(/Pobłogosław,\s+o\s+Panie,\s+nas/);
	await expect(translations.nth(1)).toHaveText(/i\s+te dary Twoje,/);
	await expect(translations.nth(2)).toHaveText(/które z\s+Twej dobroci spożywać będziemy\./);
	await expect(translations.nth(3)).toHaveText(/Przez Chrystusa Pana naszego\. Amen\./);
	let sources = page.locator('main .translation-sources details.source-notes');
	await sources.locator('summary').click();
	await expect(sources).toContainText('relacja z brzmieniem historycznym');
	await expect(sources).toContainText('znaną formułę tradycyjną');
	await expect(sources).toContainText(
		'Katechizm religji rzymsko-katolickiej dla użytku szkół polskich w Republice Czechosłowackiej'
	);

	await page.goto('/app/en/orationes/benedic-domine');
	await setHelp(page, 2);
	sources = page.locator('main .translation-sources details.source-notes');
	await sources.locator('summary').click();
	await expect(sources).toContainText('relationship to historical wording');
	await expect(sources).toContainText('edited directly from the Latin');
	await expect(sources).toContainText("The Catholic Girl's Guide");
});

test('a litany pairs every invocation with its exact response in compact columns', async ({
	page
}) => {
	await page.setViewportSize({ width: 1280, height: 760 });
	await page.goto('/app/pl/litaniae/lauretanae');

	// Every response remains present and shares a row with its invocation.
	// The columns save height without losing the exact formula or its anchor.
	await expect(page.locator('#s006')).toBeVisible();
	await expect(page.locator('#s007')).toBeVisible();
	await expect(page.locator('#s009')).toBeVisible();
	await expect(page.locator('#s015')).toBeVisible();
	await expect(page.locator('#s017')).toBeVisible();
	await expect(page.locator('.response-continuation')).toHaveCount(0);

	const paired = await page
		.locator('.litany-pair')
		.first()
		.evaluate((row) => {
			const invocation = row.querySelector('.litany-invocation .verse')!.getBoundingClientRect();
			const response = row.querySelector('.litany-response .verse')!.getBoundingClientRect();
			return {
				columnCount: getComputedStyle(row).gridTemplateColumns.split(' ').length,
				topDifference: Math.abs(invocation.top - response.top),
				responseStartsAfterInvocation: response.left > invocation.left,
				pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
			};
		});
	expect(paired.columnCount).toBe(2);
	expect(paired.topDifference).toBeLessThan(2);
	expect(paired.responseStartsAfterInvocation).toBe(true);
	expect(paired.pageOverflow).toBe(0);
	const maxInvocationLines = () =>
		page
			.locator('.litany-pair')
			.evaluateAll((rows) =>
				Math.max(
					...rows.map(
						(row) =>
							new Set(
								[...row.querySelectorAll('.litany-invocation ruby')].map((word) =>
									Math.round(word.getBoundingClientRect().top)
								)
							).size
					)
				)
			);
	expect(await maxInvocationLines()).toBe(1);

	// Concordance links retain their exact occurrence and open the ordinary
	// word panel without changing the two-column layout.
	await page.goto('/app/pl/litaniae/lauretanae?w=w044');
	await expect(page.locator('#s017')).toBeVisible();
	await expect(page.locator('#w044')).toHaveClass(/selected/);
	await expect(page.locator('aside')).toBeVisible();

	await setHelp(page, 2);
	await expect(page.locator('main .translation-sources details.source-notes')).toHaveCount(1);
	await expect(page.locator('.seg-extra details.source-notes')).toHaveCount(0);

	// Stack before the longest invocation becomes the tall one-word ladder
	// seen on a tablet. The breakpoint follows the chosen print size; when
	// columns return, every invocation fits a single Latin-and-gloss line.
	const compactShape = () =>
		page
			.locator('.litany-pair')
			.first()
			.evaluate((row) => ({
				columnCount: getComputedStyle(row).gridTemplateColumns.split(' ').length,
				pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
			}));
	await page.setViewportSize({ width: 922, height: 760 });
	await expect.poll(compactShape).toEqual({ columnCount: 1, pageOverflow: 0 });
	expect(await maxInvocationLines()).toBe(1);

	await page.setViewportSize({ width: 320, height: 760 });
	await expect.poll(compactShape).toEqual({ columnCount: 1, pageOverflow: 0 });

	await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
	await page.setViewportSize({ width: 922, height: 760 });
	await page.goto('/app/pl/litaniae/lauretanae');
	await expect.poll(compactShape).toEqual({ columnCount: 1, pageOverflow: 0 });
	expect(await maxInvocationLines()).toBe(1);

	await page.setViewportSize({ width: 1665, height: 760 });
	await expect.poll(compactShape).toEqual({ columnCount: 2, pageOverflow: 0 });
	expect(await maxInvocationLines()).toBe(1);
});

test('word panel separates context, dictionary, grammar and verification', async ({ page }) => {
	await page.goto('/app/pl/orationes/ave-regina-caelorum?w=w008'); // radix
	const panel = page.locator('aside');
	await expect(panel.locator('.form')).toHaveText('radix');
	// Pronunciation belongs to the selected form and is available before
	// contextual or reference material requires any scrolling.
	await expect(panel.locator('header .pronunciation-lead .pron')).toBeVisible();
	await expect(panel.locator('.layer .pron')).toHaveCount(0);
	const headingRows = await panel.locator('header').evaluate((header) => {
		const title = header.querySelector('.form')!.getBoundingClientRect();
		const pronunciation = header.querySelector('.pronunciation-lead')!.getBoundingClientRect();
		const titleStyle = getComputedStyle(header.querySelector('.form')!);
		const pronunciationStyle = getComputedStyle(header.querySelector('.pronunciation-lead')!);
		return {
			titleCenter: title.top + title.height / 2,
			pronunciationCenter: pronunciation.top + pronunciation.height / 2,
			titleAlign: titleStyle.textAlign,
			pronunciationAlign: pronunciationStyle.textAlign
		};
	});
	expect(Math.abs(headingRows.pronunciationCenter - headingRows.titleCenter)).toBeLessThanOrEqual(
		3
	);
	expect(headingRows.titleAlign).toBe('left');
	expect(headingRows.pronunciationAlign).toBe('left');
	await expect(panel.locator('.layer-label')).toHaveText(['hasło', 'forma']);
	await expect(panel.locator('.head')).not.toContainText('›');
	// The short reading aid comes first. A genuinely useful explanation is a
	// separate, quieter paragraph rather than a dash followed by grammar. It
	// aligns with the selected word instead of entering the technical grid.
	const context = panel.locator('.context-layer');
	await expect(context).toHaveAttribute('aria-label', /^znaczenie w.kontekście$/);
	await expect(panel.locator('#word-context-label')).toHaveCount(0);
	await expect(context.locator('.gloss')).toHaveText('korzeniu');
	await expect(context.locator('.explanation')).toContainText('zbawcze Światło — Chrystus');
	const contextType = await context.evaluate((layer) => {
		const gloss = getComputedStyle(layer.querySelector('.gloss')!);
		const explanation = getComputedStyle(layer.querySelector('.explanation')!);
		return {
			glossFamily: gloss.fontFamily,
			explanationFamily: explanation.fontFamily,
			glossSize: parseFloat(gloss.fontSize),
			explanationSize: parseFloat(explanation.fontSize),
			glossStyle: gloss.fontStyle,
			glossWeight: Number(gloss.fontWeight),
			explanationWeight: Number(explanation.fontWeight),
			explanationColor: explanation.color
		};
	});
	expect(contextType.glossFamily).toBe(contextType.explanationFamily);
	expect(contextType.glossSize).toBeGreaterThan(contextType.explanationSize);
	expect(contextType.glossStyle).toBe('normal');
	expect(contextType.glossWeight).toBeGreaterThan(contextType.explanationWeight);
	// The dictionary identity is a separate layer.
	await expect(panel.locator('.head a')).toHaveAttribute('href', '/app/pl/lemma?l=radix');
	await expect(panel.locator('.head')).toContainText('radix, radícis');
	await expect(panel.locator('.head')).toContainText('— korzeń');
	// So is the strict parse, with its concept-linked term.
	await expect(panel.locator('.morph')).toContainText('wołacz');
	await expect(panel.locator('.morph a.concept')).toHaveAttribute(
		'href',
		'/app/pl/grammatica/vocativus'
	);
	const referenceType = await panel.evaluate((card) => {
		const head = getComputedStyle(card.querySelector('.head')!);
		const morph = getComputedStyle(card.querySelector('.morph')!);
		return {
			headSize: parseFloat(head.fontSize),
			morphSize: parseFloat(morph.fontSize),
			headColor: head.color,
			morphColor: morph.color,
			headLineHeight: head.lineHeight,
			morphLineHeight: morph.lineHeight
		};
	});
	expect(referenceType.headSize).toBeCloseTo(referenceType.morphSize, 1);
	expect(referenceType.headColor).toBe(referenceType.morphColor);
	expect(referenceType.headLineHeight).toBe(referenceType.morphLineHeight);
	expect(contextType.explanationSize).toBeCloseTo(referenceType.headSize, 1);
	expect(contextType.explanationColor).not.toBe(referenceType.headColor);
	const wideAlignment = await panel.evaluate((card) => ({
		titleLeft: card.querySelector('header .form')!.getBoundingClientRect().left,
		glossLeft: card.querySelector('.context-layer .gloss')!.getBoundingClientRect().left,
		entryLeft: card.querySelector('.head')!.getBoundingClientRect().left
	}));
	expect(wideAlignment.glossLeft).toBeCloseTo(wideAlignment.titleLeft, 1);
	expect(wideAlignment.entryLeft).toBeGreaterThan(wideAlignment.glossLeft);
	// The compact heading is a wide-panel improvement. On a phone the full
	// pronunciation gets its own row instead of being squeezed beside the
	// selected form and the close button.
	await page.setViewportSize({ width: 375, height: 800 });
	const narrowHeading = await panel.locator('header').evaluate((header) => {
		const title = header.querySelector('.form')!.getBoundingClientRect();
		const pronunciation = header.querySelector('.pronunciation-lead')!.getBoundingClientRect();
		const copy = header.parentElement!.querySelector('.gloss')!.getBoundingClientRect();
		return {
			titleBottom: title.bottom,
			pronunciationTop: pronunciation.top,
			titleLeft: title.left,
			copyLeft: copy.left
		};
	});
	expect(narrowHeading.pronunciationTop).toBeGreaterThanOrEqual(narrowHeading.titleBottom);
	expect(narrowHeading.copyLeft).toBeCloseTo(narrowHeading.titleLeft, 1);
	// Verification is short and useful trust information, so it remains
	// visible without an otherwise nearly equal-height disclosure control.
	const verification = panel.locator('.verification');
	await expect(verification.locator('summary')).toHaveCount(0);
	await expect(verification.locator('.meta')).toBeVisible();
	await expect(verification.locator('.meta')).toContainText('zaakceptowane');
	await expect(verification.locator('.meta')).toContainText('opracowanie, Whitaker, Collatinus');
});

test('dictionary and grammar layers keep a modest shared indent', async ({ page }) => {
	// The label column used to grow into a broad empty field at the largest
	// reading size. Keep the two bodies aligned, but close enough to their
	// short labels that they still read as one row.
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/app/pl/orationes/pater-noster?w=w007');
	await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
	await page.reload();
	await settled(page);

	const geometry = await page.locator('aside .layer').evaluateAll((layers) => {
		const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
		return {
			root,
			rows: layers.map((layer) => {
				const row = layer.getBoundingClientRect();
				const body = layer.querySelector('.layer-body')!.getBoundingClientRect();
				return { indent: body.left - row.left, left: body.left };
			})
		};
	});
	expect(geometry.rows).toHaveLength(2);
	expect(geometry.rows[0].left).toBeCloseTo(geometry.rows[1].left, 1);
	for (const row of geometry.rows) {
		expect(row.indent, 'the label column became an oversized empty field').toBeLessThanOrEqual(
			geometry.root * 5.3
		);
	}
});

test('a proper name absent from one analyzer names its true confirmers', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/confiteor?w=w009'); // Michaéli
	const meta = page.locator('aside .meta');
	await expect(meta).toContainText('opracowanie, Collatinus');
	await expect(meta).not.toContainText('Whitaker,');
});

test('a lemma-level note appears on every token of the lemma', async ({ page }) => {
	await page.goto(`${AVE}?w=w031`); // Amen
	const panel = page.locator('aside');
	await expect(panel.locator('.note')).toContainText('Hebrajskie');
	const dictionaryType = await panel.evaluate((card) => {
		const head = getComputedStyle(card.querySelector('.head')!);
		const note = getComputedStyle(card.querySelector('.note')!);
		return {
			headSize: parseFloat(head.fontSize),
			noteSize: parseFloat(note.fontSize),
			headColor: head.color,
			noteColor: note.color,
			headLineHeight: head.lineHeight,
			noteLineHeight: note.lineHeight
		};
	});
	expect(dictionaryType.noteSize).toBeCloseTo(dictionaryType.headSize, 1);
	expect(dictionaryType.noteColor).toBe(dictionaryType.headColor);
	expect(dictionaryType.noteLineHeight).toBe(dictionaryType.headLineHeight);
});

test('cross-references in explanations jump to the referenced word', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/corpus-tuum?w=w008'); // quem → Sanguis
	await expect(page.locator('aside .form')).toHaveText('quem');
	await page.locator('aside .xref', { hasText: 'Sanguis' }).click();
	await expect(page.locator('aside .form')).toHaveText('Sanguis');
	await expect(page.locator('#w007')).toBeInViewport();
});

test('the English locale renders its own gloss layer', async ({ page }) => {
	await page.goto('/app/en/orationes/ave-maria');
	await expect(page.locator('rt').first()).toHaveText('hail');
	await page.locator('#w019').click();
	await expect(page.locator('aside .head')).toContainText('— mother');
});

test('pronunciation line shows both traditions on the Polish interface', async ({ page }) => {
	await page.goto('/app/pl/orationes/pater-noster?w=w006'); // cælis
	const pron = page.locator('aside .pron');
	await expect(pron).toContainText('cæ-lis');
	await expect(pron).toContainText('rz.');
	await expect(pron).toContainText('/ˈtʃɛ.lis/');
	await expect(pron).toContainText('pol.');
	await expect(pron).toContainText('/ˈtsɛ.lis/');
});

test('a pronunciation moves to the next line as one unit', async ({ page }) => {
	// At the largest reading size Sanctificétur used to split the Roman IPA
	// inside /…/ when the remaining part of the line was too short. A label,
	// transcription and its preceding middot travel together instead.
	await page.setViewportSize({ width: 800, height: 600 });
	await page.goto('/app/pl/orationes/pater-noster?w=w007');
	await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
	await page.reload();
	await settled(page);

	const units = page.locator('aside .pron-unit');
	await expect(units).toHaveCount(2);
	const fragments = await units.evaluateAll((items) =>
		items.map((item) => item.getClientRects().length)
	);
	expect(fragments, 'an IPA transcription split across lines').toEqual([1, 1]);
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth
		),
		'keeping the transcription together caused horizontal scrolling'
	).toBe(false);
});

test('pronunciation line shows Roman only on the English interface', async ({ page }) => {
	await page.goto('/app/en/orationes/pater-noster?w=w006');
	const pron = page.locator('aside .pron');
	await expect(pron).toContainText('/ˈtʃɛ.lis/');
	await expect(pron).not.toContainText('rz.');
	await expect(pron).not.toContainText('pol.');
});

test('identical traditions collapse to one transcription', async ({ page }) => {
	await page.goto('/app/pl/orationes/ave-maria?w=w019'); // Mater
	const pron = page.locator('aside .pron');
	await expect(pron).toContainText('Ma-ter');
	await expect(pron).toContainText('/ˈma.tɛr/');
	await expect(pron).not.toContainText('rz.');
});

test('the Gloria reads with narrative, panel and provenance', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/gloria?w=w041'); // Agnus
	const panel = page.locator('aside');
	await expect(panel.locator('.form')).toHaveText('Agnus');
	await expect(panel.locator('.gloss')).toHaveText('Baranku');
	// Routine case information stays in the form row and no longer creates a
	// terse pseudo-explanation beside the prayer's meaning.
	await expect(panel.locator('.morph')).toContainText('mianownik');
	await expect(panel.locator('.explanation')).toHaveCount(0);
	await expect(panel.locator('.meta')).toContainText('opracowanie, Whitaker, Collatinus');
	// single-analyzer override: déxteram is confirmed by Whitaker's alone,
	// against the document's both-analyzers default
	await page.goto('/app/pl/ordinarium/gloria?w=w061');
	await expect(panel.locator('.meta')).toContainText('opracowanie, Whitaker');
	await expect(panel.locator('.meta')).not.toContainText('Collatinus');
	// the superlative links its grammar concept and the lemma page resolves
	await page.goto('/app/en/ordinarium/gloria?w=w074'); // Altissimus
	await expect(panel.locator('.gloss')).toHaveText('Most High');
	await panel.locator('.head a').click();
	await expect(page).toHaveURL(atRoute('/app/en/lemma', '?l=altus'));
	await expect(page.locator('.head-senses')).toContainText('high');
});

test('no token ever fragments across lines, any text, narrow viewport', async ({ page }) => {
	// A token (word + trailing punctuation) is atomic: an inline element
	// that fragments across lines reports multiple client rects — so one
	// rect per token IS the no-orphaned-punctuation invariant, wherever
	// the line breaks happen to fall.
	await page.setViewportSize({ width: 320, height: 900 });
	for (const path of [
		'/app/pl/ordinarium/gloria',
		'/app/pl/ordinarium/confiteor',
		'/app/pl/orationes/pater-noster',
		'/app/pl/orationes/ave-maria',
		'/app/pl/orationes/gloria-patri',
		'/app/pl/orationes/angelus-domini',
		'/app/pl/orationes/sub-tuum-praesidium'
	]) {
		await page.goto(path);
		await page.locator('.repeated-toggle[aria-expanded="false"]').evaluateAll((buttons) => {
			for (const button of buttons) (button as HTMLButtonElement).click();
		});
		await expect(page.locator('.verse .token').first()).toBeVisible();
		const fragmented = await page.evaluate(() =>
			[...document.querySelectorAll('.verse .token')]
				.filter((t) => t.getClientRects().length !== 1)
				.map((t) => t.querySelector('button')?.id ?? '?')
		);
		expect(fragmented, path).toEqual([]);
	}
});

test('Angelus folds each Ave Maria as an ordinary translated verse', async ({ page }) => {
	await page.goto('/app/pl/orationes/angelus-domini');
	await expect(page.getByRole('button', { name: /Versículus.*prowadzącej/ }).first()).toBeVisible();
	await expect(page.getByRole('button', { name: /Respónsum.*wiernych/ }).first()).toBeVisible();
	await expect(page.locator('.who-name')).toHaveCount(0);
	await page
		.getByRole('button', { name: /Versículus.*prowadzącej/ })
		.first()
		.click();
	await expect(page.getByText('werset osoby prowadzącej modlitwę')).toBeVisible();
	await expect(page.getByText('mówią wszyscy razem')).toHaveCount(0);
	await page.getByRole('button', { name: 'zamknij' }).click();
	const repetitions = page.locator('.verse.repeated');
	await expect(repetitions).toHaveCount(3);
	const first = repetitions.first();
	const toggle = first.locator('.repeated-toggle');
	await expect(first.locator('.token')).toHaveCount(4);
	await expect(first.locator('.base')).toHaveText(['Ave', 'María,', 'grátia', 'plena…']);
	await expect(first.locator('rt')).toHaveText(['zdrowaś', 'Maryjo', 'łaski', 'pełna']);
	await expect(toggle).toHaveAttribute('aria-expanded', 'false');
	await expect(toggle).toHaveAccessibleName('rozwiń powtórzoną modlitwę');

	const foldGeometry = await first.evaluate((verse) => {
		const previous = verse.previousElementSibling as HTMLElement;
		const next = verse.nextElementSibling as HTMLElement;
		const latin = verse.querySelector<HTMLElement>('.base')!.getBoundingClientRect();
		const previousLatin = previous.querySelector<HTMLElement>('.base')!.getBoundingClientRect();
		const nextLatin = next.querySelector<HTMLElement>('.base')!.getBoundingClientRect();
		const mark = verse.querySelector<HTMLElement>('.mark')!.getBoundingClientRect();
		const previousMark = previous.querySelector<HTMLElement>('.mark')!.getBoundingClientRect();
		return {
			font: parseFloat(getComputedStyle(verse).fontSize),
			previousFont: parseFloat(getComputedStyle(previous).fontSize),
			nextFont: parseFloat(getComputedStyle(next).fontSize),
			latinLeft: latin.left,
			previousLatinLeft: previousLatin.left,
			nextLatinLeft: nextLatin.left,
			markLeft: mark.left,
			previousMarkLeft: previousMark.left
		};
	});
	expect(foldGeometry.font).toBeCloseTo(foldGeometry.previousFont, 2);
	expect(foldGeometry.font).toBeCloseTo(foldGeometry.nextFont, 2);
	expect(foldGeometry.latinLeft).toBeCloseTo(foldGeometry.previousLatinLeft, 0);
	expect(foldGeometry.latinLeft).toBeCloseTo(foldGeometry.nextLatinLeft, 0);
	expect(foldGeometry.markLeft).toBeCloseTo(foldGeometry.previousMarkLeft, 0);

	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-expanded', 'true');
	await expect(toggle).toHaveAccessibleName('zwiń powtórzoną modlitwę');
	await expect(first.locator('.token')).toHaveCount(31);
	await expect(first.locator('.base').last()).toHaveText('Amen.');
	await toggle.click();
	await expect(first.locator('.token')).toHaveCount(4);

	await setHelp(page, 2);
	const translation = page.locator('.verse.repeated + .seg-extra').first();
	await expect(translation).toHaveText('Zdrowaś Maryjo, łaski pełna…');
	const columns = await first.evaluate((verse) => {
		const latin = verse.querySelector<HTMLElement>('.base')!.getBoundingClientRect();
		const translation = verse.nextElementSibling!.querySelector<HTMLElement>('.translation')!;
		const translated = translation.getBoundingClientRect();
		return {
			latinLeft: latin.left,
			latinTop: latin.top,
			translatedLeft: translated.left,
			translatedTop: translated.top
		};
	});
	expect(columns.translatedLeft - columns.latinLeft).toBeGreaterThan(200);
	expect(Math.abs(columns.translatedTop - columns.latinTop)).toBeLessThanOrEqual(1);

	await toggle.click();
	await expect(first.locator('.token')).toHaveCount(31);
	await expect(translation).toContainText('Święta Maryjo, Matko Boża');
	await expect(page.locator('.verse.repeated + .seg-extra')).toHaveCount(3);

	await page.goto('/app/en/orationes/angelus-domini');
	await setHelp(page, 2);
	await expect(page.locator('.verse.repeated + .seg-extra').first()).toHaveText(
		'Hail Mary, full of grace…'
	);
});

test('Sub tuum separates the antiphon from the extended form', async ({ page }) => {
	await page.goto('/app/pl/orationes/sub-tuum-praesidium');
	const shortForm = page.getByRole('button', { name: 'antyfona' });
	const longForm = page.getByRole('button', { name: 'forma rozszerzona' });
	await expect(shortForm).toHaveAttribute('aria-pressed', 'true');
	await expect(longForm).toHaveAttribute('aria-pressed', 'false');
	await expect(page.locator('button#w025')).toHaveCount(0);
	await longForm.click();
	await expect(longForm).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('button#w001')).toHaveCount(1);
	await expect(page.locator('button#w025')).toBeVisible();
	await page.getByRole('button', { name: 'o modlitwie' }).click();
	// dialog, not complementary: the sheet declares itself since the a11y
	// review — a dismissible panel that takes focus is a non-modal dialog
	await expect(page.getByRole('dialog', { name: 'o modlitwie' })).toContainText(
		'Podstawową formę stanowi antyfona'
	);
	await page.goto('/app/pl/orationes/angelus-domini');
	await page.goto('/app/pl/orationes/sub-tuum-praesidium');
	await expect(page.getByRole('button', { name: 'forma rozszerzona' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await page.reload();
	await expect(page.getByRole('button', { name: 'forma rozszerzona' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(page.locator('button#w025')).toBeVisible();
});

test('the about sheet is closed in every reading mode, opens on demand', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/gloria');
	const pill = page.locator('.about-pill');
	const sheet = page.locator('aside.about-sheet');
	// closed by default in all three reading modes
	for (const level of [1, 0, 2] as const) {
		await setHelp(page, level);
		await expect(pill).toBeVisible();
		await expect(sheet).not.toBeVisible();
	}
	// opens as a bottom sheet without moving the text
	const before = await page.locator('.verse').first().boundingBox();
	await pill.click();
	await expect(sheet).toBeVisible();
	await expect(sheet).toContainText('pieśni aniołów');
	const after = await page.locator('.verse').first().boundingBox();
	expect(after?.y).toBe(before?.y);
	// escape closes it; a fresh load starts closed
	await page.keyboard.press('Escape');
	await expect(sheet).not.toBeVisible();
	await pill.click();
	await page.goto('/app/pl/ordinarium/gloria');
	await expect(sheet).not.toBeVisible();
});

test('the about sheet and the word panel take turns', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/gloria?w=w001');
	await expect(page.locator('aside .form')).toHaveText('Glória');
	await page.locator('.about-pill').click();
	await expect(page.locator('aside.about-sheet')).toBeVisible();
	await expect(page.locator('aside .form')).not.toBeVisible();
	await page.locator('#w002').click();
	await expect(page.locator('aside.about-sheet')).not.toBeVisible();
	await expect(page.locator('aside .form')).toHaveText('in');
});

test('the about sheet speaks the interface language', async ({ page }) => {
	await page.goto('/app/en/orationes/pater-noster');
	const pill = page.locator('.about-pill');
	await expect(pill).toContainText('about this prayer');
	await pill.click();
	await expect(page.locator('aside.about-sheet')).toContainText("Lord's Prayer");
});

test('an unresolved legacy citation is not presented as audited evidence', async ({ page }) => {
	await page.goto('/app/en/ordinarium/misereatur');
	await page.locator('.about-pill').click();
	await expect(page.locator('aside.about-sheet')).toContainText('absolution');
	await expect(page.locator('aside.about-sheet details.source-notes')).toHaveCount(0);
});

test('the Credo reads with participles in the panel', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/credo?w=w064'); // incarnátus
	const panel = page.locator('aside');
	await expect(panel.locator('.form')).toHaveText('incarnátus');
	await expect(panel.locator('.morph')).toContainText('imiesłów');
	await expect(panel.locator('.morph')).toContainText('perfectum');
	await expect(panel.locator('.explanation')).toHaveCount(0);
	// deponent participle keeps its concept link
	await page.goto('/app/en/ordinarium/credo?w=w083'); // passus
	await expect(panel.locator('.morph')).toContainText('participle');
	await expect(panel.locator('.morph a.concept', { hasText: 'deponent' })).toBeVisible();
	// the feminine dies ruling surfaces in the parse line
	await page.goto('/app/pl/ordinarium/credo?w=w090'); // die
	await expect(panel.locator('.morph')).toContainText('r. żeński');
	await expect(panel.locator('.explanation')).toHaveCount(0);
	// A contextual explanation remains where it adds theological meaning that
	// neither the gloss nor the form row can carry alone.
	await page.goto('/app/pl/ordinarium/credo?w=w122'); // vivificántem
	await expect(panel.locator('.explanation')).toContainText(
		'W Credo staje się tytułem Ducha Świętego: „Ożywiciel”'
	);
});

/**
 * A word sitting in the bottom third of a short viewport — the case where
 * the panel would cover the very word that was tapped.
 *
 * Scrolls until it finds one instead of assuming the first screen holds
 * text: how tall the header is depends on what controls a reading page
 * carries, and a test that silently found nothing would report a null id
 * rather than the behaviour it is here for.
 */
async function wordNearBottom(page: import('@playwright/test').Page): Promise<string> {
	const pick = () =>
		page.evaluate(() => {
			const vh = window.innerHeight;
			const word = [...document.querySelectorAll('.word')].find((el) => {
				const r = el.getBoundingClientRect();
				return r.top > vh * 0.7 && r.bottom < vh;
			});
			return word?.id ?? null;
		});
	for (let tries = 0; tries < 12; tries++) {
		const id = await pick();
		if (id) return id;
		await page.evaluate(() => window.scrollBy(0, 200));
		await page.waitForTimeout(50);
	}
	throw new Error('no word in the bottom third of the viewport, after scrolling');
}

test('a tapped word near the viewport bottom rises above the panel', async ({ page }) => {
	await page.setViewportSize({ width: 800, height: 520 });
	await page.goto('/app/pl/ordinarium/credo');
	const id = await wordNearBottom(page);
	await page.locator(`#${id}`).click();
	await expect
		.poll(
			() =>
				page.evaluate((wid) => {
					const r = document.getElementById(wid!)!.getBoundingClientRect();
					const s = document.querySelector('aside')!.getBoundingClientRect();
					return r.bottom <= s.top + 1;
				}, id),
			{ timeout: 3000 }
		)
		.toBe(true);
});

test('the folder answers a key with the page it is showing @folder', async ({ page }) => {
	// Changing the hash updates the address at once and queues `hashchange`
	// for a later task. Until that arrives the address names a page not yet on
	// screen, and the page the reader has left is still listening — so one
	// arrow key after a link click walked TWO prayers on. It failed on CI,
	// where the gap is wider, and passed on every local run until the sequence
	// was driven directly, which is what this does: the click and the key in
	// one task, the widest the gap can be.
	await page.goto('/app/pl/ordinarium/confiteor');
	await page.evaluate(() => {
		const link = [...document.querySelectorAll('.pager a')].find((a) =>
			/Nóminis Iesu/.test(a.textContent ?? '')
		) as HTMLAnchorElement;
		link.click();
		dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
	});
	await expect(page).toHaveURL(atRoute('ordinarium/confiteor'));
});

test('the pager walks the book in liturgical order', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/gloria');
	const pager = page.locator('.pager');
	// the Kyrie stands between the Confiteor and the Gloria, as at Mass
	await expect(pager.locator('a', { hasText: 'Kýrie' })).toBeVisible();
	await pager.locator('a', { hasText: 'Credo' }).click();
	await expect(page).toHaveURL(atRoute('ordinarium/credo'));
	// crossing the section boundary backwards, into the last litany
	await page.goto('/app/pl/ordinarium/confiteor');
	await pager.locator('a', { hasText: 'Nóminis Iesu' }).click();
	await expect(page).toHaveURL(atRoute('litaniae/sanctissimi-nominis-iesu'));
	// arrow keys page too, but never while the mode radios own them.
	// The URL arriving is not the page being ready to answer a key: this
	// navigation was a CLICK, so it did not go through the fixture's goto,
	// and in the folder it is a real document load. An assertion after one
	// is safe because assertions retry — a keystroke is not, and this one
	// landed on a page with nothing listening yet, on CI, in the offline
	// project, while every local run passed.
	await settled(page);
	await page.keyboard.press('ArrowRight');
	await expect(page).toHaveURL(atRoute('ordinarium/confiteor'));
	// and that key was a navigation too, so the same applies — the more so
	// here, where the assertion is that NOTHING happens: an unhydrated page
	// would give exactly that answer for the wrong reason
	await settled(page);
	// the reading-mode radios own the arrows while focused: the key moves
	// the check, never the page. The default interlinear is the LAST
	// segment of the display order (Latin · bilingual · interlinear), so
	// ArrowRight wraps to Latin — level 0.
	await page.locator('.help [role="radio"][aria-checked="true"]').focus();
	await page.keyboard.press('ArrowRight');
	await expect(page).toHaveURL(atRoute('ordinarium/confiteor'));
	await expect(page.locator('.help [data-level="0"]')).toHaveAttribute('aria-checked', 'true');
	// first text has no previous
	await page.goto('/app/pl/orationes/pater-noster');
	await expect(page.locator('.pager a')).toHaveCount(1);
});

test('selecting a word does not take the arrow keys away', async ({ page }) => {
	// Every word in the book is a <button>, and the pager's key handler
	// refused arrows whenever a BUTTON held focus — meant to keep them for
	// the radio groups, it took them from the text itself. Tap a word to
	// read its analysis and the arrows went dead (owner, 2026-08-09).
	//
	// Asserted as an EQUIVALENCE rather than against a hardcoded next text:
	// what the arrows do is the book's business, and this test's business
	// is only that selecting a word does not change it.
	await page.goto('/app/pl/ordinarium/confiteor');
	await settled(page);
	await page.keyboard.press('ArrowRight');
	// the navigation is client-side; page.url() is only true once it lands
	await page.waitForURL((u) => !u.pathname.includes('confiteor'));
	const paged = new URL(page.url()).pathname;

	await page.goto('/app/pl/ordinarium/confiteor');
	await settled(page);
	await page.locator('button.word').first().click();
	await expect(page.locator('aside .form')).toBeVisible();
	await page.keyboard.press('ArrowRight');
	await expect(page, 'with a word selected the arrow still pages').toHaveURL(
		(u) => u.pathname === paged
	);
});

test('the focus ring marks the permanent word surface without changing its line', async ({
	page
}) => {
	// Selection and keyboard focus share the token that permanently wraps a
	// Latin word and its gloss. The button itself stays unoutlined; the token
	// pseudo-element is paint only and cannot change the line box.
	await page.goto('/app/pl/ordinarium/confiteor');
	await settled(page);
	// TABBED to, not focused programmatically: :focus-visible is the whole
	// point of the rule, and only a real keyboard route turns it on.
	for (let i = 0; i < 60; i++) {
		await page.keyboard.press('Tab');
		if (await page.evaluate(() => document.activeElement?.classList.contains('word'))) break;
	}

	const m = await page.evaluate(() => {
		const w = document.activeElement as HTMLElement;
		const token = w.closest('.token') as HTMLElement;
		const ring = getComputedStyle(token, '::before');
		// where the ring's OUTERMOST edge falls, in page coordinates.
		// The tint's inset is READ from the rendered pseudo-element rather
		// than copied from the stylesheet, so the two cannot drift apart.
		const tint = token.getBoundingClientRect();
		const pad = (parseFloat(ring.width) - tint.width) / 2;
		const offset = parseFloat(ring.outlineOffset);
		const outer = { left: tint.left - pad - offset, right: tint.right + pad + offset };
		// the neighbouring words, whose letters the ring must not reach into
		const words = [...document.querySelectorAll('button.word')];
		const i = words.indexOf(w as HTMLButtonElement);
		const inkOf = (b: Element | undefined) => {
			if (!b) return null;
			const r = document.createRange();
			r.selectNodeContents(b.querySelector('.base')!);
			return r.getBoundingClientRect();
		};
		const prev = inkOf(words[i - 1]),
			next = inkOf(words[i + 1]);
		return {
			isWord: w.classList.contains('word'),
			focusVisible: w.matches(':focus-visible'),
			onTheButton: getComputedStyle(w).outlineStyle,
			onTheWord: ring.outlineStyle,
			offset,
			width: parseFloat(ring.outlineWidth),
			clearsPrev: prev ? outer.left - prev.right : Infinity,
			clearsNext: next ? next.left - outer.right : Infinity,
			stacking: {
				position: getComputedStyle(token).position,
				zIndex: getComputedStyle(token).zIndex
			}
		};
	});

	expect(m.isWord, 'tabbing reaches a word').toBe(true);
	expect(m.focusVisible, 'and gives it a visible focus').toBe(true);
	expect(m.onTheButton, 'no ring on the line box').toBe('none');
	expect(m.onTheWord, 'a ring on the word').toBe('solid');
	// Drawn INSIDE the tint. Offset outward and the page shows through
	// between the two, and the ring reaches into the words on either side
	// (owner, 2026-08-09) — the words are set 1.4px apart, so there is no
	// room to spend outward at all.
	expect(m.offset, 'the ring is inset by its own width, not offset out').toBeLessThanOrEqual(
		-m.width
	);
	expect(m.clearsPrev, 'the ring clears the word before it').toBeGreaterThan(0);
	expect(m.clearsNext, 'the ring clears the word after it').toBeGreaterThan(0);

	// And nothing paints over it. Tints are pseudo-elements at one depth,
	// where equal z-index paints in DOM order, so the word AFTER the
	// focused one drew its tint across the ring's right stroke and it came
	// back thinner than the other three (owner, 2026-08-09).
	expect(m.stacking.position, 'the focused word is positioned').toBe('relative');
	expect(m.stacking.zIndex, 'and stacks above its neighbours').not.toBe('auto');
});

test('two tinted words meet exactly, with no page between them', async ({ page }) => {
	// The tint is half the gap between two words, so a selected word and a
	// focused one beside it stand edge to edge. Wider and every tint lay
	// across both its neighbours', which is how the word after a focused
	// one came to paint over its ring; narrower and a line of page showed
	// between a ring and the tint beside it (owner, 2026-08-09).
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/app/pl/ordinarium/confiteor');
	// a word must be tinted for its ::before to exist at all
	await page.locator('button.word').first().click();

	const m = await page.evaluate(() => {
		const sel = document.querySelector('.token.word-selected')!;
		// read the inset off the rendered tint, never off the stylesheet
		const pad =
			(parseFloat(getComputedStyle(sel, '::before').width) - sel.getBoundingClientRect().width) / 2;
		const words = [...document.querySelectorAll('button.word')];
		const em = parseFloat(getComputedStyle(sel).fontSize);
		let widestGap = 0;
		for (let i = 0; i < words.length - 1; i++) {
			const a = words[i].querySelector('.base')!.getBoundingClientRect();
			const b = words[i + 1].querySelector('.base')!.getBoundingClientRect();
			if (Math.abs(a.top - b.top) > 2) continue; // same line only
			widestGap = Math.max(widestGap, b.left - a.right);
		}
		return { pad, widestGap, em };
	});

	expect(m.pad, 'the tint has an inset to read').toBeGreaterThan(0);
	// Stated against the gap this renderer actually produces, not against a
	// pixel count: the gap is 0.0625em on a Mac and 0.079em on the Linux
	// runner, and a test written to the first number went red on the second.
	expect(2 * m.pad, 'two tints reach each other').toBeGreaterThanOrEqual(m.widestGap);
	expect(
		(2 * m.pad - m.widestGap) / m.em,
		'and do not overlap enough to read as one band'
	).toBeLessThan(0.06);
});

test('a modified arrow belongs to the browser, not to the pager', async ({ page }) => {
	// Cmd+← is Back on a Mac and Alt+← is Back everywhere else, and the
	// pager swallowed both: the reader pressed Back and arrived at the
	// NEXT prayer instead (owner, 2026-08-07). It checked which key and
	// never which modifiers.
	//
	// Loaded straight into this page, so there is nothing behind it in
	// history: whatever the browser makes of the chord, the one thing that
	// must not happen is a move through the book. Sancte Míchaël is what
	// a bare ArrowLeft would reach from here, which is what the test above
	// asserts it still does.
	await page.goto('/app/pl/ordinarium/confiteor');
	for (const chord of [
		'Meta+ArrowLeft',
		'Alt+ArrowLeft',
		'Control+ArrowRight',
		'Shift+ArrowRight'
	]) {
		await page.keyboard.press(chord);
		await expect(page, `${chord} paged the book`).toHaveURL(atRoute('ordinarium/confiteor'));
	}
});

test.describe('keeping the screen awake', () => {
	test.use({ permissions: ['screen-wake-lock'] });

	test('a text holds the screen open by itself, and lets go off-page', async ({ page }) => {
		// record what the page asks of the real API (which then runs)
		await page.addInitScript(() => {
			const real = navigator.wakeLock;
			(window as unknown as { calls: string[] }).calls = [];
			Object.defineProperty(navigator, 'wakeLock', {
				configurable: true,
				value: {
					request: (type: WakeLockType) => {
						(window as unknown as { calls: string[] }).calls.push(type);
						return real.request(type);
					}
				}
			});
		});

		// the landing is a menu, not a reading surface — nothing is held
		await page.goto('/app/pl');
		await page.waitForTimeout(150);
		expect(await page.evaluate(() => (window as unknown as { calls: string[] }).calls)).toEqual([]);
		// no switch: the reader is never asked
		await expect(page.locator('button.wake')).toHaveCount(0);

		// opening a text takes the lock without being asked
		await page.locator('a[href="/app/pl/ordinarium/credo"]').click();
		await expect
			.poll(() => page.evaluate(() => (window as unknown as { calls: string[] }).calls.length))
			.toBeGreaterThan(0);

		// and a movement of the flow does the same (a fresh document, so its
		// own tally starts from nothing). The ordo index is a menu, like the
		// landing, and holds nothing.
		await page.goto('/app/pl/ordo');
		await page.waitForTimeout(150);
		expect(await page.evaluate(() => (window as unknown as { calls: string[] }).calls)).toEqual([]);
		await page.goto('/app/pl/ordo/canon');
		await expect
			.poll(() => page.evaluate(() => (window as unknown as { calls: string[] }).calls))
			.toEqual(['screen']);
	});
});

test('the book keeps a ribbon: reopening a text resumes the position', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/credo');
	// Scroll and wait for the ribbon to actually commit. A fixed pause races
	// hydration: the listener that records the position is attached by the
	// page's own script, and under load a scroll can land before it exists.
	await expect
		.poll(
			async () => {
				// Return to the top first: scrolling to a position the page is
				// already at fires no event, so a retry would be silent.
				await page.evaluate(() => {
					window.scrollTo(0, 0);
					window.scrollTo(0, 600);
				});
				return page.evaluate(() => localStorage.getItem('scrutabor-pos:ordinarium/credo'));
			},
			{ intervals: [1400, 1400, 1400, 1400], timeout: 15000 }
		)
		.not.toBeNull();
	// leave for the catalog and come back — the ribbon holds
	await page.getByRole('link', { name: 'strona główna modlitewnika' }).click();
	await expect(page).toHaveURL(atRoute('/app/pl'));
	await page.locator('a[href="/app/pl/ordinarium/credo"]').click();
	await expect(page).toHaveURL(/credo/);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(400);
	// a deep link outranks the ribbon: the word is centered, not the ribbon restored
	await page.goto('/app/pl/ordinarium/credo?w=w003');
	await expect(page.locator('aside')).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const r = document.getElementById('w003')?.getBoundingClientRect();
				return !!r && r.top >= 0 && r.bottom <= window.innerHeight;
			})
		)
		.toBe(true);
	// an expired ribbon is ignored — planted from the catalog, where no
	// leave-time save can overwrite it on the way in
	await page.goto('/app/pl');
	await page.evaluate(() => {
		localStorage.setItem(
			'scrutabor-pos:ordinarium/credo',
			JSON.stringify({ y: 600, t: Date.now() - 13 * 60 * 60 * 1000 })
		);
	});
	// Enter through the book itself. A second top-level page.goto to a URL
	// already present in browser history may restore that history entry's
	// scroll before SvelteKit can process the expired ribbon, making this
	// browser-restoration test instead of a ribbon-expiry test.
	await page.locator('a[href="/app/pl/ordinarium/credo"]').click();
	await expect(page).toHaveURL(/credo/);
	// Processing the expired entry is the signal. A fixed wait could inspect
	// the initial top-of-page state before a starved afterNavigate callback had
	// read the ribbon at all and therefore pass without exercising expiry.
	await expect
		.poll(() => page.evaluate(() => localStorage.getItem('scrutabor-pos:ordinarium/credo')))
		.toBeNull();
	expect(await page.evaluate(() => window.scrollY)).toBeLessThan(10);
});

test('closing the panel leaves the page where it is', async ({ page }) => {
	await page.setViewportSize({ width: 800, height: 520 });
	await page.goto('/app/pl/ordinarium/credo');
	const id = await wordNearBottom(page);
	const before = await page.evaluate(() => window.scrollY);
	await page.locator(`#${id}`).click();
	await expect.poll(() => page.evaluate(() => document.querySelector('aside') !== null)).toBe(true);
	await page.waitForTimeout(700); // let the tap-scroll settle
	const shifted = await page.evaluate(() => window.scrollY);
	expect(shifted).toBeGreaterThan(before);
	// close via Escape (history-entry path) — the page must not move
	await page.keyboard.press('Escape');
	await page.waitForTimeout(400);
	expect(await page.evaluate(() => window.scrollY)).toBe(shifted);
	// and via the browser's own back after reopening
	await page.locator(`#${id}`).click();
	await page.waitForTimeout(700);
	const shifted2 = await page.evaluate(() => window.scrollY);
	await page.goBack();
	await page.waitForTimeout(400);
	expect(await page.evaluate(() => window.scrollY)).toBe(shifted2);
});

test('the part control appears only where it changes something', async ({ page }) => {
	// A Mass dialogue needs the reader's role, but its wording and delivery
	// need not differ between sung and low Mass.
	await page.goto('/app/en/ordinarium/praefatio-dialogus');
	await expect(page.getByRole('radio', { name: 'faithful' })).toBeVisible();
	await expect(page.locator('.picker[data-kind="mass"]')).toHaveCount(0);

	// One missal speaker, but a real participation change: at Low Mass the
	// faithful may say the ministers' Confiteor with the server (DMS 31 b).
	await page.goto('/app/en/ordinarium/confiteor');
	await expect(page.getByRole('radio', { name: 'faithful' })).toBeVisible();
	await expect(page.getByRole('radio', { name: 'low' })).toBeVisible();

	// Degree 2 versus 3 is documentary metadata until the reading page names
	// those degrees; every available role participates, so neither setting
	// changes visible information.
	await page.goto('/app/en/ordinarium/gloria');
	await expect(page.locator('.picker[data-kind="role"]')).toHaveCount(0);
	await expect(page.locator('.picker[data-kind="mass"]')).toHaveCount(0);

	// The Angelus has a real devotional dialogue, not Mass roles or forms.
	await page.goto('/app/en/orationes/angelus-domini');
	await expect(page.locator('.picker[data-kind="role"]')).toHaveCount(0);
	await expect(page.locator('.picker[data-kind="mass"]')).toHaveCount(0);

	await page.goto('/app/en/ordinarium/quod-ore-sumpsimus'); // the priest's, throughout
	await expect(page.getByRole('radio', { name: 'faithful' })).toHaveCount(0);
	// and the reading-mode control, which always does something, stays
	await expect(page.locator('.help [role="radiogroup"]')).toBeVisible();
});
