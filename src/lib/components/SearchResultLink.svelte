<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		href,
		compact = false,
		saveBeforeNavigation = false,
		onResult,
		children
	}: {
		href: string;
		compact?: boolean;
		saveBeforeNavigation?: boolean;
		onResult?: (event: Event) => void;
		children: Snippet;
	} = $props();

	function prepare(event: MouseEvent | PointerEvent) {
		// Pointer activation is saved before the offline router's click capture.
		// A keyboard or assistive-technology click has detail 0 and saves here.
		if (event.type === 'pointerdown' && !saveBeforeNavigation) return;
		if (event.type === 'click' && saveBeforeNavigation && event.detail !== 0) return;
		onResult?.(event);
	}
</script>

<a
	class="search-result"
	class:compact
	{href}
	onpointerdown={saveBeforeNavigation ? prepare : undefined}
	onclick={prepare}
>
	{@render children()}
</a>
