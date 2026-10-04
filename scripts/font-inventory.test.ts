import { describe, expect, it } from 'vitest';
import { checkedText, fontInventory, type TextRequest } from './font-inventory';

function fixture() {
	const pages = Array.from({ length: 151 }, (_, i) => `/en/page-${i}`);
	const responses = new Map<string, { status: number; type: string; body: string }>();
	responses.set('/sitemap.xml', {
		status: 200,
		type: 'application/xml',
		body: `<urlset>${pages.map((p) => `<url><loc>https://scrutabor.org${p}</loc></url>`).join('')}</urlset>`
	});
	for (const path of [...pages, '/404', '/pl/404', '/en/404'])
		responses.set(path, {
			status: path === '/pl/404' || path === '/en/404' ? 404 : 200,
			type: 'text/html; charset=utf-8',
			body: '<html><link href="/_app/a.css"></html>'
		});
	responses.set('/_app/a.css', {
		status: 200,
		type: 'text/css',
		body: '/* "./b.js" is not an original inventory reference */'
	});
	const requested: string[] = [],
		read: string[] = [];
	const request: TextRequest = {
		get: async (path) => {
			requested.push(path);
			const value = responses.get(path);
			if (!value) throw new Error(`Unexpected request ${path}`);
			return {
				status: () => value.status,
				headers: () => ({ 'content-type': value.type }),
				text: async () => {
					read.push(path);
					return value.body;
				}
			};
		}
	};
	return { pages, responses, requested, read, request };
}

describe('the finite font inventory', () => {
	it('keeps all sitemap text, explicit error documents and referenced asset characters', async () => {
		const f = fixture();
		f.responses.get('/en/page-150')!.body += 'Ż';
		f.responses.get('/_app/a.css')!.body = '"/_app/b.js" /* œ */';
		f.responses.set('/_app/b.js', {
			status: 200,
			type: 'application/javascript; charset=utf-8',
			body: '"/_app/a.css"; "ǽ";'
		});
		const declared = new Set(Array.from({ length: 128 }, (_, i) => String.fromCharCode(i)));
		const result = await fontInventory(f.request, declared);
		expect(result.documents).toHaveLength(154);
		expect(result.documents).toContainEqual(['/404', 200]);
		expect(result.documents).toContainEqual(['/pl/404', 404]);
		expect(result.documents).toContainEqual(['/en/404', 404]);
		expect(result.assets).toEqual(['/_app/a.css', '/_app/b.js']);
		expect(result.needed).toEqual([
			['Ż', '/en/page-150'],
			['œ', '/_app/a.css'],
			['ǽ', '/_app/b.js']
		]);
		expect(f.requested.filter((p) => p === '/_app/a.css')).toHaveLength(1);
		expect(f.requested.filter((p) => p === '/_app/b.js')).toHaveLength(1);
	});

	it.each([
		[404, 'text/html', 'expected HTTP 200'],
		[200, 'text/html', 'expected css'],
		[200, 'text/css', 'received HTML instead of css']
	] as const)(
		'rejects a bad asset before following its error-document links (%s/%s)',
		async (status, type, message) => {
			const f = fixture();
			f.responses.set('/_app/a.css', {
				status,
				type,
				body: '<!doctype html><link href="./_app/deeper.css">Ж'
			});
			await expect(fontInventory(f.request, new Set())).rejects.toThrow(message);
			expect(f.requested.filter((p) => p.includes('_app/'))).toEqual(['/_app/a.css']);
			if (type === 'text/html') expect(f.read).not.toContain('/_app/a.css');
		}
	);

	it.each(['/en/page-0', '/pl/404', '/en/404'])(
		'rejects an unexpected document status for %s',
		async (path) => {
			const f = fixture();
			f.responses.get(path)!.status = path.startsWith('/en/page') ? 404 : 200;
			await expect(fontInventory(f.request, new Set())).rejects.toThrow(`${path}: expected HTTP`);
			expect(f.read).not.toContain(path);
		}
	);

	it('rejects a successful HTML sitemap instead of treating it as an empty inventory', async () => {
		const f = fixture();
		f.responses.get('/sitemap.xml')!.type = 'text/html';
		await expect(fontInventory(f.request, new Set())).rejects.toThrow('expected xml');
		expect(f.requested).toEqual(['/sitemap.xml']);
		expect(f.read).toEqual([]);
	});

	it('bounds even a chain of correctly typed unique assets', async () => {
		const f = fixture();
		f.responses.get('/_app/a.css')!.body = '"/_app/b.js"';
		f.responses.set('/_app/b.js', { status: 200, type: 'text/javascript', body: '"/_app/c.js"' });
		await expect(fontInventory(f.request, new Set(), 2)).rejects.toThrow(
			'exceeded 2 unique resources'
		);
		expect(f.requested.filter((p) => p.includes('_app/'))).toEqual(['/_app/a.css', '/_app/b.js']);
	});

	it('does not send inventory requests to a different origin', async () => {
		const f = fixture();
		f.responses.get('/en/page-0')!.body = '"https://elsewhere.invalid/_app/a.js"';
		await expect(fontInventory(f.request, new Set())).rejects.toThrow(
			'external font-inventory asset'
		);
		expect(f.requested.every((p) => p.startsWith('/'))).toBe(true);
	});

	it('rejects script MIME and HTML bodies with the same checks as stylesheets', async () => {
		const f = fixture();
		f.responses.set('/_app/a.js', { status: 200, type: 'text/html', body: '<html>"/_app/b.js"' });
		await expect(checkedText(f.request, '/_app/a.js', 200, 'js')).rejects.toThrow('expected js');
		f.responses.get('/_app/a.js')!.type = 'text/javascript';
		await expect(checkedText(f.request, '/_app/a.js', 200, 'js')).rejects.toThrow(
			'received HTML instead of js'
		);
	});
});
