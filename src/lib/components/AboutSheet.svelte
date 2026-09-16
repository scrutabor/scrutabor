<script lang="ts">
	import Sheet from '$lib/components/Sheet.svelte';
	import SourceNotes from '$lib/components/SourceNotes.svelte';
	import type { Citation } from '$lib/corpus';
	import { M, type Lang } from '$lib/i18n';

	let {
		lang,
		about,
		citations,
		onclose
	}: { lang: Lang; about?: string; citations: Citation[]; onclose: () => void } = $props();
</script>

<Sheet {lang} label={M[lang].aboutLabel} title={M[lang].aboutLabel} extra="about-sheet" {onclose}>
	{#if about}<p class="about-text">{about}</p>{/if}
	<SourceNotes {citations} {lang} />
</Sheet>

<style>
	.about-text {
		margin: 0.6rem 0 0;
		font-size: 1rem;
		line-height: 1.65;
		color: var(--ink);
	}
</style>
