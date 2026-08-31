# Agents & LLMs

A searchable knowledge base for the "Agents & LLMs" short series. Companion to the
[Konrad's Dev Insight](https://www.youtube.com) YouTube shorts.

## The knowledge base

[`index.html`](index.html) is a static, search-first page. Type a term or filter by
category (Absolute basics / Foundations / Model internals / Agents & tools /
Production & ops) and it filters instantly — no backend, no build step.

Content lives in [`concepts.json`](concepts.json), separate from the page. **Adding a
new short is one JSON object, no HTML editing:**

```json
{
  "id": "kv-cache",
  "title": "KV cache",
  "kind": "model",
  "def": "One sentence, plain language.",
  "note": "Optional: a second sentence with more nuance.",
  "lang": "python",
  "code": "optional code snippet",
  "videoUrl": "https://youtube.com/shorts/..."
}
```

- `kind` is one of `basics` (Absolute basics), `found` (Foundations), `model` (Model internals), `agent` (Agents & tools), `prod` (Production & ops).
- `lang` and `code` are optional — omit both for a definition-only tile.
- `videoUrl` is optional; leave it `""` until the short is published, then fill it in
  and the tile grows a **▶ watch** link automatically.
- Every tile gets a stable anchor (`index.html#kv-cache`) for pinned comments or
  direct links — no extra step needed, it's built from `id`.
- Picking a category chip or typing a search updates the address bar to
  `index.html?kind=agent&q=react`, so the URL always reflects exactly what's on
  screen. The **🔗 copy link to this view** button next to the result count copies
  that URL — anyone who opens it lands on the same filter and search, restored
  automatically on load.

## Contributing

[`CONTRIBUTING.md`](CONTRIBUTING.md) is the full field reference and style guide — what a
`def` and a `note` should sound like, when a snippet earns its place, which category a tile
belongs in, and the mermaid conventions the eleven diagrams share. Before opening a PR:

```bash
node scripts/validate.mjs
```

It needs nothing installed — Node built-ins only, matching the no-dependencies rule for the
site itself. It checks `concepts.json` against [`concepts.schema.json`](concepts.schema.json)
(required fields, no unknown ones, valid `kind` and `lang`, `id` shape and uniqueness,
`videoUrl` empty-or-YouTube) and confirms every `index.html#<id>` link in the pages resolves
to a real tile. CI runs the same command on every push and pull request.

## Architecture: CRUD to agents

[`architecture.html`](architecture.html) is a second, static page — an essay-style
one-pager on how a classic layered system (client → frontend → API → domain →
database) changes shape once an agent is introduced. It covers what actually moves,
what survives unchanged, where the "no more API/frontend" framing overstates itself,
and the concrete problems that show up while both architectures run side by side
during a migration. It links back into `index.html`'s concept tiles (MCP, tool use,
RAG, guardrails, human-in-the-loop, A2A, evals) for anyone who wants the underlying
definitions. Reachable from the **Architecture** link in the header nav of both pages.

## Roadmap

Where this project is going — the content plan (42 → ~91 tiles, including a new
Security & safety category), new essay pages, and the publishing cadence — lives in
[`ROADMAP.md`](ROADMAP.md). The live checklist is the
[roadmap tracker issue](https://github.com/konradcinkusz/agents-and-llms/issues/26),
and every work item is an [open issue](https://github.com/konradcinkusz/agents-and-llms/issues).

## Run it locally

Because the page `fetch()`s `concepts.json`, opening `index.html` directly from disk
(`file://`) will fail in most browsers. Serve it locally instead:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

GitHub Pages serves everything over `https://`, so this only matters for local preview.

## Publish on GitHub Pages

1. Push this repo to GitHub.
2. Settings → **Pages** → deploy from `main`, folder `/ (root)`.
3. Live at `https://<username>.github.io/agents-and-llms/`.

`.nojekyll` is included so Pages serves the files as-is.

> **One edit before you publish:** set `channelUrl` in the `CONFIG` block near the
> bottom of `index.html` to your channel URL.

## Structure

```
agents-and-llms/
├─ README.md
├─ CONTRIBUTING.md          ← how to write a tile: fields, style guide, workflow
├─ ROADMAP.md               ← where the project is going, phase by phase
├─ LICENSE
├─ .nojekyll
├─ index.html               ← the knowledge base (search + filter)
├─ architecture.html        ← CRUD-to-agents essay (second tab)
├─ mcp-vs-rest.html         ← MCP vs REST essay (third tab)
├─ concepts.json            ← every tile's data — edit this to add a short
├─ concepts.schema.json     ← the field reference for concepts.json
├─ scripts/
│  └─ validate.mjs          ← the only check: node scripts/validate.mjs
└─ .github/
   ├─ workflows/validate.yml   ← runs the validator on every push and PR
   ├─ ISSUE_TEMPLATE/          ← new tile · fix a tile · video published
   └─ pull_request_template.md
```

## License

MIT — see [LICENSE](LICENSE).
