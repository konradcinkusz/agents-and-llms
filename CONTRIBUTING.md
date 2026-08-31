# Contributing

This repo is a static site: three HTML pages plus one JSON file. **No package.json, no
dependencies, no build step** — that is deliberate and it stays. Anything you add has to
work when the files are served as-is from GitHub Pages.

Almost every contribution is the same shape: **one new object in
[`concepts.json`](concepts.json)**. This page is how to write that object so it looks like
it was always there.

---

## Run it locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Serve it — don't double-click `index.html`. The page **`fetch()`es `concepts.json`**, and
browsers block `fetch()` on the `file://` origin, so opening the file directly gives you an
empty grid and a "couldn't load concepts.json" message. Any static server works; `python3`
is just the one everybody already has.

Then validate your edit:

```bash
node scripts/validate.mjs
```

The validator enforces the same rules as [`concepts.schema.json`](concepts.schema.json),
in plain JS so no JSON-schema library is needed: required fields, no unknown fields,
`kind` restricted to the five real categories, `lang` restricted to the four real values,
`id` shape and uniqueness, `videoUrl` empty-or-YouTube — plus the two things a schema can't
express on its own, duplicate `id`s and every `index.html#<id>` link in the essay pages
resolving to a real tile. It also **warns** when a `def` or `note` runs long enough to be
two sentences wearing a trenchcoat.

It is dependency-free ESM using only Node built-ins (same no-build rule as everything else),
runs from any directory, and exits non-zero on errors — warnings still exit 0, but fix them
anyway. **CI runs exactly this command on every PR**, so run it before you push and you'll
never be surprised.

---

## Anatomy of a tile

`concepts.json` is a JSON **array** of objects — 42 of them today. One object, one tile.

```json
{
  "id": "kv-cache",
  "title": "KV cache",
  "kind": "model",
  "def": "One plain-language sentence.",
  "note": "One sentence of extra nuance.",
  "lang": "python",
  "code": "cache[layer] = (k, v)   # reuse instead of recompute",
  "videoUrl": ""
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | kebab-case, unique, **permanent** — it's the anchor |
| `title` | yes | what a viewer would type into search |
| `kind` | yes | exactly one of `basics`, `found`, `model`, `agent`, `prod`, `sec` |
| `def` | yes | one plain-language sentence |
| `note` | no | one sentence of extra nuance |
| `lang` | no | `python`, `json`, `trace`, or `mermaid` |
| `code` | no | `lang` and `code` come as a pair — both or neither |
| `aliases` | no | up to 8 extra search terms, never displayed |
| `related` | no | 2–4 ids for the tile's "see also" row |
| `videoUrl` | no | `""` until the short is published, then the YouTube link |

No other fields. Anything unrecognized is a validator error, so a field you invent won't
silently sit in the file doing nothing.

### `aliases` — the words people type, not the words you wrote

Search already covers the tile's own text, so an alias is only worth adding when it is a
term a viewer would realistically **type** and that appears nowhere in the tile: `top-p`
for `sampling`, `CoT` for `chain-of-thought`, `function calling` for `tool-use`,
`vector store` for `vector-db`. Abbreviations, competing industry names, and the
hyphenation the title happens not to use are all fair game.

Two rules the validator enforces: an alias may not be the exact `title` of a **different**
tile (that would send the searcher to the wrong place), and the list must not repeat itself.
An alias already contained in the tile's own title, def or note is not an error, but it is
dead weight — that text is searched already.

### `related` — a shortlist, not an index

Two to four ids, rendered as the tile's "see also" row. Ask: *having understood this tile,
what is the next thing that makes it land?* Prefer edges that **cross categories**, because
those are exactly what a flat list hides — `embedding` (found) → `vector-db` (agent),
`context` (found) → `context-engineering` (prod), `prompt-injection` (sec) →
`guardrails-permissions` (prod).

Every id must exist and none may be the tile's own; both are validator errors, since a
dangling entry renders as a link that goes nowhere. Edges need not be symmetric.

### `paths.json` — the ordered routes

Separate from `concepts.json`. Each path is `{ id, title, blurb, steps }`, where `steps` is
an ordered list of concept ids, and `id` becomes `?path=<id>` in the URL. A path answers
"where do I start?", which search cannot — so **order is the content**: never reference an
idea before the tile that defines it. The validator checks that every step resolves and
that no path repeats a tile.

Mechanics worth knowing before you write:

- **Array order is display order.** There is no sort. Put your object with the tiles of its
  category — the file is grouped by category, in the same order as the chip row.
- **Search matches `title` + category label + `def` + `note` + `code` + `aliases`**,
  lowercased. Words in none of those are words nobody can find the tile by.
- `code` is a JSON string, so newlines are `\n` and inner quotes are escaped. Keep the file
  at 2-space indent, no trailing commas.
- Plenty of tiles have no `code` at all. That is a normal, finished tile.

---

## Style guide

### `def` — one plain-language sentence

One sentence. No jargon that isn't itself a tile. Say what the thing *is*, not what
category of thing it belongs to.

**Good** (`token`):

> The smallest chunk of text a model reads or writes — usually a word-piece, not a whole word.

**Bad:**

> A token is the atomic unit emitted by a BPE tokenizer over the model's vocabulary, consumed autoregressively at inference time.

Three terms there (BPE, vocabulary, autoregressive) are not tiles, so the sentence only
works for someone who already knows the answer. It also opens with "A token is" — the title
already said that.

**Good** (`hallucination`):

> When a model states something false or made-up as if it were fact, with no signal that it's unsure.

**Bad:**

> Hallucination is a well-known limitation of large language models that has been widely discussed.

That's a sentence about the topic, not a definition of it. If a reader can't repeat your
`def` back as an answer, it isn't one.

Cross-referencing another tile by name is fine and encouraged — `memory` leans on
"context window", which is the `context` tile. That's the rule: jargon is allowed exactly
when the reader can click a tile for it.

### `note` — one sentence of extra nuance

One sentence that adds something the `def` didn't. A few tiles split it into two short
sentences; treat that as the ceiling, not the target. Never restate the `def` in new words,
and never pad with "it's important to note that".

**Good** (`hallucination`, after the `def` above):

> It happens because the model is predicting plausible-sounding text, not looking facts up — confidence and correctness aren't the same thing.

The `def` said *what*; the note says *why*. Nothing repeats.

**Bad:**

> Hallucinations happen when the model makes things up, which can be a problem in production use cases.

Restates the `def`, then adds a vague warning.

The notes that earn their place tend to do one of four things — correct a likely
misreading, name the trade-off, give the rule of thumb, or draw a boundary:

- `what-is-ai` corrects: "AI is the umbrella term. Machine learning, LLMs and agents are all specific approaches inside it, not synonyms for it."
- `loop-engineering` names the trade-off: "Stop too early and the task is unfinished. Stop too late and you burn tokens on a loop that already found its answer three steps ago."
- `token` gives the rule of thumb: "Everything is counted, priced and limited in tokens. For English, ~4 characters is about 1 token."
- `guardrails-permissions` draws the boundary: "A guardrail that only logs a violation after the fact isn't a guardrail — it has to be able to block or reroute before the action actually runs."

### `title` — phrased the way a viewer would search

Write the words someone types when they don't yet know the answer.

**Good:** `"What is an AI agent?"` · `"Training vs inference — what's the difference?"` ·
`"Function calling / tool use"` · `"Evals for agents"`

`"Function calling / tool use"` carries both names people use, so either search finds it.
`"Evals for agents"` is the searchable phrasing even though its `id` is the more precise
`agent-trajectory-evals` — the `id` has to be unique, the title has to be findable, and
they're allowed to differ.

**Bad:** `"Trajectory-level agent evaluation methodology"` · `"On tool invocation"` ·
`"Agents 101"`

Nobody searches for those. Question-form titles ("What is …?") are right for `basics`,
where the reader is looking up vocabulary; short noun phrases ("Temperature",
"Positional encoding", "Context engineering") are right elsewhere, where the reader
already knows the word and wants the meaning.

### `code` — only when it earns its place

Six lines or fewer. It has to show something the two sentences couldn't. If it's just the
prose again in a different font, cut it — a definition-only tile is a finished tile.

**Good** (`attention`, 3 lines) — the mechanism, with nothing else in frame:

```python
scores  = query @ key.T
weights = softmax(scores)
out     = weights @ value
```

**Good** (`token`, 1 line) — the whole point is that the split isn't where you'd guess:

```python
tokens = ["token", "izing"]   # "tokenizing" -> 2 tokens, not 1 word
```

**Bad** — imports, a client, a key, error handling, and the actual idea buried in the
middle:

```python
import os
from some_sdk import Client          # 20 lines the reader has to skim
client = Client(api_key=os.environ["API_KEY"])
try:
    resp = client.messages.create(model="...", messages=[...])
...
```

Nothing on a tile should need a library, an API key, or a `main()`. Snippets are
illustrative pseudo-code by design: `retrieve()`, `embed()`, `model()` are made-up
functions and that's correct.

**Choosing `lang`:**

| Use | When | Real example |
|---|---|---|
| `python` | a mechanism, a formula, or a loop | `attention`, `agent-loop`, `softmax` |
| `json` | the concept *is* a payload shape | `tool-use` (a tool schema), `messages`, `temperature` |
| `trace` | the concept is a sequence of model turns | `react` (Thought / Action / Observation) |
| `mermaid` | the concept is a flow — things moving between parts, or a decision | `guardrails-permissions`, `loop-engineering` |
| *nothing* | the two sentences are the whole idea | `transformer`, `mcp`, `handoff`, all of `basics` |

The test for `mermaid` vs a text snippet: if you'd draw it on a whiteboard with arrows,
it's a diagram; if you'd type it, it's a snippet. `context-engineering` is a diagram
because the point is three sources funnelling into one window. `transformer` has neither,
because "stacked attention and feed-forward layers, no recurrence" is already the picture.

---

## Choosing a category

Five categories, exactly these keys (the labels come from the `KINDS` object in
`index.html`):

| `kind` | Label | What belongs here |
|---|---|---|
| `basics` | Absolute basics | The vocabulary someone needs before any of the rest parses |
| `found` | Foundations | What you need to know to use an LLM API |
| `model` | Model internals | What happens inside the network |
| `agent` | Agents & tools | What makes it an agent rather than a chatbot |
| `prod` | Production & ops | The disciplines of running one for real |
| `sec` | Security & safety | The threats specific to a model that reads untrusted text and can act |

Six categories, and that is the whole list — `KINDS` in `index.html` builds the chip row
from it, so a `kind` outside this table fails the validator and would render nothing.

### The boundary cases that actually come up

Most tiles are obvious. These are the ones people get wrong:

- **`guardrails-permissions` is `prod`, not `agent`.** Every agent could have guardrails;
  not every agent does. The tile is about the discipline of deciding and enforcing policy,
  which is an operational practice, not a component that makes the thing an agent.
- **`tool-use` is `agent`, not `found`.** It's an API feature, so `found` is tempting — but
  tool calling is the exact thing that turns a chat model into something that acts. It's
  the definition of the category.
- **`context` is `found`, `context-engineering` is `prod`.** The context window is a hard
  limit of the API you're calling: you can't use one without knowing it. Deciding what goes
  into that window on each turn is an ongoing practice with trade-offs. Same word, two
  categories, and the split is the rule in miniature.

The underlying question, in order:

1. Would a beginner need this word to understand the *other* tiles? → `basics`
2. Is it inside the network — weights, layers, attention, sampling math? → `model`
3. Do you need it to call the API at all — tokens, context, messages, temperature? → `found`
4. Is it part of what makes the system act rather than answer — loops, tools, memory,
   protocols, orchestration? → `agent`
5. Is it a practice you get better at while operating one — evaluating, tracing,
   constraining, engineering the context or the loop? → `prod`

The `agent` / `prod` line is the one that blurs: **`agent` is the mechanism, `prod` is the
discipline of running the mechanism well.** `agent-loop` (what the loop is) is `agent`;
`loop-engineering` (deciding when it stops) is `prod`. `evals` (what an eval is) is
`agent`; `agent-trajectory-evals` (scoring whole trajectories in anger) is `prod`.

---

## `id` rules — permanent once merged

- kebab-case: lowercase letters, digits, single hyphens. `memory-architecture`, not
  `Memory_Architecture` or `memoryArchitecture`.
- Unique across the file.
- Descriptive enough to stay unique later: `evals` was taken, so the agent-trajectory tile
  became `agent-trajectory-evals` rather than something that would collide.

**Once a tile is merged, its `id` never changes.** It's the anchor (`index.html#kv-cache`),
which means it is:

- the target of **pinned YouTube comments** on published shorts — renaming breaks a link
  under a video that's already out there and can't be edited by anyone but the poster;
- **cross-linked from the essay pages** — `architecture.html` and `mcp-vs-rest.html` deep-link
  into `a2a`, `agent-loop`, `agent-trajectory-evals`, `guardrails-permissions`,
  `human-in-the-loop`, `mcp`, `rag`, `skills`, `tool-design`, `tool-use`.

Renaming an `id` is a breaking change, full stop. If a title turns out wrong, **change the
`title` and leave the `id` alone** — they're allowed to drift apart, and a stale-but-stable
`id` costs nothing. If a tile is genuinely wrong-headed, discuss it in an issue before
deleting it.

---

## Mermaid conventions

Eleven tiles carry diagrams and they all follow the same house pattern — copy an existing
one rather than starting fresh. Mermaid 10 is loaded from a CDN and initialized with
`theme: "base"`, so **all colour comes from `classDef` lines in the diagram itself.** A
diagram with no `classDef` renders in default mermaid grey and will look out of place.

Three class names, used consistently:

| Class | Meaning | `classDef` line |
|---|---|---|
| `n` | neutral — the normal steps | `classDef n fill:#EFE9FE,stroke:#7C3AED,color:#5B21B6,font-size:13px` |
| `ok` | the good outcome / terminal state | `classDef ok fill:#E3F4F1,stroke:#0E9384,color:#0A6A60,font-size:13px` |
| `warn` | blocked, denied, or needs a human | `classDef warn fill:#FBE7E7,stroke:#B23B3B,color:#8C2323,font-size:13px` |

Rules that keep new diagrams looking like the old ones:

- Every `classDef` ends with **`font-size:13px`**. Tiles are narrow; the default size
  overflows.
- Declare **only the classes you use.** `harness-engineering` and `orchestration-patterns`
  declare `n` alone; `guardrails-permissions` declares all three.
- Apply classes with the `:::` suffix on the node: `A[Agent action]:::n`,
  `E[Execute]:::ok`, `B[Block / ask human]:::warn`.
- `classDef` lines go **last**, after the graph body.
- `flowchart TD` by default; `flowchart LR` for a short left-to-right pipeline (`skills`).
- Short node ids (`A`, `H`, `Sel`, `S1`) — they're never displayed, and long ones make the
  one-line-per-edge style unreadable.
- **3–6 nodes.** Same budget as a code snippet. If it needs more, the tile is trying to
  cover two concepts.
- Decisions are `{...}` and still get `:::n`: `P{Policy check}:::n`. Terminal stops are
  stadium-shaped: `S([Stop]):::ok`. Dotted arrows (`-.->`) mark a derived or observed
  relation rather than a step (`agent-trajectory-evals`).
- Label your branches: `-->|allowed|`, `-->|denied|`, `-->|not done|`.

The canonical example, `guardrails-permissions`, as it reads once unescaped:

```
flowchart TD
    A[Agent action]:::n --> P{Policy check}:::n
    P -->|allowed| E[Execute]:::ok
    P -->|denied| B[Block / ask human]:::warn
    classDef n fill:#EFE9FE,stroke:#7C3AED,color:#5B21B6,font-size:13px
    classDef ok fill:#E3F4F1,stroke:#0E9384,color:#0A6A60,font-size:13px
    classDef warn fill:#FBE7E7,stroke:#B23B3B,color:#8C2323,font-size:13px
```

In the JSON, that's one string with `\n` between lines. The `classDef` lines don't count
against the 6-line snippet budget — the node count is the budget. Mermaid runs with
`securityLevel: "strict"`, so keep labels to plain text; wrap a label in quotes
(`A["get_weather(city)"]`) if it contains brackets or punctuation mermaid would try to
parse. Always check a new diagram in the browser — a mermaid syntax error renders as a
broken box, and the validator checks JSON, not diagram syntax.

---

## Workflow: adding a new short

Content lands **before** the video, so the site always leads the channel.

1. **Add the tile** to `concepts.json` with `"videoUrl": ""`, placed next to its category
   neighbours.
2. **Validate and eyeball it**: `node scripts/validate.mjs`, then `python3 -m http.server 8000`
   and confirm the tile renders, the search terms you expect actually find it, and any
   diagram draws.
3. **Open a PR.** CI runs the validator. Keep it to one concept per PR where you can —
   review is faster and a bad tile can be reverted alone.
4. **Merge.** GitHub Pages deploys from `main`, so the tile is live within a minute or two
   at `index.html#<id>`.
5. **Record and publish the short.**
6. **One-line PR filling `videoUrl`** with the published URL. The tile grows its
   **▶ watch** link automatically — no HTML to touch.
7. **Pin a comment** on the short linking `index.html#<id>`. That anchor is now permanent
   (see the `id` rules above).

A tile with `videoUrl: ""` is not a draft or a placeholder — it's the normal state for a
tile whose short hasn't been recorded yet. Every one of the 42 tiles is in that state
today.

---

## Editing the HTML pages

Rarer, but two things to know.

**The `CONFIG` block is duplicated three times.** `index.html`, `architecture.html` and
`mcp-vs-rest.html` each carry their own copy near the bottom of their script:

```js
const CONFIG = {
  channelUrl: "https://www.youtube.com/@_dev_insight",
  github:     "https://github.com/konradcinkusz/agents-and-llms"
};
```

There is no shared JS file to import from — that's the price of the no-build-step rule, and
it's a price worth paying. **If you change one value, change it in all three files in the
same commit.** Both essay pages carry the comment *"Same CONFIG block as index.html — keep
the two in sync"* right above theirs. Out-of-sync values are invisible until someone clicks
a footer link on the wrong page.

**Keep the pages dependency-free.** Mermaid from a CDN is the only external script; don't
add a framework, a bundler, or a `package.json`. Any tooling that has to exist (like the
validator) is Node built-ins only, ESM, `.mjs`.

---

## Before you open the PR

- [ ] `node scripts/validate.mjs` passes
- [ ] Served locally and the tile looks right — including the diagram, if any
- [ ] `def` is one sentence, plain language, no non-tile jargon
- [ ] `note` adds something the `def` didn't
- [ ] `code` is ≤ 6 lines and earns its place, or there is no `code`
- [ ] `kind` is one of the five real keys, and you can state which rule put it there
- [ ] `id` is kebab-case, unique, and one you're happy to be stuck with forever
- [ ] `videoUrl` is `""` unless the short is already published
- [ ] If you touched `CONFIG`, all three HTML pages match

---

## Tone

Precise, plain language, no filler. Short words over long ones. No hedging ("it could be
argued"), no hype ("revolutionary"), no marketing verbs. If a sentence would survive being
cut, cut it. A viewer arrives with 60 seconds of context and one question — answer it.
