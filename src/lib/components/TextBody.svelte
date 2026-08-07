<script lang="ts">
	import type { GlossDocument, TextDocument } from '$lib/corpus';
	import { M, type Lang } from '$lib/i18n';
	import { isYours, role } from '$lib/role.svelte';
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
		citedVerse = null
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
		minister: 'R.',
		populus: 'R.',
		omnes: 'O.',
		schola: 'R.'
	};

	// The editorial rules — who is marked, whose voice is named, which verse
	// opens with the initial — are pure functions of the segments and live in
	// $lib/speaker-marks with their reasons and their tests. What is here is
	// only the binding of them to this document.
	const segs = $derived(doc.segments);
	const answers = $derived(marks.hasAnswers(segs));
	const namesSpeaker = (i: number) => marks.namesSpeaker(segs, i);
	const marked = (i: number) => marks.marked(segs, i);
	const namesVoice = (i: number) => marks.namesVoice(segs, i);
	const firstVerse = $derived(marks.firstVerseWithInitial(segs));
</script>

{#snippet face(id: string, form: string, post = '', raised = false, sink = 0)}{@const fit =
		initialFit(form.slice(0, 1), helpLevel >= 1)}<ruby
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
		>{#if helpLevel >= 1}<rt
				style:top="calc(var(--reading) * (var(--gloss-gap) + {sink - (raised ? fit.lift : 0)}))"
				class="shifted"
				{lang}>{gloss.words[id]?.gloss}</rt
			>{/if}</ruby
	>{/snippet}

{#each doc.segments as seg, i (seg.id)}
	{#if seg.type === 'rubric'}
		<div class="rubric">
			<p class="rubric-la" lang="la">{seg.text}</p>
			<!-- Narratives ride with any help (reading-ux §5): knowing what
			     happens at the altar is word-level-grade help; translations
			     alone stay at the top step. -->
			{#if helpLevel >= 1 && gloss.segments[seg.id]?.narrative}
				<p class="rubric-narrative">{gloss.segments[seg.id].narrative}</p>
			{/if}
		</div>
	{:else}
		<!-- Who says it, and how loudly. Absent attribution renders as
		     nothing at all: the corpus says "not read yet" by leaving the
		     field out, and a missal that guessed would be worse than one
		     that is silent. The reader's own lines carry the strongest
		     mark, because finding them at a glance is the whole point. -->
		{@const mine = answers && isYours(seg.speaker, role.value)}
		{@const showVoice = namesVoice(i)}
		{#if namesSpeaker(i) || showVoice}
			<p class="who" class:yours={mine}>
				{#if namesSpeaker(i) && seg.speaker}<span class="who-name"
						>{M[lang].speakers[seg.speaker]}</span
					>{/if}
				{#if showVoice && seg.voice && seg.voice !== 'clara'}<span class="who-voice"
						>{M[lang].voices[seg.voice]}</span
					>{/if}
			</p>
		{/if}
		{@const showMark = marked(i)}
		{@const verseNo = seg.speaker ? undefined : verses?.[seg.id]}
		<!-- The gloss row of a verse whose initial reaches below the line
		     sinks together, so the glosses stay level with each other. -->
		{@const sink =
			i === firstVerse
				? initialFit(seg.words?.[0]?.form.slice(0, 1) ?? '', helpLevel >= 1).sink
				: 0}
		<p
			class="verse"
			class:glossed={helpLevel >= 1}
			class:quiet={seg.voice === 'secreto'}
			class:answer={mine}
			class:marked={showMark || verseNo !== undefined}
			class:cited={verseNo !== undefined && verseNo === citedVerse}
			id={verseNo !== undefined ? `v${verseNo}` : undefined}
			lang="la"
		>
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
			{#if showMark && seg.speaker && MARKS[seg.speaker]}{#if onmark}<button
						type="button"
						class="mark"
						class:yours={mine}
						aria-label={M[lang].markTitle[seg.speaker]}
						onclick={onmark}>{MARKS[seg.speaker]}</button
					>{:else}<span class="mark" class:yours={mine} aria-hidden="true"
						>{MARKS[seg.speaker]}</span
					>{/if}<span class="sr-only"
					>{M[lang].speakers[seg.speaker]}:
				</span>{:else if verseNo !== undefined}{#if onverse}<button
						type="button"
						class="mark"
						aria-label={M[lang].verseAria(verseNo)}
						aria-pressed={verseNo === citedVerse}
						onclick={() => onverse?.(verseNo)}>{verseNo}</button
					>{:else}<span class="mark">{verseNo}</span
					>{/if}{/if}{#each seg.words ?? [] as w, wi (w.id)}{@const raised =
					i === firstVerse && wi === 0}<span class="token"
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
{/each}

<style>
	/* The attribution line: small caps, quiet, above the words it names —
	   the shape a missal uses for its S. and M. */
	.who {
		margin: 0 0 calc(var(--reading) * 0.103);
		font-size: calc(var(--reading) * 0.497);
		letter-spacing: 0.09em;
		text-transform: lowercase;
		font-variant-caps: small-caps;
		color: var(--ink-soft);
		display: flex;
		gap: calc(var(--reading) * 0.414);
		align-items: baseline;
	}

	.who-voice {
		font-style: italic;
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

	button.mark:focus-visible {
		outline: 2px solid var(--rubric);
		outline-offset: 2px;
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
	.verse {
		font-size: var(--reading);
		line-height: 1.75;
		margin: 0 0 calc(var(--reading) * 0.759);
		padding-inline-start: calc(var(--reading) * 1.379);
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
		line-height: 2.3;
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
	}

	.word {
		font: inherit;
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		color: inherit;
	}

	/* The highlight hugs the LATIN, not the ruby box. A ruby's box holds
	   its annotation as well, and once the gloss row was given its own air
	   the annotation hung below the box that was drawing the highlight —
	   so a tapped word came back with a wash that started above the letters
	   and ended in the middle of the gloss beneath them. */
	/* The wash marks the PAIR — the word and the gloss under it — not the
	   word alone. A ruby base is stretched to its column and the column is
	   as wide as the longer of the two, so a short word under a long gloss
	   („Fiat" under „niech się stanie") came back with a box far wider
	   than itself and nothing said why. Measured: the glyphs of Fiat are
	   34px inside an 89px box, and no inner span can hug them — ruby
	   stretches its base's inline content, and an inline-block that
	   escaped that would disturb the line box the raised initial needs.
	   So the box is right and it was the MEANING that was missing: it
	   covers the gloss too now, which is what the column width was always
	   describing. The gap between the two is closed by padding, which on
	   an inline box paints without moving the line. */
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

	button.word:hover .base,
	button.word:hover rt {
		background: var(--wash);
	}

	button.word.selected .base,
	button.word.selected rt {
		background: var(--wash-strong);
	}

	/* On the word under analysis the gloss is the thing being read, and the
	   strong wash is too close to the soft ink for text this size (4.0:1).
	   Primary ink both clears AA and matches where the reader is looking.
	   Guarded by tests/contrast.spec and the axe sweep. */
	button.word.selected rt {
		color: var(--ink);
	}

	button.word:focus-visible {
		outline: 2px solid var(--rubric);
		outline-offset: 2px;
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
		margin: calc(var(--reading) * 1.241) 0 calc(var(--reading) * 0.759);
		border-inline-start: 2px solid var(--rubric);
		padding-inline-start: calc(var(--reading) * 0.621);
	}

	/* The verses can take the whole of a wide column, because a line of
	   them is only as long as the words on it and every word is as wide as
	   its gloss. The PROSE cannot: rubrics, their narratives and the
	   translations are ordinary sentences, and at 56rem they were running
	   to 127 characters a line. Capped in `ch`, so each block is held to a
	   reading measure by its OWN type rather than by a number of rem that
	   is only right for one of them. */
	.rubric-la {
		margin: 0;
		max-width: 62ch;
		color: var(--rubric);
		font-style: italic;
		font-size: calc(var(--reading) * 0.724);
	}

	.rubric-narrative {
		margin: calc(var(--reading) * 0.172) 0 0;
		max-width: 62ch;
		color: var(--ink-soft);
		font-size: calc(var(--reading) * 0.676);
		line-height: 1.5;
	}

	/* Translations get the same typographic treatment as rubric narratives —
	   a thin vertical hairline with an indent — so the page stays layered
	   text, not cards: red hairline = what happens, neutral = what it means. */
	/* A translation belongs to the verse above it, and the page has ONE
	   rhythm — so it sits a line's distance under the gloss row and the
	   next verse sits a line's distance under it, not jammed against one
	   and marooned from the other.
	   (It used to pull itself UP by 0.45rem, which worked while a glossed
	   verse carried 1.42rem of margin beneath it. That margin is 0.22rem
	   now — one rhythm — so the same negative pulled the translation into
	   the gloss row.)
	   Its rule stands in the gutter where the speaker marks hang, and its
	   text starts on the same left edge as the Latin: it is that verse in
	   another language, so it belongs in that verse's column. */
	.seg-extra {
		margin: calc(var(--reading) * 0.345) 0 calc(var(--reading) * 0.379);
		border-inline-start: 2px solid var(--wash-strong);
		padding-inline-start: calc(var(--reading) * 1.379 - 2px);
	}

	.translation {
		margin: 0;
		/* its face is wider than the narrative's for the same ch, so it
		   needs fewer of them to land on the same measure */
		max-width: 56ch;
		color: var(--ink-soft);
		font-style: italic;
		font-size: calc(var(--reading) * 0.724);
		line-height: 1.55;
	}
</style>
