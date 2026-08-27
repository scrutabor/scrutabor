<script lang="ts">
	import type { GlossDocument, TextDocument } from '$lib/corpus';
	import SourceNotes from '$lib/components/SourceNotes.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { massForm } from '$lib/mass-form.svelte';
	import {
		collectTranslationCitations,
		collectTranslationRelationships,
		litanyRows,
		type LitanyRow
	} from '$lib/reading-text';
	import { isEveryonesResponse, isYours, mayJoin, role } from '$lib/role.svelte';
	import { initialFit } from '$lib/reading-geometry';
	import * as marks from '$lib/speaker-marks';

	// The rendered text itself, shared by the reading page and the ordo
	// flow. `ontap` makes the words buttons; the flow passes an idPrefix so
	// that the several texts on its page address their words apart.
	let {
		doc,
		gloss,
		lang,
		helpLevel,
		selectedId = null,
		idPrefix = '',
		ontap,
		onmark,
		verses,
		onverse,
		citedVerse = null,
		citedSegments = [],
		onsegmentselect,
		collapsedSegments = [],
		collapsedLabel,
		collapsedShow,
		collapsedHide,
		litanyColumns = false,
		showSpeakerNames = true,
		hideOpeningRubric = false,
		showTranslationSources = true
	}: {
		doc: TextDocument;
		gloss: GlossDocument;
		lang: Lang;
		helpLevel: number;
		selectedId?: string | null;
		/** Namespaces the DOM ids, for pages that show more than one text. */
		idPrefix?: string;
		ontap?: (id: string) => void;
		/** Asked for the key to the marks. Without it the mark is inert. */
		onmark?: () => void;
		/** Verse numbers by segment id, for the texts that print them —
		 * the psalter. They take the speaker mark's column and its quiet
		 * ink; a segment with a speaker keeps its speaker mark instead. */
		verses?: Record<string, number>;
		/** Tapped a verse number. With it the numbers become buttons and
		 * the cited verse is marked; without it they are print. */
		onverse?: (no: number) => void;
		citedVerse?: number | null;
		/** Segments named by a search result or a reader-created share link. */
		citedSegments?: string[];
		/** Selects one segment, or extends the current range with Shift. */
		onsegmentselect?: (id: string, extend: boolean) => void;
		/** Optional reading-page folds for repeated, already-familiar prayers.
		 * The text remains in the HTML and in the corpus; details merely keeps
		 * repetition from dominating the visual hierarchy. */
		collapsedSegments?: string[];
		collapsedLabel?: string;
		collapsedShow?: string;
		collapsedHide?: string;
		/** Prayer-book setting: pair each litany invocation with its response. */
		litanyColumns?: boolean;
		/** Some devotional dialogues are already clear from V./R. alone. */
		showSpeakerNames?: boolean;
		/** A standalone Mass prayer keeps the opening rubric's deep-link
		 * anchor, while leaving its continuous-rite direction to the Ordo. */
		hideOpeningRubric?: boolean;
		/** The landing specimen favours the always-open analysis box: its
		 * translation-sources disclosure pushed the box below the fold
		 * (owner, 2026-08-21), and the panel carries its own sources row. */
		showTranslationSources?: boolean;
	} = $props();

	// A dot, not a colon: it is unreserved in a URL, so `?w=credo.w001`
	// stays readable instead of arriving as %3A, and it matches the corpus's
	// own dotted ids (ordinarium.credo).
	const domId = (id: string) => (idPrefix ? `${idPrefix}.${id}` : id);

	// V. and R. — versiculus and responsum — in red, the marks the 1962
	// typical edition prints down its dialogue pages and the marks a Polish
	// reader meets in the Pallottinum Ordo. They are also what this corpus's
	// own witnesses print by a wide margin: R. 96 times and V. 74 against
	// S. 36 and M. 15.
	//
	// (The books set them barred, ℣ and ℟. That pair lives in Letterlike
	// Symbols, a block EB Garamond does not carry, so they would drop to a
	// system face mid-line. Plain V. and R. it is, which is how plenty of
	// hand missals print them too.)
	//
	// EVERY spoken line carries its mark, including the ones the books
	// leave bare down the body of a prayer (owner, 2026-08-06). His reason
	// is the one that counts here: what confused him years ago, following
	// Mass in a printed missal, was exactly the lines that carry no mark. A
	// mark on every line answers "who says this" without the reader having
	// to work out where the last mark stopped applying — and it draws a
	// second line the page needs, between what is SAID and the narrative
	// around it.
	const MARKS: Record<string, string> = {
		sacerdos: 'V.',
		ductor: 'V.',
		minister: 'R.',
		populus: 'R.',
		omnes: 'O.',
		schola: 'R.'
	};

	// The editorial rules — who is marked, whose voice is named, which verse
	// opens with the initial — are pure functions of the segments and live in
	// $lib/speaker-marks with their reasons and their tests. What is here is
	// only the binding of them to this document.
	const segs = $derived(doc.segments.map((segment) => marks.inMassForm(segment, massForm.value)));
	// A one-line fixed response has only one rubrical speaker, but its
	// participation still makes it an answer the reader needs identified.
	const answers = $derived(marks.hasAnswers(segs) || marks.hasParticipation(segs));
	// In a continuous shared prayer (Credo, Gloria, Sanctus, Agnus Dei,
	// and the ministers' Confiteor at low Mass) V./R. would pretend that a
	// dialogue exists. Name the shared participation in words instead.
	const firstSharedVerse = $derived(segs.findIndex((segment) => segment.type === 'verse'));
	const sharedSpeaker = $derived.by(() => {
		const speakers = new Set(
			segs
				.filter((segment) => segment.type === 'verse' && segment.speaker)
				.map((segment) => segment.speaker!)
		);
		return speakers.size === 1 ? [...speakers][0] : undefined;
	});
	const sharedPrayer = $derived(
		marks.isSharedPrayer(segs, massForm.value) &&
			(role.value === 'populus' || sharedSpeaker !== undefined)
	);
	const namesSpeaker = (i: number) => marks.namesSpeaker(segs, i);
	const marked = (i: number) => marks.marked(segs, i);
	const namesVoice = (i: number) => marks.namesVoice(segs, i);
	const firstVerse = $derived(marks.firstVerseWithInitial(segs));
	const segmentId = (id: string) => (idPrefix ? `${idPrefix}-${id}` : id);
	const rows: LitanyRow[] = $derived(
		litanyColumns ? litanyRows(segs) : segs.map((_, primary) => ({ primary }))
	);
	// Bilingual (help 2) reads as a bilingual missal: plain Latin beside the
	// verse translation where the room allows, stacked where it does not.
	// The litany keeps its own two-column convention either way.
	const bilingual = $derived(helpLevel === 2 && !litanyColumns);
	const translationCitations = $derived(collectTranslationCitations(segs, gloss));
	const translationRelationships = $derived(collectTranslationRelationships(segs, gloss));
</script>

{#snippet face(id: string, form: string, post = '', raised = false, sink = 0)}{@const fit =
		initialFit(form.slice(0, 1), helpLevel === 1)}<ruby
		><span
			class="base"
			style:padding-top={raised ? `${fit.padTop}em` : null}
			style:padding-bottom={raised ? `${fit.padBottom}em` : null}
			>{#if raised}<span
					class="initial"
					style:font-size="{fit.scale}em"
					style:margin-inline-start="{fit.start}em"
					style:margin-inline-end="{fit.end}em">{form.slice(0, 1)}</span
				>{form.slice(1)}{:else}{form}{/if}{post}</span
		>{#if helpLevel === 1}<rt
				style:top="calc(var(--reading) * (var(--gloss-gap) + {sink - (raised ? fit.lift : 0)}))"
				class="shifted"
				{lang}>{gloss.words[id]?.gloss}</rt
			>{/if}</ruby
	>{/snippet}

{#snippet segment(seg: TextDocument['segments'][number], i: number)}
	{#if collapsedSegments.includes(seg.id)}
		<details class="repeated-prayer">
			<summary>
				<span class="repeated-title" lang="la">{collapsedLabel}</span>
				<span class="repeated-action smallcaps">
					<span class="when-closed">{collapsedShow}</span>
					<span class="when-open">{collapsedHide}</span>
				</span>
			</summary>
			<div class="repeated-body">
				{@render verse(seg, i)}
			</div>
		</details>
	{:else if seg.type === 'rubric' && hideOpeningRubric && i === 0}
		<!-- Bibliography backlinks cite this exact segment. The direction is
		     hidden here, not deleted: its anchor still resolves at the prayer's
		     opening and the Ordo renders the complete segment. -->
		<span
			class="rubric-anchor"
			class:segment-selected={citedSegments.includes(seg.id)}
			id={segmentId(seg.id)}
			aria-hidden="true"
		></span>
	{:else if seg.type === 'rubric'}
		<div
			class="rubric"
			class:segment-selected={citedSegments.includes(seg.id)}
			id={segmentId(seg.id)}
		>
			<p class="rubric-la" lang="la">{seg.text}</p>
			<!-- Narratives ride in EVERY mode (owner, 2026-08-21): what
			     happens at the altar is the prayer book's own layer, not
			     translation help — łacina without it read as lacking, while
			     labels like "z formularza dnia" stayed, so the mode was
			     never "pure Latin" to begin with. The mode governs language
			     help on the prayers alone. -->
			{#if gloss.segments[seg.id]?.narrative}
				<p class="rubric-narrative">{gloss.segments[seg.id].narrative}</p>
				<SourceNotes citations={gloss.segments[seg.id].narrative_citations} {lang} />
			{/if}
		</div>
	{:else}
		{@render verse(seg, i)}
	{/if}
{/snippet}

{#snippet flow()}
	{#each rows as row (segs[row.primary].id)}
		{@const primary = segs[row.primary]}
		{#if row.response !== undefined}
			<div class="litany-pair">
				<div class="litany-cell litany-invocation">
					{@render segment(primary, row.primary)}
				</div>
				<div class="litany-cell litany-response">
					{@render segment(segs[row.response], row.response)}
				</div>
			</div>
		{:else}
			{@render segment(primary, row.primary)}
		{/if}
	{/each}
{/snippet}

{#if bilingual}
	<!-- The container the column query answers to: rem in a container
	     query scales with the reading knob, so bigger text correctly
	     demands more room before the page splits (the pickers' own
	     pattern). The grid itself lives on .columns below. -->
	<div class="bilingual">
		<div class="columns">{@render flow()}</div>
	</div>
{:else if helpLevel === 0 && !litanyColumns}
	<!-- Bare Latin keeps a book measure: at the bare scale the frame's
	     full content runs ~85 characters, far past the 45-75 a book sets.
	     The litany is excluded — its paired columns are their own layout
	     with their own width. -->
	<div class="measure">{@render flow()}</div>
{:else}
	{@render flow()}
{/if}

{#if helpLevel >= 2 && showTranslationSources && translationCitations.length}
	<div class="translation-sources">
		<SourceNotes
			citations={translationCitations}
			relationships={translationRelationships}
			{lang}
			centered
		/>
	</div>
{/if}

{#snippet verse(seg: TextDocument['segments'][number], i: number)}
	{#if seg.type === 'verse'}
		<!-- Who says it, and how loudly. Absent attribution renders as
		     nothing at all: the corpus says "not read yet" by leaving the
		     field out, and a missal that guessed would be worse than one
		     that is silent. The reader's own lines carry the strongest
		     mark, because finding them at a glance is the whole point. -->
		{@const mine = answers && isYours(seg, role.value, massForm.value)}
		{@const showVoice = namesVoice(i)}
		<!-- WHOSE LINE, from where the reader is sitting. The Missale gives
		     every response at low Mass to the minister, so the label read
		     ministrant over lines a congregation was about to say — the
		     wrong answer to the question the reader was asking (owner,
		     2026-08-09). A reader in the pew is named for their own lines;
		     a server or a priest still sees the rubrical speaker, which is
		     what THEY need. Nothing is renamed that is not the reader's:
		     the celebrant's lines keep his name for everyone. -->
		{@const yours = mine && role.value === 'populus'}
		{@const everyones = mine && isEveryonesResponse(seg, massForm.value)}
		{@const joinable =
			role.value === 'populus' &&
			mayJoin(seg, massForm.value) &&
			marks.namesConditionalParticipation(segs, i, massForm.value)}
		{@const nameSpeaker = sharedPrayer ? i === firstSharedVerse : namesSpeaker(i)}
		{@const speakerName =
			yours && sharedPrayer && sharedSpeaker
				? M[lang].faithfulWith[sharedSpeaker]
				: yours && sharedPrayer
					? M[lang].faithful
					: yours && seg.speaker
						? M[lang].faithfulWith[seg.speaker]
						: yours
							? M[lang].faithful
							: seg.speaker
								? M[lang].speakers[seg.speaker]
								: undefined}
		{#if (showSpeakerNames && nameSpeaker) || showVoice || joinable}
			<p class="who" class:yours={mine}>
				{#if showSpeakerNames && nameSpeaker && speakerName}<span class="who-name"
						>{speakerName}</span
					>{/if}
				<!-- The first degree: the short responses the instruction asks
				     that every congregation be able to make (nn. 25 a, 31 a).
				     A newcomer's question is not which lines they MAY say but
				     which ones everybody is about to, and this is the answer
				     to that one. -->
				{#if everyones}<span class="who-all">{M[lang].everyone}</span>{/if}
				{#if joinable}<span class="who-join">{M[lang].mayJoin}</span>{/if}
				{#if showVoice && seg.voice && seg.voice !== 'clara'}<span class="who-voice"
						>{M[lang].voices[seg.voice]}</span
					>{/if}
			</p>
		{/if}
		{@const showMark = !sharedPrayer && marked(i)}
		{@const verseNo = seg.speaker ? undefined : verses?.[seg.id]}
		<!-- In the bilingual columns the reservation is skipped: the grid's
		     row-gap already clears the initial's rise, and an inline margin
		     here would defeat the baseline alignment that keeps a verse and
		     its translation on one line (it did — the first row sat 10px
		     off until this condition). -->
		<!-- The gloss row of a verse whose initial reaches below the line
		     sinks together, so the glosses stay level with each other. -->
		{@const fit0 =
			i === firstVerse ? initialFit(seg.words?.[0]?.form.slice(0, 1) ?? '', helpLevel === 1) : null}
		{@const sink = fit0?.sink ?? 0}
		<p
			class="verse"
			style:margin-top={fit0 && !bilingual ? `${fit0.reserve}em` : null}
			style:--selection-initial-start={fit0 ? `calc(var(--reading) * ${-fit0.reserve})` : null}
			class:glossed={helpLevel === 1}
			class:quiet={seg.voice === 'secreto'}
			class:answer={mine}
			class:marked={showMark || verseNo !== undefined}
			class:cited={verseNo !== undefined && verseNo === citedVerse}
			class:segment-selected={citedSegments.includes(seg.id)}
			id={verseNo !== undefined ? segmentId(`v${verseNo}`) : segmentId(seg.id)}
			lang="la"
		>
			{#if onsegmentselect}<button
					type="button"
					class="segment-handle"
					class:selected={citedSegments.includes(seg.id)}
					aria-pressed={citedSegments.includes(seg.id)}
					aria-label={citedSegments.includes(seg.id)
						? M[lang].segmentDeselect
						: M[lang].segmentSelect}
					title={citedSegments.includes(seg.id) ? M[lang].segmentDeselect : M[lang].segmentSelect}
					onclick={(event) => onsegmentselect?.(seg.id, event.shiftKey)}
				>
					<span class="segment-handle-ink" aria-hidden="true"></span>
				</button>{/if}
			{#if verseNo !== undefined}<span
					class="segment-anchor"
					id={segmentId(seg.id)}
					aria-hidden="true"
				></span>{/if}
			<!-- The mark the books print in red beside the line, and then the
			     words with NO text node between: a space there would push the
			     first line one space past the lines it wraps onto, and the
			     hanging indent exists precisely to line them up. The mark is
			     not a word of the text — it carries the speaker's name for
			     anyone who cannot see the colour, and the tap targets stay
			     the words. Word and trailing punctuation form one atomic
			     token (inline-block): the line breaker may only break at the
			     spaces BETWEEN tokens, never between a word and its comma or
			     period. Guarded by the one-rect e2e invariant. -->
			<!-- The button OPENS THE LEGEND, so its accessible name says so —
			     a name that only described the mark promised nothing and
			     delivered a dialog. The line's speaker is announced by the
			     sr-only span beside it, with the SAME name the sighted
			     reader sees: naming the rubrical speaker there while the
			     visible label says "the faithful" contradicted the role
			     setting exactly where it does its work. -->
			{#if showMark && seg.speaker && MARKS[seg.speaker]}{#if onmark}<button
						type="button"
						class="mark"
						class:yours={mine}
						aria-label={`${M[lang].markTitle[seg.speaker]}, ${M[lang].markLegendTitle}`}
						onclick={onmark}><span class="ink">{MARKS[seg.speaker]}</span></button
					>{:else}<span class="mark" class:yours={mine} aria-hidden="true"
						>{MARKS[seg.speaker]}</span
					>{/if}<span class="sr-only"
					>{speakerName ?? M[lang].speakers[seg.speaker]}:
				</span>{:else if verseNo !== undefined}{#if onverse}<button
						type="button"
						class="mark"
						aria-label={M[lang].verseAria(verseNo)}
						aria-pressed={verseNo === citedVerse}
						onclick={() => onverse?.(verseNo)}><span class="ink">{verseNo}</span></button
					>{:else}<span class="mark">{verseNo}</span
					>{/if}{/if}{#each seg.words ?? [] as w, wi (w.id)}{@const raised =
					i === firstVerse && wi === 0}<span
					class="token"
					class:word-selected={selectedId === domId(w.id)}
					>{#if ontap}<button
							class="word"
							id={domId(w.id)}
							class:selected={selectedId === domId(w.id)}
							onclick={() => ontap?.(domId(w.id))}
							>{@render face(w.id, w.form, w.post ?? '', raised, sink)}</button
						>{:else}<span class="word"
							>{@render face(w.id, w.form, w.post ?? '', raised, sink)}</span
						>{/if}</span
				>{' '}{/each}
		</p>
		{#if helpLevel >= 2 && gloss.segments[seg.id]?.translation}
			<div class="seg-extra">
				<p class="translation">{gloss.segments[seg.id].translation}</p>
			</div>
		{/if}
	{/if}
{/snippet}

<style>
	.rubric-anchor {
		display: block;
		height: 0;
	}

	.segment-anchor {
		position: absolute;
	}

	.rubric.segment-selected {
		border-radius: 0.24rem;
		background: color-mix(in srgb, var(--wash) 78%, var(--bg));
	}

	/* Segment selection is a painted layer only. It never changes the verse's
	   width, padding, line breaks or margins, so following lines cannot jump
	   when a shared link is opened. The tint reaches down to an interlinear
	   gloss through paint outside the box rather than reserving new space. */
	.verse:has(.initial) {
		--selection-block-start: var(--selection-initial-start);
	}

	.verse:has(> .segment-handle) {
		position: relative;
		isolation: isolate;
	}

	/* The paint layer exists before and after selection. Selection changes its
	   colour only: no child, pseudo-element or box-model value enters or leaves
	   the rendered tree when the reader chooses a line. */
	.verse:has(> .segment-handle)::before {
		position: absolute;
		inset: var(--selection-block-start) 0 var(--selection-block-end) calc(var(--reading) * -0.44);
		border-radius: 0.24rem;
		background: transparent;
		content: '';
		pointer-events: none;
		z-index: -2;
	}

	.verse.segment-selected::before,
	.verse.segment-selected + .seg-extra {
		/* Opaque blend, although visually as quiet as the former translucent
		   wash. Adjacent selected lines overlap by a fraction of a pixel to
		   cover font-metric rounding; an alpha colour made that overlap a
		   darker horizontal seam. Equal opaque paint remains exactly equal. */
		background: color-mix(in srgb, var(--wash) 78%, var(--bg));
	}

	.verse.segment-selected + .seg-extra {
		border-radius: 0.24rem;
	}

	.segment-handle {
		position: absolute;
		inset-block: var(--selection-block-start) var(--selection-block-end);
		inset-inline-start: calc(var(--reading) * -0.8);
		display: grid;
		width: calc(var(--reading) * 0.72);
		height: auto;
		place-items: center;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
		opacity: 0.38;
		z-index: 1;
	}

	.segment-handle-ink {
		display: block;
		width: 0.12rem;
		height: calc(var(--reading) * 0.42);
		border-radius: 999px;
		background: var(--ink-soft);
		transition:
			height 120ms ease,
			background-color 120ms ease;
	}

	.segment-handle:hover,
	.segment-handle:focus-visible,
	.segment-handle.selected {
		opacity: 1;
	}

	.segment-handle:hover .segment-handle-ink,
	.segment-handle:focus-visible .segment-handle-ink {
		height: calc(var(--reading) * 0.58);
		background: var(--ink);
	}

	.segment-handle.selected .segment-handle-ink {
		opacity: 0;
	}

	.segment-handle.selected {
		background: linear-gradient(var(--rubric), var(--rubric)) center / 0.12rem 100% no-repeat;
	}

	.segment-handle:focus-visible {
		outline: none;
	}

	.segment-handle.selected:focus-visible {
		background-size: 0.24rem 100%;
	}

	.segment-handle:focus-visible .segment-handle-ink {
		width: 0.24rem;
		height: calc(var(--reading) * 0.78);
		background: var(--rubric);
	}

	@media (hover: hover) and (pointer: fine) {
		.segment-handle:not(.selected):not(:focus-visible) {
			opacity: 0;
		}

		.verse:hover > .segment-handle {
			opacity: 0.68;
		}
	}

	.translation-sources {
		margin: calc(var(--reading) * 1.1) 0 calc(var(--reading) * 0.55);
	}

	.litany-pair {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
		column-gap: calc(var(--reading) * 0.55);
		align-items: start;
	}

	.litany-cell {
		min-width: 0;
	}

	@media (max-width: 30rem) {
		.litany-pair {
			grid-template-columns: minmax(0, 0.82fr) minmax(0, 1fr);
			column-gap: calc(var(--reading) * 0.4);
		}
	}

	/* With the opening process rubric absent, the first speaker name is the
	   beginning of the standalone prayer, not a new section after prose. */
	.rubric-anchor + .who {
		margin-top: 0.3rem;
	}

	.repeated-prayer {
		margin: calc(var(--reading) * 0.55) 0;
	}

	/* A repeated prayer begins with the same summary whether it is folded or
	   open. With glosses visible, the preceding gloss is painted below its
	   verse box, where the box model cannot see it; keep the summary clear of
	   that ink in BOTH states so opening the prayer never makes its heading
	   jump toward the preceding response. */
	.verse.glossed + .repeated-prayer {
		margin-top: calc(var(--reading) * 0.98);
	}

	.repeated-prayer:not([open]):has(+ .verse.glossed) {
		margin-bottom: calc(var(--reading) * 0.32);
	}

	.repeated-prayer summary {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: fit-content;
		max-width: 100%;
		padding: 0.25rem 0;
		color: var(--ink-soft);
		cursor: pointer;
		list-style: none;
	}

	.repeated-prayer summary::-webkit-details-marker {
		display: none;
	}

	.repeated-prayer summary::before {
		content: '›';
		color: var(--rubric);
		font-size: 0.9em;
		line-height: 1;
		transition: transform 120ms ease;
	}

	.repeated-prayer[open] summary::before {
		transform: rotate(90deg);
	}

	.repeated-title {
		font-size: calc(var(--reading) * 0.86);
		line-height: 1.2;
		color: var(--ink);
	}

	.repeated-action {
		font-size: calc(var(--reading) * 0.47);
		letter-spacing: 0.09em;
		line-height: 1;
		color: var(--rubric);
	}

	.when-open {
		display: none;
	}

	.repeated-prayer[open] .when-open {
		display: inline;
	}

	.repeated-prayer[open] .when-closed {
		display: none;
	}

	.repeated-body {
		margin-top: calc(var(--reading) * 0.45);
	}

	.repeated-prayer summary:focus-visible {
		outline: 2px solid var(--rubric);
		outline-offset: 3px;
	}

	/* The attribution line: small caps, quiet, above the words it names —
	   the shape a missal uses for its S. and M. */
	.who {
		/* The label belongs to the verse BELOW it, and it has to look like
		   it does. Its own bottom margin is tiny for that reason — but a
		   glossed verse above gives back only --gloss-gap, exactly the
		   overhang its gloss row paints below the box, so the label was
		   landing on that row with no daylight at all and reading as part
		   of the verse it follows (owner, 2026-08-09). The top margin here
		   is the daylight, and it is written as the air wanted PLUS the
		   overhang that has to be cleared first. Collapses against a
		   rubric's larger bottom margin, so a label after a rubric is
		   unchanged. */
		margin: calc(var(--reading) * (0.517 + var(--gloss-gap))) 0 calc(var(--reading) * 0.103);
		font-size: calc(var(--reading) * 0.497);
		letter-spacing: 0.09em;
		text-transform: lowercase;
		font-variant-caps: small-caps;
		color: var(--ink-soft);
		display: flex;
		gap: calc(var(--reading) * 0.414);
		align-items: baseline;
	}

	/* And measured in glyphs it was still the wrong way round as soon as the
	   glosses showed: 40 above and 22 below on bare Latin, where the label
	   plainly names the verse under it — but 20 and 28 with the glosses on,
	   where it reads as the tail of the verse above (owner, 2026-08-09).

	   The overhang above is only half of it. The other half is the leading
	   BELOW: a glossed verse is set at line-height 2.3, so a third of a
	   line of air stands over its first Latin glyph, inside its own box
	   where a margin cannot reach it. Clearing the overhang bought back
	   5px and the leading had already given away 26.

	   So the label spends more above and takes back some of that leading
	   below, and the pair restores the proportion bare Latin has: 40 and
	   22. Both corrections name the state that causes them and neither
	   fires without it. */
	.verse.glossed + .who {
		margin-top: calc(var(--reading) * (0.517 + var(--gloss-gap) + 0.86));
	}

	.who:has(+ .verse.glossed) {
		margin-bottom: calc(var(--reading) * -0.26);
	}

	/* A raised initial reaches above the ordinary verse's line box. The
	   compact label-to-verse correction above therefore puts its ink into
	   the label's cap-height zone even though the boxes still appear spaced.
	   Give that exceptional first line visible clearance. A little air above
	   the label preserves the stronger gap on that side, so it still plainly
	   names the prayer below rather than the preceding passage. */
	.who:has(+ .verse .initial) {
		padding-top: calc(var(--reading) * 0.16);
	}

	.who:has(+ .verse:not(.glossed) .initial) {
		margin-bottom: calc(var(--reading) * 0.75);
	}

	.who:has(+ .verse.glossed .initial) {
		margin-bottom: calc(var(--reading) * 0.39);
	}

	/* Set like the voice mark it sits beside — the same size and tracking,
	   in the rubric's red, because it says something about the reader's own
	   part rather than about the celebrant's. */
	.who-all {
		color: var(--rubric);
	}

	/* The speaker's mark, in the red the books use for everything that is
	   not the text itself. Fixed width, so the marks read as a column of
	   their own and the Latin beside them keeps one straight edge — the
	   way S. and M. sit in a hand missal. Works at every width: the mark
	   is part of the line, not something hung in a margin a phone does
	   not have. */
	.mark {
		/* `font` before `font-size`, or the shorthand resets it: a button
		   carries the browser's own font otherwise, and the mark has to be
		   the page's face at the page's size. */
		font: inherit;
		display: inline-block;
		width: calc(var(--reading) * 1.379);
		/* The OTHER voice's mark is quiet ink. Red is kept for the reader's
		   own lines, so that the answer to "which of these do I say?" is
		   the colour of the page rather than something to work out — the
		   way a bilingual missal sets the people's parts in bold. This is
		   what makes the choice of part change the page rather than only
		   its labels. */
		color: var(--ink-soft);
		font-size: calc(var(--reading) * 0.655);
		user-select: none;
		/* A button, and it looks exactly like the letter a missal prints:
		   no chrome, no underline. Tapping it opens the key — the owner
		   found a help cursor with a slow native tooltip invited a click
		   and then did nothing, which is worse than either alone. */
		appearance: none;
		border: 0;
		background: none;
		padding: 0;
		text-align: start;
	}

	/* Only a mark that DOES something invites the hand: a tappable
	   speaker mark opens the key, a verse number cites its verse. A
	   plain span in the margin is print, and print offered a dead
	   pointer (the owner found it). */
	button.mark {
		cursor: pointer;
	}

	button.mark:hover {
		text-decoration: underline dotted;
		text-underline-offset: 0.25em;
	}

	/* The ring goes round the LETTER, not the gutter. A mark's box is a
	   fixed 1.379 of the reading size — the width the Latin column is
	   indented by, which is what keeps every verse on one left edge — and
	   `V.` fills less than half of it. A ring on that box drew a rectangle
	   three times the width of the letter and reached over the first word
	   of the line (owner, 2026-08-09). The span holds the ink and nothing
	   else; the button keeps the width the column needs. */
	button.mark:focus-visible {
		outline: none;
	}

	button.mark:focus-visible .ink {
		outline: 2px solid var(--rubric);
		outline-offset: 2px;
		border-radius: 0.1em;
	}

	/* The cited verse: its number in rubric red — the same signal the
	   reader's own lines use, here meaning "the verse this link names". */
	.verse.cited > .mark {
		color: var(--rubric);
	}

	.mark.yours {
		color: var(--rubric);
		font-weight: 600;
	}

	/* The opening initial, red, standing on the same baseline as the word it
	   begins — large enough to open the prayer, not so large that it opens a
	   hole in the line above. */
	.initial {
		color: var(--rubric);
		line-height: 0;
		text-indent: 0;
	}

	/* A taller glyph in the ruby base raises the base box, and the
	   annotation rides down with it: measured at 4px for a 1.75em initial
	   at the reading size, identical at phone width, so the gloss of the
	   first word sat 4px below the line its neighbours share. Put back by
	   the same 4px. */
	rt.shifted {
		position: relative;
	}

	/* The reader's own lines are marked by their MARK — heavier, and in
	   the red the eye is already looking for. They used to carry a red rule
	   down the edge as well, which was a second device saying the same
	   thing in the same colour as the rule beside a rubric: two vertical
	   red lines on one page, meaning different things. The rule now means
	   one thing, "this is a rubric", and the mark carries the rest. */

	/* Said silently: still fully legible — it is the text of the Mass, not
	   an aside — but set apart so that what is heard reads first. */
	.verse.quiet {
		color: var(--ink-soft);
	}

	/* Hanging indent: the mark sits out at the edge and every line of the
	   verse — the first and the ones it wraps onto — aligns past it, so
	   the marks form their own column and the Latin keeps one straight
	   left edge. Verses with no mark indent the same, or an unattributed
	   line would jut out among attributed ones. */
	/* THE INITIAL RESERVES ITS OWN SPACE, and the verse carrying it is the
	   only place that can. Vertical padding on an INLINE box paints and
	   reserves nothing — it does not grow the line — so the raised letter
	   rises out of the top of its line and into whatever stands above it.
	   Every speaker label on a movement sat 20px clear of its verse except
	   the four before a drop cap, which had 13 (owner, 2026-08-10).
	   The margin is set from `initialFit().reserve` — the wash's own
	   measured padTop plus the half-leading the bare modes' tighter
	   leading takes back — so the space reserved and the space painted
	   cannot drift apart. Compensating in the label instead would
	   have meant compensating in the rubric and the translation too, and
	   in whatever comes next: the fault is the verse's, so the verse pays.
	   The mirror of --gloss-gap, which is ink hanging BELOW its box. */
	.verse {
		--selection-block-start: calc(var(--reading) * 0.14);
		--selection-block-end: calc(var(--reading) * -0.08);
		font-size: var(--reading-bare);
		/* 1.5, down from 1.75 (owner, 2026-08-21): the bare modes read as
		   a prayer book, and printed missals set their verses close to
		   solid — 1.75 was the interlinear's air bleeding into modes that
		   have no glosses to make room for. Glossed verses override to 2.3
		   below, so this number never renders in interlinear mode. At 1.5 a
		   wrapped verse holds together as one unit and the verse margin
		   finally reads as structure, not as one more line gap. */
		line-height: 1.5;
		/* the bare modes' own rhythm — priced on the bare scale the text
		   reads at (the study margin sat here first, and under 19.5px
		   text it read as a blank line between every verse) */
		margin: 0 0 calc(var(--reading-bare) * 0.62);
		padding-inline-start: calc(var(--reading) * 1.379);
		/* no last word alone on its line (Glorificámus / te.) — a
		   progressive nicety where the engine has it */
		text-wrap: pretty;
	}

	/* Only a line that carries a mark hangs out to the left for it. A line
	   continuing the same voice keeps the column, which is what says it is
	   still that voice. */
	.verse.marked {
		text-indent: calc(var(--reading) * -1.379);
	}

	/* Measured, because the proportions were backwards: a gloss sat ON the
	   Latin it belongs to (0.1px, sometimes touching a descender) with 27px
	   of nothing beneath it, so every pair read as two loose lines rather
	   than one word and its meaning.

	   Proximity is the only thing making that pairing legible, so a gloss
	   sits close to the Latin it glosses and every line stands well clear
	   of the next.

	   ONE rhythm down the page, and one left edge. The page used to open
	   up between verses, and the owner's report was that it looked
	   arbitrary — which it was: whether a verse takes one line or two is
	   a fact about the WINDOW, not about the text, so the tight gap
	   marked something a reader cannot learn and that moves when the
	   phone is turned. A hanging indent for the continuations was tried
	   in its place and was worse: it broke the column AND, by setting its
	   own text-indent, it undid the one the speaker mark hangs on, so a
	   marked verse's words stood 2rem right of an unmarked one's. The
	   column is flush; what says a verse has begun is its capital, its
	   stop, and the mark when the voice changes. */
	.verse.glossed {
		--selection-block-end: calc(var(--reading) * -0.34);
		font-size: var(--reading);
		line-height: 2.3;
		margin-bottom: calc(var(--reading) * 0.759);
		/* The gloss row is shifted down by GLOSS_GAP, and a relative shift
		   moves paint without moving layout — so the last gloss of a verse
		   hangs below the box that carries the margin, and the verse gives
		   away that much of the space beneath it. Given back here, which is
		   why a rubric under a glossed line looked cramped while the same
		   rubric under another rubric looked right. Nothing beyond that:
		   a verse break is not extra air. */
		margin-bottom: calc(var(--reading) * var(--gloss-gap));
	}

	/* text-indent INHERITS, and an inline-block establishes its own first
	   line box — so the verse's hanging indent would be re-applied inside
	   every token and every word would sit 2rem left of where it belongs,
	   printing them on top of one another. The indent belongs to the verse
	   alone; everything inside it starts at zero. */
	.token,
	.mark {
		text-indent: 0;
	}

	.token {
		display: inline-block;
		position: relative;
		isolation: isolate;
	}

	.word {
		font: inherit;
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		color: inherit;
	}

	/* The permanent token is the selection surface for its Latin word and
	   interlinear gloss. It is as wide as the wider half of that ruby pair,
	   while its block edges are the physical reading line's edges. The same
	   block inset variables paint the selected segment and selected word:
	   one can therefore never protrude beyond the other, and selection still
	   changes paint only — never padding, line-height or rendered children. */
	.base {
		padding: 0.06em 0.069em calc(var(--reading) * var(--gloss-gap));
		/* The wash wants a little air around the letters; the LETTERS must
		   not move for it. Horizontal padding on an inline box is layout,
		   not just paint, so that 0.1rem was pushing every Latin word
		   1.6px into its ruby column while the gloss started at the column
		   edge — which is why the glosses read as sitting further left
		   than the Latin. Cancelled here: the wash keeps its air, the text
		   keeps the margin. */
		margin-inline: -0.069em;
		border-radius: 0.172em;
	}

	button.word {
		cursor: pointer;
	}

	.token:where(
			:has(> button.word:hover),
			:has(> button.word:focus-visible),
			.word-selected
		)::before {
		content: '';
		position: absolute;
		/* MORE THAN HALF THE GAP between two words, so two tints always meet
		   and the page never shows between them (owner, 2026-08-09). They
		   may overlap by a fraction of a pixel; nothing depends on their
		   paint order any more, because a focused word makes a stacking
		   context of its own.

		   Half the gap exactly was tried, and that is not a number that
		   exists: the gap measures 0.0625em on a Mac and 0.079em on the
		   Linux runner. Font metrics again — the same trap that made a
		   measure tuned in `ch` land 40px out. So this is sized for the
		   wider of the two rather than for the one in front of me, and the
		   test states the rule relatively: they meet, and they do not
		   overlap enough to read as one band. */
		inset-block: var(--selection-block-start) var(--selection-block-end);
		inset-inline: -0.05em;
		border-radius: 0.172em;
		background: var(--wash);
		z-index: -1;
	}

	.token.word-selected::before {
		/* Persistent selection outranks transient hover and focus. `:where()`
		   deliberately keeps the shared surface rule less specific: otherwise
		   desktop hover and the sticky hover left by a phone tap dilute this
		   strong wash back to the ordinary affordance colour. */
		background: var(--wash-strong);
	}

	/* On the word under analysis the gloss is the thing being read, and the
	   strong wash is too close to the soft ink for text this size (4.0:1).
	   Primary ink both clears AA and matches where the reader is looking.
	   Guarded by tests/contrast.spec and the axe sweep. */
	button.word.selected rt {
		color: var(--ink);
	}

	/* The ring belongs to the same permanent token surface as its wash, not
	   to the button's browser outline. It is therefore visible without ever
	   changing the line box or stealing space from neighbouring words. */
	button.word:focus-visible {
		outline: none;
	}

	.token:has(> button.word:focus-visible) {
		position: relative;
		z-index: 1;
	}

	/* Drawn INSIDE the wash, on its own edge. Offset outward by even 1px and
	   two things go wrong at once: the page shows through between the tint
	   and the ring, and the ring reaches into the words on either side —
	   the gap between two words is a space, and there is not a pixel of it
	   to spare (owner, 2026-08-09). A negative offset the width of the
	   ring puts its outer edge exactly on the tint's, so the focused word
	   is one chip and takes no more room than it did unfocused. */
	.token:has(> button.word:focus-visible)::before {
		outline: 2px solid var(--rubric);
		outline-offset: -2px;
	}

	ruby {
		ruby-position: under;
		/* A word and its gloss share a column as wide as the LONGER of
		   them, and ruby's default is to centre both in it. Mid-line that
		   is invisible; at the head of a line it is not — "Fiat" over
		   "niech się stanie" was pushed 26px into its column and read as a
		   deliberate indent, which is what the owner saw. Aligned to the
		   start instead, so every word begins where its column begins and
		   every gloss begins under its own word, which is how a printed
		   interlinear is set anyway. The slack all falls to the right of
		   whichever of the two is shorter.

		   Prefixed for WebKit; where neither is honoured the layout
		   degrades to the centred version, which is what it was. */
		-webkit-ruby-align: start;
		ruby-align: start;
	}

	/* Upright, and larger. The gloss is read WORD BY WORD, in short bursts,
	   at the size of a footnote — and EB Garamond's italic at 12.7px is too
	   light for that, which is what made it hard to read. It is already
	   told apart from the Latin by size and by colour; the slope was doing
	   no work the other two were not. */
	rt {
		font-size: 0.64em;
		color: var(--ink-soft);
		letter-spacing: 0.01em;
		/* The gloss is apparatus, not text: a selection swept across the
		   verse must copy the LATIN alone, not "Dadaj mihimi" — the
		   annotation excluded itself from every selection the moment it
		   was allowed into one (the owner pasted the result). */
		user-select: none;
		-webkit-user-select: none;
		/* One Latin word often needs several words to gloss it — 49 of the
		   163 glosses in the English Credo — and the gloss has to read as
		   ONE thing under ONE word, or the word-by-word correspondence
		   that the whole apparatus rests on is broken: "having suffered"
		   split over two lines reads as two glosses.

		   The Leipzig Glossing Rules solve this by joining such a gloss
		   with periods (`come.out`), which is right for a linguistics
		   paper and wrong for someone praying — "let.it.be.done" is not
		   readable. Same guarantee, kept in the layout instead: the words
		   stay, the break does not. (It happens not to break today even at
		   280px, because the ruby column sizes to the longer of the two —
		   this states the invariant rather than relying on that.) */
		white-space: nowrap;
	}

	/* A rubric is not another line of the prayer: it is a different voice,
	   in red, with a rule down its edge. It takes a step more air above it
	   than one line of a prayer takes from the next — the margins collapse,
	   so this is the one that decides the gap. */
	.rubric {
		/* A rubric sits BETWEEN two verses and should look equally far from
		   each (owner, 2026-08-09); it was 29px from the one above and 18
		   from the one below. Equal ink, not equal margins: a glossed verse
		   paints its gloss row --gloss-gap below the box the margin hangs
		   from, so clearing that overhang is what buys the same daylight
		   above as below. The two together still spend the 2.0 the old pair
		   spent, so the page's rhythm is unchanged. */
		margin: calc(var(--reading) * (1 + var(--gloss-gap))) 0 calc(var(--reading) * 1);
		border-inline-start: 2px solid var(--rubric);
		padding-inline-start: calc(var(--reading) * 0.621);
	}

	/* HALF-LEADING IS NOT INK, and the eye only sees ink. The pair above
	   balances the BOXES, and with the glosses showing the owner still read
	   the rubric as belonging to the text above it: 26px of daylight over,
	   45 under. Measured in glyphs rather than boxes, which is what the
	   reader measures in.

	   Both numbers come from line-height 2.3 on a glossed verse. It is a
	   third of a line of air ABOVE the first Latin glyph of the verse
	   below — inside that verse's own box, so no margin here can see it —
	   and the gloss row of the verse above hangs past its box the other
	   way. Neither is visible to the box model; together they move the
	   rubric two thirds of the way toward the text above it.

	   So the two corrections only exist while the glosses do, and each
	   names the state that causes it. Bare Latin (help 0) already balanced
	   at 41/38 and is deliberately left alone. */
	.verse.glossed + .rubric {
		margin-top: calc(var(--reading) * (1 + var(--gloss-gap) + 0.43));
	}

	.rubric:has(+ .verse.glossed) {
		margin-bottom: calc(var(--reading) * 0.61);
	}

	/* EVERY KIND OF TEXT ENDS WHERE THE LATIN ENDS (owner, 2026-08-09).
	   Verse, rubric, narrative and translation all run to the one right
	   edge of the column, so the page has one right margin and not four.
	   None of them carries a measure of its own.

	   That replaced a set of per-block `ch` caps meant to hold each kind
	   of prose to a classical measure, and two things were wrong with
	   them. They stopped the prose some 200px short of the Latin standing
	   directly above it, which a reader takes for a fault rather than for
	   a measure. And `ch` is the width of a zero in whatever font ACTUALLY
	   LOADED: the three numbers that landed within 4px of each other on a
	   Mac landed 40px apart on the Linux runner, and the test written to
	   hold them together is what caught it. A measure tuned in `ch` across
	   three different faces is not a measure, it is a coincidence.

	   The column already bounds the line without any of that: `.page`
	   caps at 896px, so prose reaches about 105 characters at the
	   smallest reading size on the widest screen, and fewer at every
	   larger size. */
	.rubric-la {
		margin: 0;
		color: var(--rubric);
		font-size: calc(var(--reading) * 0.724);
	}

	.rubric-narrative {
		margin: calc(var(--reading) * 0.172) 0 0;
		color: var(--ink-soft);
		font-size: calc(var(--reading) * 0.676);
		line-height: 1.5;
	}

	/* Translations get the same typographic treatment as rubric narratives —
	   a thin vertical hairline with an indent — so the page stays layered
	   text, not cards: red hairline = what happens, neutral = what it means. */
	/* THE TRANSLATION'S TWO HOMES (bilingual is the only mode that renders
	   one, so everything here describes that mode).

	   STACKED — a narrow container, or a phone: the translation sits
	   close under its own verse and clearly further from the next, in a
	   quieter voice than the Latin (a touch smaller, soft ink) because
	   interleaved same-size roman in two languages blurs whose line is
	   whose at a glance. The old spacing compensated for a gloss row that
	   no longer exists in this mode — the mode change retired a year of
	   margin archaeology (0.345, 0.621, the 0.09 paddings) along with the
	   hairline, whose work the alternation now does.

	   COLUMNS — see .bilingual below: the translation becomes a PEER of
	   the Latin, same size, same ink, same leading, position doing all
	   the distinguishing. */
	.seg-extra {
		margin: 0 0 calc(var(--reading-bare) * 0.9);
		padding-inline-start: calc(var(--reading) * 1.379);
	}

	/* The verse gives up part of its own bottom margin when a translation
	   follows: attachment is the point, and margins between siblings
	   collapse to the LARGER one, so the verse's own bottom margin would
	   otherwise hold the translation a full rhythm away. */
	.verse:has(+ .seg-extra) {
		/* Priced from ink measurements AT THE BARE SCALE (repriced
		   2026-08-21 when the bare modes tightened to 1.5 leading — the
		   first price was −0.06 against 1.75's deeper half-leading, and
		   at 1.5 it left 7.6px of ink air, under the 10px the attachment
		   bounds hold). The verse's 1.5 leading leaves ~5px below its
		   last baseline and the translation brings ~4px of its own
		   above; +0.09 of a line lands the ink gap near 12px against
		   ~28 below: attached, unmistakably. */
		margin-bottom: calc(var(--reading) * 0.09);
	}

	.translation {
		margin: 0;
		/* No measure of its own — it ends where the Latin above it ends;
		   see the rule over .rubric-la. This is the block that started
		   that change: capped, it broke at little more than half the width
		   the line above it used, and a psalm verse of 77 characters
		   wrapped where its own Latin had not. */
		color: var(--ink-soft);
		/* 0.9 of the BARE verse above it: the subordinate voice follows
		   the text it translates, and soft ink plus the indent carry the
		   hierarchy that size used to overstate. (Its history in one line:
		   0.724 of the study size until the readability audit of
		   2026-08-20 found it optically ~13px, 0.78 after, and rebased on
		   the bare scale when the modes split — 17.6px today, above the
		   audit's soft-ink floor.) */
		font-size: calc(var(--reading-bare) * 0.9);
		line-height: 1.55;
		text-wrap: pretty;
	}

	/* THE BILINGUAL SPREAD. Above ~44rem of container the bilingual mode
	   splits into the two columns of a hand missal, verse against verse —
	   INSIDE the standard frame, at the bare reading scale (--reading-bare,
	   app.css). One frame for every mode was the owner's ruling
	   (2026-08-21, second morning): the first cut widened the page to
	   72rem instead, and the text outgrowing its own chrome read as a
	   leftward shift. At the bare scale the Latin column runs 42-49
	   characters in the frame's half — Missale Meum's own desktop
	   geometry, measured (two ~420px columns in a 900px text area).
	   rem in the query scales with the root knob, so larger print
	   demands a wider room before the page splits.

	   Baseline alignment is what makes the rows TRUE: the first baseline
	   of the translation sits on the first baseline of its verse — raised
	   initial, wrapped lines and all — because with equal type and equal
	   leading the grid can align what the eye actually reads. The row gap
	   carries the rhythm the verse margins carry when stacked; inside the
	   grid those margins are zeroed so no row is taller than its content
	   from either column's side. */
	.bilingual {
		container: bilingual / inline-size;
	}

	/* The book measure for bare text that is not in columns: ~66
	   characters at the bare scale, centred on the title's own axis.
	   rem, so the root knob widens it with the type. Shared by Latin
	   and by bilingual's stacked face below the column threshold. */
	.measure,
	.columns {
		max-width: 36rem;
		margin-inline: auto;
	}

	/* The mode wrappers' edges defer to the margins OUTSIDE them, the way
	   flow collapse always did — in BOTH faces of przekład, because the
	   landing's flex specimen collapses nothing either: without this the
	   first rubric's margin stacked on the section seam in columns (the
	   owner's find, measured by the campaign), and the last translation's
	   margin pushed the landing's analysis box 43px from text the other
	   modes keep at 26 (the owner's second find, same page). The drop-cap
	   reservation is an inline style and outranks the first-child zero. */
	.columns > :first-child,
	.measure > :first-child {
		margin-top: 0;
	}

	.columns > :last-child,
	.measure > :last-child {
		margin-bottom: 0;
	}

	/* …and in a translated LAST row both cells yield, or the verse's row
	   margin stretches the final track and the seam grows by exactly one
	   verse-rhythm in the columns face alone (measured 36.3 where every
	   other mode reads 25.6). */
	.columns > .verse:has(+ .seg-extra:last-child) {
		margin-bottom: 0;
	}

	@container bilingual (min-width: 44rem) {
		.columns {
			max-width: none;
			margin-inline: 0;
			display: grid;
			/* EQUAL columns (owner, 2026-08-21: with 1.12fr/1fr the Polish
			   read as a bigger face — same type both sides, measured to the
			   glyph, but the longer language sat in the narrower column and
			   filled its lines fuller). Equal halves are also Missale
			   Meum's own desktop shape, and they put the seam on the
			   title's axis. */
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			column-gap: 2.6rem;
			align-items: baseline;
		}

		/* NO BLANKET ROW-GAP. A grid inserts its gap between EVERY row and
		   collapses no margins — so the rubrics, the speaker labels and
		   the folded prayers, whose flow margins were priced for collapse,
		   all drifted apart in columns (the geometry campaign measured
		   49px where flow shows 23). The verse rows carry the rhythm
		   themselves — priced on the BARE scale (owner: on the study scale
		   it was a third too much air) — and the pair rules below give the
		   full-width children exactly the distances flow's collapse gave
		   them. */
		.columns > .verse,
		.columns > .seg-extra {
			margin-bottom: calc(var(--reading-bare) * 0.55);
		}

		/* before a full-width child, the verse ROW yields its margin — in
		   flow it collapsed into the child's larger one. Both cells of a
		   translated row must yield: the verse's next sibling is its own
		   translation, so the rubric hides one sibling further on, and a
		   verse that kept its margin stretched the row track and pushed
		   the rubric 50px from ink the flow keeps at 29 (the campaign's
		   probe, then the centrality test). */
		.columns > .verse:has(+ :is(.rubric, .who, .repeated-prayer)),
		.columns > .verse:has(+ .seg-extra + :is(.rubric, .who, .repeated-prayer)),
		.columns > .seg-extra:has(+ :is(.rubric, .who, .repeated-prayer)) {
			margin-bottom: 0;
		}

		/* between two full-width children only the first's bottom margin
		   speaks, as collapse decided; two rubrics keep the extra
		   --gloss-gap their flow pair spends */
		.columns > :is(.rubric, .repeated-prayer) + :is(.rubric, .who, .repeated-prayer) {
			margin-top: 0;
		}

		.columns > .rubric + .rubric {
			margin-top: calc(var(--reading) * var(--gloss-gap));
		}

		.columns > * {
			grid-column: 1 / -1;
		}

		.columns > .verse {
			grid-column: 1;
			margin-top: 0;
		}

		.columns > .seg-extra {
			grid-column: 2;
			margin-top: 0;
			padding-inline-start: 0;
		}

		.columns > .seg-extra .translation {
			font-size: var(--reading-bare);
			/* parity of leading with the verse column — equal type AND equal
			   rhythm is what lets the grid align what the eye reads */
			line-height: 1.5;
			color: var(--ink);
		}
	}

	@media print {
		.translation-sources {
			display: none;
		}

		/* The fold is part of the current reading state. A closed repeated
		   prayer costs one quiet line on paper; one the reader opened remains
		   open. Only the show/hide affordance disappears. Native details then
		   gives print exactly the same open state as the screen. */
		.repeated-prayer {
			break-inside: avoid;
			margin: calc(var(--reading) * 0.36) 0;
		}

		.repeated-prayer > summary {
			display: flex;
			gap: 0;
			padding: 0;
			cursor: default;
			break-after: avoid;
		}

		.repeated-prayer > summary::before,
		.repeated-action {
			display: none;
		}

		.repeated-title {
			font-size: calc(var(--reading) * 0.78);
		}

		.repeated-prayer > .repeated-body {
			margin-top: calc(var(--reading) * 0.24);
		}

		.verse,
		.rubric,
		.seg-extra,
		.litany-pair {
			break-inside: avoid;
		}

		.who {
			break-after: avoid;
			margin: calc(var(--reading) * 0.5) 0 calc(var(--reading) * 0.08) !important;
		}

		.who:has(+ .verse .initial) {
			padding-top: calc(var(--reading) * 0.12);
		}

		.verse {
			line-height: 1.48;
			margin-bottom: calc(var(--reading) * 0.42);
		}

		.verse.glossed {
			line-height: 2.03;
			margin-bottom: calc(var(--reading) * var(--gloss-gap));
		}

		rt {
			font-size: 0.67em;
		}

		.rubric,
		.verse.glossed + .rubric,
		.rubric:has(+ .verse.glossed) {
			margin-top: calc(var(--reading) * 0.68);
			margin-bottom: calc(var(--reading) * 0.68);
		}

		.seg-extra {
			break-before: avoid;
			margin: calc(var(--reading) * 0.38) 0 calc(var(--reading) * 0.32);
		}

		.litany-pair {
			grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr) !important;
			column-gap: calc(var(--reading) * 0.38);
		}

		.token::before {
			display: none;
		}

		button.word.selected rt {
			color: var(--ink-soft);
		}

		button.mark,
		button.mark:hover {
			text-decoration: none;
		}
	}

	/* Even A6 gains more from complete side-by-side responses at this compact
	   face. Stack only on genuinely narrower custom stock, where each column
	   would have less than a useful prayer-book measure. */
	@media print and (max-width: 85mm) {
		.litany-pair {
			grid-template-columns: minmax(0, 1fr) !important;
		}
	}
</style>
