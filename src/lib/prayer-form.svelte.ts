// Which recension of Sub tuum praesidium the reader prefers to pray.
// This is a genuine reading choice, like the selected part and Mass form,
// rather than a disclosure that should reset every time the page is opened.

import { browser } from '$app/environment';

export const PRAYER_FORMS = ['basic', 'extended'] as const;
export type PrayerForm = (typeof PRAYER_FORMS)[number];

const KEY = 'scrutabor-prayer-form';

function stored(): PrayerForm {
	if (!browser) return 'basic';
	const saved = localStorage.getItem(KEY);
	return (PRAYER_FORMS as readonly string[]).includes(saved ?? '')
		? (saved as PrayerForm)
		: 'basic';
}

// Prerender uses the basic antiphon; the reader's preference is restored once
// the app is alive, following the same pattern as role and Mass form.
let current = $state<PrayerForm>('basic');

export const prayerForm = {
	get value(): PrayerForm {
		return current;
	},
	set(next: PrayerForm) {
		current = next;
		if (browser) localStorage.setItem(KEY, next);
	}
};

/** Apply the reader's stored choice. Called once, from the app layout. */
export function loadPrayerForm(): void {
	if (browser) current = stored();
}
