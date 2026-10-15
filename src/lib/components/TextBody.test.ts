import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import TextBody from './TextBody.svelte';
import type { GlossDocument, Segment, TextDocument } from '../corpus';

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
