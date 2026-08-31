# What this changes

<!--
One or two sentences. If this adds a tile, name it and say which category rule put it there
(see "Choosing a category" in CONTRIBUTING.md). If it changes a page, say which of the three.
-->

Closes #

# Checklist

CI runs `node scripts/validate.mjs` on every PR. This is the same list, so a ticked box is a
green build.

- [ ] Ran `node scripts/validate.mjs` locally and it passed
- [ ] `concepts.json` still parses as JSON — array, 2-space indent, no trailing commas
- [ ] Every new `id` is kebab-case and unique across the file
- [ ] No existing tile's `id` was renamed (ids are permanent anchors — pinned YouTube comments
      and the essay pages point at them)
- [ ] `kind` is one of `basics`, `found`, `model`, `agent`, `prod` (there is no `sec` yet)
- [ ] `def` is one plain-language sentence
- [ ] Any `code` has a matching `lang` — `python`, `json`, `trace` or `mermaid`, both fields or
      neither
- [ ] `videoUrl` is `""` or an `https://` YouTube link
- [ ] Served locally (`python3 -m http.server 8000`) and the tile renders, including the diagram
      if there is one

Not a `concepts.json` change? Delete the checklist and say what you changed instead.
