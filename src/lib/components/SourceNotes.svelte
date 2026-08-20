<script lang="ts">
	import type { Citation } from '$lib/corpus';
	import { M, type Lang } from '$lib/i18n';

	let {
		citations,
		lang,
		centered = false
	}: { citations?: Citation[]; lang: Lang; centered?: boolean } = $props();
</script>

{#if citations?.length}
	<details class="source-notes" class:centered>
		<summary class="smallcaps"
			><svg class="disclosure" viewBox="0 0 8 8" aria-hidden="true"
				><path d="M2 1l4 3-4 3z"></path></svg
			>{M[lang].sourcesLabel}</summary
		>
		<ol>
			<!-- The key carries the url too: the grouping upstream (reading-text)
		     distinguishes citations by title + url, so two entries can share
		     a title and a locator and differ only there — and a duplicate
		     each-key does not degrade, it throws, on hydration, in
		     production. -->
			{#each citations as citation (`${citation.title}:${citation.locator}:${citation.url ?? ''}`)}
				<li>
					{#if citation.url}<a
							href={citation.url}
							target="_blank"
							rel="external noopener"
							lang="und">{citation.title}</a
						>{:else}<cite lang="und">{citation.title}</cite>{/if}<span class="locator" lang="und"
						>, {citation.locator}</span
					>
				</li>
			{/each}
		</ol>
		<p class="bibliography-link smallcaps">
			<a href="/app/{lang}/bibliographia"
				>{M[lang].bibliographyLink}<span aria-hidden="true">›</span></a
			>
		</p>
	</details>
{/if}

<style>
	.source-notes {
		margin: 0.78rem 0 0;
		color: var(--ink-soft);
		font-size: 0.8rem;
		line-height: 1.45;
	}

	summary {
		width: max-content;
		display: flex;
		align-items: center;
		gap: 0.38rem;
		cursor: pointer;
		color: var(--rubric);
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		list-style: none;
	}

	.disclosure {
		width: 0.42rem;
		height: 0.42rem;
		fill: currentColor;
		flex: none;
		transition: transform 120ms ease;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	details[open] > summary .disclosure {
		transform: rotate(90deg);
	}

	.centered summary {
		margin-inline: auto;
	}

	ol {
		margin: 0.45rem 0 0;
		padding-inline-start: 1.35rem;
	}

	.centered ol {
		max-width: 28rem;
		margin-inline: auto;
		text-align: left;
	}

	li + li {
		margin-top: 0.3rem;
	}

	.bibliography-link {
		margin: 0.65rem 0 0;
		font-family: 'EB Garamond Label', 'EB Garamond', serif;
		font-size: 0.72rem;
		letter-spacing: 0.07em;
		text-align: right;
	}

	.bibliography-link span {
		margin-inline-start: 0.35rem;
		font-size: 1.05em;
	}

	a {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px dotted var(--border);
	}

	a:hover {
		color: var(--ink);
	}

	@media print {
		.source-notes {
			display: none;
		}
	}
</style>
