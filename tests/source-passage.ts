import type { Locator } from '@playwright/test';
import { expect } from './fixtures';

/** Check both the visible locator and the pinned source opened by that locator. */
export async function expectSourcePassage(
	container: Locator,
	language: string,
	heading: string,
	file: `Missa/${string}` | `Horae/${string}`,
	first: number,
	last = first,
	revision = '44667ff518b8ff1439780470828b39714f5306a2'
) {
	const slash = file.indexOf('/');
	const branch = file.startsWith('Horae/') ? 'horas' : 'missa';
	const path = `web/www/${branch}/Latin/${file.slice(slash + 1)}`;
	const range = first === last ? `L${first}` : `L${first}-L${last}`;
	const url = `https://github.com/DivinumOfficium/divinum-officium/blob/${revision}/${path}#${range}`;
	const lineLabel = language === 'pl' ? 'w.' : first === last ? 'line' : 'lines';
	const numbers = first === last ? String(first) : `${first}–${last}`;
	const link = container.locator(`a:is(.source-passage, .passage)[href="${url}"]`);
	await expect(link).toHaveCount(1);
	await expect(link).toHaveText(`${heading} · ${file} · ${lineLabel} ${numbers}`);
}
