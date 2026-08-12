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
		<summary class="smallcaps">{M[lang].sourcesLabel}</summary>
		<ol>
			{#each citations as citation (`${citation.title}:${citation.locator}`)}
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
		<p class="bibliography-link">
			<a href="/app/{lang}/bibliographia">{M[lang].bibliographyLink}</a>
		</p>
	</details>
{/if}

<style>
	.source-notes {
		margin: 0.55rem 0 0;
		color: var(--ink-soft);
		font-size: 0.8rem;
		line-height: 1.45;
	}

	summary {
		width: max-content;
		cursor: pointer;
		color: var(--rubric);
		font-size: 0.72rem;
		letter-spacing: 0.06em;
	}

	summary::marker {
		font-size: 0.78em;
	}

	summary::-webkit-details-marker {
		font-size: 0.78em;
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
		margin: 0.45rem 0 0;
	}

	a {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px dotted var(--border);
	}

	a:hover {
		color: var(--ink);
	}

	cite {
		font-style: normal;
	}
</style>
