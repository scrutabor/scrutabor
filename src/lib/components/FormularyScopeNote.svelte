<script lang="ts">
	import { M, type Lang } from '$lib/i18n';

	let { lang, centered = false }: { lang: Lang; centered?: boolean } = $props();
</script>

<p class="formulary-scope" class:centered>{M[lang].formularyScope}</p>

<style>
	.formulary-scope {
		margin: 1rem 0 0;
		color: var(--ink-soft);
		font-size: 0.85rem;
		line-height: 1.45;
		text-align: start;
	}
	.centered {
		max-inline-size: 42rem;
		margin-inline: auto;
	}
</style>
