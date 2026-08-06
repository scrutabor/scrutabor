<script lang="ts">
	import type { GlossDocument, TextDocument } from '$lib/corpus';
	import { M, type Lang } from '$lib/i18n';
	import { isYours, role } from '$lib/role.svelte';

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
		onmark
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

	// Two shapes, and the books set them differently.
	//
	// A DIALOGUE is voices trading lines — the preface dialogue, the psalm
	// said alternately with the server. The books mark every line of it,
	// ℣ and ℟ down the page, and give it no opening initial.
	//
	// A PRAYER is one voice saying the whole thing, and it ends with the
	// answer Amen. The books open it with a red initial and mark NOTHING
	// but that answer: no missal prints ℣ down the body of the Canon.
	//
	// The two are told apart by how often the voice changes: a prayer turns
	// over once, at the Amen; a dialogue keeps turning.
	const turns = $derived.by(() => {
		const speakers = doc.segments
			.filter((s) => s.type === 'verse' && s.speaker)
			.map((s) => s.speaker);
		return speakers.filter((sp, i) => i > 0 && sp !== speakers[i - 1]).length;
	});
	const isDialogue = $derived(turns >= 2);
	const answers = $derived(
		new Set(doc.segments.filter((s) => s.type === 'verse' && s.speaker).map((s) => s.speaker))
			.size > 1
	);

	// The mark says who says it; the NAME says what the mark means, and it
	// only has to say that once. Each speaker is named the first time it
	// appears in a text — a dialogue that alternates every line would
	// otherwise carry a label above every line of it.
	//
	// It used to add "you answer" on the reader's own first line. That is
	// gone: the page SHOWS whose line it is — the mark is red and heavy for
	// the reader's part and quiet for the other voice — and a book does not
	// need to tell its reader what to do with a line it has already marked
	// as theirs.
	const firstAt = $derived.by(() => {
		const seen: Record<string, number> = {};
		doc.segments.forEach((s, i) => {
			if (s.type === 'verse' && s.speaker && !(s.speaker in seen)) seen[s.speaker] = i;
		});
		return seen;
	});
	const namesSpeaker = (i: number) => {
		const sp = doc.segments[i]?.speaker;
		return answers && sp !== undefined && firstAt[sp] === i;
	};

	// Is there a rubric between this verse and the one before it? A
	// direction breaks the text apart on the page — red, railed, with its
	// own translation under it — and the eye that comes back down to the
	// Latin has lost the thread of whose words these are.
	const afterRubric = (i: number) => {
		for (let j = i - 1; j >= 0; j--) {
			if (doc.segments[j].type === 'verse') return false;
			if (doc.segments[j].type === 'rubric') return true;
		}
		return false;
	};

	// The mark prints where the voice TURNS, and again wherever a rubric has
	// broken the flow. Both halves are the owner's, and both are about the
	// same thing — a reader following Mass should never have to work out
	// where the last mark stopped applying:
	//
	//   * not on every line of one voice. Four V.'s down the petitions of
	//     the Pater noster say the same thing four times, and the indent
	//     already says a line belongs to the voice above it.
	//   * but yes after every rubric, even where that means Per ipsum takes
	//     a V. on each of its phrases: that prayer has a direction between
	//     every one of them, so the reader is coming back to the text each
	//     time, and each time is a place to be told.
	const marked = (i: number) => {
		const sp = doc.segments[i]?.speaker;
		if (!sp) return false;
		if (afterRubric(i)) return true;
		for (let j = i - 1; j >= 0; j--) {
			if (doc.segments[j].type === 'verse') return doc.segments[j].speaker !== sp;
		}
		return true;
	};

	// The voice follows the same rule, for the same reason: "silently" over
	// every line of a prayer said silently throughout is a label repeating
	// itself, but after a direction it is worth saying again.
	const namesVoice = (i: number) => {
		const seg = doc.segments[i];
		if (!seg?.voice || seg.voice === 'clara') return false;
		if (afterRubric(i)) return true;
		for (let j = i - 1; j >= 0; j--) {
			if (doc.segments[j].type === 'verse') return doc.segments[j].voice !== seg.voice;
		}
		return true;
	};

	// The initial the books open a prayer with, in red. RAISED, not dropped:
	// a dropped initial floats, and a float cuts straight through the gloss
	// line under the first words — this page carries an apparatus the
	// printers did not have to fit around. Raised is a missal device too,
	// and it sits on the baseline where the word-by-word layout expects it.
	//
	// It has to be split off the first word rather than styled through it:
	// ::first-letter never reaches the letter, because every word is an
	// inline-block and that is where the pseudo-element stops. It stays
	// INSIDE the ruby base, though. Setting it beside the ruby put the
	// gloss back on the line but left the base holding only "ax" of Pax
	// while the annotation read "The peace" — and ruby centres a short base
	// under a long annotation, which opened a gap after the initial wide
	// enough to read as a word break.
	//
	// It goes on the first line with something to say — "Orémus." on its own
	// is a call to pray, and the book gives the initial to the prayer that
	// follows it, not to it.
	// Fitting a letter set larger than the letters beside it. Three
	// measurements off the reading face itself (canvas actualBoundingBox
	// against the advance), and everything else follows from them.
	//
	// SIDEBEARINGS, as fractions of the letter's own size. Ink that CROSSES
	// the advance (Q's tail, A's diagonal) lands on the next glyph whatever
	// the font intended at 1em, so all of it is cleared; ink that STOPS
	// SHORT only leaves too big a gap, and only by what scaling added. No
	// kerning term: a pair kerned for two letters of one size says nothing
	// about a letter set nearly twice as large beside a small one, and
	// importing it pulled T's arm onto the e of Te ígitur.
	const SB: Record<string, [number, number]> = {
		P: [0.024, 0.025],
		S: [0.04, 0.043],
		C: [0.046, 0.055],
		A: [-0.002, -0.005],
		D: [0.029, 0.035],
		E: [0.037, 0.025],
		M: [0.019, 0.036],
		Q: [0.045, -0.116],
		I: [0.019, 0.018],
		G: [0.045, 0.036],
		H: [0.037, 0.04],
		L: [0.027, 0.009],
		O: [0.045, 0.045],
		B: [0.019, 0.04],
		N: [0.012, 0.01],
		V: [0.0, -0.006],
		T: [0.027, 0.002],
		U: [0.024, 0.01]
	};

	// DESCENT below the baseline, in the letter's own em. Q is the only
	// capital that opens a prayer in this corpus and reaches below the
	// line, and at 1.75 its tail put 3.6px into the gloss underneath.
	//
	// Shrinking it was the wrong answer — the owner's, and he is right: a Q
	// two-thirds the size of every other initial is a worse fault than the
	// one it fixes, and the ink is not where a sideways nudge could help
	// either (the tail falls straight over the START of the gloss word, so
	// clearing it that way would drag the gloss 36px off its own word).
	// The line gives way instead: the whole gloss row of that verse sinks
	// by what the tail needs, so the glosses stay level with EACH OTHER,
	// which is the alignment a reader can see, and only sit a hair lower
	// than the row of some other verse, which nobody can.
	// INK reach above and below the baseline, in the letter's own em. The
	// highlight is drawn on the base box, and that box is sized for text at
	// the reading size: an initial at 1.75 pokes out of the top of it, and
	// Q's tail out of the bottom. Padding on an inline element grows the
	// box it paints without touching the line, which is exactly what is
	// wanted — the wash covers the whole letter and the gloss does not move.
	const INK: Record<string, [number, number]> = {
		P: [0.658, 0.005],
		S: [0.664, 0.016],
		C: [0.663, 0.015],
		A: [0.686, 0.005],
		D: [0.659, 0.007],
		E: [0.653, 0.005],
		M: [0.656, 0.011],
		Q: [0.664, 0.248],
		I: [0.653, 0.005],
		G: [0.663, 0.014],
		H: [0.653, 0.005],
		L: [0.653, 0.005],
		O: [0.664, 0.014],
		B: [0.657, 0.005],
		N: [0.658, 0.017],
		V: [0.653, 0.012],
		T: [0.694, 0.005],
		U: [0.653, 0.014]
	};
	// how far the base's own box reaches, measured, less the padding it
	// already carries
	const BOX_ASC = 1.073 - 0.06;
	const BOX_DESC = 0.362 - 0.06;
	const PAD = 0.06;
	// The box measurement is of one rendering of one font, and the next
	// environment measures its own: 0.04em was enough for this machine's
	// build and left L 0.06px proud of its highlight on CI's. The margin
	// is 0.1em — about two pixels, which no one can see on a wash and no
	// rounding is going to cross.
	const COVER = 0.1;

	const DESCENT: Record<string, number> = { Q: 0.248 };
	// The gloss row sits GLOSS_GAP lower than ruby puts it, so a descender
	// has that much more room before it: measured 0.272em from the baseline
	// to the ink of the gloss, plus the gap.
	//
	// It used to be 0.32rem, chosen so that even the raised initial's tail
	// cleared the gloss without the line giving way — and that pushed the
	// gloss AWAY from the Latin it belongs to and towards the Latin below,
	// which on a verse that wraps left the two indistinguishable: measured
	// 1.3px to its own line against 2.0px to the next. A reader had no cue
	// which line a gloss went with, and the whole column read as evenly
	// spaced rather than as pairs. So it comes back to what an ordinary
	// descender actually needs (0.341em of room against a p or q's 0.24em),
	// and the raised initial does what it was always meant to do when its
	// tail is too long: sink that one verse's gloss row (see `sink`).
	const GLOSS_GAP = 0.22; // rem
	const ROOM_BELOW = 0.272 + GLOSS_GAP / 1.45;
	const RAISED = 1.75;
	// A large letter wants more room around it than its metrics ask for:
	// the one judgement in all of this, and what stops A reading as touching
	// the word before it while measuring as neutral on both sides.
	const AIR = 0.03;

	/** How far this verse's gloss row has to sink for the initial's tail,
	 * in rem — nothing at all unless the letter reaches below the line. */
	function sinkFor(letter: string, glossed: boolean): number {
		const descent = DESCENT[letter] ?? 0;
		if (!glossed || descent === 0) return 0;
		const over = descent * RAISED - ROOM_BELOW; // in the reading size's em
		return over <= 0 ? 0 : (over * 1.45) / 1 + 0.02; // reading size is 1.45rem
	}

	/** [font-size, margin-start, margin-end, gloss lift] for an initial, all
	 * in the initial's own em except the lift, which is the reading size. */
	function initialFit(letter: string, glossed: boolean) {
		const scale = RAISED;
		const [sbStart, sbEnd] = SB[letter] ?? [0, 0];
		const air = AIR / scale;
		const side = (sb: number) => (sb < 0 ? -sb + air : (-(scale - 1) / scale) * sb + air);
		return {
			scale,
			start: side(sbStart),
			end: side(sbEnd),
			// a taller glyph raises the ruby base box and the annotation rides
			// down with it: 4px measured at scale 1.75, and it scales with the
			// extra size, so 0.333rem for every 1 of it
			lift: (scale - 1) * 0.333,
			sink: sinkFor(letter, glossed),
			// the wash has to cover the whole letter, top and tail
			padTop: Math.max(PAD, (INK[letter]?.[0] ?? 0) * scale - BOX_ASC + COVER),
			padBottom: Math.max(PAD, (INK[letter]?.[1] ?? 0) * scale - BOX_DESC + COVER)
		};
	}

	const firstVerse = $derived(
		isDialogue
			? -1
			: doc.segments.findIndex((s) => s.type === 'verse' && (s.words?.length ?? 0) >= 3)
	);
</script>

{#snippet face(id: string, form: string, raised = false, sink = 0)}{@const fit = initialFit(
		form.slice(0, 1),
		helpLevel >= 1
	)}<ruby
		><span
			class="base"
			style:padding-top={raised ? `${fit.padTop}em` : null}
			style:padding-bottom={raised ? `${fit.padBottom}em` : null}
			>{#if raised}<span
					class="initial"
					style:font-size="{fit.scale}em"
					style:margin-inline-start="{fit.start}em"
					style:margin-inline-end="{fit.end}em">{form.slice(0, 1)}</span
				>{form.slice(1)}{:else}{form}{/if}</span
		>{#if helpLevel >= 1}<rt
				style:top="{GLOSS_GAP + sink - (raised ? fit.lift : 0)}rem"
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
			class:marked={showMark}
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
				</span>{/if}{#each seg.words ?? [] as w, wi (w.id)}{@const raised =
					i === firstVerse && wi === 0}<span class="token"
					>{#if ontap}<button
							class="word"
							id={domId(w.id)}
							class:selected={selectedId === domId(w.id)}
							onclick={() => ontap?.(domId(w.id))}
							>{@render face(w.id, w.form, raised, sink)}</button
						>{:else}<span class="word">{@render face(w.id, w.form, raised, sink)}</span
						>{/if}{w.post ?? ''}</span
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
		margin: 0 0 0.15rem;
		font-size: 0.72rem;
		letter-spacing: 0.09em;
		text-transform: lowercase;
		font-variant-caps: small-caps;
		color: var(--ink-soft);
		display: flex;
		gap: 0.6rem;
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
		width: 2rem;
		/* The OTHER voice's mark is quiet ink. Red is kept for the reader's
		   own lines, so that the answer to "which of these do I say?" is
		   the colour of the page rather than something to work out — the
		   way a bilingual missal sets the people's parts in bold. This is
		   what makes the choice of part change the page rather than only
		   its labels. */
		color: var(--ink-soft);
		font-size: 0.95rem;
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

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
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
		font-size: 1.45rem;
		line-height: 1.75;
		margin: 0 0 1.1rem;
		padding-inline-start: 2rem;
	}

	/* Only a line that carries a mark hangs out to the left for it. A line
	   continuing the same voice keeps the column, which is what says it is
	   still that voice. */
	.verse.marked {
		text-indent: -2rem;
	}

	/* Measured, because the proportions were backwards: a gloss sat ON the
	   Latin it belongs to (0.1px, sometimes touching a descender) with 27px
	   of nothing beneath it, so every pair read as two loose lines rather
	   than one word and its meaning.

	   Proximity is the only thing making that pairing legible, so the
	   three distances are set as a scale and not one at a time: a gloss
	   close to the Latin it glosses, a clear step to the next line of the
	   same verse, a clearer one to the next verse. The middle step is
	   line-height — with ruby-position: under there is no other lever for
	   the space between two lines of ONE verse, since the gloss hangs
	   inside the line box. */
	.verse.glossed {
		line-height: 2.3;
		/* The gloss row is shifted down by GLOSS_GAP, and a relative shift
		   moves paint without moving layout — so the last gloss of a verse
		   hangs below the box that carries the margin, and the verse gives
		   away that much of the space beneath it. Given back here, which is
		   why a rubric under a glossed line looked cramped while the same
		   rubric under another rubric looked right. */
		margin-bottom: calc(2.1rem + 0.22rem);
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
	.base {
		padding: 0.06em 0.1rem;
		border-radius: 0.25rem;
	}

	button.word {
		cursor: pointer;
	}

	button.word:hover .base {
		background: var(--wash);
	}

	button.word.selected .base {
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
	}

	/* A rubric is not another line of the prayer: it is a different voice,
	   in red, with a rule down its edge. It takes a step more air above it
	   than one line of a prayer takes from the next — the margins collapse,
	   so this is the one that decides the gap. */
	.rubric {
		margin: 1.8rem 0 1.1rem;
		border-inline-start: 2px solid var(--rubric);
		padding-inline-start: 0.9rem;
	}

	.rubric-la {
		margin: 0;
		color: var(--rubric);
		font-style: italic;
		font-size: 1.05rem;
	}

	.rubric-narrative {
		margin: 0.25rem 0 0;
		color: var(--ink-soft);
		font-size: 0.98rem;
		line-height: 1.5;
	}

	/* Translations get the same typographic treatment as rubric narratives —
	   a thin vertical hairline with an indent — so the page stays layered
	   text, not cards: red hairline = what happens, neutral = what it means. */
	.seg-extra {
		margin: -0.45rem 0 1.4rem;
		border-inline-start: 2px solid var(--wash-strong);
		padding-inline-start: 0.9rem;
	}

	.translation {
		margin: 0;
		color: var(--ink-soft);
		font-style: italic;
		font-size: 1.05rem;
		line-height: 1.55;
	}
</style>
