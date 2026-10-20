import { defineConfig } from '@playwright/test';

const prebuilt = process.env.SCRUTABOR_E2E_PREBUILT === '1';
const noServer = process.env.SCRUTABOR_E2E_NO_SERVER === '1';

// Most interaction tests use the framework preview. The static-host project
// separately exercises the deployed build/ tree, without framework fallbacks.
//
// And then again, over file://, against the folder edition. That one has
// no server, no router and no origin, and it broke three times while this
// suite was entirely green: a page that still asked the router for its
// language, a word panel that walked back out of the prayer when closed,
// a stylesheet looked for one directory above where it lived. None of
// those could be seen from the hosted side. A second artifact needs a
// second run, or it rots the first time someone touches a route.
export default defineConfig({
	testDir: 'tests',
	// A stray .only left in a spec narrows CI to one test of five hundred
	// and reports green. Vitest refuses that under CI by its own default;
	// Playwright only when told.
	forbidOnly: !!process.env.CI,
	// A CI failure is otherwise only its message: keep a screenshot of a failed
	// test so the uploaded results show what the page looked like. Recording a
	// trace for every test slowed the CI runners into timeouts.
	use: process.env.CI ? { screenshot: 'only-on-failure' } : {},
	webServer: noServer
		? undefined
		: [
				{
					// Both artifacts, from one command, so they can never disagree about
					// which corpus or which runtime they were built from. (The offline
					// zip is not among them: it travels with each GitHub release, and
					// the landing links the latest release's asset directly.)
					command: prebuilt ? 'npm run preview' : 'npm run build:offline && npm run preview',
					port: 4173,
					// A cold CI runner builds the complete hosted and folder editions before
					// preview starts. The full liturgical-year corpus can take nearly two
					// minutes even on a warm workstation, so leave room for a cold runner.
					timeout: 240_000,
					reuseExistingServer: !process.env.CI
				},
				{
					// The deployed tree itself. SvelteKit's preview answers from
					// .svelte-kit/output, where the route sidecars the build prunes
					// still exist and a missing page still reaches the server runtime —
					// two of the differences that hid a broken Back and an offline book
					// that could never complete. The static-host project runs the
					// navigation and worker scenarios against build/ alone, with the
					// four rules the static host applies (scripts/static-host.ts).
					command: 'node scripts/static-host.ts 4174',
					port: 4174,
					timeout: 30_000,
					reuseExistingServer: !process.env.CI
				}
			],
	// The corpus is large and the flow pages are long; a 5 s default starts
	// biting on page loads that are genuinely doing work.
	timeout: 60_000,
	expect: { timeout: 15_000 },
	projects: [
		{
			name: 'hosted',
			use: { baseURL: 'http://localhost:4173' },
			// The mirror of @online below: a handful of properties belong to
			// the folder alone — what it does with scripting turned off, and
			// that it is styled before its script has run.
			grepInvert: /@folder|@sweep|@static-host/
		},
		{
			name: 'offline',
			// Paths are translated to files by the fixture, which is where
			// the knowledge of the folder's shape belongs.
			//
			// What is skipped here is skipped because it cannot exist off a
			// server, not because it is inconvenient: the service worker and
			// its caches, the cold-load weight of a first visit over HTTP,
			// the server's own 404, and the language redirect a server does
			// with a Location header.
			grepInvert: /@online|@static-host/
		},
		{
			// The deployed tree, served as the static host serves it — see the
			// second web server above. History traversal, redirects and the
			// worker's whole-book promise are proven here and nowhere else.
			name: 'static-host',
			use: { baseURL: 'http://localhost:4174' },
			grep: /@static-host/
		},
		{
			name: 'reader-firefox',
			testMatch: [
				'pager-layout.spec.ts',
				'print-associations.spec.ts',
				'interlinear-portability.spec.ts',
				'interlinear-clipping.spec.ts',
				'trinity-preface.spec.ts',
				'epiphany-constructions.spec.ts',
				'epiphany-third-constructions.spec.ts',
				'epiphany-fourth-constructions.spec.ts',
				'epiphany-fifth-constructions.spec.ts',
				'epiphany-sixth-constructions.spec.ts',
				'epiphany-sixth-analysis.spec.ts',
				'septuagesima-constructions.spec.ts',
				'septuagesima-analysis.spec.ts',
				'sexagesima-constructions.spec.ts',
				'sexagesima-analysis.spec.ts',
				'shared-sexagesima-constructions.spec.ts',
				'shared-sexagesima-analysis.spec.ts',
				'quinquagesima-constructions.spec.ts',
				'quinquagesima-analysis.spec.ts',
				'palm-constructions.spec.ts',
				'confidence-constructions.spec.ts',
				'holy-thursday-constructions.spec.ts',
				'holy-thursday-canon.spec.ts',
				'temporal-canon.spec.ts',
				'communicantes-captions.spec.ts',
				'vigil-lauds.spec.ts',
				'paschal-dismissal.spec.ts',
				'low-sunday-contexts.spec.ts',
				'lemma-paradigms.spec.ts',
				'preface-polish-choirs.spec.ts',
				'word-fit.spec.ts',
				'second-easter-sunday.spec.ts',
				'ordo-omission-guidance.spec.ts',
				'octave-secret-constructions.spec.ts',
				'pronoun-context.spec.ts',
				'ordo-chant-guidance.spec.ts',
				'munda-ordo.spec.ts',
				'fonts.spec.ts'
			],
			grep: /@reader/,
			use: { browserName: 'firefox', baseURL: 'http://localhost:4174' }
		},
		{
			name: 'reader-webkit',
			testMatch: [
				'pager-layout.spec.ts',
				'print-associations.spec.ts',
				'interlinear-portability.spec.ts',
				'interlinear-clipping.spec.ts',
				'trinity-preface.spec.ts',
				'epiphany-constructions.spec.ts',
				'epiphany-third-constructions.spec.ts',
				'epiphany-fourth-constructions.spec.ts',
				'epiphany-fifth-constructions.spec.ts',
				'epiphany-sixth-constructions.spec.ts',
				'epiphany-sixth-analysis.spec.ts',
				'septuagesima-constructions.spec.ts',
				'septuagesima-analysis.spec.ts',
				'sexagesima-constructions.spec.ts',
				'sexagesima-analysis.spec.ts',
				'shared-sexagesima-constructions.spec.ts',
				'shared-sexagesima-analysis.spec.ts',
				'quinquagesima-constructions.spec.ts',
				'quinquagesima-analysis.spec.ts',
				'palm-constructions.spec.ts',
				'confidence-constructions.spec.ts',
				'holy-thursday-constructions.spec.ts',
				'holy-thursday-canon.spec.ts',
				'temporal-canon.spec.ts',
				'communicantes-captions.spec.ts',
				'vigil-lauds.spec.ts',
				'paschal-dismissal.spec.ts',
				'low-sunday-contexts.spec.ts',
				'lemma-paradigms.spec.ts',
				'preface-polish-choirs.spec.ts',
				'word-fit.spec.ts',
				'second-easter-sunday.spec.ts',
				'ordo-omission-guidance.spec.ts',
				'octave-secret-constructions.spec.ts',
				'pronoun-context.spec.ts',
				'ordo-chant-guidance.spec.ts',
				'munda-ordo.spec.ts',
				'fonts.spec.ts'
			],
			grep: /@reader/,
			use: { browserName: 'webkit', baseURL: 'http://localhost:4174' }
		},
		{
			// The typography sweep visits every Polish surface. Running it beside
			// the ordinary scenarios can starve a navigation even when the page
			// itself is sound, so it starts only after both editions have released
			// their workers and keeps its own batches on one worker.
			name: 'hosted-sweep',
			dependencies: ['hosted', 'offline'],
			// Sharding may distribute individual sweep batches across CI jobs,
			// while each job still walks its assigned pages on one worker.
			fullyParallel: true,
			workers: 1,
			use: { baseURL: 'http://localhost:4173' },
			grep: /@sweep/
		}
	]
});
