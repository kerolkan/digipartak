/*
 * DIGI parťák – bezpečný chatbot
 * ------------------------------------------------------------------
 * Princip „uzavřené knihovny“:
 *  1. Ochrana citlivých údajů – čísla karet, rodná čísla, PIN a hesla
 *     se v textu skryjí a uživatel je upozorněn. Nic se neodesílá.
 *  2. Vyhledání nejbližší odpovědi v ověřené knihovně (js/kb.js).
 *  3. Když si bot není jistý, NEHÁDÁ – nabídne témata a lidskou pomoc.
 * Vše běží jen v zařízení uživatele, bez serveru a bez AI generování.
 */
(function () {
  'use strict';
  const KB = window.DP.KB;

  function normalize(s) {
    return (' ' + String(s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ').trim() + ' ');
  }

  /* ---------- 1. Citlivé údaje ---------- */
  function luhn(num) {
    let sum = 0, dbl = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let d = +num[i];
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d; dbl = !dbl;
    }
    return sum % 10 === 0;
  }

  function scrubSensitive(text) {
    const found = new Set();
    let out = String(text);
    // Platební karta: 13–19 číslic, případně s mezerami/pomlčkami, kontrola Luhn.
    out = out.replace(/\b(?:\d[ -]?){12,18}\d\b/g, (m) => {
      const digits = m.replace(/\D/g, '');
      if (digits.length >= 13 && digits.length <= 19 && luhn(digits)) { found.add('karta'); return '•••• skryto ••••'; }
      return m;
    });
    // Rodné číslo: 6 číslic / 3–4 číslice.
    out = out.replace(/\b\d{6}\s?\/\s?\d{3,4}\b/g, () => { found.add('rodne'); return '•••• skryto ••••'; });
    // CVV / PIN / heslo / kód: skrýt jen skutečnou hodnotu – obsahuje číslici,
    // nebo je uvozená „je“, „=“ či „:“ (např. „heslo je kocka“). „Jak změnit PIN?“ nevadí.
    out = out.replace(/(^|[^\p{L}])(pin|cvv|cvc|heslo|hesla|kód|kod|password)(\s*(?:je|=|:)\s*|\s+)([^\s,.;!?]{3,})/giu, (m, pre, w, sep, val) => {
      const explicit = /(je|=|:)/i.test(sep);
      if (!explicit && !/\d/.test(val)) return m;
      if (explicit && /^(do|na|od|pro|moc|tak|potreba|potřeba|spatne|špatně|dlouhe|dlouhé|kratke|krátké|bezpecne|bezpečné)$/i.test(val)) return m;
      found.add('heslo'); return pre + w + sep + '••••';
    });
    return { text: out, found: Array.from(found) };
  }

  /* ---------- 2. Vyhledání v knihovně ---------- */
  function scoreEntry(entry, norm, tokens) {
    let score = 0;
    const hits = [];
    for (const raw of entry.k) {
      const kw = Array.isArray(raw) ? raw[0] : raw;
      const w = Array.isArray(raw) ? raw[1] : 1;
      let hit = false;
      if (kw.indexOf(' ') !== -1) {
        // Fráze: začíná na hranici slova; mezera na konci = přesné slovo.
        hit = norm.indexOf(' ' + kw.replace(/^\s+/, '')) !== -1;
      } else if (kw.length <= 3) {
        // Krátké slovo (např. „pin“, „clo“) jen jako celé slovo.
        hit = tokens.indexOf(kw) !== -1;
      } else {
        hit = tokens.some((t) => t.startsWith(kw) || (t.length >= 5 && kw.startsWith(t)));
      }
      if (hit) { score += w; hits.push(kw); }
    }
    return { score, hits };
  }

  const THRESHOLD = 3;
  const URGENT_THRESHOLD = 4; // urgentní témata chtějí silnější shodu (méně planých poplachů)

  function search(text) {
    const norm = normalize(text);
    const tokens = norm.trim().split(' ').filter(Boolean);
    const ranked = KB.map((e) => Object.assign({ entry: e }, scoreEntry(e, norm, tokens)))
      .filter((r) => r.score > 0 && (!r.entry.urgent || r.score >= URGENT_THRESHOLD))
      .sort((a, b) => (b.score - a.score) || ((b.entry.urgentLevel || 0) - (a.entry.urgentLevel || 0)));
    return ranked;
  }

  function byId(id) { return KB.find((e) => e.id === id); }

  /*
   * Hlavní funkce: vrací strukturu odpovědi, nikdy volný text z internetu.
   * type: 'answer' | 'clarify' | 'unknown'
   */
  function reply(userText) {
    const scrub = scrubSensitive(userText);
    const res = { scrubbed: scrub.text, sensitive: scrub.found };
    const clean = scrub.text.trim();

    if (clean.length < 2) {
      return Object.assign(res, { type: 'unknown', reason: 'empty' });
    }
    const ranked = search(clean);
    const top = ranked[0];

    // Urgentní témata (zdraví, krize, probíhající podvod) mají vždy přednost.
    const urgent = ranked.find((r) => r.entry.urgent);
    if (urgent) return Object.assign(res, { type: 'answer', entry: urgent.entry });

    if (!top || top.score < THRESHOLD) {
      const suggestions = ranked.filter((r) => r.entry.cat !== 'konverzace').slice(0, 3).map((r) => r.entry);
      return Object.assign(res, { type: 'unknown', suggestions });
    }

    // Dvě podobně silná témata → zeptat se, co uživatel myslí.
    const second = ranked[1];
    if (second && second.entry.cat !== 'konverzace' && top.entry.cat !== 'konverzace'
        && second.score >= THRESHOLD && top.score - second.score <= 1) {
      return Object.assign(res, { type: 'clarify', options: ranked.filter((r) => r.score >= THRESHOLD).slice(0, 3).map((r) => r.entry) });
    }
    return Object.assign(res, { type: 'answer', entry: top.entry });
  }

  window.DP.bot = { reply, byId, normalize, scrubSensitive, search };
})();
