// The deploy gate itself. It had no test at all — the one script in the
// repository without one, and the one whose silent failure ships an
// unverified build. The dangerous direction: a Pages environment whose
// commit variable is missing (renamed by the platform, withheld by a
// misconfiguration) must FAIL, not pass as "not a Pages build".
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { decide } from './ci-gate.mjs';

// The env a subprocess run needs, with every CF_PAGES_* variable cleared
// first so the machine running the tests cannot leak one in.
function cleanEnv(extra: Record<string, string> = {}) {
	const env = { ...process.env, ...extra };
	for (const key of Object.keys(env)) {
		if (key.startsWith('CF_PAGES') && !(key in extra)) delete env[key];
	}
	return env;
}

function run(extra: Record<string, string> = {}) {
	try {
		execFileSync('node', ['scripts/ci-gate.mjs'], { env: cleanEnv(extra), timeout: 30_000 });
		return 0;
	} catch (failed) {
		return (failed as { status: number }).status;
	}
}

describe('when the gate gates', () => {
	it('skips only a build with no Pages environment at all', () => {
		expect(decide({}).mode).toBe('skip');
	});

	it('gates on the commit when Pages provides one', () => {
		expect(decide({ CF_PAGES_COMMIT_SHA: 'abc123' })).toEqual({ mode: 'gate', sha: 'abc123' });
	});

	it('fails closed on a Pages environment with no commit to verify', () => {
		expect(decide({ CF_PAGES: '1' }).mode).toBe('fail');
		expect(decide({ CF_PAGES_BRANCH: 'release' }).mode).toBe('fail');
		expect(decide({ CF_PAGES_URL: 'https://x.pages.dev' }).mode).toBe('fail');
	});
});

describe('the script as Pages runs it', () => {
	// Subprocess runs, so the entry-module guard is itself under test: if
	// it ever stopped recognising the script as the entry, the gate would
	// exit 0 having gated nothing — these two runs exercise both verdicts
	// that terminate before any network is touched.
	it('exits 0 on a local build', () => {
		expect(run()).toBe(0);
	});

	it('exits 1 on a Pages build with no commit sha', () => {
		expect(run({ CF_PAGES_BRANCH: 'release' })).toBe(1);
	});
});
