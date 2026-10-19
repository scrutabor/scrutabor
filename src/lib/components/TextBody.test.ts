import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import TextBody from './TextBody.svelte';
import TextBodyLayout from './TextBodyLayout.fixture.svelte';
import type { GlossDocument, Segment, TextDocument } from '../corpus';
import { textFlowFor } from '../reading-flow';
import { massForm } from '../mass-form.svelte';
import { role } from '../role.svelte';

const defaults = { confidence: 'editorial', sources: [], review: 'pending' };
const text = (segments: Segment[]): TextDocument => ({
	schema_version: '0.21.0',
	id: 'test.frame',
	title: 'Frame',
	status: 'working-edition',
	analysis_defaults: defaults,
	analysis_defaults_words: defaults,
	segments
});
const gloss: GlossDocument = {
	schema_version: '0.21.0',
	text: 'test.frame',
	lang: 'en',
	status: 'working-edition',
	analysis_defaults: defaults,
	segments: {},
	words: {}
};
const html = (segments: Segment[], hideOpeningRubric = false) =>
	render(TextBody, {
		props: {
			doc: text(segments),
			gloss,
			lang: 'en',
			helpLevel: 0,
			hideOpeningRubric,
			idPrefix: 'frame'
		}
	}).body;

describe('actual text renderer fallbacks', () => {
	it('emits no source row or invented opening for an empty document', () => {
		const rendered = html([]);
		expect(rendered).not.toContain('flow-unit');
		expect(rendered).not.toContain('class="verse');
	});
	it('renders a genuine rubric-only document once without inventing a verse', () => {
		const rendered = html([{ id: 'r0', type: 'rubric', text: 'Test direction.' }]);
		expect(rendered.match(/Test direction\./g)).toHaveLength(1);
		expect(rendered.match(/id="frame-r0"/g)).toHaveLength(1);
		expect(rendered).not.toContain('class="verse');
	});
	it('retains a hidden rubric-only anchor once without displaying a sacred row', () => {
		const rendered = html([{ id: 'r0', type: 'rubric', text: 'Test direction.' }], true);
		expect(rendered.match(/id="frame-r0"/g)).toHaveLength(1);
		expect(rendered).toContain('rubric-anchor');
		expect(rendered).not.toContain('Test direction.');
		expect(rendered).not.toContain('class="verse');
	});
});

describe('a body that follows another body in one Ordo slot', () => {
	const verse = (id: string): Segment => ({
		id,
		type: 'verse',
		speaker: 'schola',
		words: [{ id: `${id}.w0`, form: 'Alleluia', lemma: 'alleluia', morph: { pos: 'x' } }]
	});
	const neighbour = textFlowFor(
		text([verse('p1'), verse('p2')]),
		gloss,
		{ helpLevel: 0 },
		'cantu',
		'populus'
	);
	const rendered = (props: object) =>
		render(TextBody, {
			props: {
				doc: text([{ id: 'r0', type: 'rubric', text: 'In feriis Adventus.' }, verse('s1')]),
				gloss,
				lang: 'en',
				helpLevel: 0,
				idPrefix: 'body',
				...props
			}
		}).body;
	it('keeps its edge rows as the slot edges when it stands alone', () => {
		const html = rendered({});
		expect(html).toMatch(/class="flow-row[^"]*\bfirst\b[^"]*"/);
		expect(html).toMatch(/class="flow-row[^"]*\blast\b[^"]*"/);
		expect(html).not.toContain('partition-start');
	});
	it('prices its first row against the row rendered before it', () => {
		const html = rendered({ preceding: neighbour.last });
		expect(html).not.toMatch(/class="flow-row[^"]*\bfirst\b[^"]*"/);
		expect(html).toMatch(/class="flow-row[^"]*partition-start[^"]*" data-before="verse"/);
		expect(html).toMatch(/class="measure[" ]/);
	});
	// The opening rubric row always carries data-after="verse" towards its own
	// verse; the last row adds a second one only when a body follows.
	const afterVerse = (html: string) => (html.match(/data-after="verse"/g) ?? []).length;
	it('keeps its last row open towards the row rendered after it', () => {
		const html = rendered({ following: neighbour.first });
		expect(html).not.toMatch(/class="flow-row[^"]*\blast\b[^"]*"/);
		expect(afterVerse(html)).toBe(2);
	});
	// The Easter Gradual is one verse: it renders whole in the part's opening
	// and the Alleluia begins the continuation, so the opening's last row is
	// the body's last row and must know what follows.
	const inLayout = (props: object) =>
		render(TextBodyLayout, {
			props: {
				doc: text([verse('s1')]),
				gloss,
				lang: 'en',
				helpLevel: 0,
				idPrefix: 'body',
				...props
			}
		}).body;
	it('keeps its last row open when the whole body renders in its opening', () => {
		const html = inLayout({ following: neighbour.first });
		expect(html).toContain('<div class="opening">');
		expect(html).not.toContain('class="continuation"');
		expect(html).not.toMatch(/class="flow-row[^"]*\blast\b[^"]*"/);
		expect(html).toMatch(/data-after="verse"/);
	});
	it('ends at the slot edge in its opening when nothing follows', () => {
		const html = inLayout({});
		expect(html).toContain('<div class="opening">');
		expect(html).toMatch(/class="flow-row[^"]*\blast\b[^"]*"/);
		expect(html).not.toMatch(/data-after="verse"/);
	});
	// A body that renders its translation sources stays linked to the body
	// after it; the last row is marked for the screen-only neutralisation.
	const witness = [{ title: 'Witness', locator: 'p. 1' }];
	it('keeps the link across its sources block and marks the last row', () => {
		const html = rendered({
			helpLevel: 2,
			verifiedTranslationCitations: witness,
			following: neighbour.first
		});
		expect(html).toContain('translation-sources');
		expect(html).not.toMatch(/class="flow-row[^"]*\blast\b[^"]*"/);
		expect(afterVerse(html)).toBe(2);
		expect(html).toMatch(/class="flow-row[^"]*\bsources-after\b[^"]*"/);
	});
	it('marks no row when the sources are not shown', () => {
		const html = rendered({
			helpLevel: 2,
			verifiedTranslationCitations: witness,
			showTranslationSources: false,
			following: neighbour.first
		});
		expect(html).not.toContain('translation-sources');
		expect(html).not.toMatch(/class="flow-row[^"]*\blast\b[^"]*"/);
		expect(afterVerse(html)).toBe(2);
		expect(html).not.toMatch(/sources-after/);
	});
	it('marks its first row when the body before it shows its sources', () => {
		const html = rendered({ helpLevel: 2, preceding: neighbour.last, precededBySources: true });
		expect(html).toMatch(/class="flow-row[^"]*\bsources-before\b[^"]*"/);
		expect(rendered({ helpLevel: 2, preceding: neighbour.last })).not.toMatch(/sources-before/);
	});
});

describe.each([0, 1, 2])('a reference response at help level %i', (helpLevel) => {
	const response: Segment = {
		id: 's01',
		type: 'verse',
		speaker: 'minister',
		participation: { lecta: { gradus: 1, source: 'DMS 31 a' } },
		words: [
			{ id: 'w001', form: 'Laus', lemma: 'laus', morph: { pos: 'noun' } },
			{ id: 'w002', form: 'tibi', lemma: 'tu', morph: { pos: 'pron' } },
			{ id: 'w003', form: 'Christe', lemma: 'Christus', morph: { pos: 'noun' } }
		]
	};
	const responseGloss: GlossDocument = {
		...gloss,
		segments: { s01: { translation: 'Praise to You, O Christ.' } },
		words: {
			w001: { gloss: 'praise' },
			w002: { gloss: 'to You' },
			w003: { gloss: 'O Christ' }
		}
	};
	// Deliberately inert fixture URL. No request is needed for server markup.
	const witness = [
		{
			title: 'Test witness',
			locator: 'Test location',
			url: 'https://example.invalid/response-witness'
		}
	];
	const rendered = (referenceOnly: boolean, segments = [response]) =>
		render(TextBody, {
			props: {
				doc: text(segments),
				gloss: responseGloss,
				lang: 'en',
				helpLevel,
				idPrefix: 'retained',
				ontap: () => {},
				referenceOnly,
				verifiedTranslationCitations: witness
			}
		}).body;
	const verseClasses = (html: string) => {
		const opening = html.match(/<p\b[^>]*\bid="retained-s01"[^>]*>/)?.[0];
		expect(opening).toBeDefined();
		const classes = opening!.match(/\bclass="([^"]*)"/)?.[1];
		expect(classes).toBeDefined();
		return classes!.split(/\s+/);
	};
	const retained = (html: string) => {
		// The decorative initial splits a Latin word across tags. Inspect
		// this controlled ASCII fixture’s text, not an aria-label substring.
		const content = html.replace(/<[^>]*>/g, '');
		for (const id of ['retained-s01', 'retained.w001', 'retained.w002', 'retained.w003'])
			expect(html.match(new RegExp('id="' + id.replaceAll('.', '\\.') + '"', 'g'))).toHaveLength(1);
		for (const word of ['Laus', 'tibi', 'Christe']) expect(content).toContain(word);
		if (helpLevel === 1)
			for (const caption of ['praise', 'to You', 'O Christ']) expect(content).toContain(caption);
		if (helpLevel === 2) expect(content).toContain('Praise to You, O Christ.');
		for (const href of ['https://example.invalid/response-witness', '/app/en/bibliographia'])
			expect(html.split('href="' + href + '"').length - 1).toBe(helpLevel === 2 ? 1 : 0);
	};
	it.each(['lecta', 'cantu'] as const)(
		'retains words and anchors without active %s actor cues',
		(form) => {
			const before = structuredClone(response),
				beforeGloss = structuredClone(responseGloss);
			const oldForm = massForm.value,
				oldRole = role.value;
			try {
				massForm.set(form);
				for (const who of ['populus', 'minister', 'sacerdos'] as const) {
					role.set(who);
					const active = rendered(false),
						reference = rendered(true);
					expect(active).toContain('class="who');
					expect(active).toContain('class="mark');
					if (form === 'lecta') expect(active).toContain('everyone answers');
					expect(verseClasses(active)).not.toContain('quiet');
					expect(verseClasses(active).includes('answer')).toBe(
						who === 'minister' || (form === 'lecta' && who === 'populus')
					);
					expect(reference).not.toContain('class="who');
					expect(reference).not.toContain('class="mark');
					expect(verseClasses(reference)).not.toContain('quiet');
					expect(verseClasses(reference)).not.toContain('answer');
					retained(active);
					retained(reference);
				}
			} finally {
				massForm.set(oldForm);
				role.set(oldRole);
			}
			expect(response).toEqual(before);
			expect(responseGloss).toEqual(beforeGloss);
		}
	);
	it('does not leak a conditional faculty, quiet styling, or voice instruction into reference mode', () => {
		const oldForm = massForm.value,
			oldRole = role.value;
		const faculty: Segment = {
			...response,
			speaker: 'sacerdos',
			voice: 'secreto',
			participation: { lecta: { source: 'DMS 32', conditional: true } }
		};
		const before = structuredClone(faculty);
		try {
			massForm.set('lecta');
			role.set('sacerdos');
			const active = rendered(false, [faculty]),
				reference = rendered(true, [faculty]);
			expect(active).toContain('the faithful may join');
			expect(active).toContain('silently');
			expect(verseClasses(active)).toContain('quiet');
			expect(verseClasses(active)).toContain('answer');
			expect(reference).not.toContain('the faithful may join');
			expect(reference).not.toContain('silently');
			expect(reference).not.toContain('class="who');
			expect(verseClasses(reference)).not.toContain('quiet');
			expect(verseClasses(reference)).not.toContain('answer');
			retained(active);
			retained(reference);
		} finally {
			massForm.set(oldForm);
			role.set(oldRole);
		}
		expect(faculty).toEqual(before);
	});
});
