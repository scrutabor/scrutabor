<script lang="ts">
	import { tick } from 'svelte';
	import { M, type Lang } from '$lib/i18n';
	import { loadSearch } from '$lib/search-loader';
	import type { SearchResults } from '$lib/search';

	let { lang }: { lang: Lang } = $props();
	const msgs = $derived(M[lang]);

	let dialog: HTMLDialogElement;
	let field: HTMLInputElement;
	let query = $state('');
	let results = $state<SearchResults | null>(null);
	let pending = $state(false);
	let failed = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let request = 0;

	const count = $derived(
		(results?.titles.length ?? 0) + (results?.contents.length ?? 0) + (results?.grammar.length ?? 0)
	);

	async function open() {
		dialog.showModal();
		await tick();
		field.focus();
	}

	function close() {
		dialog.close();
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
				const { searchBook } = await loadSearch();
				const found = await searchBook(query, lang);
				if (turn === request) results = found;
			} catch {
				if (turn === request) failed = true;
			} finally {
				if (turn === request) pending = false;
			}
		}, 250);
	}
</script>

<button
	type="button"
	class="search-trigger"
	aria-label={msgs.searchLabel}
	title={msgs.searchLabel}
	aria-haspopup="dialog"
	onclick={open}
>
	<svg viewBox="0 0 24 24" aria-hidden="true">
		<circle cx="10.8" cy="10.8" r="6.4" />
		<path d="m15.6 15.6 4.2 4.2" />
	</svg>
</button>

<dialog bind:this={dialog} aria-labelledby="search-title" onclose={() => clearTimeout(timer)}>
	<div class="search-shell">
		<header>
			<h2 id="search-title">{msgs.searchTitle}</h2>
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

		<form role="search" onsubmit={(event) => event.preventDefault()}>
			<label class="sr-only" for="book-search">{msgs.searchTitle}</label>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<circle cx="10.8" cy="10.8" r="6.4" />
				<path d="m15.6 15.6 4.2 4.2" />
			</svg>
			<input
				bind:this={field}
				bind:value={query}
				id="book-search"
				type="search"
				autocomplete="off"
				aria-describedby="search-hint search-status"
				oninput={queueSearch}
			/>
			{#if query}
				<button type="button" class="clear" aria-label={msgs.searchClear} onclick={clearQuery}>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path d="M7 7l10 10M17 7 7 17" />
					</svg>
				</button>
			{/if}
		</form>
		<p id="search-hint" class="hint">{msgs.searchHint}</p>
		<p id="search-status" class="sr-only" role="status" aria-live="polite">
			{pending ? msgs.searchLoading : results ? msgs.searchCount(count) : ''}
		</p>

		<div class="results" aria-busy={pending}>
			{#if failed}
				<p class="empty">{msgs.searchFailed}</p>
			{:else if pending && !results}
				<p class="empty">{msgs.searchLoading}</p>
			{:else if results && count === 0}
				<p class="empty">{msgs.searchNoResults}</p>
			{:else if results}
				{#if results.titles.length}
					<section aria-labelledby="search-titles">
						<h3 id="search-titles" class="smallcaps">{msgs.searchTitles}</h3>
						<ul>
							{#each results.titles as result (result.textKey)}
								<li>
									<a href={result.href} onclick={close}>
										<span class="badge">{msgs.searchResultTitle}</span>
										<strong>{result.title}</strong>
										{#if result.latinTitle !== result.title}<span class="latin" lang="la"
												>{result.latinTitle}</span
											>{/if}
										{#if result.matchedAlias}<span class="alias"
												>{msgs.searchMatchedAlias}: {result.matchedAlias}</span
											>{/if}
										<span class="context smallcaps">{result.context}</span>
									</a>
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#if results.contents.length}
					<section aria-labelledby="search-contents">
						<h3 id="search-contents" class="smallcaps">{msgs.searchContents}</h3>
						<ul>
							{#each results.contents as result (`${result.source}:${result.textKey}:${result.segmentId}`)}
								<li>
									<a href={result.href} onclick={close}>
										<span class="badge"
											>{result.source === 'la'
												? msgs.searchResultLatin
												: msgs.searchResultTranslation}</span
										>
										<strong>{result.title}</strong>
										<span class="snippet" lang={result.source === 'la' ? 'la' : lang}
											>{#each result.parts as part, index (`${index}:${part.hit}`)}{#if part.hit}<mark
														>{part.text}</mark
													>{:else}{part.text}{/if}{/each}</span
										>
										<span class="context smallcaps">{result.context}</span>
									</a>
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#if results.grammar.length}
					<section aria-labelledby="search-grammar">
						<h3 id="search-grammar" class="smallcaps">{msgs.searchGrammar}</h3>
						<ul>
							{#each results.grammar as result (result.lemma)}
								<li>
									<a href={result.href} onclick={close}>
										<span class="badge">{msgs.searchResultGrammar}</span>
										<strong lang="la">{result.head}</strong>
										{#if result.senses.length}<span class="snippet"
												>{result.senses.join(' · ')}</span
											>{/if}
									</a>
								</li>
							{/each}
						</ul>
					</section>
				{/if}
			{/if}
		</div>
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
		font: inherit;
		cursor: pointer;
	}

	.search-trigger:hover {
		background: var(--wash);
		color: var(--ink);
	}

	.search-trigger svg,
	form > svg {
		width: 1.05rem;
		height: 1.05rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
	}

	dialog {
		width: min(42rem, calc(100vw - 2rem));
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

	.search-shell {
		display: flex;
		max-height: calc(100dvh - 2rem);
		flex-direction: column;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.35rem 1.35rem 0.9rem 1.5rem;
	}

	h2 {
		margin: 0;
		color: var(--ink);
		font-size: 1.35rem;
		font-weight: 500;
		line-height: 1.15;
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

	form {
		position: relative;
		margin: 0 1.35rem;
	}

	form > svg {
		position: absolute;
		top: 50%;
		left: 1rem;
		transform: translateY(-50%);
		color: var(--ink-soft);
		pointer-events: none;
		transition: color 120ms ease;
	}

	form:focus-within > svg {
		color: var(--ink);
	}

	input {
		width: 100%;
		height: 3.15rem;
		padding: 0.55rem 2.85rem 0.55rem 2.85rem;
		border: 1px solid var(--border);
		border-radius: 0.7rem;
		background: var(--bg);
		color: var(--ink);
		font: inherit;
		font-size: 1.08rem;
		line-height: 1;
		transition:
			border-color 120ms ease,
			box-shadow 120ms ease;
	}

	input:focus-visible {
		outline: none;
		border-color: var(--ink-soft);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--ink-soft) 14%, transparent);
	}

	input::-webkit-search-cancel-button {
		appearance: none;
	}

	.clear {
		position: absolute;
		top: 50%;
		right: 0.55rem;
		display: grid;
		width: 2rem;
		height: 2rem;
		transform: translateY(-50%);
		place-items: center;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: var(--ink-soft);
		cursor: pointer;
	}

	.clear:hover {
		background: var(--wash);
		color: var(--ink);
	}

	.clear svg {
		width: 0.8rem;
		height: 0.8rem;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-width: 1.8;
	}

	.hint {
		margin: 0.55rem 1.5rem 0.9rem;
		color: var(--ink-soft);
		font-size: 0.86rem;
		line-height: 1.3;
	}

	.results {
		min-height: 5rem;
		overflow-y: auto;
		padding: 0 1.35rem 1.35rem;
		overscroll-behavior: contain;
	}

	section + section {
		margin-top: 1.15rem;
	}

	h3 {
		margin: 0 0 0.4rem;
		color: var(--ink-soft);
		font-size: 0.78rem;
		font-weight: 500;
		letter-spacing: 0.06em;
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
		border: 1px solid var(--border);
		border-radius: 0.7rem;
		background: color-mix(in srgb, var(--bg) 45%, transparent);
		overflow: hidden;
	}

	li + li {
		border-top: 1px solid var(--border);
	}

	li a {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.2rem 0.65rem;
		padding: 0.75rem 0.85rem;
		color: inherit;
		text-decoration: none;
	}

	li a:hover {
		background: var(--wash);
	}

	.badge {
		grid-row: 1 / span 3;
		align-self: start;
		min-width: 5.6rem;
		padding: 0.16rem 0.35rem;
		border: 1px solid var(--border);
		border-radius: 0.25rem;
		color: var(--rubric);
		font-size: 0.72rem;
		line-height: 1.2;
		text-align: center;
	}

	strong {
		font-weight: 600;
		line-height: 1.2;
	}

	.latin,
	.alias,
	.snippet,
	.context {
		grid-column: 2;
	}

	.latin,
	.alias,
	.context {
		color: var(--ink-soft);
		font-size: 0.84rem;
	}

	.snippet {
		line-height: 1.35;
	}

	.context {
		font-size: 0.72rem;
		letter-spacing: 0.05em;
	}

	mark {
		background: var(--wash-strong);
		color: inherit;
		border-radius: 0.1rem;
	}

	.empty {
		margin: 1.4rem 0;
		text-align: center;
		color: var(--ink-soft);
	}

	@media (max-width: 28rem) {
		dialog {
			width: calc(100vw - 1rem);
			max-height: calc(100dvh - 1rem);
		}

		.search-shell {
			max-height: calc(100dvh - 1rem);
		}

		header {
			padding: 1rem 1rem 0.75rem 1.1rem;
		}

		h2 {
			font-size: 1.2rem;
		}

		form {
			margin-inline: 0.75rem;
		}

		.hint {
			margin-inline: 1rem;
		}

		.results {
			padding-inline: 0.75rem;
		}

		li a {
			grid-template-columns: 1fr;
		}

		.badge {
			grid-row: auto;
			width: fit-content;
			min-width: 0;
		}

		.latin,
		.alias,
		.snippet,
		.context {
			grid-column: 1;
		}
	}

	@media print {
		.search-trigger,
		dialog {
			display: none;
		}
	}
</style>
