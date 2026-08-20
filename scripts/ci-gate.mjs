// Deployment gate: refuse to build for production unless this commit's
// CI concluded green. CI marks each green main commit with a ref
// (refs/ci-green/<sha>, pushed by the workflow's last step); this gate
// polls for that ref over git's smart-HTTP protocol, which - unlike
// the REST API - is not rate-limited on the shared build IP pool.
// A commit whose CI failed never gets the ref, so the gate times out
// and the build fails: fail-closed by design.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const REPO_URL = 'https://github.com/scrutabor/scrutabor.git';
const TIMEOUT_MS = 12 * 60 * 1000;
const POLL_MS = 20 * 1000;

/**
 * Whether to gate, and on what. 'skip' only when NOTHING says this is a
 * Pages build: a Pages environment whose commit variable is missing —
 * renamed, or withheld — must fail closed, not pass as "not a Pages
 * build". The other CF_PAGES_* variables are the witnesses that it is one.
 */
export function decide(env = process.env) {
	if (env.CF_PAGES_COMMIT_SHA) return { mode: 'gate', sha: env.CF_PAGES_COMMIT_SHA };
	if (env.CF_PAGES || env.CF_PAGES_BRANCH || env.CF_PAGES_URL) return { mode: 'fail' };
	return { mode: 'skip' };
}

// The gate runs only as the entry script — decide() is imported by its
// test, and an import that called process.exit would kill the test runner.
// The test also runs this file as a subprocess, so the entry path is
// itself under test and cannot silently stop gating deploys.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const decision = decide();
	if (decision.mode === 'skip') {
		// Not a Pages build (local run): nothing to gate.
		console.log('ci-gate: no Pages environment - skipping (local build)');
		process.exit(0);
	}
	if (decision.mode === 'fail') {
		console.error(
			'ci-gate: a Pages environment with no CF_PAGES_COMMIT_SHA - there is no commit to verify, failing closed'
		);
		process.exit(1);
	}
	const sha = decision.sha;

	const started = Date.now();
	for (;;) {
		let out = '';
		try {
			out = execFileSync('git', ['ls-remote', REPO_URL, `refs/ci-green/${sha}`], {
				encoding: 'utf8',
				timeout: 30_000
			});
		} catch {
			// transient network/remote failure - retry until the deadline
		}
		if (out.includes(`refs/ci-green/${sha}`)) {
			console.log(`ci-gate: ci-green ref present for ${sha}`);
			process.exit(0);
		}
		if (Date.now() - started > TIMEOUT_MS) {
			console.error(
				`ci-gate: no ci-green ref for ${sha} within ${TIMEOUT_MS / 60000} min - failing closed`
			);
			process.exit(1);
		}
		console.log('ci-gate: waiting for the ci-green ref...');
		await new Promise((resolve) => setTimeout(resolve, POLL_MS));
	}
}
