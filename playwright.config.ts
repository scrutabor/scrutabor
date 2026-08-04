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
	use: { baseURL: 'http://localhost:4173' }
});
