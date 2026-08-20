# Scrutabor

_Prayer in Latin with understanding._

**Live at [scrutabor.org](https://scrutabor.org).**

A reading and prayer companion for Latin sacral texts — the traditional
Roman liturgy (1962) first, the Church's common prayers next — in which
the text itself is the interface: every Latin word can be tapped for its
lemma, full morphological analysis, gloss, and an explanation of its
function in the sentence — _why Deo and not Deum_. Liturgical rubrics
carry a narrative layer describing what is happening at the altar.

**Status: working edition.** The complete Ordinary of the 1962 Mass —
from the prayers at the foot of the altar through the Last Gospel — plus
the prayers after low Mass and a growing shelf of common prayers, fully
annotated in Polish and English. The annotated data lives in
[scrutabor-corpus](https://github.com/scrutabor/scrutabor-corpus), where
every analysis carries sources, confidence, and review state.

## Site layout

One origin, one build, two surfaces:

- **`/`** — the landing pages (`/pl`, `/en`): what Scrutabor is, the
  offline download, and the privacy page (`/pl/privacy`, `/en/privacy`).
  The root is a language router that redirects before first paint.
- **`/app`** — the book itself, with its own language router at `/app/`
  and every reading surface beneath it (`/app/pl`, `/app/pl/ordo`,
  `/app/pl/lemma/oro`, …). The web-app manifest and the service worker
  are scoped to `/app/`, so the installable, offline-capable thing is
  the book alone — a landing edit never touches a reader's offline copy.

## Reading model

- **Help slider** with three verbosity levels: bare Latin · word-by-word
  interlinear glosses · everything, adding per-verse translations and
  rubric narratives as quiet hairline-marked text.
- **Tap any word** at any level for the full three-layer analysis: the
  dictionary entry (head, senses, lemma notes), the parse rendered from
  structured morphology, and the contextual note for this sentence.
  Cross-references jump to the related word; grammar terms in the parse
  line link to concept pages.
- **Ordo Missæ flow** (`/app/pl/ordo`) — the whole order of Mass in six
  movements, with the reader's own part chosen: in the pew, server, or
  priest.
- **Lemma pages** (`/app/pl/lemma/oro`) with a concordance — every place
  the word appears across the texts, each occurrence a deep link that
  opens the reading view on that word.
- **Grammar pages** (`/app/pl/grammatica`) — the cases, moods, and
  constructions of the prayers, every example drawn from the corpus.
- Polish and English interfaces, light and dark themes, and typography
  treated as a feature: EB Garamond with real interlinear ruby
  annotations. The word panel follows bottom-sheet conventions: back
  closes it, tapping outside dismisses it, and the URL always deep-links
  to the open word.
- **A copy to keep** — `npm run build:offline` assembles the whole book
  as a folder (and `-- --zip` as `Scrutabor.zip`) that runs from a disk
  with no server at all. Each release attaches the zip as an asset, and
  the landing links the latest release's copy directly.

## Development

```bash
npm ci
npm run dev            # dev server
npm run check          # svelte-check
npm run lint           # prettier + eslint + stylelint
npm run test:unit      # vitest (rendering logic, data-snapshot consistency)
npm run test:e2e       # playwright against the built static site AND the offline folder
npm run build          # static site into build/
npm run build:offline  # the downloadable folder into build-offline/
```

CI runs lint, check, build, and both test suites on every push.

SvelteKit with the static adapter — the site prerenders completely; every
text page is plain HTML before any JavaScript runs. No backend. Runtime
dependencies are deliberately minimal.

## License

[AGPL-3.0](LICENSE). The liturgical texts and annotations come from
[scrutabor-corpus](https://github.com/scrutabor/scrutabor-corpus)
(CC BY-SA 4.0).
