// Docs-only behaviour: code snippets, navigation, token previews and demos.
// The docs use the library straight from source so they always show the current code.
import '../src/ds.css';
import { toast, version, type ToastOptions } from '../src/ds';
import './docs.css';

const DS_URL = `${location.origin}/v1`;

document.querySelectorAll('[data-ds-version]').forEach((el) => (el.textContent = version));

// ---------- code blocks ----------

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function dedent(code: string) {
  const lines = code.replace(/^\s*\n/, '').replace(/\s+$/, '').split('\n');
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  return lines.map((l) => l.slice(indent)).join('\n');
}

function highlightHtml(code: string) {
  return code.replace(/(<!--[\s\S]*?-->)|(<\/?)([\w-]+)((?:\s+[^\s=>]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?>)|([^<]+|<)/g,
    (_m, com, open, tag, attrs, close, text) => {
      if (com) return `<span class="tok-com">${esc(com)}</span>`;
      if (text !== undefined) return esc(text);
      const a = (attrs as string).replace(/([^\s=]+)(?:=("[^"]*"|'[^']*'|[^\s>]+))?/g, (_x, name, val) =>
        `<span class="tok-attr">${esc(name)}</span>${val ? `=<span class="tok-str">${esc(val)}</span>` : ''}`);
      return `<span class="tok-tag">${esc(open)}${tag}</span>${a}<span class="tok-tag">${esc(close)}</span>`;
    });
}

function highlightJs(code: string) {
  return code.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)|('[^'\n]*'|"[^"\n]*"|`[^`]*`)|\b(import|from|export|const|let|var|function|return|if|else|await|async|new|true|false|null|undefined)\b|\b(\d+(?:\.\d+)?)\b|([^/'"`\w]+|\w+|.)/gm,
    (_m, com, str, kw, num, rest) =>
      com ? `<span class="tok-com">${esc(com)}</span>`
      : str ? `<span class="tok-str">${esc(str)}</span>`
      : kw ? `<span class="tok-kw">${kw}</span>`
      : num ? `<span class="tok-num">${num}</span>`
      : esc(rest));
}

function highlightCss(code: string) {
  return code.replace(/(\/\*[\s\S]*?\*\/)|(--[\w-]+)|(#[0-9a-f]{3,8}\b|\d+(?:\.\d+)?(?:px|%|em|rem)?)|([^/\-#\d]+|.)/gi,
    (_m, com, prop, num, rest) =>
      com ? `<span class="tok-com">${esc(com)}</span>`
      : prop ? `<span class="tok-attr">${prop}</span>`
      : num ? `<span class="tok-num">${esc(num)}</span>`
      : esc(rest));
}

function highlightSh(code: string) {
  return code.split('\n').map((l) => (l.trim().startsWith('#') ? `<span class="tok-com">${esc(l)}</span>` : esc(l))).join('\n');
}

const highlighters: Record<string, (s: string) => string> = { html: highlightHtml, js: highlightJs, css: highlightCss, sh: highlightSh };

function codeBlock(code: string, lang: string) {
  const wrap = document.createElement('div');
  wrap.className = 'code';
  const pre = document.createElement('pre');
  const el = document.createElement('code');
  el.innerHTML = (highlighters[lang] ?? esc)(code);
  pre.append(el);

  const actions = document.createElement('div');
  actions.className = 'code-actions';
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'btn btn-sm';
  copy.textContent = 'Copy';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast('Copied to clipboard', { variant: 'success', duration: 2000 });
    } catch {
      toast('Copy failed: select the code and copy manually', { variant: 'danger' });
    }
  });
  actions.append(copy);

  const label = document.createElement('span');
  label.className = 'code-lang';
  label.textContent = lang;
  actions.prepend(label);
  wrap.append(pre, actions);

  if (code.split('\n').length > 14) {
    wrap.classList.add('is-collapsed');
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'code-expand';
    more.textContent = 'Show full code';
    more.addEventListener('click', () => {
      const collapsed = wrap.classList.toggle('is-collapsed');
      more.textContent = collapsed ? 'Show full code' : 'Show less';
    });
    wrap.append(more);
  }
  return wrap;
}

// Live examples: the snippet is the example's own markup, so they can't drift apart.
// index.html captures it before ds.js adds runtime attributes (aria-pressed, tabindex, …).
declare global {
  interface Window { __examples?: string[] }
}
document.querySelectorAll<HTMLElement>('.example[data-code]').forEach((ex, i) => {
  const html = dedent(window.__examples?.[i] ?? ex.innerHTML).replace(/=""/g, '');
  ex.after(codeBlock(html, 'html'));
});

// Static snippets written in <textarea class="code-src">.
document.querySelectorAll<HTMLTextAreaElement>('textarea.code-src').forEach((ta) => {
  const block = codeBlock(dedent(ta.value).replaceAll('{{DS_URL}}', DS_URL), ta.dataset.lang ?? 'text');
  block.classList.add('standalone');
  ta.replaceWith(block);
});

// ---------- foundations ----------

const COLOR_GROUPS: [string, string[]][] = [
  ['Surfaces', ['--bg', '--surface', '--surface-2', '--fill', '--fill-strong', '--separator']],
  ['Text', ['--text', '--muted']],
  ['Brand', ['--accent', '--accent-hover', '--accent-soft', '--focus']],
  ['Status', ['--success', '--success-soft', '--warning', '--warning-soft', '--danger', '--danger-soft']],
];

const probe = document.createElement('span');
probe.style.display = 'none';
document.body.append(probe);

function resolved(token: string) {
  probe.style.color = `var(${token})`;
  const c = getComputedStyle(probe).color;
  const m = c.match(/rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+%?))?\)/);
  if (!m) return c;
  const [r, g, b] = m.slice(1, 4).map(Number);
  const hex = `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`;
  const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : Number(m[4]);
  return a < 1 ? `${hex} · ${Math.round(a * 100)}%` : hex;
}

function renderSwatches() {
  const root = document.getElementById('swatches')!;
  root.replaceChildren(
    ...COLOR_GROUPS.map(([title, tokens]) => {
      const group = document.createElement('div');
      group.className = 'swatch-group';
      group.innerHTML = `<h3>${title}</h3><div class="swatches">${tokens
        .map((t) => `<div class="swatch"><div class="swatch-color on-check"><span style="background: var(${t})"></span></div><div class="swatch-info"><code>${t}</code><span>${resolved(t)}</span></div></div>`)
        .join('')}</div>`;
      return group;
    }),
  );
}
renderSwatches();
document.addEventListener('ds:themechange', renderSwatches);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', renderSwatches);

document.getElementById('space-scale')!.innerHTML = [1, 2, 3, 4, 5, 6, 8, 10, 12]
  .map((n) => `<div class="space-row"><code>--space-${n}</code><span>${n * 4}px</span><div class="space-bar" style="width: var(--space-${n})"></div></div>`)
  .join('');

document.getElementById('radius-tiles')!.innerHTML = [['sm', 8], ['', 10], ['md', 14], ['lg', 18], ['xl', 20], ['full', 999]]
  .map(([n, px]) => {
    const token = n ? `--radius-${n}` : '--radius';
    return `<div class="token-tile"><div class="tile radius" style="border-radius: var(${token})"></div><code>${token}</code><span>${px}px</span></div>`;
  })
  .join('');

document.getElementById('shadow-tiles')!.innerHTML = [['sm', 'Subtle lift'], ['md', 'Cards, panels'], ['lg', 'Dialogs, popovers']]
  .map(([n, use]) => `<div class="token-tile"><div class="tile" style="box-shadow: var(--shadow-${n}); border-radius: var(--radius-md)"></div><code>--shadow-${n}</code><span>${use}</span></div>`)
  .join('');

// ---------- demos ----------

const demoToasts: Record<string, [string, ToastOptions]> = {
  info: ['Saved to history', {}],
  success: ['12 images converted', { variant: 'success' }],
  warning: ['Storage is almost full', { variant: 'warning' }],
  danger: ['Could not read beach.heic', { variant: 'danger' }],
  action: ['Image removed', { duration: 6000, action: { label: 'Undo', onClick: () => toast('Restored', { variant: 'success' }) } }],
};
document.querySelectorAll<HTMLButtonElement>('[data-demo-toast]').forEach((btn) =>
  btn.addEventListener('click', () => toast(...demoToasts[btn.dataset.demoToast!])),
);

const quality = document.querySelector<HTMLInputElement>('#demo-quality')!;
quality.addEventListener('input', () => (document.getElementById('demo-quality-val')!.textContent = quality.value));

document.querySelectorAll<HTMLElement>('.chips').forEach((group) =>
  group.addEventListener('click', (e) => {
    const chip = (e.target as Element).closest('.chip');
    if (!chip) return;
    group.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  }),
);

// Example links shouldn't jump the page.
document.querySelectorAll<HTMLAnchorElement>('.example a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));

// ---------- navigation ----------

const sidebar = document.getElementById('docs-sidebar')!;
const menuBtn = document.querySelector<HTMLButtonElement>('.docs-menu-btn')!;
const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('#docs-nav a')];

function setMenu(open: boolean) {
  sidebar.classList.toggle('is-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
}
menuBtn.addEventListener('click', () => setMenu(!sidebar.classList.contains('is-open')));
navLinks.forEach((a) => a.addEventListener('click', () => setMenu(false)));

const filter = document.querySelector<HTMLInputElement>('#docs-filter')!;
const empty = document.createElement('p');
empty.className = 'docs-nav-empty';
empty.textContent = 'No matches';
empty.hidden = true;
document.getElementById('docs-nav')!.append(empty);
filter.addEventListener('input', () => {
  const q = filter.value.trim().toLowerCase();
  let shown = 0;
  for (const a of navLinks) {
    a.hidden = !!q && !a.textContent!.toLowerCase().includes(q);
    if (!a.hidden) shown++;
  }
  document.querySelectorAll<HTMLElement>('.docs-nav-group').forEach((g) => (g.hidden = !!q));
  empty.hidden = shown > 0;
});
filter.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') navLinks.find((a) => !a.hidden)?.click();
});
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !(e.target as Element).closest('input, textarea, select')) {
    e.preventDefault();
    filter.focus();
  }
});

// Highlight the section currently in view.
const sections = navLinks.map((a) => document.querySelector<HTMLElement>(a.hash)).filter((s): s is HTMLElement => !!s);
const visible = new Set<Element>();
const observer = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) visible.add(e.target);
      else visible.delete(e.target);
    }
    const current = sections.find((s) => visible.has(s));
    if (!current) return;
    navLinks.forEach((a) => a.classList.toggle('is-active', a.hash === `#${current.id}`));
  },
  { rootMargin: '-64px 0px -60% 0px' },
);
sections.forEach((s) => observer.observe(s));
