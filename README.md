# Scrutabor

_Pray in Latin with understanding._

A reading and prayer companion for Latin sacral texts — the traditional
Roman liturgy (1962) first, the Church's common prayers next — in which
the text itself is the interface: every Latin word can be tapped for its
lemma, full morphological analysis, gloss, and an explanation of its
function in the sentence — _why Deo and not Deum_. Liturgical rubrics
carry a narrative layer describing what is happening at the altar.

**Status: working edition.** Four texts so far — the Confiteor, Pater
noster, Ave Maria, and Gloria Patri — fully annotated in Polish and
English. The annotated data lives in
[scrutabor-corpus](https://github.com/scrutabor/scrutabor-corpus), where
every analysis carries sources, confidence, and review state.

## Reading model

- **Help slider** with three verbosity levels: bare Latin · word-by-word
  interlinear glosses · everything, adding per-verse translations and
  rubric narratives as quiet hairline-marked text.
- **Tap any word** at any level for the full three-layer analysis: the
  dictionary entry (head, senses, lemma notes), the parse rendered from
  structured morphology, and the contextual note for this sentence.
  Cross-references jump to the related word; grammar terms in the parse
  line link to concept pages.
- **Lemma pages** (`/pl/lemma/oro`) with a concordance — every place the
  word appears across the texts, each occurrence a deep link that opens
  the reading view on that word.
- **Grammar pages** (`/pl/grammatica`) — the cases, moods, and
  constructions of the prayers, every example drawn from the corpus.
- Polish and English interfaces (`/pl`, `/en`), light and dark themes,
  and typography treated as a feature: EB Garamond with real interlinear
  ruby annotations. The word panel follows bottom-sheet conventions:
  back closes it, tapping outside dismisses it, and the URL always
  deep-links to the open word.

## Development

```bash
npm ci
npm run dev        # dev server
npm run check      # svelte-check
npm run lint       # prettier + eslint + stylelint
npm run test:unit  # vitest (rendering logic, data-snapshot consistency)
npm run test:e2e   # playwright against the built static site
npm run build      # static site into build/
```

CI runs lint, check, build, and both test suites on every push.

SvelteKit with the static adapter — the site prerenders completely; every
text page is plain HTML before any JavaScript runs. No backend. Runtime
dependencies are deliberately minimal.

## License

[AGPL-3.0](LICENSE). The liturgical texts and annotations come from
[scrutabor-corpus](https://github.com/scrutabor/scrutabor-corpus)
(CC BY-SA 4.0).
