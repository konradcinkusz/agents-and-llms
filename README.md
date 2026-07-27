# Agents & LLMs

A searchable knowledge base for the "Agents & LLMs" short series. Companion to the
[Konrad's Dev Insight](https://www.youtube.com) YouTube shorts.

## The knowledge base

[`index.html`](index.html) is a static, search-first page. Type a term or filter by
category (Absolute basics / Foundations / Model internals / Agents & tools) and it
filters instantly — no backend, no build step.

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

- `kind` is one of `basics` (Absolute basics), `found` (Foundations), `model` (Model internals), `agent` (Agents & tools).
- `lang` and `code` are optional — omit both for a definition-only tile.
- `videoUrl` is optional; leave it `""` until the short is published, then fill it in
  and the tile grows a **▶ watch** link automatically.
- Every tile gets a stable anchor (`index.html#kv-cache`) for pinned comments or
  direct links — no extra step needed, it's built from `id`.

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
├─ LICENSE
├─ .nojekyll
├─ index.html          ← the knowledge base (search + filter)
└─ concepts.json        ← every tile's data — edit this to add a short
```

## License

MIT — see [LICENSE](LICENSE).
