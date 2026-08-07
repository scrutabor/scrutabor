// Keep a staging deployment out of the search results.
//
// A preview build is the whole book at a second address. Indexed, it
// competes with the real site for its own words — and every page of it
// carries a canonical pointing at scrutabor.org, so a crawler is being told
// two things at once. The fix is to say plainly that this copy is not for
// reading by machines.
//
// Two belts, because they answer different questions. robots.txt is what a
// crawler asks BEFORE fetching; X-Robots-Tag is what the response itself
// says, and it is the one that governs indexing even when something has
// already fetched the page.
//
// Keyed on the branch Cloudflare sets, so production cannot be affected by
// it: CF_PAGES_BRANCH is absent locally and equal to the production branch
// on a real deploy.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'build';
const PRODUCTION_BRANCH = 'release';

/** Is this build a deployment of something other than the release branch? */
export function isPreview(branch = process.env.CF_PAGES_BRANCH) {
	return Boolean(branch) && branch !== PRODUCTION_BRANCH;
}

if (!isPreview()) {
	console.log(`mark-preview: branch ${process.env.CF_PAGES_BRANCH ?? '(none)'} — nothing to mark`);
} else {
	writeFileSync(
		join(OUT, '_headers'),
		`# This deployment is not the published edition.
/*
  X-Robots-Tag: noindex, nofollow
`
	);
	writeFileSync(
		join(OUT, 'robots.txt'),
		`# A staging copy of scrutabor.org. The published edition is the one to read.
User-agent: *
Disallow: /
`
	);
	console.log(`mark-preview: ${process.env.CF_PAGES_BRANCH} marked noindex`);
}
