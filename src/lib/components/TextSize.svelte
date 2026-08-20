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
	//
	// A MENU rather than a button that cycles. Cycling was the first try
	// and the owner found it opaque: it says neither what the setting is
	// nor what else it could be, and on the pages with no Latin on them —
	// the landing, the Ordo index — pressing it changed nothing a reader
	// could see, so it read as broken. A menu answers both at once, and
	// answers them everywhere.
	import { onMount } from 'svelte';
	import Menu from './Menu.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { ORDER, reading } from '$lib/reading.svelte';

	let { lang }: { lang: Lang } = $props();
	const msgs = $derived(M[lang]);

	// The served HTML is always the default size — app.html applies the
	// stored choice before first paint, and this picks it up.
	onMount(() => reading.sync());

	const label = $derived(`${msgs.textSizeAria}: ${msgs.textSizes[reading.value]}`);
</script>

<Menu {label}>
	{#snippet trigger()}
		<!-- the small-A/large-A the whole world uses for this. trim-label is
		     the face with normalised metrics (app.css): EB Garamond's ascent
		     is taller than its em, so a line box of it centres visibly high
		     inside a round button, which is what the owner saw. -->
		<span class="aa trim-label" aria-hidden="true">A<span class="big">A</span></span>
	{/snippet}
	{#snippet children(close)}
		{#each ORDER as step (step)}
			<li>
				<!-- aria-current, the same mark the language rows carry: an
				     option without a listbox is an invalid tree, and the menu
				     is a disclosure, not a listbox (Menu.svelte). -->
				<button
					class="menu-row"
					type="button"
					aria-current={step === reading.value ? 'true' : undefined}
					onclick={() => {
						reading.set(step);
						close();
					}}
				>
					<!-- each option is set at the size it stands for, so the list
				     shows the choice rather than describing it -->
					<span
						class="sample trim-label"
						aria-hidden="true"
						style:font-size={`${0.8 + ORDER.indexOf(step) * 0.28}rem`}>A</span
					>
					<span>{msgs.textSizes[step]}</span>
				</button>
			</li>
		{/each}
	{/snippet}
</Menu>

<style>
	/* not `.mark` — that is the speaker mark on the reading surfaces,
	   and two different things under one name is how a selector in a
	   test quietly measures the wrong element. */
	.aa {
		display: flex;
		align-items: baseline;
		gap: 0.05em;
		font-size: 0.78rem;
		line-height: 1;
		/* The normalized line box is mathematically centred, but two bare
		   capitals still carry a little more visible weight above its middle.
		   A sub-pixel optical correction settles the ink without moving the
		   button, chevron, or samples in the menu. */
		transform: translateY(0.03em);
	}

	.big {
		font-size: 1.3em;
	}

	.sample {
		flex: none;
		width: 1.4rem;
		text-align: center;
		line-height: 1;
		color: var(--ink-soft);
	}
</style>
