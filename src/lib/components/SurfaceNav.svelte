<script lang="ts">
	// The header row of a centred page: language, reading size, theme.
	// One component because it is one object — the catalog wears it for
	// the book (base defaults to /app) and the landing pages wear it at
	// the origin root (base ""). The row's layout rule lives in app.css.
	import LangMenu from './LangMenu.svelte';
	import TextSize from './TextSize.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import type { Lang } from '$lib/i18n';

	let { lang, base = '/app' }: { lang: Lang; base?: string } = $props();
</script>

<nav>
	<LangMenu {lang} {base} />
	<TextSize {lang} />
	<ThemeToggle {lang} />
</nav>
