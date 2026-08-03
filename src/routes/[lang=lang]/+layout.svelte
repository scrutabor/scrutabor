<script lang="ts">
	import { page } from '$app/state';
	import type { Lang } from '$lib/i18n';

	let { children } = $props();

	// Remember the reader's language and keep the live DOM lang in sync on
	// client-side navigation (the prerendered <html lang> is set by hooks).
	$effect(() => {
		const lang = page.params.lang as Lang;
		document.documentElement.lang = lang;
		localStorage.setItem('scrutabor-lang', lang);
	});
</script>

{@render children()}
