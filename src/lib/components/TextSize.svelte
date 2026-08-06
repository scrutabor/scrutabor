<script lang="ts">
	// How large the reading face is set. It sits with the theme and the
	// language, not on the reading page beside the help slider: this is a
	// preference a reader sets once, like the theme, and the reading
	// surfaces stay quiet (decisions #20). The help slider is the other
	// kind of control — it belongs to the text in front of you.
	//
	// It matters more here than in most apps. The people this is for skew
	// older, the primary use is a dim nave with the book at arm's length,
	// and once this is wrapped for Android and iOS there is no browser
	// chrome to pinch-zoom from.
	import { onMount } from 'svelte';
	import { M, type Lang } from '$lib/i18n';
	import { reading } from '$lib/reading.svelte';

	let { lang }: { lang: Lang } = $props();
	const msgs = $derived(M[lang]);

	// The served HTML is always the default size — app.html applies the
	// stored choice before first paint, and this picks it up.
	onMount(() => reading.sync());

	// The label carries the CURRENT step, so a reader who cannot see the
	// letters is told where the setting stands when the button takes focus,
	// and told again when it changes.
	const label = $derived(`${msgs.textSizeAria}: ${msgs.textSizes[reading.value]}`);
</script>

<button onclick={() => reading.next()} aria-label={label} title={label}>
	<!-- the small-A/large-A the whole world uses for this -->
	<span class="small" aria-hidden="true">A</span><span class="large" aria-hidden="true">A</span>
</button>
<span class="sr-only" aria-live="polite">{label}</span>

<style>
	button {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 0.05em;
		background: none;
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0;
		color: var(--ink-soft);
		font: inherit;
		cursor: pointer;
	}

	button:hover {
		background: var(--wash);
		color: var(--ink);
	}

	.small {
		font-size: 0.72rem;
	}

	.large {
		font-size: 1rem;
	}
</style>
