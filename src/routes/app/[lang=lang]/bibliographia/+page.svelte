<script lang="ts">
	import {
		loadBibliographySource,
		type BibliographyDetailGroup,
		type BibliographyRole,
		type BibliographySectionId,
		type BibliographySource,
		type BibliographyUse
	} from '$lib/bibliography';
	import PageNav from '$lib/components/PageNav.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { bindProse } from '$lib/polish';

	let { data } = $props();
	const sections = $derived(data.sections);
	const lang = $derived(data.lang as Lang);
	const msgs = $derived(M[lang]);
	let details = $state<Record<string, BibliographyDetailGroup[] | undefined>>({});
	let loading = $state<Record<string, boolean>>({});
	let failed = $state<Record<string, boolean>>({});
	const polishCount = (n: number, one: string, few: string, many: string) =>
		n === 1
			? one
			: n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
				? `${n} ${few}`
				: `${n} ${many}`;

	const copy = $derived(
		lang === 'pl'
			? {
					lead: 'Bibliografia jest pogrupowana według rzeczywistej roli źródeł. Obejmuje tylko pozycje, których tożsamość, strony i użycie zostały sprawdzone bezpośrednio. Rozwiń źródło, aby zobaczyć miejsca w wydaniu oraz teksty, dla których stanowi świadectwo.',
					sections: {
						latin_textual_sources: {
							title: 'Łacińskie świadectwa tekstu',
							note: 'Wydania kontrolujące łacińskie brzmienie, recenzję i strukturę tekstu.'
						},
						wording_witnesses: {
							title: 'Świadectwa brzmienia przekładu',
							note: 'Historyczne przekłady użyte jako podstawa rewizji albo materiał porównawczy.'
						},
						official_documents_and_liturgical_history: {
							title: 'Dokumenty urzędowe i historia liturgii',
							note: 'Źródła poświadczające kontekst, użycie i miejsce tekstu w liturgii.'
						},
						scripture_language_and_scholarship: {
							title: 'Pismo Święte, język i opracowania',
							note: 'Wydania biblijne oraz opracowania wspierające rozstrzygnięcia językowe.'
						}
					} satisfies Record<BibliographySectionId, { title: string; note: string }>,
					roles: {
						controlling_official_text: 'tekst urzędowy kontrolujący brzmienie',
						direct_approved_print: 'bezpośrednie świadectwo w zatwierdzonym wydaniu',
						historical_context: 'świadectwo kontekstu historycznego',
						historical_wording_basis: 'historyczna podstawa brzmienia',
						historical_wording_comparator: 'historyczne brzmienie porównawcze',
						official_liturgical_context: 'urzędowe świadectwo kontekstu liturgicznego',
						scripture_control: 'wydanie kontrolujące tekst biblijny'
					} satisfies Record<BibliographyRole, string>,
					texts: (n: number) => polishCount(n, '1 tekst', 'teksty', 'tekstów'),
					uses: (n: number) => polishCount(n, '1 użycie', 'użycia', 'użyć'),
					wholeText: 'cały tekst',
					verse: (n?: number) => (n ? `werset ${n}` : 'wskazany werset'),
					verses: (first?: number, last?: number) =>
						first && last ? `wersety ${first}–${last}` : 'wskazane wersety',
					loading: 'Wczytywanie użyć źródła…',
					failed: 'Nie udało się wczytać użyć źródła. Zamknij i spróbuj ponownie.',
					typeface: [
						'Wydanie złożono krojem EB Garamond (Georg Duffner, Octavio Pardo), udostępnionym na licencji ',
						'.'
					]
				}
			: {
					lead: 'The bibliography is grouped by the actual function of each source. It includes only records whose identity, pages, and use have been checked directly. Expand a source to see its locations and the texts for which it serves as evidence.',
					sections: {
						latin_textual_sources: {
							title: 'Latin textual witnesses',
							note: 'Editions controlling the Latin wording, recension, and structure of a text.'
						},
						wording_witnesses: {
							title: 'Translation wording witnesses',
							note: 'Historical translations used as a revision basis or a documented comparator.'
						},
						official_documents_and_liturgical_history: {
							title: 'Official documents and liturgical history',
							note: 'Sources documenting a text’s context, use, and place in the liturgy.'
						},
						scripture_language_and_scholarship: {
							title: 'Scripture, language, and scholarship',
							note: 'Biblical editions and scholarship supporting linguistic decisions.'
						}
					} satisfies Record<BibliographySectionId, { title: string; note: string }>,
					roles: {
						controlling_official_text: 'official text controlling the wording',
						direct_approved_print: 'direct witness in an approved edition',
						historical_context: 'historical context witness',
						historical_wording_basis: 'historical wording basis',
						historical_wording_comparator: 'historical wording comparator',
						official_liturgical_context: 'official liturgical context witness',
						scripture_control: 'edition controlling the biblical text'
					} satisfies Record<BibliographyRole, string>,
					texts: (n: number) => (n === 1 ? '1 text' : `${n} texts`),
					uses: (n: number) => (n === 1 ? '1 use' : `${n} uses`),
					wholeText: 'complete text',
					verse: (n?: number) => (n ? `verse ${n}` : 'indicated verse'),
					verses: (first?: number, last?: number) =>
						first && last ? `verses ${first}–${last}` : 'indicated verses',
					loading: 'Loading source uses…',
					failed: 'The source uses could not be loaded. Close the entry and try again.',
					typeface: [
						'This edition is set in EB Garamond (Georg Duffner, Octavio Pardo), released under the ',
						'.'
					]
				}
	);
	const lead = $derived(lang === 'pl' ? bindProse(copy.lead) : copy.lead);
	const sourceKey = (source: BibliographySource) => `${source.section}:${source.id}`;
	const location = (use: BibliographyUse) =>
		use.kind === 'text'
			? copy.wholeText
			: use.kind === 'range'
				? copy.verses(use.first, use.last)
				: copy.verse(use.first);
	const locator = (group: BibliographyDetailGroup) =>
		[group.section, group.printed, group.scan].filter(Boolean).join(' · ');

	async function disclose(event: Event, source: BibliographySource) {
		const node = event.currentTarget as HTMLDetailsElement;
		const key = sourceKey(source);
		if (!node.open || details[key] || loading[key]) return;
		loading[key] = true;
		failed[key] = false;
		try {
			details[key] = await loadBibliographySource(lang, source);
		} catch {
			failed[key] = true;
		} finally {
			loading[key] = false;
		}
	}
</script>

<svelte:head>
	<title>{msgs.bibliographyPageTitle} — Scrutabor</title>
	<meta name="description" content={msgs.bibliographyDescription} />
</svelte:head>

<div class="page">
	<PageNav {lang} />

	<main>
		<h1 class="minor">{msgs.bibliographyPageTitle}</h1>
		<p class="what">{lead}</p>

		<div class="sections">
			{#each sections as section (section.id)}
				<section class="source-section" aria-labelledby={`section-${section.id}`}>
					<header>
						<h2 id={`section-${section.id}`}>{copy.sections[section.id].title}</h2>
						<p>{copy.sections[section.id].note}</p>
					</header>

					<ul class="sources">
						{#each section.sources as source (source.id)}
							<li class="source">
								<details ontoggle={(event) => disclose(event, source)}>
									<summary>
										<span class="source-name">
											<cite lang="und">{source.title}</cite>
											{#if source.meta.length}
												<span class="edition-meta" lang="und">{source.meta.join(' · ')}</span>
											{/if}
										</span>
										<span class="source-count"
											>{copy.texts(source.textCount)} · {copy.uses(source.useCount)}</span
										>
									</summary>

									<div class="source-body" aria-live="polite">
										{#if loading[sourceKey(source)]}
											<p class="state">{copy.loading}</p>
										{:else if failed[sourceKey(source)]}
											<p class="state failure">{copy.failed}</p>
										{:else if details[sourceKey(source)]}
											<ul class="evidence-groups">
												{#each details[sourceKey(source)] ?? [] as group (group.key)}
													<li class="evidence-group">
														<p class="role smallcaps">{copy.roles[group.role]}</p>
														{#if group.url}
															<a
																class="external locator"
																href={group.url}
																target="_blank"
																rel="external noopener"
																lang="und"
																>{locator(group)}<svg
																	class="external-mark"
																	viewBox="0 0 12 12"
																	aria-hidden="true"><path d="M4 2h6v6M10 2 2 10"></path></svg
																></a
															>
														{:else}
															<p class="locator" lang="und">{locator(group)}</p>
														{/if}
														<ul class="uses">
															{#each group.uses as use (use.key)}
																<li>
																	<a href={use.href}>{use.title}</a><span> — {location(use)}</span>
																</li>
															{/each}
														</ul>
													</li>
												{/each}
											</ul>
										{/if}
									</div>
								</details>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>

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
	.what {
		margin-top: 1.4rem;
		line-height: 1.65;
	}

	.sections {
		margin-top: 2.8rem;
	}

	.source-section + .source-section {
		margin-top: 3.2rem;
	}

	.source-section > header {
		max-width: var(--prose-width);
		margin-bottom: 1rem;
	}

	h2 {
		margin: 0;
		font-size: clamp(1.35rem, 2.4vw, 1.75rem);
		font-weight: 600;
		line-height: 1.2;
	}

	.source-section > header p {
		margin: 0.35rem 0 0;
		color: var(--ink-soft);
		font-size: 0.95rem;
		line-height: 1.45;
	}

	.sources,
	.evidence-groups,
	.uses {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.sources {
		border-top: 1px solid var(--border);
	}

	.source {
		border-bottom: 1px solid var(--border);
	}

	summary {
		display: grid;
		grid-template-columns: 0.8rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.35rem 0.8rem;
		padding: 1rem 0.3rem;
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

	.source-name {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: 0.15rem;
	}

	summary cite {
		font-size: 1.06rem;
		font-style: normal;
		font-weight: 600;
		line-height: 1.28;
	}

	.edition-meta,
	.source-count {
		color: var(--ink-soft);
		font-size: 0.78rem;
		line-height: 1.3;
	}

	.source-count {
		text-align: right;
		white-space: nowrap;
	}

	.source-body {
		padding: 0 1rem 1.2rem 1.9rem;
	}

	.evidence-group {
		padding: 0.8rem 0.9rem;
		background: color-mix(in srgb, var(--wash) 55%, transparent);
		border-inline-start: 2px solid var(--border);
	}

	.evidence-group + .evidence-group {
		margin-top: 0.75rem;
	}

	.role {
		margin: 0 0 0.18rem;
		color: var(--rubric);
		font-size: 0.7rem;
		letter-spacing: 0.055em;
	}

	.locator {
		display: inline;
		margin: 0;
		color: var(--ink);
		font-size: 0.9rem;
		line-height: 1.45;
	}

	.uses {
		margin-top: 0.42rem;
		color: var(--ink-soft);
		font-size: 0.88rem;
		line-height: 1.45;
	}

	.uses li + li {
		margin-top: 0.2rem;
	}

	.state {
		margin: 0;
		color: var(--ink-soft);
		font-style: italic;
	}

	.failure {
		color: var(--rubric);
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

	.typeface {
		margin-top: 2.8rem;
		color: var(--ink-soft);
		font-size: 0.9rem;
	}

	@media (max-width: 34rem) {
		.source-section + .source-section {
			margin-top: 2.6rem;
		}

		summary {
			grid-template-columns: 0.8rem minmax(0, 1fr);
			align-items: start;
		}

		.source-count {
			grid-column: 2;
			text-align: left;
			white-space: normal;
		}

		.source-body {
			padding-inline: 1.4rem 0.2rem;
		}
	}
</style>
