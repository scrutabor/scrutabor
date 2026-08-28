/** Whether every promised path already has an answer in one cache. */
export async function cacheContainsAll(
	cache: Pick<Cache, 'match'>,
	paths: Iterable<string>
): Promise<boolean> {
	for (const path of new Set(paths)) {
		if (!(await cache.match(path, { ignoreSearch: true }))) return false;
	}
	return true;
}
