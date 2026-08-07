// The dangerous direction is one-way: marking a preview costs nothing,
// marking PRODUCTION would quietly ask every search engine to drop the
// site. So the rule is tested from the production side first.
import { describe, expect, it } from 'vitest';
import { isPreview } from './mark-preview.mjs';

describe('which deployments are marked noindex', () => {
	it('never the release branch', () => {
		expect(isPreview('release')).toBe(false);
	});

	it('nor a local build, which has no branch at all', () => {
		expect(isPreview(undefined)).toBe(false);
		expect(isPreview('')).toBe(false);
	});

	it('but yes staging', () => {
		expect(isPreview('staging')).toBe(true);
	});

	it('and yes anything else that somehow gets deployed', () => {
		// preview_branch_includes should keep this from happening; if it
		// ever does, the copy still says it is not the published edition
		expect(isPreview('main')).toBe(true);
		expect(isPreview('some-experiment')).toBe(true);
	});
});
