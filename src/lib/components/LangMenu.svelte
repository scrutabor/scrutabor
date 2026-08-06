<script lang="ts">
	import Flag from './Flag.svelte';
	import Menu from './Menu.svelte';
	import { LANGS, M, type Lang } from '$lib/i18n';

	let { lang }: { lang: Lang } = $props();

	// Same page in the other language: swap the leading path segment and
	// keep the query (an open word panel travels as ?w=). Reads location,
	// not page.url — shallow replaceState updates only the former — and is
	// safe because this only runs after a click, never at prerender.
	function pathFor(l: Lang): string {
		return `/${l}${location.pathname.replace(/^\/(pl|en)/, '')}${location.search}`;
	}
</script>

<Menu label={M[lang].langMenuAria}>
	{#snippet trigger()}
		<Flag {lang} />
	{/snippet}
	{#snippet children(close)}
		{#each LANGS as l (l)}
			<li>
				<a
					class="menu-row"
					href={pathFor(l)}
					aria-current={l === lang ? 'true' : undefined}
					lang={l}
					onclick={close}
				>
					<Flag lang={l} />
					<span>{M[l].langName}</span>
				</a>
			</li>
		{/each}
	{/snippet}
</Menu>
