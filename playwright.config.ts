import { defineConfig } from '@playwright/test';

// Interaction tests run against the real static build (adapter-static
// output served by vite preview) — the same artifact production serves.
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
	webServer: {
		// Both artifacts, from one command, so they can never disagree about
		// which corpus or which runtime they were built from. (The offline
		// zip is not among them: it travels with each GitHub release, and
		// the landing links the latest release's asset directly.)
		command: 'npm run build:offline && npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
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
			grepInvert: /@folder/
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
			grepInvert: /@online/
		}
	]
});
