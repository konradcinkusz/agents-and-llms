#!/usr/bin/env node
/**
 * validate.mjs — the only check this repo runs.
 *
 * Validates concepts.json (structure, field rules, house style) and the
 * cross-page tile anchors the essay pages depend on. Dependency-free ESM,
 * Node 20+, built-ins only — the repo has no package.json and keeps it that way.
 *
 *   node scripts/validate.mjs                 # validates ./concepts.json
 *   node scripts/validate.mjs some/other.json # validates a copy (handy for testing)
 *
 * Exit 0 = clean (warnings may still print). Exit 1 = at least one error.
 *
 * The rules below mirror concepts.schema.json, implemented in plain JS so no
 * JSON-schema library is needed. Change a rule in both places.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* ------------------------------------------------------------------ *
 * Rules — everything that changes as the project grows lives here.
 * ------------------------------------------------------------------ */

// The category keys, mapped to their labels in index.html's KINDS object.
// Adding the planned "sec" ("Security & safety") category is one line here.
const KINDS = {
  basics: "Absolute basics",
  found: "Foundations",
  model: "Model internals",
  agent: "Agents & tools",
  prod: "Production & ops",
};

// Languages the tile renderer in index.html knows how to highlight or draw.
const LANGS = ["python", "json", "trace", "mermaid"];

const REQUIRED_FIELDS = ["id", "title", "kind", "def"];

// Optional fields. Planned additions ("related", "aliases") go here.
const OPTIONAL_FIELDS = ["note", "lang", "code", "videoUrl"];

// Tile ids are permanent anchors (index.html#<id>), so they stay kebab-case.
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// videoUrl is either "" (short not published yet) or an https:// YouTube link
// that points at a specific video. These two must stay in step with the
// "videoUrl" pattern in concepts.schema.json — the host list exists only so the
// error message can name the problem; VIDEO_URL is the rule.
const VIDEO_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "m.youtu.be",
];
const VIDEO_URL = /^https:\/\/(?:(?:www|m)\.)?(?:youtube\.com|youtu\.be)\/.+/;

// Every page in the repo root is scanned for "index.html#<id>" tile references.
// Discovered rather than listed, so an essay page added later is covered on the
// day it lands instead of the day someone remembers to edit this file.

// House style: def is one plain sentence, note is one sentence of nuance.
// Over these lengths it is almost certainly two sentences wearing a trenchcoat.
const MAX_DEF_CHARS = 240;
const MAX_NOTE_CHARS = 320;

/* ------------------------------------------------------------------ *
 * Setup
 * ------------------------------------------------------------------ */

const ALLOWED_FIELDS = new Set([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]);
const KIND_KEYS = Object.keys(KINDS);

// Resolve paths against the repo root, not the cwd, so the script runs
// correctly from anywhere (CI runs it from the root; humans may not).
const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

// index.html first (it owns the anchors), then the essays in name order.
const HTML_PAGES = readdirSync(ROOT)
  .filter((f) => f.endsWith(".html"))
  .sort((a, b) => (a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b)));

const argPath = process.argv[2];
const CONCEPTS_PATH = argPath ? resolve(process.cwd(), argPath) : join(ROOT, "concepts.json");

// Show a path relative to the repo root when the file lives inside it,
// otherwise the absolute path — "../../../tmp/x.json" helps nobody.
const relToRoot = relative(ROOT, CONCEPTS_PATH);
const FILE_LABEL = relToRoot && !relToRoot.startsWith("..") ? relToRoot : CONCEPTS_PATH;

const errors = [];
const warnings = [];
const error = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

/** Human-readable pointer to an entry: index always, id when we have one. */
function at(index, concept) {
  const id = concept && typeof concept.id === "string" && concept.id.trim() ? concept.id : null;
  return id ? `concepts[${index}] "${id}"` : `concepts[${index}]`;
}

/** Turn a JSON.parse character offset into line/column for a usable message. */
function lineColumn(text, offset) {
  const upto = text.slice(0, offset);
  const line = upto.split("\n").length;
  const column = offset - upto.lastIndexOf("\n");
  return `line ${line}, column ${column}`;
}

/* ------------------------------------------------------------------ *
 * (a) File parses as JSON and is an array
 * ------------------------------------------------------------------ */

if (!existsSync(CONCEPTS_PATH)) {
  console.error(`error: ${CONCEPTS_PATH} does not exist.`);
  process.exit(1);
}

const raw = readFileSync(CONCEPTS_PATH, "utf8");
let concepts;
try {
  concepts = JSON.parse(raw);
} catch (err) {
  const posMatch = /position (\d+)/.exec(err.message);
  const where = posMatch ? ` (${lineColumn(raw, Number(posMatch[1]))})` : "";
  console.error(`error: ${FILE_LABEL} is not valid JSON${where}`);
  console.error(`       ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(concepts)) {
  console.error(`error: ${FILE_LABEL} must be a JSON array, got ${typeof concepts}.`);
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * (b–g) Per-concept checks
 * ------------------------------------------------------------------ */

const idIndex = new Map(); // id -> first index seen, for duplicate reporting
const counts = Object.fromEntries(KIND_KEYS.map((k) => [k, 0]));
let withVideo = 0;

concepts.forEach((concept, i) => {
  if (concept === null || typeof concept !== "object" || Array.isArray(concept)) {
    error(`${at(i, null)}: must be an object, got ${Array.isArray(concept) ? "array" : concept === null ? "null" : typeof concept}.`);
    return;
  }

  const where = at(i, concept);

  // (b) required fields present and non-empty strings
  for (const field of REQUIRED_FIELDS) {
    if (!(field in concept)) {
      error(`${where}: missing required field "${field}".`);
    } else if (!isNonEmptyString(concept[field])) {
      error(`${where}: "${field}" must be a non-empty string (got ${JSON.stringify(concept[field])}).`);
    }
  }

  // (g) no unknown top-level fields — catches typos like "defn" or "vidoeUrl"
  for (const field of Object.keys(concept)) {
    if (!ALLOWED_FIELDS.has(field)) {
      error(`${where}: unknown field "${field}". Allowed: ${[...ALLOWED_FIELDS].join(", ")}.`);
    }
  }

  // (c) id is kebab-case and unique
  if (isNonEmptyString(concept.id)) {
    const id = concept.id;
    if (!ID_PATTERN.test(id)) {
      error(`${where}: id "${id}" is not kebab-case (lowercase letters/digits, single hyphens between them).`);
    }
    if (idIndex.has(id)) {
      error(`${where}: duplicate id "${id}" — already used by concepts[${idIndex.get(id)}]. Ids are permanent anchors and must be unique.`);
    } else {
      idIndex.set(id, i);
    }
  }

  // (d) kind is one of the known category keys
  if (isNonEmptyString(concept.kind)) {
    if (!KIND_KEYS.includes(concept.kind)) {
      error(`${where}: kind "${concept.kind}" is not valid. Use one of: ${KIND_KEYS.join(", ")}.`);
    } else {
      counts[concept.kind] += 1;
    }
  }

  // (f) code and lang co-occur; lang must be known
  const hasCode = "code" in concept;
  const hasLang = "lang" in concept;
  if (hasCode && !hasLang) {
    error(`${where}: has "code" but no "lang". A snippet needs a language (${LANGS.join(", ")}).`);
  }
  if (hasLang && !hasCode) {
    error(`${where}: has "lang" but no "code". Drop "lang" for a definition-only tile.`);
  }
  if (hasLang && !isNonEmptyString(concept.lang)) {
    error(`${where}: "lang" must be a non-empty string (got ${JSON.stringify(concept.lang)}).`);
  } else if (hasLang && !LANGS.includes(concept.lang)) {
    error(`${where}: lang "${concept.lang}" is not supported. Use one of: ${LANGS.join(", ")}.`);
  }
  if (hasCode && !isNonEmptyString(concept.code)) {
    error(`${where}: "code" must be a non-empty string (got ${JSON.stringify(concept.code)}).`);
  }

  // note, when present, is prose — same non-empty rule as the required strings
  if ("note" in concept && !isNonEmptyString(concept.note)) {
    error(`${where}: "note" must be a non-empty string, or be omitted entirely.`);
  }

  // (e) videoUrl is "" or an https:// YouTube link
  if ("videoUrl" in concept) {
    const url = concept.videoUrl;
    if (typeof url !== "string") {
      error(`${where}: "videoUrl" must be a string ("" until the short is published).`);
    } else if (url !== "") {
      let parsed = null;
      try {
        parsed = new URL(url);
      } catch {
        error(`${where}: videoUrl "${url}" is not a valid URL.`);
      }
      if (parsed) {
        if (parsed.protocol !== "https:") {
          error(`${where}: videoUrl "${url}" must use https://.`);
        } else if (!VIDEO_HOSTS.includes(parsed.hostname.toLowerCase())) {
          error(`${where}: videoUrl host "${parsed.hostname}" is not a YouTube host (${VIDEO_HOSTS.join(", ")}).`);
        } else if (!VIDEO_URL.test(url)) {
          error(`${where}: videoUrl "${url}" has no video path — link the short itself, e.g. https://www.youtube.com/shorts/<id>.`);
        } else {
          withVideo += 1;
        }
      }
    }
  }

  // (i) style guard — warnings only, never fails the build
  if (isNonEmptyString(concept.def) && concept.def.length > MAX_DEF_CHARS) {
    warn(`${where}: def is ${concept.def.length} chars (house style is one sentence, <= ${MAX_DEF_CHARS}).`);
  }
  if (isNonEmptyString(concept.note) && concept.note.length > MAX_NOTE_CHARS) {
    warn(`${where}: note is ${concept.note.length} chars (house style is one sentence, <= ${MAX_NOTE_CHARS}).`);
  }
});

/* ------------------------------------------------------------------ *
 * (h) Cross-page anchor check
 *
 * The essay pages deep-link into tiles as index.html#<id>. Those references
 * are unambiguous: whatever follows the hash must be a concept id.
 *
 * Bare "#x" hrefs are NOT treated the same way — each page has its own
 * section ids (#faq, #compare, ...), and mcp-vs-rest.html even has a local
 * #skills section that collides with the "skills" tile. So a bare anchor is
 * only reported (as a warning) when it matches neither a local element id
 * nor a concept id, which means it is a dead link on that page.
 * ------------------------------------------------------------------ */

const conceptIds = new Set(idIndex.keys());
let tileRefCount = 0;
const tileRefIds = new Set();
let pagesScanned = 0;

for (const page of HTML_PAGES) {
  pagesScanned += 1;
  const html = readFileSync(join(ROOT, page), "utf8");

  // Unambiguous tile references: index.html#<id>. The character class is
  // deliberately loose so a malformed anchor is caught, not silently skipped.
  for (const m of html.matchAll(/index\.html#([A-Za-z0-9_-]+)/g)) {
    const anchor = m[1];
    tileRefCount += 1;
    tileRefIds.add(anchor);
    if (!conceptIds.has(anchor)) {
      error(`${page}: link "index.html#${anchor}" points at a tile that does not exist in concepts.json.`);
    }
  }

  // Local element ids on this page, used to tell a section link from a dead one.
  const localIds = new Set();
  for (const m of html.matchAll(/\sid="([A-Za-z0-9_-]+)"/g)) localIds.add(m[1]);

  for (const m of html.matchAll(/href="#([A-Za-z0-9_-]+)"/g)) {
    const anchor = m[1];
    if (localIds.has(anchor)) continue; // a section on this page — fine
    if (page === "index.html" && conceptIds.has(anchor)) continue; // a tile on this page — fine
    warn(`${page}: href="#${anchor}" matches no section on the page and no concept id — dead link?`);
  }
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

for (const w of warnings) console.warn(`warn:  ${w}`);

if (errors.length > 0) {
  for (const e of errors) console.error(`error: ${e}`);
  console.error("");
  // Errors can come from the JSON or from a page that links into it, so the
  // summary counts them without claiming they are all in one file.
  console.error(`FAIL — ${errors.length} error${errors.length === 1 ? "" : "s"} (${FILE_LABEL} and the pages linking into it).`);
  process.exit(1);
}

const labelWidth = Math.max(...KIND_KEYS.map((k) => KINDS[k].length));
console.log(`ok — ${FILE_LABEL} is valid.`);
console.log("");
for (const k of KIND_KEYS) {
  console.log(`  ${KINDS[k].padEnd(labelWidth)}  ${String(counts[k]).padStart(3)}  (${k})`);
}
console.log(`  ${"total".padEnd(labelWidth)}  ${String(concepts.length).padStart(3)}`);
console.log("");
console.log(`  videos published:  ${withVideo}/${concepts.length}`);
console.log(`  tile anchors:      ${tileRefCount} index.html#... link${tileRefCount === 1 ? "" : "s"} across ${pagesScanned} page${pagesScanned === 1 ? "" : "s"}, ${tileRefIds.size} distinct id${tileRefIds.size === 1 ? "" : "s"}, all resolved`);
if (warnings.length > 0) {
  console.log(`  warnings:          ${warnings.length} (not fatal)`);
}
process.exit(0);
