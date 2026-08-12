// The site's visit counter, as it sits in every prerendered page.
//
// Its own file because two things need it and they need it to agree: the
// offline package cuts this block out (scripts/build-offline.mjs), and a
// test proves that the cut takes this block and nothing else. The package's
// own canary cannot prove that on its own — a pattern that deleted too much
// would still leave zero matches behind and pass.

/** Matches the beacon block in a built page.
 *
 * Tempered against the closing tag: `(?:(?!<\/script>)[\s\S])*?` cannot
 * cross out of the script it started in. Without that, the engine would
 * begin at the FIRST script in the document — the pre-paint theme block —
 * and lazily run past its end looking for the beacon, taking the theme with
 * it when it found one. */
export const BEACON_BLOCK =
	/[\t ]*<script>(?:(?!<\/script>)[\s\S])*?cloudflareinsights(?:(?!<\/script>)[\s\S])*<\/script>\n?/g;

/** The host the beacon is fetched from, and so the string the package must
 * not contain anywhere — in a page, in a bundle, in the README. */
export const BEACON_HOST = 'cloudflareinsights';
