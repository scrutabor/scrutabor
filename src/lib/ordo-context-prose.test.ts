import { expect, it } from 'vitest';
import { ORDO } from './ordo';
import { PROPER_DAYS } from './proprium';
import { ordoContext } from './ordo-context';

it.each(['pl', 'en'] as const)('checks all selected-day context prose in %s', (lang) => {
	const entries = ORDO.flatMap((movement) => movement.entries);
	const masses = [null, ...PROPER_DAYS.map((mass) => mass.id)];
	const notes = new Map<string, string>();
	expect(entries.length).toBeGreaterThan(60);
	expect(masses.length).toBeGreaterThan(100);
	for (const entry of entries)
		for (const mass of masses)
			for (const dismissal of [false, true]) {
				const note = ordoContext(entry.id, mass, dismissal, lang);
				if (note) notes.set(`${mass}/${entry.id}/${dismissal}`, note);
			}
	const distinct = new Set(notes.values());
	expect(distinct.size).toBeGreaterThan(20);
	for (const prefix of ['vigilia-paschalis/', 'dominica-ii-passionis/', 'vigilia-pentecostes/'])
		expect(
			[...notes.keys()].some((key) => key.startsWith(prefix)),
			prefix
		).toBe(true);
	expect([...notes.values()].some((note) => note.includes('Munda cor meum'))).toBe(true);
	const offenders = [...notes].filter(([, note]) => note.includes(';'));
	expect(offenders, 'use two sentences without changing the rubric').toEqual([]);
});
