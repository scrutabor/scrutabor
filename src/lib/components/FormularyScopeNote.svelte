<script lang="ts">
	import { M, type Lang } from '$lib/i18n';

	let { lang, centered = false }: { lang: Lang; centered?: boolean } = $props();
</script>

<p class="formulary-scope" class:centered>{M[lang].formularyScope}</p>

<style>
	.formulary-scope {
		max-width: 52ch;
		margin: 1rem 0 0;
		color: var(--ink-soft);
		font-size: 0.85rem;
		line-height: 1.45;
		text-align: start;
	}
	.centered {
		margin-inline: auto;
	}
</style>
