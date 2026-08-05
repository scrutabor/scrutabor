// Deployment gate: refuse to build for production unless this commit's
// CI concluded green. Cloudflare Pages runs this ahead of the build
// (see the project's build command), so a push whose tests fail — or
// whose CI never reports — deploys nothing. Fail-closed by design.
//
// Auth is optional: the repo is public, so the checks API answers
// anonymously; set GITHUB_TOKEN in the Pages environment to lift the
// anonymous rate limit if it ever bites.

const REPO = 'scrutabor/scrutabor-app';
const sha = process.env.CF_PAGES_COMMIT_SHA;
const TIMEOUT_MS = 12 * 60 * 1000;
const POLL_MS = 30 * 1000;

if (!sha) {
	// Not a Pages build (local run): nothing to gate.
	console.log('ci-gate: no CF_PAGES_COMMIT_SHA - skipping (not a Pages build)');
	process.exit(0);
}

const headers = { accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const started = Date.now();
for (;;) {
	const res = await fetch(`https://api.github.com/repos/${REPO}/commits/${sha}/check-runs`, {
		headers
	});
	if (res.status === 403 || res.status === 429) {
		// The anonymous limit, shared across every build on this IP pool.
		// Retry until the deadline - and set GITHUB_TOKEN in the Pages
		// environment to stop depending on that lottery.
		if (Date.now() - started > TIMEOUT_MS) {
			console.error('ci-gate: rate-limited past the deadline - failing closed');
			process.exit(1);
		}
		console.log(`ci-gate: checks API rate-limited (${res.status}) - retrying...`);
		await new Promise((resolve) => setTimeout(resolve, POLL_MS));
		continue;
	}
	if (!res.ok) {
		console.error(`ci-gate: checks API answered ${res.status} - failing closed`);
		process.exit(1);
	}
	const { check_runs: runs = [] } = await res.json();
	const bad = runs.filter(
		(r) =>
			r.status === 'completed' && !['success', 'neutral', 'skipped'].includes(r.conclusion ?? '')
	);
	if (bad.length > 0) {
		console.error(`ci-gate: CI failed for ${sha}: ${bad.map((r) => r.name).join(', ')}`);
		process.exit(1);
	}
	// A gate that checks nothing must not pass: require at least one
	// completed run before declaring green.
	if (runs.length > 0 && runs.every((r) => r.status === 'completed')) {
		console.log(`ci-gate: ${runs.length} check(s) green for ${sha}`);
		process.exit(0);
	}
	if (Date.now() - started > TIMEOUT_MS) {
		console.error(`ci-gate: CI did not conclude within ${TIMEOUT_MS / 60000} min - failing closed`);
		process.exit(1);
	}
	console.log(`ci-gate: waiting for CI (${runs.length} run(s) reported)...`);
	await new Promise((resolve) => setTimeout(resolve, POLL_MS));
}
