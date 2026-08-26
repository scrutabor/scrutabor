<script lang="ts">
	import { browser } from '$app/environment';
	import { replaceState } from '$app/navigation';
	import { onDestroy, onMount, tick } from 'svelte';
	import PageNav from '$lib/components/PageNav.svelte';
	import SearchField from '$lib/components/SearchField.svelte';
	import SearchResults from '$lib/components/SearchResults.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { loadSearch } from '$lib/search-loader';
	import type { SearchResults as Results } from '$lib/search';
	import { readSession, removeSession, writeSession } from '$lib/storage';
	import { pageUrl, routeOf } from '$lib/url';

	let { data } = $props();
	const lang = $derived(data.lang as Lang);
	const msgs = $derived(M[lang]);

	let field = $state<HTMLInputElement>(null!);
	let query = $state('');
	let results = $state<Results | null>(null);
	let pending = $state(false);
	let failed = $state(false);
	let shortcut = $state('Ctrl K');
	let timer: ReturnType<typeof setTimeout> | undefined;
	let request = 0;
	let restoreY: number | undefined;
	let restored = false;
	const RETURN_POSITION = 'scrutabor-search-return';

	function writeQuery() {
		const url = pageUrl();
		if (query) url.searchParams.set('q', query);
		else url.searchParams.delete('q');
		replaceState(url, {});
	}

	async function restorePosition() {
		if (restored || restoreY === undefined) return;
		restored = true;
		await tick();
		requestAnimationFrame(() => {
			requestAnimationFrame(() => window.scrollTo({ top: restoreY, behavior: 'auto' }));
			removeSession(RETURN_POSITION);
		});
	}

	function queueSearch(updateAddress = true, delay = 250) {
		clearTimeout(timer);
		const turn = ++request;
		failed = false;
		if (updateAddress) writeQuery();
		if (query.trim().length < 2) {
			pending = false;
			results = null;
			return;
		}
		pending = true;
		timer = setTimeout(async () => {
			try {
				const { searchBook } = await loadSearch();
				const found = await searchBook(query, lang);
				if (turn === request) {
					results = found;
					await restorePosition();
				}
			} catch {
				if (turn === request) failed = true;
			} finally {
				if (turn === request) pending = false;
			}
		}, delay);
	}

	function clearQuery() {
		query = '';
		queueSearch();
		field.focus();
	}

	function rememberPosition(event: Event) {
		if (
			event instanceof PointerEvent &&
			(event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
		) {
			return;
		}
		writeSession(
			RETURN_POSITION,
			JSON.stringify({ route: routeOf(pageUrl()), y: window.scrollY, at: Date.now() })
		);
	}

	onMount(async () => {
		query = pageUrl().searchParams.get('q') ?? '';
		shortcut = navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl K';
		try {
			const saved = JSON.parse(readSession(RETURN_POSITION) ?? 'null') as {
				route?: string;
				y?: number;
				at?: number;
			} | null;
			if (
				saved?.route === routeOf(pageUrl()) &&
				typeof saved.y === 'number' &&
				typeof saved.at === 'number' &&
				Date.now() - saved.at < 60 * 60 * 1000
			) {
				restoreY = saved.y;
			}
		} catch {
			removeSession(RETURN_POSITION);
		}
		queueSearch(false, 0);
		if (restoreY === undefined) {
			await tick();
			field.focus({ preventScroll: true });
		}
	});

	onDestroy(() => clearTimeout(timer));
</script>

<svelte:head>
	<title>{msgs.searchTitle} — Scrutabor</title>
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<div class="page search-page">
	<PageNav {lang} />
	<main>
		<header class="search-head">
			<h1 class="minor">{msgs.searchTitle}</h1>
			<SearchField
				id="book-search-page"
				label={msgs.searchTitle}
				clearLabel={msgs.searchClear}
				describedby="search-hint search-status"
				bind:value={query}
				bind:field
				oninput={() => queueSearch()}
				onclear={clearQuery}
			/>
			<div class="search-notes">
				<p id="search-hint">{msgs.searchHint}</p>
				{#if browser}<p class="shortcut">{msgs.searchShortcutHint(shortcut)}</p>{/if}
			</div>
		</header>

		<SearchResults {lang} {results} {pending} {failed} onResult={rememberPosition} />
	</main>
</div>

<style>
	.search-page {
		max-width: min(68rem, 92vw);
	}

	main {
		width: 100%;
	}

	.search-head {
		position: sticky;
		z-index: 5;
		top: 0;
		padding-block: 0.2rem 0.85rem;
		background: color-mix(in srgb, var(--bg) 96%, transparent);
		backdrop-filter: blur(9px);
	}

	h1 {
		margin-block: 1.45rem 1rem;
	}

	.search-notes {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.2rem 1rem;
		margin-top: 0.55rem;
		color: var(--ink-soft);
		font-size: 0.84rem;
		line-height: 1.35;
	}

	.search-notes p {
		margin: 0;
	}

	.shortcut {
		margin-inline-start: auto;
	}

	@media (max-width: 34rem) {
		.search-page {
			max-width: none;
		}

		.search-head {
			padding-top: 0.1rem;
		}

		h1 {
			margin-block: 1.15rem 0.8rem;
		}

		.shortcut {
			display: none;
		}
	}

	@media print {
		.search-head {
			position: static;
		}
	}
</style>
