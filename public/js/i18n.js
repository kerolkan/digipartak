/*
 * DIGI parťák – jazyky
 * ------------------------------------------------------------------
 * Čeština je primární jazyk: všechny texty v kódu jsou česky a slouží
 * zároveň jako klíče překladů. Ostatní jazyky jsou v public/i18n/<kód>.js
 * a načítají se jen tehdy, když je uživatel zvolí.
 *
 * Soubor jazyka:  DP.L10N.en = {
 *   ui:     { 'Český text': 'Translation', 'Krok {i} z {n}': 'Step {i} of {n}' },
 *   kb:     { 'id-tematu': [titulek, odpověď, [kroky…], varování] },
 *   guides: { 'id-navodu': [titulek, úvod, [[krok, text, tip], …]] },
 *   cats:   { bezpeci: 'Online safety', … },
 *   phones: { senior: [název, popis], … },
 *   urgent: { 'krize': ['want to die', …], … }   // nouzová témata i bez internetu
 *   scam:   { urgent: 'immediately|within 24', … } // klíčová slova pro kontrolu podvodu
 * }
 */
(function () {
  'use strict';
  const DP = window.DP = window.DP || {};
  DP.L10N = DP.L10N || {};

  const LANGS = [
    { code: 'cs', name: 'Čeština', speech: 'cs-CZ' },
    { code: 'en', name: 'English', speech: 'en-GB' },
    { code: 'uk', name: 'Українська', speech: 'uk-UA' },
    { code: 'de', name: 'Deutsch', speech: 'de-DE' },
    { code: 'sk', name: 'Slovenčina', speech: 'sk-SK' },
    { code: 'pl', name: 'Polski', speech: 'pl-PL' }
  ];
  const byCode = (c) => LANGS.find((l) => l.code === c);

  let lang = 'cs';
  let dict = null;

  /* Překlad: neznámý text se vrátí česky (bezpečný záložní jazyk). */
  function T(str, vars) {
    let out = (dict && dict.ui && Object.prototype.hasOwnProperty.call(dict.ui, str)) ? dict.ui[str] : str;
    if (vars) out = String(out).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return out;
  }

  /* Originální české texty, abychom se mohli kdykoli vrátit. */
  const ORIG = { kb: {}, guides: {}, cats: {}, phones: {} };
  function snapshot() {
    (DP.KB || []).forEach((e) => { ORIG.kb[e.id] = { title: e.title, a: e.a, steps: e.steps.slice(), warn: e.warn }; });
    (DP.GUIDES || []).forEach((g) => { ORIG.guides[g.id] = { title: g.title, intro: g.intro, src: g.src, steps: g.steps.map((s) => Object.assign({}, s)) }; });
    Object.keys(DP.CATS || {}).forEach((k) => { ORIG.cats[k] = DP.CATS[k].label; });
    (DP.PHONES || []).forEach((p) => { ORIG.phones[p.id] = { name: p.name, desc: p.desc }; });
  }

  function applyContent() {
    const d = dict || {};
    (DP.KB || []).forEach((e) => {
      const o = ORIG.kb[e.id]; const t = d.kb && d.kb[e.id];
      e.title = t ? t[0] : o.title;
      e.a = t ? t[1] : o.a;
      e.steps = t ? t[2] : o.steps.slice();
      e.warn = t ? (t[3] || undefined) : o.warn;
      e.translated = !!t || lang === 'cs';
    });
    (DP.GUIDES || []).forEach((g) => {
      const o = ORIG.guides[g.id]; const t = d.guides && d.guides[g.id];
      g.title = t ? t[0] : o.title;
      g.intro = t ? t[1] : o.intro;
      g.src = T(o.src);
      g.steps = t ? t[2].map((s) => ({ t: s[0], p: s[1], tip: s[2] || undefined })) : o.steps.map((s) => Object.assign({}, s));
    });
    Object.keys(DP.CATS || {}).forEach((k) => { DP.CATS[k].label = (d.cats && d.cats[k]) || ORIG.cats[k]; });
    (DP.PHONES || []).forEach((p) => {
      const t = d.phones && d.phones[p.id]; const o = ORIG.phones[p.id];
      p.name = t ? t[0] : o.name; p.desc = t ? t[1] : o.desc;
    });
  }

  /* Statické texty v index.html (data-i18n, data-i18n-aria). */
  function applyStatic() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = T(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', T(el.getAttribute('data-i18n-aria'))); });
  }

  function load(code) {
    if (code === 'cs' || DP.L10N[code]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'i18n/' + code + '.js';
      s.onload = () => (DP.L10N[code] ? resolve() : reject(new Error('missing')));
      s.onerror = () => reject(new Error('load'));
      document.head.appendChild(s);
    });
  }

  function store(code) { try { localStorage.setItem('dp:lang', JSON.stringify(code)); } catch (e) { /* soukromé okno */ } }
  function stored() { try { const v = JSON.parse(localStorage.getItem('dp:lang')); return byCode(v) ? v : null; } catch (e) { return null; } }
  function detect() {
    const list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'cs']);
    for (const l of list) {
      const c = String(l).toLowerCase().slice(0, 2);
      if (c === 'cs') return 'cs';
      if (byCode(c)) return c;
    }
    return 'cs';
  }

  async function setLang(code, remember) {
    if (!byCode(code)) code = 'cs';
    try { await load(code); }
    catch (e) { code = 'cs'; } // bez internetu a bez uloženého souboru zůstane čeština
    lang = code;
    dict = code === 'cs' ? null : DP.L10N[code];
    applyContent();
    applyStatic();
    if (remember) store(code);
    return code;
  }

  async function init() {
    snapshot();
    return setLang(stored() || detect(), false);
  }

  DP.T = T;
  DP.i18n = {
    LANGS, T, init, setLang,
    current: () => lang,
    info: () => byCode(lang),
    speech: () => byCode(lang).speech,
    extra: (key) => (dict && dict[key]) || null
  };
})();
