# Org Chart Tool — Design Spec

**Date:** 2026-07-02
**Status:** Approved for implementation

## Problem

`guides/org-chart.html` already exists and is live, ranking (or targeting) SEO traffic for "조직도 만들기" (make an org chart). It teaches users to hand-assemble an org chart out of generic flowchart rectangles and lines — the guide itself says "도식화 메이커에는 조직도 전용 모드가 따로 있지는 않지만..." ("Diagram Maker doesn't have a dedicated org-chart mode, but..."). There is no purpose-built org-chart tool. This is a content/product mismatch: landing users are promised a workflow the product doesn't deliver.

## Goal

Ship a real, purpose-built org-chart tool (Korean + English) that:
1. Delivers the exact workflow the guide already describes (build a tree by adding subordinates/peers, auto-arranged, no manual placement).
2. Reuses the existing node-edge canvas engine rather than rebuilding rendering from scratch.
3. Is properly indexed (own URL, full SEO metadata, FAQPage schema) in both languages.
4. Is linked from the guide (which currently promises nothing) and from site nav — closing the gap.

## Architecture decision: standalone page, not a third app mode

Two options were considered:
- **A.** Add `mode: 'orgchart'` inside the existing single-page `index.html` app (most code reuse, but couples the tool's URL/SEO to the flowchart/mindmap app shell).
- **B. (chosen)** Standalone `org-chart.html` / `en/org-chart.html` pages, each with their own SEO metadata, that load the *same shared engine singletons* (`Canvas`, `History`, `Storage`, `Export`, `Utils`, `I18n`) plus two new small modules.

**B** is chosen because every other tool/guide page on this site is already a separate static HTML file with its own metadata — that's the established site architecture (no build step, no router). Forcing org-chart into the mode-switcher would mean either faking a separate URL via redirect/query-param tricks, or losing per-page SEO control. B also keeps the new code small and focused instead of adding a third branch to `app.js`'s already-large event-binding surface.

## Files created

- `org-chart.html` — Korean tool page.
- `en/org-chart.html` — English tool page.
- `js/orgchart.js` — tree data/layout module (peer to `js/mindmap.js`): `initRoot`, `addChild`, `addPeer`, `relayout`.
- `js/orgchart-app.js` — page controller (a trimmed, focused peer to `js/app.js` covering only what org-chart needs: canvas pan/zoom/select/drag via `Canvas`, toolbar-driven node creation instead of double-click-to-create-shape, two-field inline editing, export buttons, undo/redo, autosave, share link).

## Files modified

- `js/nodes.js` — additive: new `'orgchart'` node type (shape path + two-tier text rendering), `name`/`title` fields alongside existing fields. No existing behavior changes for `'rectangle'`/`'mindmap'`/etc. node types.
- `js/export.js` — additive: `Export.toSVG()` gains the same two-tier name/title rendering branch for the `'orgchart'` node type, so exported SVG/PNG matches on-screen rendering. No change to existing export paths for other node types.
- `guides/org-chart.html` — add top-of-article CTA, rewrite Section 3 (which currently states no dedicated mode exists), repoint the existing bottom CTA at the new tool.
- `index.html`, `en/index.html` — add nav link to the new tool.
- `sitemap.xml` — add both new URLs with hreflang alternate pairs.

## Data model

New node type `orgchart`, extending the existing node shape:

```js
{
  id, type: 'orgchart', x, y, width, height,
  fillColor, strokeColor,
  level,        // depth in tree, 0 = root
  parentId,     // null for root
  name: '홍길동',      // bold line
  title: '팀장',        // lighter subline
  isRoot: true|false,   // like mindmap's isCenter
  text: 'derived: name + "\\n" + title'  // kept in sync so existing text-drawing paths need no structural change
}
```

Keeping `node.text` derived (not primary) means `Nodes.render()`'s existing single/multi-line `tspan` fallback and `Export.toSVG()`'s existing text path continue to work unmodified for every *other* node type; only the `orgchart` type gets a new two-tier rendering branch.

Connections are plain parent→child edges via the existing `Connections.create()`, unmodified: solid orthogonal line, no arrowhead (matches the guide's own stated advice — "조직도는 화살표 없는 직선이 깔끔… 화살표를 없음으로"). Anchor sides are fixed per the top-down layout: `fromSide: 'bottom'` (parent) → `toSide: 'top'` (child), same convention `Templates.buildFlowchart()` already uses for its top-down flowchart templates.

## Auto-layout algorithm

Level-based tree layout, structurally adapted from the existing, working `Mindmap.relayout()` (`js/mindmap.js`) — same subtree-sizing recursion, axis-swapped:

- Mindmap: children stack **vertically** (by height), branching **left/right** from a center.
- Org chart: children stack **horizontally** (by width), branching **downward** only from a root.

Algorithm:
1. Root fixed at top-center, `y = 0`.
2. For every node, recursively compute **subtree width** = sum of children's subtree widths (own width if leaf), with a fixed horizontal gap (`gapX`) between sibling subtrees.
3. Each level sits at a fixed `y = level * levelGap` (simple level-based vertical spacing).
4. Children are laid out left-to-right under their parent, each centered within its own subtree-width slice, so sibling subtrees never overlap horizontally regardless of how bushy one branch is vs. another.
5. Runs automatically after every `addChild` / `addPeer` / delete — no manual drag-to-place required. This *is* the differentiator from "just use generic rectangles."

This is intentionally simple (no Reingold-Tilford contour-tracking, no edge-crossing minimization) — sufficient for typical org charts (a handful of levels, a handful of reports per manager) and consistent with the spec's explicit "doesn't need to be sophisticated" guidance.

## Box visual style (differentiator from generic flowchart boxes)

- Shape: rounded rectangle, `rx: 6` — distinct from flowchart's sharp-cornered `rectangle` and mindmap's pill-shaped `rounded`.
- Two-tier text: name (`font-weight: 600`, `13px`) above title (`font-weight: 400`, `11px`, secondary text color), fixed vertical offset, rendered as two `tspan`s — mirrors the existing multi-line tspan pattern already used elsewhere in `Nodes.render()`/`Export.toSVG()`.
- Thin top accent bar or a divider line between the name/title tiers, in the node's stroke color — cheap, visually distinguishes an org card from a plain rectangle at a glance.
- Palette: root gets a distinct accent color (like mindmap's center node); all other levels share one neutral card color (org charts conventionally don't rainbow-code by depth the way mind maps do — v1 keeps this simple: root vs. everyone else).
- Default size: fixed width ~130px, taller than flowchart default (~56–60px) to fit two text tiers; auto-grows via `Utils.measureText` if name/title text is long.

## Interaction model

- Left panel toolbar: "+ 하위 추가" (add child) / "+ 동료 추가" (add peer). Peer button disabled when the root is selected (root has no parent to attach a sibling to) or nothing is selected.
- Add-child: creates a new orgchart node as a child of the selected node, triggers relayout, selects the new node.
- Add-peer: creates a sibling under the selected node's `parentId` (same parent = colleague reporting to the same manager), triggers relayout, selects the new node.
- Double-click/tap opens inline edit with **two stacked inputs** (name, title) — new small function in `orgchart-app.js`, does not touch `app.js`.
- Delete removes the selected node's entire subtree (cascade-delete), mirroring the existing mindmap-branch-delete pattern in `app.js`, ported into `orgchart-app.js`.
- Undo/redo, pan/zoom, fit-to-view, PNG/SVG/JSON export, share-link: all delegate to the existing `History` / `Canvas` / `Export` / `Storage` singletons, unmodified.

## GA4 event

No new event name needed — reusing `Export.download()` / `Export._capture()` means every export from the org-chart tool automatically fires the site's existing `gtag('event', 'diagram_export', { format: fmt })` convention with `format` = `png`/`svg`/`json`, exactly like the flowchart/mindmap tools. This satisfies "fire an event on chart creation/export... matching this site's existing gtag event naming convention" without inventing a divergent event name.

## SEO / content plan

**`org-chart.html`** (Korean): title/meta/description/keywords/OG/twitter/canonical scoped to `https://diagram.matchiq.co.kr/org-chart.html`, hreflang pair to `en/org-chart.html` + x-default, following the exact tag shape used in `index.html`. `WebApplication` JSON-LD (`name: "조직도 메이커"`, `featureList` covering add-child/add-peer/auto-layout/export). `FAQPage` JSON-LD with org-chart-specific Q&A (how auto-layout works, name/title fields, export formats, mobile support, free/no-signup — consistent with the site's existing free/no-signup positioning). A short on-page Korean content section (intro + "how it works" steps + FAQ `dl`) so the page carries real indexable text, not just an app shell — matching the pattern already used in `index.html`'s footer `guide-content` block.

**`en/org-chart.html`**: natural (not machine-translated) English mirroring `en/index.html`'s structural choices — own title/meta/OG (`og:locale: en_US`, `og:locale:alternate: ko_KR`), hreflang pair back to the Korean page, independently-worded `WebApplication` + `FAQPage` JSON-LD (not 1:1 translations of the Korean FAQ).

Both pages reuse the same header/footer chrome (family-sites links, footer-links row, GA4, AdSense) as other tool pages.

## Guide integration (closing the content/product gap)

In `guides/org-chart.html`:
1. New CTA inserted immediately after the intro paragraph (before "1. 조직도란 무엇이고 어디에 쓰나"), separate from the existing bottom CTA — links to `../org-chart.html`.
2. Section 3 ("조직도 그리는 순서 — 도식화 메이커 활용법") rewritten: it currently states no dedicated mode exists and instructs manual double-click-to-place-then-align workflow. This becomes factually wrong once the tool ships, so it's rewritten to describe the real add-child/add-peer/auto-layout workflow and links to the new tool.
3. Existing bottom `cta-box` link target changes from `../index.html` to `../org-chart.html`.
4. Footer `footer-links` "조직도 가이드" stays; new tool page is cross-linked from the guide and back.

`index.html` / `en/index.html`: new nav link to the tool (in `header-actions`, alongside the language switch) plus updated guide-card cross-link. `sitemap.xml`: two new `<url>` entries with hreflang alternate pairs, matching the existing `/` and `/en/` entry pattern.

## Verification plan

1. Build a test tree programmatically (1 manager + 2 reports) via the tool's own `Orgchart.addChild` logic; confirm the two reports are laid out side-by-side below the manager with no horizontal overlap and correct parent→child connectors.
2. Confirm PNG/SVG/JSON export produces valid output and fires the `diagram_export` GA4 event.
3. Load both `org-chart.html` and `en/org-chart.html` in a real browser session; confirm zero console errors.
4. Reload `guides/org-chart.html` after edits; confirm it still renders correctly (headings, table, existing links) and the new CTA appears near the top, not just at the bottom.

## Out of scope

- English version of `guides/org-chart.html` (no English guide counterpart currently exists on the site; not requested).
- Reingold-Tilford or other advanced tree-layout algorithms (explicitly not required by the spec).
- Lateral/dotted-line "matrix" reporting relationships (guide describes these conceptually but the spec confirms peer = sibling under the same parent only; matrix relationships are out of scope for v1).
- Per-branch color coding beyond root-vs-rest (nice-to-have, not required).
