<script lang="ts">
	import type { BibliographyRole } from '$lib/bibliography';
	import PageNav from '$lib/components/PageNav.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { bindProse } from '$lib/polish';

	let { data } = $props();
	const sources = $derived(data.sources);
	const lang = $derived(data.lang as Lang);
	const msgs = $derived(M[lang]);
	const copy = $derived(
		lang === 'pl'
			? {
					lead: 'Bibliografia obejmuje historyczne źródła brzmienia przekładów oraz źródła konkretnych objaśnień. Każdy wpis pokazuje miejsce w wydaniu i rzeczywistą rolę źródła. Łacińskich świadków tekstu i aparat krytyczny udostępniamy osobno w repozytorium korpusu.',
					roles: {
						translation: ['przekład', 'źródło przekładu'],
						context: ['opis', 'opis tekstu'],
						rubric: ['rubryka', 'objaśnienie rubryki'],
						word: ['słowa', 'objaśnienie słowa'],
						lemma: ['hasła', 'nota słownikowa']
					} satisfies Record<BibliographyRole, [string, string]>,
					typeface: [
						'Wydanie złożono krojem EB Garamond (Georg Duffner, Octavio Pardo), udostępnionym na licencji ',
						'.'
					]
				}
			: {
					lead: 'The bibliography includes historical sources for translation wording and sources for specific explanations. Each entry shows the place in the edition and the source’s actual role. Latin textual witnesses and the critical apparatus are published separately in the corpus repository.',
					roles: {
						translation: ['translation', 'translation source'],
						context: ['text notes', 'text note'],
						rubric: ['rubrics', 'rubric note'],
						word: ['words', 'word explanation'],
						lemma: ['lemmata', 'dictionary note']
					} satisfies Record<BibliographyRole, [string, string]>,
					typeface: [
						'This edition is set in EB Garamond (Georg Duffner, Octavio Pardo), released under the ',
						'.'
					]
				}
	);
	const lead = $derived(lang === 'pl' ? bindProse(copy.lead) : copy.lead);
	const shortRole = (role: BibliographyRole) => copy.roles[role][0];
	const longRole = (role: BibliographyRole) => copy.roles[role][1];
</script>

<svelte:head>
	<title>{msgs.bibliographyPageTitle} — Scrutabor</title>
	<meta name="description" content={msgs.bibliographyDescription} />
</svelte:head>

<div class="page">
	<PageNav {lang} />

	<main>
		<h1 class="minor">{msgs.bibliographyPageTitle}</h1>
		<p class="latin-name" lang="la">bibliographia</p>
		<p class="what">{lead}</p>

		<ul class="sources">
			{#each sources as source (source.title)}
				<li class="source">
					<details>
						<summary>
							<cite lang="und">{source.title}</cite>
							<span class="source-meta"
								>{source.roles.map((role) => shortRole(role)).join(' · ')}</span
							>
						</summary>
						<div class="source-body">
							<ul class="locators">
								{#each source.locators as locator (`${locator.locator}:${locator.url ?? ''}`)}
									<li>
										{#if locator.url}
											<a
												class="external locator-reference"
												href={locator.url}
												target="_blank"
												rel="external noopener"
												lang="und"
												>{locator.locator}<svg
													class="external-mark"
													viewBox="0 0 12 12"
													aria-hidden="true"><path d="M4 2h6v6M10 2 2 10"></path></svg
												></a
											>
										{:else}
											<span class="locator-reference" lang="und">{locator.locator}</span>
										{/if}
										<div class="use-groups">
											{#each locator.groups as group (group.role)}
												<p class="uses">
													<span class="uses-label">{longRole(group.role)}:</span>
													{#each group.uses as use, i (`${use.href}:${use.detail ?? ''}`)}{i > 0
															? ', '
															: ''}<a href={use.href} lang="la"
															>{use.title}{#if use.detail}<span class="use-detail">
																	— {use.detail}</span
																>{/if}</a
														>{/each}
												</p>
											{/each}
										</div>
									</li>
								{/each}
							</ul>
						</div>
					</details>
				</li>
			{/each}
		</ul>

		<!-- The face itself is a source: the OFL asks that its licence travel
		     with the font, and the subsets this edition ships are the font.
		     The URL is absolute so the sentence stays true in a downloaded
		     copy, which carries the same text as OFL.txt beside its README. -->
		<p class="fine typeface">
			{copy.typeface[0]}<a
				class="external"
				href="https://scrutabor.org/OFL.txt"
				target="_blank"
				rel="external noopener license">SIL Open Font License</a
			>{copy.typeface[1]}
		</p>
	</main>
</div>

<style>
	.latin-name {
		margin: 0.2rem 0 0;
		text-align: center;
		color: var(--rubric);
	}

	/* The opening paragraph takes the shared prose measure (app.css); the
	   entries beneath it are rows, like the concordance on a lemma page,
	   so they take the frame. */
	.what {
		margin-top: 1.4rem;
		line-height: 1.65;
	}

	.sources {
		margin-top: 2.2rem;
		padding: 0;
		list-style: none;
		border-top: 1px solid var(--border);
	}

	.source {
		border-bottom: 1px solid var(--border);
	}

	summary {
		display: grid;
		grid-template-columns: 0.8rem minmax(0, 1fr) auto;
		align-items: baseline;
		gap: 0.35rem 0.75rem;
		padding: 0.9rem 0.25rem;
		cursor: pointer;
		list-style: none;
		border-radius: 0.35rem;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary::before {
		content: '›';
		color: var(--rubric);
		font-size: 1.15rem;
		line-height: 1;
		transform-origin: center;
		transition: transform 120ms ease;
	}

	details[open] summary::before {
		transform: rotate(90deg);
	}

	summary:hover {
		background: var(--wash);
	}

	summary cite {
		font-size: 1.05rem;
		font-style: normal;
		font-weight: 600;
		line-height: 1.3;
	}

	.source-meta {
		color: var(--ink-soft);
		font-size: 0.75rem;
		letter-spacing: 0.04em;
		white-space: nowrap;
	}

	.source-body {
		padding: 0 1rem 1rem 1.95rem;
	}

	.locators {
		margin: 0;
		padding-inline-start: 1.15rem;
	}

	.locators li {
		line-height: 1.5;
	}

	.locators li + li {
		margin-top: 0.7rem;
	}

	a {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px dotted var(--border);
	}

	a:hover {
		color: var(--rubric);
	}

	.external-mark {
		display: inline-block;
		width: 0.65em;
		height: 0.65em;
		margin-inline-start: 0.22em;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.35;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.use-groups {
		margin-top: 0.18rem;
	}

	.uses {
		margin: 0;
		color: var(--ink-soft);
		font-size: 0.9rem;
	}

	.uses + .uses {
		margin-top: 0.12rem;
	}

	.uses-label {
		margin-right: 0.25rem;
		color: var(--ink);
	}

	.typeface {
		margin-top: 2.2rem;
		color: var(--ink-soft);
		font-size: 0.95rem;
	}

	@media (max-width: 34rem) {
		summary {
			grid-template-columns: 0.8rem minmax(0, 1fr);
		}

		.source-meta {
			grid-column: 2;
			white-space: normal;
		}

		.source-body {
			padding-inline: 1.55rem 0.25rem;
		}
	}
</style>
