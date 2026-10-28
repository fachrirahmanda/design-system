// Checks the text colour pairs Basis ships against WCAG AA (4.5:1 for text) in both themes, from
// the tokens in src/css/tokens.css. Runs before every build: a token change that makes text hard
// to read fails the build instead of reaching the apps.
import { readFileSync } from 'node:fs';

const MIN = 4.5;
const css = readFileSync(new URL('../src/css/tokens.css', import.meta.url), 'utf8');

/** Token name → [light, dark], each as [r, g, b, alpha]. */
const tokens = {};
for (const [, name, light, dark] of css.matchAll(/--([\w-]+):\s*light-dark\(\s*([^,]+?(?:\([^)]*\))?)\s*,\s*([^;]+?(?:\([^)]*\))?)\s*\);/g)) {
  tokens[name] = [parse(light), parse(dark)];
}

function parse(v) {
  v = v.trim();
  const hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).concat(1);
  const rgb = v.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+))?\s*\)$/);
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3], rgb[4] === undefined ? 1 : +rgb[4]];
  throw new Error(`check-contrast: can't read colour "${v}"`);
}

/** A colour with alpha laid over an opaque one. */
const over = ([r, g, b, a], [R, G, B]) => [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a), 1];
const lum = (c) => {
  const [r, g, b] = c.slice(0, 3).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const WHITE = [255, 255, 255, 1];
const NEAR_BLACK = [10, 10, 10, 1];
const GROUNDS = ['bg', 'surface', 'surface-2'];
/** [what, text colour, ground colour] per theme (0 light, 1 dark). */
const pairs = (t) => {
  const tok = (n) => {
    if (!tokens[n]) throw new Error(`check-contrast: no --${n} in tokens.css`);
    return tokens[n][t];
  };
  const list = [];
  for (const g of GROUNDS) {
    list.push([`--text on --${g}`, tok('text'), tok(g)]);
    list.push([`--muted on --${g}`, tok('muted'), tok(g)]);
  }
  list.push(['--on-accent on --accent', tok('on-accent'), tok('accent')]);
  for (const s of ['info', 'success', 'warning', 'danger']) {
    for (const g of GROUNDS) {
      // .text-*, and badges and alerts: the colour on its own soft tint.
      list.push([`--${s} on --${g}`, tok(s), tok(g)]);
      list.push([`--${s} on --${s}-soft over --${g}`, tok(s), over(tok(`${s}-soft`), tok(g))]);
    }
  }
  // Solid status buttons (buttons.css): white text in light, near-black in dark.
  for (const s of ['success', 'danger']) list.push([`.btn-${s} text`, t ? NEAR_BLACK : WHITE, tok(s)]);
  return list;
};

let failed = 0;
for (const [t, theme] of [[0, 'light'], [1, 'dark']]) {
  for (const [what, fg, bg] of pairs(t)) {
    const r = ratio(fg, bg.length === 4 && bg[3] < 1 ? over(bg, tokens.bg[t]) : bg);
    if (r < MIN) {
      failed++;
      console.error(`  ✗ ${theme}: ${what} is ${r.toFixed(2)}:1 (needs ${MIN}:1)`);
    }
  }
}
if (failed) {
  console.error(`check-contrast: ${failed} text colour pair(s) below ${MIN}:1. Adjust the tokens in src/css/tokens.css.`);
  process.exit(1);
}
console.log('check-contrast: every text colour pair is 4.5:1 or more in both themes');
