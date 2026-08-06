<script lang="ts">
	// The top line of every page of the book: the way back on the left, the
	// settings on the right. Eight routes carried a byte-identical copy
	// of this markup AND of its five CSS rules, which is eight chances for
	// one page's chrome to drift away from the rest — the reader sees all
	// eight, so a difference reads as a fault. It lives here instead.
	import LangMenu from '$lib/components/LangMenu.svelte';
	import TextSize from '$lib/components/TextSize.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import type { Lang } from '$lib/i18n';

	// Most pages go back to the reader's home; the grammar pages go back to
	// their own index, which is the only thing that varies.
	let { lang, href, label }: { lang: Lang; href?: string; label?: string } = $props();
	const to = $derived(href ?? `/${lang}`);
</script>

<nav>
	<a href={to} class="back smallcaps">{label ?? 'scrutabor'}</a>
	<div class="nav-right">
		<LangMenu {lang} />
		<TextSize {lang} />
		<ThemeToggle {lang} />
	</div>
</nav>

<style>
	nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.back {
		text-decoration: none;
		color: var(--ink-soft);
		font-size: 0.85rem;
	}

	.back:hover {
		color: var(--ink);
	}
</style>
