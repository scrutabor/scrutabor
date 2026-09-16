// The hosted reader deliberately uses full-document navigation. SvelteKit's
// client-router sidecars are therefore duplicate route payloads: the same
// server data is already embedded in each prerendered HTML document.
//
// Remove only the framework's exact sidecar basename, only below the emitted
// build directory. The app's own JSON artifacts have descriptive names and
// are untouched.
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const BUILD = 'build';
let removed = 0;

function prune(directory) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) prune(path);
		else if (entry.name === '__data.json') {
			rmSync(path);
			removed += 1;
		}
	}
}

prune(BUILD);
console.log(`removed ${removed} redundant route data files`);
