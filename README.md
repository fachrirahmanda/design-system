# Basis design system

The shared CSS and JavaScript baseline for our web apps: tokens, components, forms and small behaviours, with light and dark themes. The docs site (component list with live examples and copyable code) and the library are deployed together.

**Docs:** https://design-system-bc6.pages.dev
**Library:** https://design-system-bc6.pages.dev/v1/ds.css · `/v1/ds.js` (ES module) · `/v1/ds.iife.js` (classic script)

## Use it in an app

```html
<link rel="stylesheet" href="https://design-system-bc6.pages.dev/v1/ds.css">
<script type="module" src="https://design-system-bc6.pages.dev/v1/ds.js"></script>
```

In Vite apps put the base URL in `.env` (`VITE_DS_URL=https://design-system-bc6.pages.dev/v1`) and reference `%VITE_DS_URL%/ds.css` in `index.html`. See `../image-converter` for a full example.

## Versioning

Everything under `/v1/` must stay backwards compatible, because every app picks up changes within about 5 minutes (`Cache-Control: max-age=300`). For a breaking change (renaming a class or token, changing markup a component needs), publish it as `/v2/` and move apps over one at a time.

## Development

```bash
npm install
npm run dev       # docs on http://localhost:5174, library at /v1/ds.css and /v1/ds.js
npm run build     # type check, docs into dist/, library into dist/v1/
npm run deploy    # build + deploy to Cloudflare Pages (project `design-system`)
```

To try changes in an app before deploying, run `npm run dev` here and `npm run dev:local-ds` in the app.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/ds.css` | Library stylesheet entry (imports everything in `src/css/`) |
| `src/css/tokens.css` | Colors, type scale, spacing, radius, shadows, motion |
| `src/css/base.css` | Element defaults (reboot) |
| `src/css/buttons.css` | Buttons, icon buttons, chips, theme switch |
| `src/css/forms.css` | Fields, inputs, select, checkbox, switch, segmented, range, drop zone |
| `src/css/content.css` | Container, surface, navbar, card, badge, alert, table, list group, avatar, empty state |
| `src/css/interactive.css` | Tabs, dropdown, dialog, toast, tooltip, accordion, progress, spinner, skeleton |
| `src/css/utilities.css` | Layout and text helpers |
| `src/ds.ts` | Behaviours (theme, dialogs, tabs, dropdowns, toasts, range fill) and the `window.DS` API |
| `index.html`, `docs/` | Documentation site |
| `public/_headers` | CORS and caching for `/v1/*` |

## Adding a component

1. Add its styles to the matching file in `src/css/` using tokens, not raw colors.
2. If it needs JavaScript, wire it in `src/ds.ts` with delegated listeners and `data-ds-*` attributes.
3. Add a section to `index.html` with an `.example[data-code]` block (the code snippet is generated from the example) and a link in the sidebar.
