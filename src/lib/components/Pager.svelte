<script lang="ts">
	// The foot of a reading surface: the prayer before and the prayer after,
	// so the book can be walked without going back to the catalogue. The
	// reading pages and the ordo movements had a copy each — same markup,
	// same seven CSS rules, different only in how a link is spelled — and
	// the two are seen one after the other by anyone following the Mass, so
	// a drift between them is a drift a reader notices.
	import { M, type Lang } from '$lib/i18n';

	let {
		lang,
		prev,
		next
	}: {
		lang: Lang;
		prev?: { href: string; title: string };
		next?: { href: string; title: string };
	} = $props();
	const msgs = $derived(M[lang]);
</script>

<nav class="pager" aria-label={msgs.pagerAria}>
	{#if prev}
		<a class="pager-link" href={prev.href}
			><span class="chev" aria-hidden="true">‹</span>
			<span lang="la">{prev.title}</span></a
		>
	{:else}
		<span></span>
	{/if}
	{#if next}
		<a class="pager-link pager-next" href={next.href}
			><span lang="la">{next.title}</span>
			<span class="chev" aria-hidden="true">›</span></a
		>
	{/if}
</nav>

<style>
	.pager {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
		margin-top: 3rem;
		padding-top: 1.1rem;
		border-top: 1px solid var(--border);
	}

	.pager-link {
		color: var(--ink-soft);
		text-decoration: none;
		font-size: 1.05rem;
	}

	.pager-link:hover {
		color: var(--ink);
	}

	.pager-next {
		text-align: right;
		margin-left: auto;
	}

	/* EB Garamond centers its guillemets on the x-height, which reads
	   low beside capital-initial titles — raise them optically. */
	.chev {
		position: relative;
		top: -0.05em;
	}
</style>
