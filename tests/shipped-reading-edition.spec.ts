// A normal reading must use the generated shipped pack and the same declared edition.
import { expect, test } from './fixtures';
import manifest from '../src/lib/data/manifest.json' with { type: 'json' };
import table from '../src/lib/data/introductiones.json' with { type: 'json' };
import formularies from '../src/lib/data/formularies.json' with { type: 'json' };
import type { ProperPayload } from '../src/lib/proper.svelte';
import type { TextDocument } from '../src/lib/corpus';

test.use({ serviceWorkers: 'block' });
for (const lang of ['pl', 'en'] as const)
	test(`${lang} shipped6.6 pack initializes every dated consumer and displays its reading @online`, async ({
		page
	}) => {
		expect(manifest.schema_version).toBe('6.6.0');
		expect(table.schema_version).toBe('2.0.0');
		expect(table.announcements).toHaveLength(205);
		const mass = 'dominica-iii-post-pascha';
		const days = [...formularies.formularies].sort((a, b) => a.order - b.order);
		const index = days.findIndex((day) => day.id === mass);
		expect(index).toBeGreaterThanOrEqual(0);
		const pack = String(Math.floor(index / 5) + 1).padStart(2, '0');
		const response = await page.request.get(`/artifacts/proprium/${lang}/pack-${pack}.json`);
		expect(response.ok()).toBe(true);
		const shipped = (await response.json()).days[mass] as ProperPayload;
		expect(shipped.day).toBe(mass);
		expect(shipped.lang).toBe(lang);
		await page.addInitScript(() => localStorage.setItem('scrutabor-role', 'sacerdos'));
		// No route/fetch/lookup/schema mock: chooseDay's four-resource precondition must hold.
		await page.goto(`/app/${lang}/ordo/catechumenorum?dies=2026-04-26`);
		for (const role of ['epistola', 'evangelium'] as const) {
			const part = shipped.parts.find((part) => part.part === role)!;
			expect(part).toBeDefined();
			const doc = part.doc as TextDocument;
			expect(doc.id).toBe(part.key.replace('/', '.'));
			const first = doc.segments.flatMap((s) => s.words ?? [])[0];
			const slug = part.key.split('/')[1];
			const body = page.locator(`[id="${slug}.${first.id}"]`);
			await expect(body).toBeVisible();
			await expect(body.locator('.base')).toHaveText(`${first.form}${first.post ?? ''}`);
			const binding = table.announcements.find((row) => row.reading === part.key)!;
			expect(binding).toBeDefined();
			const unit = table.units.find((unit) => unit.id === binding.unit)!;
			const formula = `${unit.text.split('/')[1]}~${role}-annuntiatio~${slug}.${unit.words[0]}`;
			const section = page.locator('section.part').filter({ has: body });
			await expect(section.locator(`[id="${formula}"]`)).toBeVisible();
			await expect(section.locator('.reading-reference')).toHaveText(binding.reference);
		}
		await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
		await expect(page.locator('.picker .state')).toHaveCount(0);
	});
