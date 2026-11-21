# KUBIK application UI — design system

## Scope (ADR-053)

Redesign the home, collection (campaign / daily / Vault), settings, controls
guide, pause and completion screens. Do **not** redesign the playfield, camera,
HUD, minimap, touch pad, hints or gameplay palette. Those keep `style.css` and
its existing theme rules; `shell.css` scopes application styles to `.screen`
and `.overlay`, with a separate `--ui-*` token namespace.

## Visual language

Quiet, geometric, editorial. No glass/neon gradients or unrelated accent
colours for every card. A lime primary action anchors graphite surfaces;
light mode uses warm paper and olive text accents. A locally authored SVG
isometric sculpture illustrates the home screen; it is explicitly an
illustration, not a playable level preview.

| Token | Dark | Light | Purpose |
|---|---|---|---|
| `--ui-bg` | `#141714` | `#f3f3eb` | application canvas |
| `--ui-surface` | `#1b1f1b` | `#fbfcf6` | cards and dialogs |
| `--ui-raised` | `#222722` | `#e9ecdf` | controls and hover |
| `--ui-ink` | `#f1f2e9` | `#252b22` | primary text |
| `--ui-muted` | `#a2aaa0` | `#626c5d` | supporting text |
| `--ui-line` | `#343a33` | `#d5dacb` | separators and borders |
| `--ui-accent` | `#c5f36b` | `#c0ed62` | primary CTA and completion |
| `--ui-ring` | `#d3ff8c` | `#577b17` | visible keyboard focus |

- **Type:** Manrope Variable for display/interface; IBM Plex Mono 400 for
  numbers, section labels and keycaps. Fontsource packages bundle font files
  locally; there are no Google Fonts/CDN requests. System fallbacks remain.
- **Icons:** named, tree-shaken imports from `lucide`, rendered as decorative
  24-unit SVGs, 1.7 stroke. Interactive icon-only buttons have accessible names.
  Existing gameplay icons are intentionally not replaced in this scope.
- **Spacing:** 4/8/12/16/24/32 with fluid page gutters and a 1320px max width.
- **Shape:** 9px buttons, 9–14px cards, 18px dialogs; restrained 1px borders.
- **States:** default, hover, active, focus-visible, current, cleared and
  disabled/locked. Only Vault rooms lock; every campaign level remains open.

## Components and flow

- Home: primary continue/start CTA, secondary collection, daily card, real
  saved campaign progress, navigation to guide and settings. No invented streaks
  or completion numbers. New and returning save states have distinct copy.
- Collection: fixed navigation and world jump buttons; independently scrolling
  five/three-column cards; daily entry, ten act sections and Vault. Current
  section is announced via `aria-current`; the tab strip follows the section.
- Settings: theme, Auto/Reduced/Full motion and sound backed by existing save
  fields and handlers. Accessible from home, collection and pause. The game's
  HUD moon/sun and sound buttons are unchanged and stay synchronized.
- Guide: keyboard and touch instructions, including hold-to-roll.
- Pause / completion: shared dialog treatment; existing resume, replay, next,
  records, medal and mastery data stay intact. Settings returns to pause,
  **not** to an accidentally resumed game.

## Accessibility, responsiveness and boundaries

`initShell` manages visible UI layers, makes backgrounds inert, contains Tab
focus, closes settings/guide with Escape and restores their invoking control.
Native Enter/Space activation does not also trigger global Play/Next shortcuts.
Arrow keys scroll menus rather than arming held movement; gameplay key handling
when playing is unchanged. Settings shortcuts cannot restart the board below.

No horizontal page overflow at tested 320px/390px mobile widths. Mobile home
scrolls vertically; collection header/footer remain available. Dialog panels
scroll in short viewports. Safe-area gutters protect notched screens. Browser
zoom is allowed; the game canvas retains its own `touch-action: none`.
Existing system/in-game reduced-motion CSS applies to the new shell too.

## Validation

Against the **production preview** (`npm run build`, then `npm run preview`):

- `npm run test:ui`: desktop 1440×960, 390×844 and 320×640; real navigation,
  fresh progress, theme/motion/sound persistence, focus wrap/restore,
  Escape, world navigation, pause/settings/resume, game input and completion
  layout; screenshots in ignored `shots/shell/`; zero external requests.
- `npm run test:a11y`: axe WCAG 2 A/AA + 2.1 AA scans of six application
  screens in both themes, plus 320px settings (13 scans). This is automated
  coverage, not a claim of a full manual assistive-technology certification.
- `tests/unit/shell.test.mjs`: local assets, named modal semantics, shell/game
  token separation, native controls/zoom, closed icon registry.
- Existing pinned-bug regressions and the hook's stratified live-play gate
  remain required. The completion layout tests invoke the real win event for
  fixture coverage; they are **not** substituted for live playability proof.
- UI and accessibility browser checks also run in push/PR CI against the build.

## Dependency / licence note

Lucide is ISC-licensed. Manrope and IBM Plex Mono are SIL OFL-1.1 fonts, installed
through Fontsource. These are an explicit exception to the original
"asset-free UI" convention, to satisfy the requested production typography
and consistent icon package. The game world remains procedural, and the app
still uses no remote assets, backend, analytics, runtime CDN or telemetry by
default. Complete terms ship as `public/third-party-ui-licenses.txt`, copied to the
production build; source terms also remain in the installed packages' LICENSE
files. axe-core is a development-only scanner (no Puppeteer browser download
or extra browser runtime dependency is introduced).

Executed before commit: production build, complete UI flow regression, all 13
axe scans with zero violations, existing pinned-bug regressions and the legacy
mechanics playtest (85/85, no page errors). Full unit run: 255/255. Automated
contrast checks finish only finite entrance animations before snapshots;
normal animation flow is exercised separately, preventing a software-GL
first-frame opacity snapshot from masquerading as a palette failure.
