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
		ontap
	}: {
		doc: TextDocument;
		gloss: GlossDocument;
		lang: Lang;
		helpLevel: number;
		selectedId?: string | null;
		/** Namespaces the DOM ids, for pages that show more than one text. */
		idPrefix?: string;
		ontap?: (id: string) => void;
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
	// otherwise carry a label above every line of it — and the reader's own
	// part is named once, on the first line that is theirs. After that the
	// red marks and the rail carry it alone, which is how a missal does it.
	const firstAt = $derived.by(() => {
		const seen: Record<string, number> = {};
		doc.segments.forEach((s, i) => {
			if (s.type === 'verse' && s.speaker && !(s.speaker in seen)) seen[s.speaker] = i;
		});
		return seen;
	});
	const firstMine = $derived(
		doc.segments.findIndex((s) => s.type === 'verse' && isYours(s.speaker, role.value))
	);
	const namesSpeaker = (i: number) => {
		const sp = doc.segments[i]?.speaker;
		return answers && sp !== undefined && firstAt[sp] === i;
	};

	// The mark is printed where the VOICE TURNS, and nowhere else: four V.'s
	// down the petitions of the Pater noster say the same thing four times,
	// and the indent already says the line belongs to the voice above it
	// (owner, 2026-08-06).
	//
	// Rubrics do not reset it. They were reprinting the mark at first, on
	// the argument that a direction interrupts the thread — but Per ipsum
	// carries a rubric between every phrase of one doxology, and it came
	// back marked V. four times over, which is the noise this rule exists
	// to remove. A rubric is set apart in red and railed; the text column
	// runs on underneath it, and that is what says the voice has not
	// changed.
	const marked = (i: number) => {
		const sp = doc.segments[i]?.speaker;
		if (!sp) return false;
		for (let j = i - 1; j >= 0; j--) {
			if (doc.segments[j].type === 'verse') return doc.segments[j].speaker !== sp;
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
	// inline-block and that is where the pseudo-element stops.
	//
	// It goes on the first line with something to say — "Orémus." on its own
	// is a call to pray, and the book gives the initial to the prayer that
	// follows it, not to it.
	const firstVerse = $derived(
		isDialogue
			? -1
			: doc.segments.findIndex((s) => s.type === 'verse' && (s.words?.length ?? 0) >= 3)
	);
</script>

{#snippet face(id: string, form: string, raised = false)}{#if raised}<span class="initial"
			>{form.slice(0, 1)}</span
		>{/if}<ruby
		>{raised ? form.slice(1) : form}{#if helpLevel >= 1}<rt {lang}>{gloss.words[id]?.gloss}</rt
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
		{@const saysYours = mine && i === firstMine}
		{#if namesSpeaker(i) || saysYours || (seg.voice && seg.voice !== 'clara')}
			<p class="who" class:yours={mine}>
				{#if namesSpeaker(i) && seg.speaker}<span class="who-name"
						>{M[lang].speakers[seg.speaker]}</span
					>{/if}
				{#if seg.voice && seg.voice !== 'clara'}<span class="who-voice"
						>{M[lang].voices[seg.voice]}</span
					>{/if}
				{#if saysYours}<span class="who-yours"
						>{M[lang].yoursLabel[role.value === 'sacerdos' ? 'say' : 'answer']}</span
					>{/if}
			</p>
		{/if}
		{@const showMark = marked(i)}
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
			{#if showMark && seg.speaker && MARKS[seg.speaker]}<abbr
					class="mark"
					class:yours={mine}
					title={M[lang].markTitle[seg.speaker]}
					aria-hidden="true">{MARKS[seg.speaker]}</abbr
				><span class="sr-only"
					>{M[lang].speakers[seg.speaker]}:
				</span>{/if}{#each seg.words ?? [] as w, wi (w.id)}{@const raised =
					i === firstVerse && wi === 0}<span class="token"
					>{#if ontap}<button
							class="word"
							id={domId(w.id)}
							class:selected={selectedId === domId(w.id)}
							onclick={() => ontap?.(domId(w.id))}>{@render face(w.id, w.form, raised)}</button
						>{:else}<span class="word">{@render face(w.id, w.form, raised)}</span>{/if}{w.post ??
						''}</span
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

	.who-yours {
		color: var(--rubric);
	}

	/* The speaker's mark, in the red the books use for everything that is
	   not the text itself. Fixed width, so the marks read as a column of
	   their own and the Latin beside them keeps one straight edge — the
	   way S. and M. sit in a hand missal. Works at every width: the mark
	   is part of the line, not something hung in a margin a phone does
	   not have. */
	.mark {
		display: inline-block;
		width: 2rem;
		color: var(--rubric);
		font-size: 0.95rem;
		user-select: none;
		/* an <abbr>, because that is what it is — a letter standing for a
		   word — but without the underline browsers give one, which beside
		   Latin would read as a link */
		text-decoration: none;
		cursor: help;
	}

	/* Your own lines carry a heavier mark: the page should answer "which
	   of these do I say?" from across a pew, before any word is read. */
	.mark.yours {
		font-weight: 600;
	}

	/* The opening initial, red, standing on the same baseline as the word it
	   begins — large enough to open the prayer, not so large that it opens a
	   hole in the line above. */
	.initial {
		color: var(--rubric);
		font-size: 1.75em;
		line-height: 0;
		text-indent: 0;
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

	.verse.glossed {
		line-height: 2.7;
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
		padding: 0 0.1rem;
		margin: 0;
		border-radius: 0.25rem;
		color: inherit;
	}

	button.word {
		cursor: pointer;
	}

	button.word:hover {
		background: var(--wash);
	}

	button.word.selected {
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

	rt {
		font-size: 0.55em;
		font-style: italic;
		color: var(--ink-soft);
		letter-spacing: 0.01em;
	}

	.rubric {
		margin: 0 0 1.1rem;
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
