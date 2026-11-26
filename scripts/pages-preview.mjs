/** Is this build a deployment of something other than the release branch? */
export function isPreview(branch) {
	return Boolean(branch) && branch !== 'release';
}
