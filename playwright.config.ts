import { defineConfig } from '@playwright/test';

// Interaction tests run against the real static build (adapter-static
// output served by vite preview) — the same artifact production serves.
export default defineConfig({
	testDir: 'tests',
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	// The corpus is large and the flow pages are long; a 5 s default starts
	// biting on page loads that are genuinely doing work.
	timeout: 60_000,
	expect: { timeout: 15_000 },
	use: { baseURL: 'http://localhost:4173' }
});
