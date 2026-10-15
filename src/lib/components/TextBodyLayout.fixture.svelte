<!-- Test fixture: renders TextBody through a part layout shaped like the Ordo
     page's, so unit tests reach the separate opening and continuation flows. -->
<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import TextBody from './TextBody.svelte';
	let props: Omit<ComponentProps<typeof TextBody>, 'layout'> = $props();
</script>

{#snippet layout(opening: Snippet, continuation: Snippet, hasContinuation: boolean)}
	<div class="opening">{@render opening()}</div>
	{#if hasContinuation}
		<div class="continuation">{@render continuation()}</div>
	{/if}
{/snippet}

<TextBody {...props} {layout} />
