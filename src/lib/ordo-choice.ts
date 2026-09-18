import { dayOn, isCivilDate } from './kalendarium';
import { PROPER_DAYS, dayByCalendarKey } from './proprium';

/** The date is always present. A null Mass explicitly requests the Ordinary alone. */
export interface OrdoChoice {
	date: string;
	mass: string | null;
}

export const DAY_PARAM = 'dies';
export const MASS_PARAM = 'missa';

/** Only Masses belonging to this occurrence, never the preceding Sunday's Mass. */
export function massesOn(date: string) {
	const on = dayOn(date);
	return on ? PROPER_DAYS.filter((day) => day.calendar.key === on.formulary) : [];
}

/** Invalid overrides fail closed; they must not put another feast under this date. */
export function resolveOrdoChoice(date: string, mass: string | null = null): OrdoChoice | null {
	if (!isCivilDate(date)) return null;
	if (mass === 'none') return { date, mass: null };
	if (mass !== null) {
		return massesOn(date).some((day) => day.id === mass) ? { date, mass } : null;
	}
	const on = dayOn(date);
	return { date, mass: on ? (dayByCalendarKey(on.formulary)?.id ?? null) : null };
}

/** Share both the date and any deliberate departure from its default Mass. */
export function writeOrdoChoice(url: URL, choice: OrdoChoice): void {
	url.searchParams.set(DAY_PARAM, choice.date);
	const automatic = resolveOrdoChoice(choice.date);
	if (choice.mass === null) url.searchParams.set(MASS_PARAM, 'none');
	else if (choice.mass !== automatic?.mass) url.searchParams.set(MASS_PARAM, choice.mass);
	else url.searchParams.delete(MASS_PARAM);
}

export function ordoHref(href: string, choice: OrdoChoice): string {
	const url = new URL(href, 'https://scrutabor.invalid');
	writeOrdoChoice(url, choice);
	return url.pathname + url.search + url.hash;
}
