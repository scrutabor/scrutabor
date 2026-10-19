import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import HelpLevels from './HelpLevels.svelte';
import RolePicker from './RolePicker.svelte';
import { M } from '../i18n';
import { MASS_FORMS } from '../mass-form.svelte';
import { ROLES } from '../role.svelte';

// Name each radio with its visible word, not its decorative CSS separator.
// These SSR assertions check the explicit names. Browser checks must also
// verify computed accessible names with the stylesheet present.
function expectRadioNames(html: string, names: readonly string[]) {
	const buttons = [...html.matchAll(/<button\b[^>]*\brole="radio"[^>]*>/g)].map(
		([button]) => button
	);
	expect(buttons.map((button) => /aria-label="([^"]*)"/.exec(button)?.[1])).toEqual(names);
	expect(buttons.filter((button) => /aria-checked="true"/.test(button))).toHaveLength(1);
	expect(buttons.filter((button) => /tabindex="0"/.test(button))).toHaveLength(1);
	expect(html.match(/aria-hidden="true"/g)).toHaveLength(names.length);
}

describe('picker radios use their visible localized names', () => {
	for (const lang of ['pl', 'en'] as const) {
		it(`names every ${lang} role option without decoration`, () => {
			const html = render(RolePicker, { props: { lang, kind: 'role' } }).body;
			expectRadioNames(
				html,
				ROLES.map((role) => M[lang].roles[role])
			);
		});

		it(`names every ${lang} Mass-form option without decoration`, () => {
			const html = render(RolePicker, { props: { lang, kind: 'mass' } }).body;
			expectRadioNames(
				html,
				MASS_FORMS.map((form) => M[lang].massForms[form])
			);
		});

		it(`names every ${lang} reading-mode option without decoration`, () => {
			const html = render(HelpLevels, { props: { lang, value: 1 } }).body;
			expectRadioNames(
				html,
				([0, 2, 1] as const).map((level) => M[lang].levels[level])
			);
		});
	}
});
