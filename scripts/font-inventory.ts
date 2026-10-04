export interface TextResponse {
	status(): number;
	headers(): Record<string, string>;
	text(): Promise<string>;
}

export interface TextRequest {
	get(path: string): Promise<TextResponse>;
}

export type TextKind = 'html' | 'xml' | 'js' | 'css';
const TYPES: Record<TextKind, readonly string[]> = {
	html: ['text/html'],
	xml: ['application/xml', 'text/xml'],
	js: ['text/javascript', 'application/javascript'],
	css: ['text/css']
};

/** Never interpret an error document as a stylesheet or another script. */
export async function checkedText(
	request: TextRequest,
	path: string,
	status: number,
	kind: TextKind
): Promise<string> {
	const response = await request.get(path);
	if (response.status() !== status) {
		throw new Error(`${path}: expected HTTP ${status}, received ${response.status()}`);
	}
	const type = response.headers()['content-type']?.split(';')[0].trim().toLowerCase() ?? '';
	if (!TYPES[kind].includes(type)) {
		throw new Error(`${path}: expected ${kind}, received Content-Type ${type || '(missing)'}`);
	}
	const body = await response.text();
	if ((kind === 'js' || kind === 'css') && /^\s*(?:<!doctype\s+html\b|<html\b)/i.test(body)) {
		throw new Error(`${path}: received HTML instead of ${kind}`);
	}
	return body;
}

/** The site's complete textual font inventory, independent of a browser. */
export async function fontInventory(
	request: TextRequest,
	declared: ReadonlySet<string>,
	maxAssets = 20_000
) {
	const sitemap = await checkedText(request, '/sitemap.xml', 200, 'xml');
	const documents = new Map<string, number>();
	for (const match of sitemap.matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)) {
		documents.set(match[1] || '/', 200);
	}
	if (documents.size <= 150) throw new Error('The font inventory needs the complete sitemap');
	// The literal error route is real; the language-prefixed URLs exercise
	// the same bilingual fallback at positions omitted from the sitemap.
	documents.set('/404', 200);
	documents.set('/pl/404', 404);
	documents.set('/en/404', 404);
	const needed = new Map<string, string>();
	const assets = new Set<string>();
	const pending: string[] = [];
	const inspect = (body: string, path: string) => {
		for (const c of body) if (c.codePointAt(0)! > 0x1f && !declared.has(c)) needed.set(c, path);
		// Preserve the inventory's script/style coverage, resolving a
		// reference against the resource that actually contains it.
		for (const match of body.matchAll(/["'(]([^"')]*_app\/[^"')]+\.(?:js|css))["')]/g)) {
			const url = new URL(match[1], `http://localhost${path}`);
			if (url.origin !== 'http://localhost')
				throw new Error(`${path}: external font-inventory asset ${url.href}`);
			if (!assets.has(url.pathname)) {
				if (assets.size >= maxAssets)
					throw new Error(`Font asset inventory exceeded ${maxAssets} unique resources`);
				assets.add(url.pathname);
				pending.push(url.pathname);
			}
		}
	};
	const pages = [...documents];
	for (let i = 0; i < pages.length; i += 12) {
		await Promise.all(
			pages.slice(i, i + 12).map(async ([path, status]) => {
				inspect(await checkedText(request, path, status, 'html'), path);
			})
		);
	}
	for (let i = 0; i < pending.length; i++) {
		const path = pending[i];
		inspect(await checkedText(request, path, 200, path.endsWith('.css') ? 'css' : 'js'), path);
	}
	return { documents: pages, assets: [...assets], needed: [...needed] };
}
