// Basis behaviours. Everything is wired through delegated listeners on document,
// so markup added later works without calling an init function.

import { version } from '../package.json';

export { version };

// ---------- theme ----------

export type Theme = 'light' | 'dark' | 'system';

/** localStorage key; the pre-paint snippet in each app's <head> reads the same key. */
export const THEME_KEY = 'theme';

export function getTheme(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === 'light' || t === 'dark' ? t : 'system';
}

/** Force light/dark, or follow the OS with 'system'. Persists unless persist is false. */
export function setTheme(theme: Theme, persist = true) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
  else delete root.dataset.theme;
  if (persist) {
    try {
      if (theme === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }
  syncThemeButtons();
  document.dispatchEvent(new CustomEvent('ds:themechange', { detail: { theme } }));
}

function syncThemeButtons() {
  const theme = getTheme();
  document.querySelectorAll<HTMLElement>('[data-theme-value]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeValue === theme)));
}

function restoreTheme() {
  if (document.documentElement.dataset.theme) return;
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  } catch {}
}

// ---------- range ----------

/** Update the filled part of a range track. Call after setting .value from code; user input is tracked automatically. */
export function syncRange(input?: HTMLInputElement) {
  const targets = input ? [input] : document.querySelectorAll<HTMLInputElement>('input[type="range"]');
  for (const r of targets) {
    const min = Number(r.min || 0);
    const max = Number(r.max || 100);
    const pct = max > min ? ((Number(r.value) - min) / (max - min)) * 100 : 0;
    r.style.setProperty('--range-progress', `${pct}%`);
  }
}

// ---------- dialog ----------

function resolve<T extends Element>(target: string | T): T | null {
  return typeof target === 'string' ? document.querySelector<T>(target) : target;
}

export function openDialog(target: string | HTMLDialogElement) {
  const d = resolve<HTMLDialogElement>(target);
  if (d && !d.open) d.showModal();
  return d;
}

export function closeDialog(target: string | HTMLDialogElement, returnValue?: string) {
  resolve<HTMLDialogElement>(target)?.close(returnValue);
}

// ---------- dropdown ----------

function menuItems(dropdown: Element) {
  return [...dropdown.querySelectorAll<HTMLElement>('.menu-item:not(:disabled)')];
}

function setDropdown(dropdown: Element, open: boolean, focus: 'first' | 'last' | 'toggle' | null = null) {
  const toggle = dropdown.querySelector<HTMLElement>('[data-ds-toggle="dropdown"]');
  dropdown.classList.toggle('is-open', open);
  toggle?.setAttribute('aria-expanded', String(open));
  if (focus === 'toggle') toggle?.focus();
  else if (focus) {
    const items = menuItems(dropdown);
    (focus === 'first' ? items[0] : items.at(-1))?.focus();
  }
}

function closeDropdowns(except?: Element | null) {
  document.querySelectorAll('.dropdown.is-open').forEach((d) => d !== except && setDropdown(d, false));
}

// ---------- tabs ----------

export function selectTab(tab: HTMLElement) {
  const list = tab.closest('[role="tablist"]');
  if (!list) return;
  for (const t of list.querySelectorAll<HTMLElement>('[role="tab"]')) {
    const selected = t === tab;
    t.setAttribute('aria-selected', String(selected));
    t.tabIndex = selected ? 0 : -1;
    const panel = t.getAttribute('aria-controls');
    if (panel) document.getElementById(panel)?.toggleAttribute('hidden', !selected);
  }
  list.dispatchEvent(new CustomEvent('ds:tabchange', { bubbles: true, detail: { tab } }));
}

// ---------- toast ----------

export interface ToastOptions {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  /** Milliseconds before it hides; 0 keeps it until dismissed. Default 4000. */
  duration?: number;
  action?: { label: string; onClick: () => void };
}

function toastRegion() {
  let region = document.querySelector<HTMLElement>('.toast-region');
  if (!region) {
    region = document.createElement('div');
    region.className = 'toast-region';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.append(region);
  }
  return region;
}

export function toast(message: string, options: ToastOptions = {}) {
  const el = document.createElement('div');
  el.className = `toast${options.variant && options.variant !== 'info' ? ` toast-${options.variant}` : ''}`;
  const text = document.createElement('span');
  text.className = 'toast-message';
  text.textContent = message;
  el.append(text);

  let timer = 0;
  const dismiss = () => {
    clearTimeout(timer);
    if (el.classList.contains('is-leaving')) return;
    el.classList.add('is-leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 300); // in case animations are disabled
  };

  if (options.action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = options.action.label;
    btn.addEventListener('click', () => {
      options.action!.onClick();
      dismiss();
    });
    el.append(btn);
  }
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', 'Dismiss');
  close.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  close.addEventListener('click', dismiss);
  el.append(close);

  toastRegion().append(el);
  const duration = options.duration ?? 4000;
  if (duration > 0) timer = window.setTimeout(dismiss, duration);
  return { dismiss };
}

// ---------- wiring ----------

function onClick(e: MouseEvent) {
  const target = e.target as Element;

  const themeBtn = target.closest<HTMLElement>('[data-theme-value]');
  if (themeBtn) setTheme(themeBtn.dataset.themeValue as Theme);

  const opener = target.closest<HTMLElement>('[data-ds-open]');
  if (opener) openDialog(opener.dataset.dsOpen!);

  const closer = target.closest<HTMLElement>('[data-ds-close]');
  if (closer) closer.closest('dialog')?.close(closer.dataset.dsClose || undefined);

  // Clicking the backdrop of a dismissible dialog closes it (the backdrop click targets the <dialog> itself).
  if (target instanceof HTMLDialogElement && target.open && target.hasAttribute('data-ds-dismissible')) {
    const r = target.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) target.close();
  }

  const dismiss = target.closest<HTMLElement>('[data-ds-dismiss]');
  if (dismiss) dismiss.closest('.alert, [data-ds-dismissible]:not(dialog)')?.remove();

  const toggle = target.closest<HTMLElement>('[data-ds-toggle="dropdown"]');
  const dropdown = target.closest('.dropdown');
  if (toggle && dropdown) {
    const open = !dropdown.classList.contains('is-open');
    closeDropdowns(dropdown);
    setDropdown(dropdown, open);
  } else {
    closeDropdowns(target.closest('.menu-item') ? null : dropdown);
  }

  const tab = target.closest<HTMLElement>('[role="tab"]');
  if (tab?.closest('[data-ds-tabs]')) selectTab(tab);
}

function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement;

  const dropdown = target.closest('.dropdown');
  if (dropdown) {
    const isToggle = target.matches('[data-ds-toggle="dropdown"]');
    if (e.key === 'Escape' && dropdown.classList.contains('is-open')) {
      e.preventDefault();
      setDropdown(dropdown, false, 'toggle');
    } else if (isToggle && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      closeDropdowns(dropdown);
      setDropdown(dropdown, true, e.key === 'ArrowDown' ? 'first' : 'last');
    } else if (target.matches('.menu-item') && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      const items = menuItems(dropdown);
      const i = items.indexOf(target);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    } else if (e.key === 'Tab') {
      setDropdown(dropdown, false);
    }
  }

  if (target.matches('[role="tab"]') && target.closest('[data-ds-tabs]')) {
    const tabs = [...target.closest('[role="tablist"]')!.querySelectorAll<HTMLElement>('[role="tab"]:not(:disabled)')];
    const i = tabs.indexOf(target);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next !== undefined) {
      e.preventDefault();
      const tab = tabs[(next + tabs.length) % tabs.length];
      tab.focus();
      selectTab(tab);
    }
  }
}

function onInput(e: Event) {
  if (e.target instanceof HTMLInputElement && e.target.type === 'range') syncRange(e.target);
}

function init() {
  if ((window as { __dsReady?: boolean }).__dsReady) return;
  (window as { __dsReady?: boolean }).__dsReady = true;
  restoreTheme();
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('input', onInput);
  const ready = () => {
    syncThemeButtons();
    syncRange();
    // Tabs: make only the selected tab focusable and hide the other panels.
    document.querySelectorAll<HTMLElement>('[data-ds-tabs]').forEach((list) => {
      const tabs = [...list.querySelectorAll<HTMLElement>('[role="tab"]')];
      const selected = tabs.find((t) => t.getAttribute('aria-selected') === 'true') ?? tabs[0];
      if (selected) selectTab(selected);
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
}

export const DS = { version, getTheme, setTheme, syncRange, openDialog, closeDialog, selectTab, toast };
export type DSApi = typeof DS;

declare global {
  interface Window { DS: DSApi }
}

window.DS = DS;
init();
