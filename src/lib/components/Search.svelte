<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import SearchField from '$lib/components/SearchField.svelte';
	import SearchOutcome from '$lib/components/SearchOutcome.svelte';
	import SearchTitleResults from '$lib/components/SearchTitleResults.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { loadSearch } from '$lib/search-loader';
	import type { TitleSearchResult } from '$lib/search';

	let { lang }: { lang: Lang } = $props();
	const msgs = $derived(M[lang]);

	let dialog: HTMLDialogElement;
	let field = $state<HTMLInputElement>(null!);
	let query = $state('');
	const searchHref = $derived(`/app/${lang}/search`);
	const allResultsHref = $derived(`${searchHref}?q=${encodeURIComponent(query.trim())}`);
	let results = $state<TitleSearchResult[] | null>(null);
	let pending = $state(false);
	let failed = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let request = 0;
	let returnFocus: HTMLElement | null = null;

	async function open() {
		const pageField = document.getElementById('book-search-page') as HTMLInputElement | null;
		if (pageField) {
			pageField.focus({ preventScroll: true });
			return;
		}
		if (!dialog.open) {
			returnFocus = document.activeElement as HTMLElement | null;
			dialog.showModal();
		}
		await tick();
		field.focus();
	}

	function close() {
		if (dialog.open) dialog.close();
	}

	function closed() {
		clearTimeout(timer);
		request += 1;
		pending = false;
		returnFocus?.focus();
		returnFocus = null;
	}

	function clickBackdrop(event: MouseEvent) {
		if (event.target !== dialog) return;
		const box = dialog.getBoundingClientRect();
		if (
			event.clientX < box.left ||
			event.clientX > box.right ||
			event.clientY < box.top ||
			event.clientY > box.bottom
		) {
			close();
		}
	}

	function shortcut(event: KeyboardEvent) {
		if (
			event.key.toLocaleLowerCase() !== 'k' ||
			(!event.metaKey && !event.ctrlKey) ||
			event.altKey
		) {
			return;
		}
		event.preventDefault();
		void open();
	}

	function clearQuery() {
		clearTimeout(timer);
		request += 1;
		query = '';
		results = null;
		pending = false;
		failed = false;
		field.focus();
	}

	function queueSearch() {
		clearTimeout(timer);
		const turn = ++request;
		failed = false;
		if (query.trim().length < 2) {
			pending = false;
			results = null;
			return;
		}
		pending = true;
		timer = setTimeout(async () => {
			try {
				const { searchTitles } = await loadSearch();
				const found = searchTitles(query, lang).slice(0, 6);
				if (turn === request) results = found;
			} catch {
				if (turn === request) failed = true;
			} finally {
				if (turn === request) pending = false;
			}
		}, 250);
	}

	onDestroy(() => clearTimeout(timer));
</script>

<svelte:window onkeydown={shortcut} />

<a class="search-trigger" href={searchHref} aria-label={msgs.searchLabel} title={msgs.searchLabel}>
	<svg viewBox="0 0 24 24" aria-hidden="true">
		<circle cx="10.8" cy="10.8" r="6.4" />
		<path d="m15.6 15.6 4.2 4.2" />
	</svg>
</a>

<dialog
	bind:this={dialog}
	aria-labelledby="quick-search-title"
	aria-describedby="quick-search-hint quick-search-status"
	onclick={clickBackdrop}
	onclose={closed}
>
	<div class="quick-shell">
		<header>
			<h2 id="quick-search-title">{msgs.searchQuickTitle}</h2>
			<button
				type="button"
				class="close"
				aria-label={msgs.close}
				title={msgs.close}
				onclick={close}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M6 6l12 12M18 6 6 18" />
				</svg>
			</button>
		</header>

		<SearchField
			id="quick-book-search"
			label={msgs.searchQuickTitle}
			clearLabel={msgs.searchClear}
			variant="dialog"
			bind:value={query}
			bind:field
			oninput={queueSearch}
			onclear={clearQuery}
		/>
		<p id="quick-search-hint" class="hint">{msgs.searchQuickHint}</p>
		<SearchOutcome
			{lang}
			statusId="quick-search-status"
			{pending}
			{failed}
			ready={results !== null}
			empty={results?.length === 0}
			count={results?.length ?? 0}
			variant="dialog"
		>
			{#if results}<SearchTitleResults {lang} {results} compact onResult={close} />{/if}
		</SearchOutcome>

		{#if query.trim().length >= 2}
			<a class="all-results" href={allResultsHref} onclick={close}>{msgs.searchAllResults} →</a>
		{/if}
	</div>
</dialog>

<style>
	.search-trigger {
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: none;
		color: var(--ink-soft);
		text-decoration: none;
		cursor: pointer;
	}

	.search-trigger:hover {
		background: var(--wash);
		color: var(--ink);
	}

	.search-trigger svg {
		width: 1.05rem;
		height: 1.05rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
	}

	dialog {
		width: min(36rem, calc(100vw - 2rem));
		max-width: none;
		max-height: calc(100dvh - 2rem);
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 1rem;
		background: var(--surface);
		color: var(--ink);
		box-shadow: 0 24px 80px rgb(20 16 10 / 28%);
	}

	dialog::backdrop {
		background: rgb(20 16 10 / 52%);
		backdrop-filter: blur(3px);
	}

	.quick-shell {
		display: flex;
		max-height: calc(100dvh - 2rem);
		flex-direction: column;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.25rem 1.25rem 0.85rem 1.4rem;
	}

	h2 {
		margin: 0;
		color: var(--ink);
		font-size: 1.25rem;
		font-weight: 500;
		line-height: 1.15;
		text-align: start;
	}

	.close {
		display: grid;
		width: 2rem;
		height: 2rem;
		flex: none;
		place-items: center;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: none;
		color: var(--ink-soft);
		cursor: pointer;
	}

	.close svg {
		display: block;
		width: 0.95rem;
		height: 0.95rem;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-width: 1.8;
	}

	.close:hover {
		background: var(--wash);
		color: var(--ink);
	}

	.hint {
		margin: 0.5rem 1.4rem 0.8rem;
		color: var(--ink-soft);
		font-size: 0.84rem;
		line-height: 1.3;
	}

	.all-results {
		align-self: flex-end;
		margin: 0.8rem 1.4rem 1.2rem;
		color: var(--rubric);
		font-size: 0.86rem;
		text-decoration: none;
	}

	.all-results:hover {
		text-decoration: underline;
	}

	@media (max-width: 28rem) {
		dialog {
			width: calc(100vw - 1rem);
			max-height: calc(100dvh - 1rem);
		}

		.quick-shell {
			max-height: calc(100dvh - 1rem);
		}

		header {
			padding: 1rem 1rem 0.75rem 1.1rem;
		}

		.hint {
			margin-inline: 1rem;
		}
	}

	@media print {
		.search-trigger,
		dialog {
			display: none;
		}
	}
</style>
