import { afterEach, expect, it } from 'vitest';
import { loadText } from './corpus';
import type { Lang } from './i18n';
import { massForm } from './mass-form.svelte';
import { speakerLabels } from './speaker-labels-test-context';

// The Preface dialogue and the Preface bodies carry the corpus's sung delivery (delivery.cantu):
// at a sung Mass the celebrant sings and the schola answers with the faithful; at a low Mass
// the server answers with them. TextBody applies it through inMassForm; these are its labels.
async function labels(key: string, lang: Lang, form: 'lecta' | 'cantu') {
	const entry = await loadText(key, lang);
	if (!entry) throw new Error(`${key} is absent from ${lang}`);
	massForm.set(form);
	return speakerLabels(entry.text, entry.gloss, lang, 'p');
}

const before = massForm.value;
afterEach(() => massForm.set(before));

const DIALOGUE_MARKS = ['V.', 'R.', 'V.', 'R.', 'V.', 'R.'];

it.each([
	['pl', 'kapłan', 'usługujący i wierni', 'schola i wierni', 'śpiew'],
	['en', 'priest', 'server and faithful', 'choir and faithful', 'sung']
] as const)(
	'%s Preface dialogue names the celebrant and the answer in both forms of Mass',
	async (lang, priest, low, sung, voice) => {
		expect(await labels('ordinarium/praefatio-dialogus', lang, 'lecta')).toEqual({
			names: [priest, low],
			voices: [],
			marks: DIALOGUE_MARKS
		});
		expect(await labels('ordinarium/praefatio-dialogus', lang, 'cantu')).toEqual({
			names: [priest, sung],
			voices: [voice],
			marks: DIALOGUE_MARKS
		});
	}
);

it.each([
	['pl', 'śpiew'],
	['en', 'sung']
] as const)('%s Preface bodies are the celebrant’s, sung at a sung Mass', async (lang, voice) => {
	for (const key of ['ordinarium/praefatio-communis', 'ordinarium/praefatio-paschalis']) {
		expect(await labels(key, lang, 'lecta'), key).toEqual({ names: [], voices: [], marks: ['V.'] });
		expect(await labels(key, lang, 'cantu'), key).toEqual({
			names: [],
			voices: [voice],
			marks: ['V.']
		});
	}
});
