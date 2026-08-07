<script lang="ts">
	import Flag from './Flag.svelte';
	import Menu from './Menu.svelte';
	import { LANGS, M, type Lang } from '$lib/i18n';
	import { where } from '$lib/where.svelte';

	// `base` is what stands before the language segment: the book lives
	// under /app, the landing pages at the origin root — the menu serves
	// both surfaces and only the prefix differs.
	let { lang, base = '/app' }: { lang: Lang; base?: string } = $props();

	// The same page in the other language. The path within a language comes
	// from the layout (see $lib/where) rather than from location.pathname,
	// which is a FILE path in a downloaded copy and has no language prefix
	// to cut. The query still comes from location: an open word panel
	// travels as ?w=, and shallow routing updates only the real URL.
	function pathFor(l: Lang): string {
		return `${base}/${l}${where.path}${location.search}`;
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
