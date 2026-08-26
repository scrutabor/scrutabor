import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROUTES = 'src/routes';

function pages(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = `${dir}/${entry.name}`;
		if (entry.isDirectory()) return pages(path);
		return entry.name.endsWith('.svelte') ? [path] : [];
	});
}

function cssRules(source: string): { selectors: string; declarations: string }[] {
	return [...source.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/g)].flatMap((style) =>
		[...style[1].matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((rule) => ({
			selectors: rule[1],
			declarations: rule[2]
		}))
	);
}

describe('the shared page frame', () => {
	it('cannot be resized by a route stylesheet', () => {
		const violations: string[] = [];
		for (const path of pages(ROUTES)) {
			const source = readFileSync(path, 'utf8');
			const roots = [...source.matchAll(/<div\s+class="page(?:\s+([^"]+))?"/g)].flatMap((match) => [
				'page',
				...(match[1]?.split(/\s+/) ?? [])
			]);
			if (!roots.length) continue;

			for (const rule of cssRules(source)) {
				if (!/\bmax-width\s*:/.test(rule.declarations)) continue;
				for (const selector of rule.selectors.split(',').map((part) => part.trim())) {
					// A selector without a combinator addresses the page root itself.
					// Descendants such as `.landing main` may still own a prose measure.
					if (!selector || /[\s>+~]/.test(selector)) continue;
					if (roots.some((name) => new RegExp(`\\.${name}(?![\\w-])`).test(selector))) {
						violations.push(`${path}: ${selector}`);
					}
				}
			}
		}

		expect(
			violations,
			'only src/app.css may set the outer page frame; constrain an inner block instead'
		).toEqual([]);
	});
});
