/* DIGI parťák – aplikace (router, obrazovky, nastavení, hlas). */
(function () {
  'use strict';
  const DP = window.DP;
  const icon = DP.icon;
  const T = DP.T;
  const L = () => DP.i18n.current();
  const main = document.getElementById('main');

  /* ================= Pomocné funkce ================= */
  function h(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v; // jen pro vlastní ikony / maskota
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach((x) => append(el, x));
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
  const ico = (name, size) => h('span', { class: 'ico-wrap', 'aria-hidden': 'true', html: icon(name, size) });

  const store = {
    get(k, d) { try { const v = localStorage.getItem('dp:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('dp:' + k, JSON.stringify(v)); } catch (e) { /* soukromé okno */ } },
    clear() { try { Object.keys(localStorage).filter((k) => k.startsWith('dp:')).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* nic */ } }
  };

  let toastTimer;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-on'), 3200);
  }

  /* ================= Nastavení ================= */
  const SIZES = [{ v: 0, label: 'Běžné', short: 'A' }, { v: 1, label: 'Velké', short: 'A+' }, { v: 2, label: 'Největší', short: 'A++' }];
  const settings = {
    size: store.get('size', 0),
    contrast: store.get('contrast', false),
    autoRead: store.get('autoRead', false),
    slow: store.get('slow', true)
  };
  function applySettings() {
    const root = document.documentElement;
    root.dataset.size = String(settings.size);
    root.dataset.contrast = settings.contrast ? 'high' : 'normal';
  }
  function setSetting(k, v) { settings[k] = v; store.set(k, v); applySettings(); }
  applySettings();

  document.getElementById('btn-textsize').addEventListener('click', () => {
    const next = (settings.size + 1) % SIZES.length;
    setSetting('size', next);
    toast(T('Velikost písma: {v}', { v: T(SIZES[next].label) }));
    syncSettingsUI();
  });

  /* ================= Hlas: čtení nahlas ================= */
  const synth = window.speechSynthesis;
  let speakingBtn = null;
  let currentUtter = null;
  function czVoice() {
    if (!synth) return null;
    const vs = synth.getVoices();
    const code = L();
    return vs.find((v) => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith(code)) || null;
  }
  function speak(text, btn) {
    if (!synth) { toast(T('Váš prohlížeč neumí číst nahlas.')); return; }
    if (currentUtter) { const was = speakingBtn; stopSpeaking(); if (btn && was === btn) return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = DP.i18n.speech();
    const v = czVoice(); if (v) u.voice = v;
    u.rate = settings.slow ? 0.85 : 1;
    u.onend = u.onerror = () => {
      if (currentUtter !== u) return; // ukončení staré promluvy po cancel() ignorujeme
      if (btn) setSpeakBtn(btn, false);
      speakingBtn = null; currentUtter = null;
    };
    currentUtter = u;
    speakingBtn = btn || null;
    if (btn) setSpeakBtn(btn, true);
    synth.speak(u);
  }
  function stopSpeaking() {
    currentUtter = null;
    if (synth) synth.cancel();
    if (speakingBtn) setSpeakBtn(speakingBtn, false);
    speakingBtn = null;
  }
  function setSpeakBtn(btn, on) {
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    const lbl = btn.querySelector('.lbl');
    if (lbl) lbl.textContent = on ? T('Zastavit čtení') : T('Přečíst nahlas');
    const ic = btn.querySelector('.ico-wrap');
    if (ic) ic.innerHTML = icon(on ? 'stop' : 'speaker');
  }
  function speakButton(getText, extraClass) {
    const b = h('button', { type: 'button', class: 'btn btn--soft btn--sm ' + (extraClass || ''), 'aria-pressed': 'false', onclick: () => speak(getText(), b) },
      ico('speaker'), h('span', { class: 'lbl' }, T('Přečíst nahlas')));
    if (!synth) b.hidden = true;
    return b;
  }
  if (synth && synth.onvoiceschanged !== undefined) synth.onvoiceschanged = () => {};

  /* ================= Hlas: diktování ================= */
  /*
   * Spolehlivější diktování:
   *  - text se skládá podle pozice výsledku (nic se nezdvojí ani nepřepíše),
   *  - oprava chyby Chrome na Androidu, kde každý výsledek opakuje celý předchozí text,
   *  - senior může mluvit pomalu a s pauzami (konec až po 3 s ticha, nebo klepnutím),
   *  - dotaz se NEODEŠLE sám: text zůstane v poli, senior ho zkontroluje a odešle.
   */
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const IS_ANDROID = /Android/i.test(navigator.userAgent);
  function assembleTranscript(results) {
    const parts = [];
    for (let i = 0; i < results.length; i++) {
      const t = (results[i][0] && results[i][0].transcript || '').trim();
      if (!t) continue;
      const prev = parts[parts.length - 1];
      if (prev && t.toLowerCase().startsWith(prev.toLowerCase())) parts[parts.length - 1] = t; // Android opakuje předchozí text
      else if (prev && prev.toLowerCase().startsWith(t.toLowerCase())) continue;
      else parts.push(t);
    }
    const txt = parts.join(' ').replace(/\s+/g, ' ').trim();
    return txt ? txt.charAt(0).toUpperCase() + txt.slice(1) : '';
  }
  function micButton(input) {
    const b = h('button', { type: 'button', class: 'btn btn--mic', 'aria-pressed': 'false' },
      ico('mic', 26), h('span', { class: 'lbl' }, T('Mluvit')));
    const setLabel = (on) => {
      b.classList.toggle('is-listening', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.querySelector('.lbl').textContent = on ? T('Poslouchám… klepněte pro konec') : T('Mluvit');
    };
    if (!Rec) {
      b.addEventListener('click', () => {
        input.focus();
        toast(T('Tento prohlížeč diktování neumí. Klepněte do pole a použijte mikrofon na klávesnici telefonu.'));
      });
      return b;
    }
    let rec = null, silenceTimer = null, maxTimer = null, before = '', got = '';
    const stop = () => { if (rec) { try { rec.stop(); } catch (e) { /* už skončilo */ } } };
    const armSilence = (ms) => { clearTimeout(silenceTimer); silenceTimer = setTimeout(stop, ms); };
    b.addEventListener('click', () => {
      if (rec) { stop(); return; }
      stopSpeaking();
      rec = new Rec();
      rec.lang = DP.i18n.speech();
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.continuous = !IS_ANDROID; // na Androidu je „continuous“ nespolehlivé
      before = input.value.trim(); got = '';
      setLabel(true);
      armSilence(9000);                       // čas na rozmyšlenou, než senior začne mluvit
      maxTimer = setTimeout(stop, 60000);      // pojistka
      rec.onresult = (e) => {
        got = assembleTranscript(e.results);
        input.value = (before ? before + ' ' : '') + got;
        input.dispatchEvent(new Event('input'));
        armSilence(3000);                      // pauza v řeči je v pořádku
      };
      rec.onerror = (e) => {
        const msg = {
          'not-allowed': T('Povolte prosím mikrofon pro tuto stránku v nastavení prohlížeče.'),
          'service-not-allowed': T('Diktování je vypnuté. Na iPhonu zapněte Siri a diktování v Nastavení, nebo použijte mikrofon na klávesnici.'),
          'no-speech': T('Nic jsem neslyšel. Klepněte na Mluvit a mluvte prosím blíž k telefonu.'),
          'audio-capture': T('Nenašel jsem mikrofon. Zkontrolujte, že ho nepoužívá jiná aplikace.'),
          'network': T('Diktování potřebuje internet. Zkuste to znovu, nebo dotaz napište.'),
          'language-not-supported': T('Diktování v tomto jazyce tu není dostupné. Použijte mikrofon na klávesnici.')
        }[e.error];
        if (msg) toast(msg);
      };
      rec.onend = () => {
        clearTimeout(silenceTimer); clearTimeout(maxTimer);
        rec = null; setLabel(false);
        if (got) {
          input.focus();
          try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) { /* nic */ }
          toast(T('Zkontrolujte prosím text. Pokud sedí, stiskněte tlačítko pro odeslání.'));
        }
      };
      try { rec.start(); } catch (e) { rec = null; setLabel(false); toast(T('Diktování se nepodařilo spustit. Zkuste to prosím znovu.')); }
    });
    return b;
  }

  /* ================= Komponenty ================= */
  function pageHead(title, sub, tone, illu) {
    return h('section', { class: 'card page-head card--' + (tone || 'cream') },
      h('div', { class: 'page-head__text' },
        h('h1', { tabindex: '-1', class: 'page-title' }, title),
        sub ? h('p', { class: 'lead' }, sub) : null),
      illu ? h('div', { class: 'page-head__illu', 'aria-hidden': 'true', html: illu }) : null);
  }

  function phoneCard(p) {
    return h('a', { class: 'phone-card phone-card--' + p.kind, href: 'tel:' + p.tel },
      h('span', { class: 'phone-card__num' }, p.display || p.tel),
      h('span', { class: 'phone-card__body' },
        h('span', { class: 'phone-card__name' }, p.name),
        h('span', { class: 'phone-card__desc' }, p.desc)),
      h('span', { class: 'phone-card__call' }, ico('phone'), h('span', null, T('Zavolat'))));
  }
  const phoneById = (id) => DP.PHONES.find((p) => p.id === id);

  function chip(label, onclick, iconName) {
    return h('button', { type: 'button', class: 'chip', onclick }, iconName ? ico(iconName, 20) : null, h('span', null, label));
  }

  /* ================= Router ================= */
  const routes = {
    '': viewHome, 'chat': viewChat, 'podvod': viewScam, 'navody': viewGuides,
    'pomoc': viewHelp, 'nastaveni': viewSettings, 'jazyk': viewLanguage
  };
  const TITLES = { '': 'Domů', chat: 'Zeptejte se', podvod: 'Je to podvod?', navody: 'Návody krok za krokem', pomoc: 'Pomoc a důležitá čísla', nastaveni: 'Nastavení', jazyk: 'Jazyk' };
  let firstRender = true;

  function render() {
    stopSpeaking();
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    const key = routes[parts[0]] ? parts[0] : '';
    main.innerHTML = '';
    main.className = 'view view--' + (key || 'home');
    routes[key](parts.slice(1));
    document.title = (key === 'navody' && parts[1] ? (DP.GUIDES.find((g) => g.id === parts[1]) || {}).title || T(TITLES[key]) : T(TITLES[key])) + ' – DIGI parťák';
    document.querySelectorAll('[data-nav]').forEach((a) => {
      const on = a.dataset.nav === (key || 'home');
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
    if (!firstRender) {
      const t = main.querySelector('h1');
      if (t) t.focus({ preventScroll: true });
    }
    firstRender = false;
  }
  window.addEventListener('hashchange', render);

  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

  /* ================= DOMŮ ================= */
  function greeting() {
    const hr = new Date().getHours();
    if (hr < 9 && hr >= 4) return T('Dobré ráno!');
    if (hr >= 18 || hr < 4) return T('Dobrý večer!');
    return T('Dobrý den!');
  }

  function askBox(placeholder) {
    const input = h('input', { type: 'text', id: 'home-ask', class: 'input', placeholder: placeholder, autocomplete: 'off', enterkeyhint: 'send', maxlength: '500' });
    const submit = (txt) => { const q = (txt || input.value).trim(); if (!q) { input.focus(); toast(T('Napište prosím svůj dotaz.')); return; } DP.pendingQuestion = q; go('#/chat'); };
    const form = h('form', { class: 'ask', onsubmit: (e) => { e.preventDefault(); submit(); } },
      h('label', { for: 'home-ask', class: 'ask__label' }, T('Napište, s čím potřebujete pomoct')),
      h('div', { class: 'ask__row' }, input,
        micButton(input),
        h('button', { type: 'submit', class: 'btn btn--dark' }, h('span', null, T('Zeptat se')), ico('arrowR'))));
    return form;
  }

  function viewHome() {
    const faqs = [
      [T('Volá mi někdo z banky'), 'banka-vola'], [T('Přišla mi divná SMS o balíku'), 'sms-balik'],
      [T('Co je Facebook?'), 'facebook'], [T('Jak poslat fotku vnoučatům?'), 'whatsapp-fotka'],
      [T('Zapomněl/a jsem heslo'), 'zapomenute-heslo'], [T('Telefon se rychle vybíjí'), 'baterie']
    ];
    append(main, [
      h('section', { class: 'home-hero' },
        h('div', { class: 'card card--cream hero' },
          langButton('hero__lang'),
          h('div', { class: 'hero__text' },
            h('p', { class: 'badge badge--lime' }, ico('heart', 18), T('Váš vlídný průvodce')),
            h('h1', { tabindex: '-1', class: 'hero__title' }, greeting()),
            h('p', { class: 'hero__sub' }, T('S čím vám mohu dnes pomoci?')),
            h('p', { class: 'muted' }, T('Technologie bez stresu, spěchu a obav. Vše vysvětlíme česky, pomalu a krok za krokem.'))),
          h('div', { class: 'hero__mascot', 'aria-hidden': 'true', html: DP.mascot() })),
        h('div', { class: 'card card--lime askcard' }, askBox(T('Například: Jak poslat fotku?')))
      ),

      h('section', { class: 'photo-row' },
        h('figure', { class: 'photo-card' },
          h('img', { src: 'img/senior-zena.jpg', alt: T('Usměvavá paní s brýlemi drží chytrý telefon.'), width: '304', height: '372', loading: 'lazy' }),
          h('figcaption', null, h('span', { class: 'photo-card__tag' }, T('Bez obav')), h('strong', null, T('Technologie bez stresu')))),
        h('div', { class: 'card card--lavender ask-easy' },
          h('h2', null, T('Ptejte se snadno')),
          h('p', null, T('Žádná otázka není hloupá. Napište ji, nebo ji řekněte nahlas tlačítkem '), h('strong', null, T('Mluvit')), '.'),
          h('div', { class: 'ask-easy__mascot', 'aria-hidden': 'true', html: DP.mascot('plain') }))
      ),

      h('section', { class: 'section', 'aria-labelledby': 'h-pom' },
        h('h2', { id: 'h-pom', class: 'section__title' }, T('Hlavní pomocníci')),
        h('div', { class: 'grid-3' },
          featureCard('lavender', 'chat', T('Zeptejte se'), T('Rozhovor s parťákem. Přednostně odpovídá ověřenými radami, jiné odpovědi jasně označí.'), T('Otevřít rozhovor'), '#/chat', T('Žádná otázka není hloupá')),
          featureCard('sky', 'shield', T('Je to podvod?'), T('Přišla vám divná SMS nebo e-mail? Společně zkontrolujeme varovné znaky.'), T('Zkontrolovat zprávu'), '#/podvod', T('Text nikam neodesíláme')),
          featureCard('cream', 'steps', T('Krok za krokem'), T('Jednoduché návody. Vždy jen jeden krok na obrazovce.'), T('Prohlédnout návody'), '#/navody', T('Pomalu, jak vám vyhovuje'))
        )),

      h('section', { class: 'section card card--cream', 'aria-labelledby': 'h-faq' },
        h('h2', { id: 'h-faq', class: 'section__title' }, T('Časté otázky')),
        h('p', { class: 'muted' }, T('Klepněte a hned dostanete odpověď.')),
        h('ul', { class: 'faq-list' }, faqs.map(([label, id]) =>
          h('li', null, h('button', { type: 'button', class: 'faq-item', onclick: () => { DP.pendingEntry = id; go('#/chat'); } },
            h('span', null, label), ico('arrowR')))))),

      h('section', { class: 'section grid-2' },
        h('div', { class: 'card card--sky promise' },
          h('div', { class: 'promise__icon', 'aria-hidden': 'true', html: icon('lock', 40) }),
          h('h2', null, T('Vaše bezpečí je na 1. místě')),
          h('ul', { class: 'checklist' },
            h('li', null, ico('check'), T('Nikdy po vás nechceme hesla, PIN ani číslo karty.')),
            h('li', null, ico('check'), T('Parťák odpovídá z knihovny ověřených rad. Každou jinou odpověď jasně označí, abyste si ji mohli ověřit.')),
            h('li', null, ico('check'), T('Vaše dotazy zůstávají jen ve vašem zařízení.')))),
        h('div', { class: 'card card--lavender human' },
          h('img', { src: 'img/senior-muz.jpg', alt: T('Usměvavý pán s brýlemi pracuje na tabletu.'), width: '308', height: '292', loading: 'lazy', class: 'human__img' }),
          h('div', null,
            h('h2', null, T('Chcete mluvit s člověkem?')),
            h('p', null, T('Senior telefon je zdarma a nonstop.')),
            h('div', { class: 'btn-row' },
              h('a', { class: 'btn btn--primary', href: 'tel:800157157' }, ico('phone'), h('span', null, '800 157 157')),
              h('a', { class: 'btn btn--outline', href: '#/pomoc' }, h('span', null, T('Další čísla pomoci'))))))),

      h('a', { class: 'card card--white settings-link', href: '#/nastaveni' },
        h('span', { class: 'feature__icon', 'aria-hidden': 'true', html: icon('text', 30) }),
        h('span', { class: 'guide-card__body' },
          h('span', { class: 'guide-card__title' }, T('Přizpůsobit aplikaci')),
          h('span', { class: 'guide-card__meta' }, T('Velikost písma, vysoký kontrast, čtení nahlas'))),
        ico('arrowR'))
    ]);
  }

  function featureCard(tone, iconName, title, text, cta, href, foot) {
    return h('a', { class: 'feature card card--' + tone, href },
      h('span', { class: 'feature__icon', 'aria-hidden': 'true', html: icon(iconName, 30) }),
      h('h3', { class: 'feature__title' }, title),
      h('p', null, text),
      h('span', { class: 'feature__foot' }, ico('checkCircle', 20), foot),
      h('span', { class: 'feature__cta' }, cta, ico('arrowR')));
  }

  /* ================= CHAT ================= */
  const chat = { log: [] }; // jen v paměti – po zavření aplikace zmizí

  function viewChat() {
    const list = h('div', { class: 'chat__log', role: 'log', 'aria-live': 'polite', 'aria-label': T('Rozhovor s DIGI parťákem') });
    const input = h('textarea', { id: 'chat-input', class: 'input chat__input', rows: '1', placeholder: T('Napište svůj dotaz…'), maxlength: '500', autocomplete: 'off', enterkeyhint: 'send' });
    const send = (txt) => {
      const q = (txt != null ? txt : input.value).trim();
      if (!q) { input.focus(); return; }
      input.value = ''; autoGrow();
      ask(q, list);
    };
    function autoGrow() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 200) + 'px'; }
    input.addEventListener('input', autoGrow);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });

    append(main, [
      h('div', { class: 'chat-head' },
        h('div', { class: 'chat-head__avatar', 'aria-hidden': 'true', html: DP.mascot('small') }),
        h('div', null,
          h('h1', { tabindex: '-1', class: 'page-title page-title--sm' }, T('Zeptejte se parťáka')),
          h('p', { class: 'chat-head__status' }, ico('shield', 18), T('Ověřené rady mají zelený štítek'))),
        h('button', { type: 'button', class: 'btn btn--soft btn--sm', onclick: () => { chat.log = []; render(); toast(T('Rozhovor jsem smazal.')); } }, ico('trash', 20), h('span', null, T('Nový rozhovor')))),
      h('p', { class: 'notice' }, ico('lock', 20), h('span', null, T('Do chatu nikdy nepište hesla, PIN ani číslo karty. Rozhovor se neukládá a po zavření aplikace zmizí.'))),
      list,
      h('form', { class: 'chat__bar', onsubmit: (e) => { e.preventDefault(); send(); } },
        h('label', { for: 'chat-input', class: 'sr-only' }, T('Váš dotaz')),
        input,
        h('div', { class: 'chat__btns' },
          micButton(input),
          h('button', { type: 'submit', class: 'btn btn--primary btn--send' }, ico('send'), h('span', { class: 'lbl' }, T('Odeslat')))))
    ]);

    if (!chat.log.length) chat.log.push({ who: 'bot', kind: 'welcome' });
    chat.log.forEach((m) => list.appendChild(renderMsg(m, list)));

    if (DP.pendingQuestion) { const q = DP.pendingQuestion; DP.pendingQuestion = null; ask(q, list); }
    else if (DP.pendingEntry) { const id = DP.pendingEntry; DP.pendingEntry = null; showEntry(id, list); }
    else scrollChat(list, false);
  }

  function scrollChat(list, smooth) {
    requestAnimationFrame(() => {
      const last = list.lastElementChild;
      if (last) last.scrollIntoView({ behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto', block: 'start' });
    });
  }

  function push(m, list) {
    chat.log.push(m);
    const el = renderMsg(m, list);
    list.appendChild(el);
    scrollChat(list, true);
    if (m.who === 'bot' && settings.autoRead && m.speak) speak(m.speak);
    return el;
  }

  function ask(q, list) {
    const r = DP.bot.reply(q, L());
    push({ who: 'user', text: r.scrubbed }, list);
    if (r.sensitive.length) push({ who: 'bot', kind: 'sensitive', found: r.sensitive }, list);
    const typing = h('div', { class: 'msg msg--bot msg--typing', 'aria-hidden': 'true' }, h('span'), h('span'), h('span'));
    list.appendChild(typing);
    setTimeout(() => {
      typing.remove();
      if (r.type === 'answer') { push(entryMsg(r.entry, r.scrubbed), list); return; }
      if (r.type === 'clarify') { push({ who: 'bot', kind: 'clarify', q: r.scrubbed, options: r.options.map((e) => e.id), speak: T('Myslíte jedno z těchto témat?') }, list); return; }
      if (r.reason === 'empty') { push({ who: 'bot', kind: 'unknown', suggestions: [], speak: T('Promiňte, nerozuměl jsem.') }, list); return; }
      askOutside(r.scrubbed, list, (r.suggestions || []).map((e) => e.id), false);
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 50 : 550);
  }

  /* Otázka mimo ověřenou knihovnu → AI. Odpověď je vždy označená „Informace mimo aplikaci“. */
  async function askOutside(question, list, suggestions, noRoute) {
    const unknown = (reason) => push({ who: 'bot', kind: 'unknown', reason, suggestions: suggestions || [], speak: T('Promiňte, na tohle teď nemám odpověď.') }, list);
    if (!navigator.onLine) { unknown('offline'); return; }
    const history = chatHistory(question);
    const typing = h('div', { class: 'msg msg--bot msg--typing msg--typing-label', role: 'status' },
      h('span', { 'aria-hidden': 'true' }), h('span', { 'aria-hidden': 'true' }), h('span', { 'aria-hidden': 'true' }),
      h('em', { class: 'typing__text' }, T('V aplikaci to nemám, hledám odpověď mimo aplikaci…')));
    list.appendChild(typing);
    scrollChat(list, true);
    const ai = await askAI(question, history, !noRoute);
    typing.remove();
    // AI poznala, že otázka patří k ověřenému tématu → ukážeme ověřenou radu (v jazyce uživatele).
    if (ai && ai.topic && DP.bot.byId(ai.topic)) { push(entryMsg(DP.bot.byId(ai.topic), question), list); return; }
    if (ai && ai.answer) push({ who: 'bot', kind: 'ai', text: ai.answer, speak: T(AI_WARNING) + ' ' + ai.answer }, list);
    else unknown('unavailable');
  }

  /* Krátká historie rozhovoru pro navazující otázky („a jak se tam přihlásím?“). */
  function chatHistory(current) {
    const out = [];
    for (const m of chat.log) {
      if (m.who === 'user') out.push({ role: 'user', text: m.text });
      else if (m.kind === 'ai') out.push({ role: 'assistant', text: m.text });
      else if (m.kind === 'entry') { const e = DP.bot.byId(m.id); if (e) out.push({ role: 'assistant', text: e.title + ': ' + e.a }); }
    }
    if (out.length && out[out.length - 1].role === 'user' && out[out.length - 1].text === current) out.pop();
    return out.slice(-6);
  }

  const AI_WARNING = 'Pozor, jde o informaci mimo aplikaci. Není z ověřené knihovny DIGI parťáka, připravila ji umělá inteligence a může obsahovat chybu. Informaci si prosím ověřte.';

  /* Seznam ověřených témat pro AI (id + název v jazyce uživatele), aby mohla otázku přiřadit. */
  function topicList() {
    return DP.KB.filter((e) => e.cat !== 'konverzace' && e.cat !== 'mimo').map((e) => ({ id: e.id, title: e.title.slice(0, 120) }));
  }

  async function askAI(question, history, route) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 50000);
    try {
      const res = await fetch('api/ask', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.slice(0, 500), history: history || [], lang: L(), topics: route ? topicList() : [] }), signal: ctrl.signal
      });
      if (!res.ok) return null;
      const data = await res.json();
      const topic = typeof data.topic === 'string' && data.topic !== 'none' ? data.topic : null;
      const answer = typeof data.answer === 'string' && data.answer.trim() ? data.answer.trim() : null;
      return topic || answer ? { topic, answer } : null;
    } catch (e) { return null; }
    finally { clearTimeout(timer); }
  }

  /* Text od AI vykreslíme bezpečně jako prostý text: odstavce a očíslované kroky. */
  function aiText(text) {
    const out = []; let ol = null;
    text.replace(/\*\*|__|^#+\s*/gm, '').split(/\n+/).map((l) => l.trim()).filter(Boolean).forEach((line) => {
      const m = line.match(/^(\d{1,2})[.)]\s+(.*)$/);
      if (m) { if (!ol) { ol = h('ol', { class: 'steps' }); out.push(ol); } ol.appendChild(h('li', null, h('span', null, m[2]))); }
      else { ol = null; out.push(h('p', { class: 'msg__answer' }, line.replace(/^[-•*]\s+/, ''))); }
    });
    return out;
  }

  function outsideButton(q, list) {
    return h('div', { class: 'outside' },
      h('p', { class: 'muted' }, T('Nenašli jste, co jste hledali?')),
      h('button', { type: 'button', class: 'btn btn--outline btn--sm', onclick: (ev) => { ev.currentTarget.disabled = true; askOutside(q, list, [], true); } },
        ico('sparkle', 20), h('span', null, T('Zeptat se mimo aplikaci'))));
  }

  function showEntry(id, list, fromChip) {
    const e = DP.bot.byId(id); if (!e) return;
    if (fromChip !== false) push({ who: 'user', text: e.title }, list);
    push(entryMsg(e), list);
  }

  function entryMsg(e, q) {
    return { who: 'bot', kind: 'entry', id: e.id, q: q || null, speak: [e.a].concat(e.steps.map((s, i) => (i + 1) + '. ' + s)).concat(e.warn ? [T('Pozor: {t}', { t: e.warn })] : []).join(' ') };
  }

  function botBubble(children, speakText) {
    return h('div', { class: 'msg msg--bot' },
      h('div', { class: 'msg__avatar', 'aria-hidden': 'true', html: DP.mascot('small') }),
      h('div', { class: 'msg__bubble' },
        h('span', { class: 'sr-only' }, T('DIGI parťák říká: ')),
        children,
        speakText ? h('div', { class: 'msg__tools' }, speakButton(() => speakText)) : null));
  }

  function topicPicker(list) {
    const wrap = h('div', { class: 'topics' });
    const sub = h('div', { class: 'topics__sub' });
    Object.keys(DP.CATS).forEach((c) => {
      const cat = DP.CATS[c];
      wrap.appendChild(h('button', { type: 'button', class: 'topic topic--' + cat.tone, 'aria-expanded': 'false', onclick: (ev) => {
        wrap.querySelectorAll('.topic').forEach((b) => b.setAttribute('aria-expanded', 'false'));
        ev.currentTarget.setAttribute('aria-expanded', 'true');
        sub.innerHTML = '';
        DP.KB.filter((e) => e.cat === c && !e.urgent).forEach((e) => sub.appendChild(chip(e.title, () => showEntry(e.id, list))));
        sub.querySelector('button') && sub.querySelector('button').focus();
      } }, ico(cat.icon, 24), h('span', null, cat.label)));
    });
    return h('div', null, wrap, sub);
  }

  function renderMsg(m, list) {
    if (m.who === 'user') {
      return h('div', { class: 'msg msg--user' }, h('div', { class: 'msg__bubble' }, h('span', { class: 'sr-only' }, T('Vy: ')), m.text));
    }
    if (m.kind === 'welcome') {
      return botBubble([
        h('p', { class: 'msg__lead' }, T('Dobrý den! Jsem DIGI parťák.')),
        h('p', null, T('Zeptejte se vlastními slovy, nebo si vyberte téma. Nejdřív hledám v knihovně ověřených rad. Když tam odpověď není, zkusím poradit jinak – ale vždy vás upozorním, ať si to ověříte.')),
        topicPicker(list)
      ], T('Dobrý den! Jsem DIGI parťák. Zeptejte se vlastními slovy, nebo si vyberte téma.'));
    }
    if (m.kind === 'sensitive') {
      const what = m.found.map((f) => ({ karta: T('číslo karty'), rodne: T('rodné číslo'), heslo: T('heslo nebo kód') })[f]).join(', ');
      return h('div', { class: 'msg msg--bot' },
        h('div', { class: 'msg__avatar', 'aria-hidden': 'true', html: DP.mascot('small') }),
        h('div', { class: 'msg__bubble msg__bubble--warn', role: 'alert' },
          h('p', { class: 'msg__lead' }, ico('alert'), T(' Pozor na citlivé údaje')),
          h('p', null, T('Ve vaší zprávě bylo {what}. Skryl jsem to a nikam se to neodeslalo.', { what })),
          h('p', null, T('Tyto údaje prosím nikdy nikomu nepište – ani do chatu, ani do SMS či e-mailu.'))));
    }
    if (m.kind === 'clarify') {
      return botBubble([
        h('p', { class: 'msg__lead' }, T('Myslíte jedno z těchto témat?')),
        h('div', { class: 'chips' }, m.options.map((id) => { const e = DP.bot.byId(id); return chip(e.title, () => showEntry(id, list)); })),
        m.q ? outsideButton(m.q, list) : null
      ], m.speak);
    }
    if (m.kind === 'unknown') {
      const sug = (m.suggestions || []).map((id) => DP.bot.byId(id)).filter(Boolean);
      return botBubble([
        h('p', { class: 'msg__lead' }, m.reason === 'offline' ? T('Jste bez internetu.') : T('Promiňte, na tohle teď nemám odpověď.')),
        h('p', null, m.reason === 'offline'
          ? T('Bez internetu umím odpovídat jen z knihovny ověřených rad. Vyberte si téma, nebo to zkuste znovu, až budete připojeni.')
          : m.reason === 'unavailable'
            ? T('V ověřené knihovně to není a odpověď mimo aplikaci se teď nepodařilo získat. Zkuste to za chvíli, napište to jinými slovy, nebo se zeptejte člověka.')
            : T('Zkuste to napsat jinými slovy, vyberte si téma, nebo se zeptejte člověka.')),
        sug.length ? h('div', null, h('p', { class: 'msg__sub' }, T('Možná hledáte:')), h('div', { class: 'chips' }, sug.map((e) => chip(e.title, () => showEntry(e.id, list))))) : null,
        topicPicker(list),
        h('div', { class: 'btn-row' }, h('a', { class: 'btn btn--outline btn--sm', href: 'tel:800157157' }, ico('phone', 20), h('span', null, T('Senior telefon 800 157 157'))))
      ], T('Promiňte, na tohle nemám ověřenou odpověď. Nechci vám radit nepřesně.'));
    }
    if (m.kind === 'ai') {
      return botBubble([
        h('div', { class: 'ai-warn', role: 'note' },
          h('p', { class: 'ai-warn__title' }, ico('alert'), h('span', null, T('Informace mimo aplikaci – ověřte si ji'))),
          h('p', null, T('Tohle v ověřené knihovně DIGI parťáka není. Odpověď připravila umělá inteligence z obecných znalostí. Může obsahovat chybu nebo být zastaralá.'))),
        aiText(m.text),
        h('div', { class: 'ai-verify' },
          h('p', { class: 'msg__sub' }, T('Jak si to ověřit:')),
          h('ul', { class: 'checklist' },
            h('li', null, ico('check'), T('Zeptejte se blízkého člověka, kterému věříte.')),
            h('li', null, ico('check'), T('Podívejte se na oficiální web instituce – adresu napište sami.')),
            h('li', null, ico('check'), T('Zavolejte bezplatně na Senior telefon 800 157 157.')))),
        h('p', { class: 'muted ai-note' }, T('Než cokoli zaplatíte nebo nainstalujete, nejdřív si informaci ověřte.'))
      ], m.speak);
    }
    if (m.kind === 'entry') {
      const e = DP.bot.byId(m.id);
      return botBubble([
        e.urgent ? h('p', { class: 'msg__urgent' }, ico('alert'), T(' Důležité – jednejte hned')) : null,
        e.cat !== 'konverzace' && e.cat !== 'mimo' ? h('p', { class: 'verified-tag' }, ico('checkCircle', 18), h('span', null, T('Ověřená rada'))) : null,
        h('h3', { class: 'msg__title' }, e.title),
        h('p', { class: 'msg__answer' }, e.a),
        e.steps.length ? h('ol', { class: 'steps' }, e.steps.map((s) => h('li', null, h('span', null, s)))) : null,
        e.warn ? h('p', { class: 'warnbox' }, ico('info'), h('span', null, e.warn)) : null,
        e.phones ? h('div', { class: 'phones phones--compact' }, e.phones.map((id) => phoneCard(phoneById(id)))) : null,
        e.action ? h('a', { class: 'btn btn--primary btn--sm', href: e.action.href }, h('span', null, e.action.label), ico('arrowR', 20)) : null,
        e.src && e.src.length ? h('details', { class: 'sources' },
          h('summary', null, ico('checkCircle', 20), T('Odkud to víme')),
          h('ul', null, e.src.map((s) => h('li', null, h('a', { href: s.u, target: '_blank', rel: 'noopener noreferrer' }, T(s.n), ico('external', 18)))))) : null,
        e.rel && e.rel.length ? h('div', null, h('p', { class: 'msg__sub' }, T('Mohlo by vás zajímat:')),
          h('div', { class: 'chips' }, e.rel.map((id) => DP.bot.byId(id)).filter(Boolean).map((r) => chip(r.title, () => showEntry(r.id, list))))) : null,
        m.q && !e.urgent ? outsideButton(m.q, list) : null
      ], m.speak);
    }
    return h('div');
  }

  /* ================= JE TO PODVOD? ================= */
  const SAMPLE = 'Vase zasilka nemohla byt dorucena. Pro opetovne doruceni uhradte poplatek 32 Kc ihned na www.posta-doruceni-cz.top';

  function viewScam() {
    const ta = h('textarea', { id: 'scam-text', class: 'input scam__input', rows: '6', maxlength: '4000', placeholder: T('Sem vložte nebo opište text podezřelé zprávy…') });
    const result = h('div', { class: 'scam__result', 'aria-live': 'polite' });
    const doCheck = () => {
      const txt = ta.value.trim();
      if (txt.length < 5) { toast(T('Nejdřív prosím vložte text zprávy.')); ta.focus(); return; }
      const r = DP.scam.check(txt);
      showResult({ level: r.level, flags: r.flags.map((f) => ({ title: f.title, why: f.why })) }, result);
    };
    const pasteBtn = h('button', { type: 'button', class: 'btn btn--outline', onclick: async () => {
      try { const t = await navigator.clipboard.readText(); if (t) { ta.value = t; toast(T('Text jsem vložil.')); } else toast(T('Schránka je prázdná.')); }
      catch (e) { toast(T('Vložte text podržením prstu v poli a volbou „Vložit“.')); ta.focus(); }
    } }, ico('paste'), h('span', null, T('Vložit zkopírovaný text')));
    if (!navigator.clipboard || !navigator.clipboard.readText) pasteBtn.hidden = true;

    /* --- Fotka / snímek obrazovky --- */
    const preview = h('div', { class: 'photo-preview' });
    const pick = (capture) => {
      const inp = h('input', { type: 'file', accept: 'image/*', class: 'sr-only', tabindex: '-1', 'aria-hidden': 'true' });
      if (capture) inp.setAttribute('capture', 'environment');
      inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; inp.remove(); if (f) analysePhoto(f, preview, result); });
      document.body.appendChild(inp);
      inp.click();
    };

    append(main, [
      pageHead(T('Je to podvod?'), T('Vložte text podezřelé zprávy, nebo nahrajte její fotku či snímek obrazovky. Ukážu vám varovné znaky a poradím, co bezpečně udělat.'), 'sky', icon('shield', 80)),

      h('section', { class: 'card card--white', 'aria-labelledby': 'h-photo' },
        h('h2', { id: 'h-photo' }, T('Zkontrolovat fotku zprávy')),
        h('p', null, T('Udělejte snímek obrazovky podezřelé SMS, e-mailu nebo zprávy a nahrajte ho sem. Můžete zprávu i vyfotit jiným telefonem.')),
        h('div', { class: 'btn-row' },
          h('button', { type: 'button', class: 'btn btn--primary btn--lg', onclick: () => pick(false) }, ico('download'), h('span', null, T('Nahrát snímek obrazovky'))),
          h('button', { type: 'button', class: 'btn btn--outline', onclick: () => pick(true) }, ico('smartphone'), h('span', null, T('Vyfotit zprávu')))),
        h('p', { class: 'hint' }, ico('info', 18), h('span', null, T('Fotka se odešle k rozboru umělé inteligenci (Claude od firmy Anthropic). Nikde ji neukládáme. Číslo karty nebo kódy na fotce raději zakryjte.'))),
        h('p', { class: 'howto' }, T('Nevíte, jak udělat snímek obrazovky? '),
          h('a', { href: '#/navody/screenshot-android' }, T('Návod pro Android')), ' · ',
          h('a', { href: '#/navody/screenshot-iphone' }, T('Návod pro iPhone'))),
        preview),

      h('section', { class: 'card card--white', 'aria-labelledby': 'h-text' },
        h('h2', { id: 'h-text' }, T('Nebo vložte text zprávy')),
        h('label', { for: 'scam-text', class: 'field-label' }, T('Text zprávy')),
        ta,
        h('p', { class: 'hint' }, ico('lock', 18), h('span', null, T('Kontrola textu probíhá jen ve vašem zařízení. Text nikam neodesíláme.'))),
        h('div', { class: 'btn-row' },
          h('button', { type: 'button', class: 'btn btn--primary btn--lg', onclick: doCheck }, ico('shield'), h('span', null, T('Zkontrolovat text'))),
          pasteBtn,
          h('button', { type: 'button', class: 'btn btn--soft', onclick: () => { ta.value = ''; result.innerHTML = ''; preview.innerHTML = ''; ta.focus(); } }, ico('trash'), h('span', null, T('Vymazat')))),
        h('button', { type: 'button', class: 'linkbtn', onclick: () => { ta.value = T(SAMPLE); doCheck(); } }, T('Vyzkoušet na ukázkové podvodné SMS'))),
      result,
      h('section', { class: 'card card--cream' },
        h('h2', null, T('Zlaté pravidlo')),
        h('p', { class: 'big-rule' }, T('Když zpráva spěchá a chce peníze nebo údaje – '), h('strong', null, T('zastavte se a ověřte si to sami.'))),
        h('p', null, T('Zavolejte bance, poště nebo úřadu na číslo z jejich oficiálního webu nebo z platební karty – nikdy na číslo či odkaz ze zprávy.')))
    ]);
  }

  /* Zmenší fotku (max. 1600 px), odstraní metadata (poloha, datum) a vrátí JPEG v base64. */
  function prepareImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const max = 1600;
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const dataUrl = c.toDataURL('image/jpeg', 0.85);
        resolve({ url, data: dataUrl.split(',')[1], mediaType: 'image/jpeg' });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  async function analysePhoto(file, preview, result) {
    preview.innerHTML = ''; result.innerHTML = '';
    if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic|heif|gif)$/i.test(file.name)) { toast(T('Vyberte prosím obrázek.')); return; }
    if (file.size > 25 * 1024 * 1024) { toast(T('Obrázek je moc velký. Zkuste udělat snímek obrazovky.')); return; }
    let img;
    try { img = await prepareImage(file); }
    catch (e) { toast(T('Tento obrázek neumím otevřít. Zkuste snímek obrazovky ve formátu JPG nebo PNG.')); return; }

    const status = h('p', { class: 'photo-status', role: 'status' }, h('span', { class: 'spinner', 'aria-hidden': 'true' }), T('Prohlížím fotku… může to trvat až půl minuty.'));
    append(preview, [h('img', { src: img.url, alt: T('Náhled nahrané fotky zprávy'), class: 'photo-preview__img' }), status]);
    if (!navigator.onLine) { status.textContent = T('Jste bez internetu. Rozbor fotky potřebuje internet – zkuste prosím opsat text zprávy do pole níže.'); return; }

    let data = null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    try {
      const res = await fetch('api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: img.data, mediaType: img.mediaType, lang: L() }), signal: ctrl.signal });
      if (res.ok) data = await res.json();
    } catch (e) { data = null; }
    finally { clearTimeout(timer); }

    if (!data) {
      status.textContent = T('Rozbor fotky se teď nepodařil. Zkuste to prosím za chvíli, nebo opište text zprávy do pole níže.');
      return;
    }
    status.remove();
    if (!data.readable || !data.is_message || data.risk === 'unclear') {
      showResult({ level: 'unclear', flags: [], summary: data.summary, ai: true, extracted: data.extracted_text }, result);
      return;
    }
    // Ke slovu AI přidáme i vlastní pravidla nad přečteným textem – platí přísnější výsledek.
    const local = data.extracted_text ? DP.scam.check(data.extracted_text) : { level: 'low', flags: [] };
    const rank = { low: 0, medium: 1, high: 2 };
    const level = rank[local.level] > rank[data.risk] ? local.level : data.risk;
    const flags = data.signs.slice();
    local.flags.forEach((f) => { const t = T(f.title); if (!flags.some((x) => x.title.toLowerCase() === t.toLowerCase())) flags.push({ title: t, why: T(f.why) }); });
    showResult({ level, flags: flags.slice(0, 7), summary: data.summary, advice: data.advice, ai: true, extracted: data.extracted_text }, result);
  }

  function showResult(r, box) {
    box.innerHTML = '';
    const M = {
      high: { cls: 'high', title: T('Velmi podezřelé!'), sub: T('Zpráva má několik typických znaků podvodu. Na nic neklikejte a nic neplaťte.'), ic: 'alert' },
      medium: { cls: 'medium', title: T('Buďte opatrní'), sub: T('Našel jsem varovné znaky. Než cokoli uděláte, ověřte si zprávu jinou cestou.'), ic: 'info' },
      low: { cls: 'low', title: T('Nenašel jsem typické znaky podvodu'), sub: T('To ale neznamená, že je zpráva určitě v pořádku. Podvodníci vymýšlejí stále nové triky.'), ic: 'checkCircle' },
      unclear: { cls: 'medium', title: T('Fotku se nepodařilo posoudit'), sub: T('Na fotce nevidím čitelnou zprávu. Zkuste ostřejší snímek obrazovky, na kterém je celý text, nebo text opište do pole.'), ic: 'info' }
    }[r.level];
    const defaultSteps = r.level === 'low'
      ? [T('Pokud vás zpráva o něco žádá, ověřte si to u odesílatele na známém čísle.'), T('Nikdy nezadávejte PIN, hesla ani kódy z SMS přes odkaz.')]
      : [T('Na odkaz ve zprávě neklikejte a neodpovídejte.'), T('Ověřte si to sami – zavolejte na oficiální číslo instituce nebo blízkému člověku.'), T('Zprávu smažte a odesílatele zablokujte.'), T('Pokud jste už něco vyplnili nebo zaplatili, hned volejte svou banku.')];
    const steps = r.level === 'unclear' ? [] : (r.advice && r.advice.length ? r.advice : defaultSteps);
    const flags = r.flags || [];
    const speakText = (r.ai ? T('Rozbor fotky pomocí umělé inteligence. Výsledek je orientační, ověřte si ho. ') : '') +
      M.title + '. ' + (r.summary || M.sub) + ' ' + flags.map((f) => T(f.title) + '.').join(' ') + (steps.length ? ' ' + T('Co udělat: {t}', { t: steps.join(' ') }) : '');
    append(box, h('section', { class: 'card verdict verdict--' + M.cls, tabindex: '-1' },
      r.ai ? h('div', { class: 'ai-warn', role: 'note' },
        h('p', { class: 'ai-warn__title' }, ico('alert'), h('span', null, T('Rozbor fotky pomocí umělé inteligence'))),
        h('p', null, T('Výsledek je orientační a může obsahovat chybu. Když si nejste jistí, ověřte si to u blízkého nebo na Senior telefonu 800 157 157.'))) : null,
      h('div', { class: 'verdict__head' },
        h('span', { class: 'verdict__icon', 'aria-hidden': 'true', html: icon(M.ic, 40) }),
        h('div', null, h('p', { class: 'verdict__kicker' }, T('Výsledek kontroly')), h('h2', { class: 'verdict__title' }, M.title))),
      h('p', { class: 'lead' }, r.summary || M.sub),
      r.ai && r.level === 'low' ? h('p', null, M.sub) : null,
      flags.length ? h('div', null, h('h3', null, T('Čeho jsem si všiml:')),
        h('ul', { class: 'flags' }, flags.map((f) => h('li', null, h('strong', null, T(f.title)), h('span', null, T(f.why)))))) : null,
      steps.length ? h('h3', null, T('Co teď bezpečně udělat:')) : null,
      steps.length ? h('ol', { class: 'steps' }, steps.map((s) => h('li', null, h('span', null, s)))) : null,
      r.extracted ? h('details', { class: 'sources' },
        h('summary', null, ico('text', 20), T('Text, který jsem na fotce přečetl')),
        h('p', { class: 'extracted' }, r.extracted)) : null,
      h('div', { class: 'btn-row' },
        speakButton(() => speakText),
        r.level === 'high' || r.level === 'medium' ? h('button', { type: 'button', class: 'btn btn--outline btn--sm', onclick: () => { DP.pendingEntry = 'uz-jsem-zadal'; go('#/chat'); } }, h('span', null, T('Už jsem klikl/a – co teď?'))) : null)));
    const v = box.querySelector('.verdict');
    v.focus({ preventScroll: true });
    v.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  /* ================= NÁVODY ================= */
  function viewGuides(params) {
    if (params[0]) return viewGuide(params[0], params[1]);
    append(main, [
      pageHead(T('Návody krok za krokem'), T('Vyberte si, co se chcete naučit. Na každé obrazovce je jen jeden krok. Můžete se kdykoli vrátit.'), 'lavender', icon('steps', 80)),
      h('ul', { class: 'guide-list' }, DP.GUIDES.map((g) => h('li', null,
        h('a', { class: 'guide-card card card--' + g.tone, href: '#/navody/' + g.id },
          h('span', { class: 'guide-card__icon', 'aria-hidden': 'true', html: icon(g.icon, 30) }),
          h('span', { class: 'guide-card__body' },
            h('span', { class: 'guide-card__title' }, g.title),
            h('span', { class: 'guide-card__meta' }, T('{n} kroků · asi {m} min', { n: g.steps.length, m: g.minutes }))),
          ico('arrowR')))))
    ]);
  }

  function viewGuide(id, stepRaw) {
    const g = DP.GUIDES.find((x) => x.id === id);
    if (!g) { go('#/navody'); return; }
    const total = g.steps.length;
    let i = parseInt(stepRaw, 10);
    if (isNaN(i) || i < 0) i = 0;
    if (i > total) i = total;
    const nav = (n) => go('#/navody/' + g.id + '/' + n);

    const back = h('a', { class: 'btn btn--soft btn--sm back', href: '#/navody' }, ico('arrowL', 20), h('span', null, T('Všechny návody')));

    if (i === 0) {
      append(main, [back,
        h('section', { class: 'card card--' + g.tone + ' guide-intro' },
          h('span', { class: 'guide-card__icon guide-card__icon--lg', 'aria-hidden': 'true', html: icon(g.icon, 44) }),
          h('h1', { tabindex: '-1', class: 'page-title' }, g.title),
          h('p', { class: 'lead' }, g.intro),
          h('p', { class: 'muted' }, T('{n} kroků · asi {m} min', { n: total, m: g.minutes })),
          h('div', { class: 'btn-row' },
            h('button', { type: 'button', class: 'btn btn--primary btn--lg', onclick: () => nav(1) }, h('span', null, T('Začít')), ico('arrowR')),
            speakButton(() => g.title + '. ' + g.intro))),
        h('p', { class: 'src-line' }, T('Zdroj: {t}', { t: g.src }))]);
      return;
    }

    const s = g.steps[i - 1];
    const pct = Math.round((i / total) * 100);
    append(main, [back,
      h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '1', 'aria-valuemax': String(total), 'aria-valuenow': String(i), 'aria-label': T('Postup návodem') },
        (function () { const b = h('div', { class: 'progress__bar' }); b.style.width = pct + '%'; return b; })()),
      h('section', { class: 'card card--white guide-step' },
        h('p', { class: 'guide-step__count' }, h('span', { class: 'stepnum', 'aria-hidden': 'true' }, String(i)), T('Krok {i} z {n}', { i, n: total })),
        h('p', { class: 'guide-step__of' }, g.title),
        h('h1', { tabindex: '-1', class: 'page-title' }, s.t),
        h('p', { class: 'guide-step__text' }, s.p),
        s.tip ? h('p', { class: 'tipbox' }, ico('sparkle'), h('span', null, h('strong', null, T('Tip: ')), s.tip)) : null,
        speakButton(() => T('Krok {i}', { i }) + '. ' + s.t + '. ' + s.p + (s.tip ? ' ' + T('Tip: ') + s.tip : ''))),
      i === total ? h('section', { class: 'card card--lime done' },
        h('div', { class: 'done__mascot', 'aria-hidden': 'true', html: DP.mascot() }),
        h('div', null, h('h2', null, T('Zvládli jste to!')), h('p', null, T('Výborně. Návod si můžete kdykoli zopakovat.')))) : null,
      h('div', { class: 'stepper' },
        h('button', { type: 'button', class: 'btn btn--outline btn--lg', onclick: () => nav(i - 1) }, ico('arrowL'), h('span', null, T('Zpět'))),
        i < total
          ? h('button', { type: 'button', class: 'btn btn--primary btn--lg', onclick: () => nav(i + 1) }, h('span', null, T('Další krok')), ico('arrowR'))
          : h('a', { class: 'btn btn--primary btn--lg', href: '#/navody' }, ico('check'), h('span', null, T('Hotovo'))))
    ]);
  }

  /* ================= POMOC ================= */
  function viewHelp() {
    append(main, [
      pageHead(T('Pomoc a důležitá čísla'), T('Klepnutím na číslo rovnou zavoláte. Ve vážné situaci neváhejte – raději zavolejte.'), 'cream', icon('phone', 80)),
      h('section', { class: 'section', 'aria-labelledby': 'h-urg' },
        h('h2', { id: 'h-urg', class: 'section__title' }, T('Tísňová volání')),
        h('div', { class: 'phones' }, DP.PHONES.filter((p) => p.kind === 'urgent').map(phoneCard))),
      h('section', { class: 'section', 'aria-labelledby': 'h-sup' },
        h('h2', { id: 'h-sup', class: 'section__title' }, T('Když potřebujete poradit nebo si promluvit')),
        h('div', { class: 'phones' }, DP.PHONES.filter((p) => p.kind === 'support').map(phoneCard))),
      h('section', { class: 'card card--sky' },
        h('h2', null, ico('bank'), T(' Ztratili jste kartu nebo vás někdo okradl?')),
        h('ol', { class: 'steps' },
          h('li', null, h('span', null, T('Hned zavolejte do své banky a kartu zablokujte. Číslo najdete na webu banky nebo ve smlouvě.'))),
          h('li', null, h('span', null, T('Krádež nebo podvod oznamte Policii ČR na čísle 158.'))))),
      h('p', { class: 'src-line' }, T('Čísla připravena podle oficiálních zdrojů (IZS, Život 90, Elpida). Před zveřejněním aplikace je ověřte.'))
    ]);
  }

  /* ================= NASTAVENÍ ================= */
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; syncSettingsUI(); });

  function switchRow(id, label, desc, key) {
    const btn = h('button', { type: 'button', id, class: 'switch', role: 'switch', 'aria-checked': settings[key] ? 'true' : 'false', 'data-key': key,
      onclick: () => { setSetting(key, !settings[key]); syncSettingsUI(); toast(T(label) + ': ' + (settings[key] ? T('zapnuto') : T('vypnuto'))); } },
      h('span', { class: 'switch__track', 'aria-hidden': 'true' }, h('span', { class: 'switch__thumb' })),
      h('span', { class: 'switch__state' }, settings[key] ? T('Zapnuto') : T('Vypnuto')));
    return h('div', { class: 'setting' },
      h('div', null, h('label', { for: id, class: 'setting__label' }, label), h('p', { class: 'muted' }, desc)), btn);
  }

  function syncSettingsUI() {
    document.querySelectorAll('.switch[data-key]').forEach((b) => {
      const on = !!settings[b.dataset.key];
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.querySelector('.switch__state').textContent = on ? T('Zapnuto') : T('Vypnuto');
    });
    document.querySelectorAll('.seg [data-size]').forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.size === settings.size)));
    const ib = document.getElementById('install-btn');
    if (ib) ib.hidden = !installEvt;
  }

  function viewSettings() {
    const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-labelledby': 'lbl-size' },
      SIZES.map((s) => h('button', { type: 'button', role: 'radio', 'data-size': String(s.v), class: 'seg__btn seg__btn--' + s.v, 'aria-checked': String(settings.size === s.v),
        onclick: () => { setSetting('size', s.v); syncSettingsUI(); toast(T('Velikost písma: {v}', { v: T(s.label) })); } },
        h('span', { class: 'seg__glyph', 'aria-hidden': 'true' }, s.short), h('span', null, T(s.label)))));

    const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    append(main, [
      pageHead(T('Nastavení'), T('Upravte si parťáka tak, aby se vám dobře četl a používal.'), 'lavender', icon('settings', 80)),
      h('section', { class: 'card card--white', 'aria-labelledby': 'h-lang' },
        h('h2', { id: 'h-lang' }, ico('globe'), ' ', T('Jazyk'), ' · Language'),
        languageList()),
      h('section', { class: 'card card--white settings' },
        h('div', { class: 'setting setting--col' },
          h('p', { id: 'lbl-size', class: 'setting__label' }, T('Velikost písma')), seg,
          h('p', { class: 'preview-text' }, T('Ukázka: Takhle velké bude písmo v celé aplikaci.'))),
        switchRow('sw-contrast', T('Vysoký kontrast'), T('Výraznější barvy a silnější okraje pro horší zrak.'), 'contrast'),
        synth ? switchRow('sw-read', T('Číst odpovědi nahlas'), T('Parťák vám každou odpověď v chatu sám přečte.'), 'autoRead') : null,
        synth ? switchRow('sw-slow', T('Pomalejší čtení'), T('Hlas bude mluvit pomaleji a zřetelněji.'), 'slow') : null),

      h('section', { class: 'card card--lime' },
        h('h2', null, T('Parťák na ploše telefonu')),
        installed ? h('p', null, ico('checkCircle'), T(' Aplikace je nainstalovaná. Výborně!'))
          : h('div', null,
            h('p', null, T('Přidejte si DIGI parťáka na plochu. Otevřete ho pak jedním klepnutím, jako každou jinou aplikaci.')),
            h('div', { class: 'btn-row' },
              h('button', { type: 'button', id: 'install-btn', class: 'btn btn--dark', hidden: !installEvt, onclick: async () => {
                if (!installEvt) return; installEvt.prompt(); const r = await installEvt.userChoice; installEvt = null; syncSettingsUI();
                if (r.outcome === 'accepted') toast(T('Hotovo! Parťák je na ploše.'));
              } }, ico('download'), h('span', null, T('Přidat na plochu'))),
              h('a', { class: 'btn btn--outline', href: '#/navody/plocha' }, h('span', null, T('Návod krok za krokem')))))),

      h('section', { class: 'card card--sky' },
        h('h2', null, T('Soukromí a bezpečí')),
        h('ul', { class: 'checklist' },
          h('li', null, ico('check'), T('Aplikace nemá žádný účet ani registraci.')),
          h('li', null, ico('check'), T('Kontrola vloženého textu v sekci „Je to podvod?“ probíhá jen ve vašem zařízení. Rozhovory se neukládají a po zavření zmizí.')),
          h('li', null, ico('check'), T('V zařízení si pamatujeme jen vaše nastavení (velikost písma, kontrast).')),
          h('li', null, ico('info'), T('Když otázka není v knihovně ověřených rad, odešle se (bez čísel karet, PINů a hesel) k zodpovězení umělé inteligenci Claude od firmy Anthropic. Taková odpověď je vždy označená „Informace mimo aplikaci“. Stejně tak se k rozboru odešle fotka zprávy, kterou nahrajete v sekci „Je to podvod?“. Nic z toho neukládáme.')),
          h('li', null, ico('info'), T('Funkci „Mluvit“ zajišťuje váš prohlížeč (např. Google nebo Apple), který může hlas zpracovat na svém serveru.'))),
        h('button', { type: 'button', class: 'btn btn--outline', onclick: () => {
          if (!confirm(T('Opravdu smazat nastavení a rozhovor? Aplikace se vrátí do výchozího stavu.'))) return;
          store.clear(); chat.log = []; Object.assign(settings, { size: 0, contrast: false, autoRead: false, slow: true }); applySettings(); render(); toast(T('Vše jsem smazal.'));
        } }, ico('trash'), h('span', null, T('Smazat vše z tohoto zařízení')))),

      h('section', { class: 'card card--cream' },
        h('h2', null, T('O aplikaci')),
        h('p', null, T('DIGI parťák je trpělivý digitální průvodce pro seniory. Chatbot nejdřív hledá v knihovně předem připravených a zkontrolovaných rad s uvedenými zdroji. Teprve když tam odpověď není, odpoví pomocí umělé inteligence – takovou odpověď vždy výrazně označí jako neověřenou.')),
        h('p', null, T('Parťák nenahrazuje lékaře, banku, policii ani právníka. Ve vážné situaci volejte 112.')),
        h('p', { class: 'muted' }, T('Stav knihovny rad: {s}. Počet ověřených témat: {n}.', { s: T(DP.KB_REVIEWED), n: DP.KB.length })))
    ]);
  }

  /* ================= JAZYK ================= */
  function langButton(cls) {
    const info = DP.i18n.info();
    return h('a', { class: 'lang-btn ' + (cls || ''), href: '#/jazyk', 'aria-label': T('Jazyk') + ': ' + info.name + '. ' + T('Změnit jazyk') },
      ico('globe', 20), h('span', null, info.name));
  }

  function languageList() {
    const cur = L();
    return h('div', { class: 'lang-list', role: 'radiogroup', 'aria-label': T('Jazyk') },
      DP.i18n.LANGS.map((l) => h('button', { type: 'button', role: 'radio', lang: l.code, class: 'lang-item', 'aria-checked': String(l.code === cur),
        onclick: async () => {
          if (l.code === L()) return;
          const got = await DP.i18n.setLang(l.code, true);
          if (got !== l.code) { toast(T('Jazyk se nepodařilo načíst. Zkontrolujte internet.')); return; }
          render();
          toast(T('Jazyk změněn: {name}', { name: l.name }));
        } },
        h('span', { class: 'lang-item__name' }, l.name),
        l.code === cur ? ico('check') : null)));
  }

  function viewLanguage() {
    append(main, [
      pageHead(T('Jazyk'), T('Vyberte jazyk aplikace. Ověřené rady jsou ve všech jazycích stejné.'), 'sky', icon('globe', 80)),
      h('section', { class: 'card card--white' }, languageList()),
      h('p', { class: 'src-line' }, T('Rady se týkají života v Česku – telefonní čísla a instituce jsou české.'))
    ]);
  }

  /* ================= Start ================= */
  document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); el.classList.add('ico-wrap'); });
  document.querySelectorAll('[data-mascot]').forEach((el) => { el.innerHTML = DP.mascot(el.dataset.mascot); });
  DP.i18n.init().then(render, render);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  window.addEventListener('online', () => toast(T('Jste znovu připojeni k internetu.')));
  window.addEventListener('offline', () => toast(T('Jste offline. Parťák ale funguje dál.')));
})();
