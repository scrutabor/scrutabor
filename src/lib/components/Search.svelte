<script lang="ts">
	import { M, type Lang } from '$lib/i18n';

	let { lang }: { lang: Lang } = $props();
	const msgs = $derived(M[lang]);
	const searchHref = $derived(`/app/${lang}/search`);

	function focusPageSearch(event: MouseEvent) {
		// A modifier or a non-primary button asks the browser for its own
		// behavior — a new tab, a new window. Only a plain click is ours.
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return;
		}
		const pageField = document.getElementById('book-search-page') as HTMLInputElement | null;
		if (!pageField) return;
		event.preventDefault();
		pageField.focus({ preventScroll: true });
	}
</script>

<a
	class="search-trigger"
	href={searchHref}
	aria-label={msgs.searchLabel}
	title={msgs.searchLabel}
	onclick={focusPageSearch}
>
	<svg viewBox="0 0 24 24" aria-hidden="true">
		<circle cx="10.8" cy="10.8" r="6.4" />
		<path d="m15.6 15.6 4.2 4.2" />
	</svg>
</a>

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

	@media print {
		.search-trigger {
			display: none;
		}
	}
</style>
