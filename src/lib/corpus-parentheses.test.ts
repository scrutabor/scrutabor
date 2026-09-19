import { expect, it, vi } from 'vitest';

vi.mock(
	'./data/texts/proprium/dominica-vi-post-epiphaniam-epistola.json',
	async (importOriginal) => {
		const module = await importOriginal<{ default: { seg: Record<string, unknown>[] } }>();
		const artifact = structuredClone(module.default);
		artifact.seg[0].parentheses = [{ from: 'w167', through: 'w170' }];
		return { default: artifact };
	}
);

import { loadCoreText, loadText } from './corpus';

it('retains source parentheses through both real asynchronous loading paths', async () => {
	const key = 'proprium/dominica-vi-post-epiphaniam-epistola';
	const core = (await loadCoreText(key))!;
	const localized = (await loadText(key, 'en'))!;
	expect(core.segments[0].parentheses).toEqual([{ from: 'w167', through: 'w170' }]);
	expect(localized.text.segments[0]).toEqual(core.segments[0]);
	expect(core.segments[0].words).toHaveLength(177);
	expect(core.segments[0].words![166]).toMatchObject({ id: 'w167', form: 'quem' });
	expect(core.segments[0].words![169]).toMatchObject({ id: 'w170', form: 'mórtuis' });
});
