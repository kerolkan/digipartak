/*
 * DIGI parťák – „Je to podvod?“
 * Orientační kontrola zprávy podle typických znaků podvodu.
 * Běží jen v zařízení, text se nikam neodesílá.
 * Nikdy netvrdí, že je zpráva „bezpečná“ – jen hledá varovné znaky.
 *
 * Česká klíčová slova jsou tady. Klíčová slova dalších jazyků jsou v souborech
 * public/i18n/<jazyk>.js (část „scam“) a přidávají se k českým – podvodné SMS
 * v Česku chodí hlavně česky, i když má aplikace nastavený jiný jazyk.
 * Názvy a vysvětlení znaků jsou česky a překládají se přes DP.T().
 */
(function () {
  'use strict';
  const norm = (s) => window.DP.bot.normalize(s);
  const stripMarks = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const RULES = [
    { id: 'link', w: 2, raw: /(https?:\/\/|www\.)|\b[a-z0-9-]+\.(cz|com|net|org|info|xyz|top|online|site|link|app|shop|eu|me|io|ru|cn|click|live|biz|sk|pl|de|ua)\b/i,
      title: 'Obsahuje odkaz', why: 'Podvodníci posílají odkazy na falešné stránky, kde chtějí údaje z karty nebo hesla.' },
    { id: 'short', w: 2, raw: /\b(bit\.ly|tinyurl|is\.gd|t\.ly|cutt\.ly|rb\.gy|shorturl|goo\.gl)\b/i,
      title: 'Zkrácený odkaz', why: 'Zkrácený odkaz skrývá, kam vás ve skutečnosti zavede.' },
    { id: 'card', w: 3, cs: '( platebni kart| cislo kart| udaje (z |o )?kart| cvv| cvc| pin | heslo| hesla| prihlasovaci| overovaci kod| sms kod| kod z sms| potvrzovaci kod)',
      title: 'Chce údaje z karty, heslo nebo kód', why: 'Banka, pošta ani úřad po vás tyto údaje ve zprávě nikdy nechtějí.' },
    { id: 'urgent', w: 2, cs: '( ihned| okamzit| neprodlen| do 24| do 48| posledni (vyzva|upozorneni|sance)| dnes do| vyprs| propadn| zablokov| pozastav| zrusen| deaktiv| omezen)',
      title: 'Tlačí vás do spěchu', why: 'Spěch a strach jsou hlavní zbraně podvodníků. Skutečné instituce vám dají čas.' },
    { id: 'fee', w: 2, digits: true, cs: '( poplat| doplat| clo | cla | dobirk| uhrad| zaplat)',
      title: 'Chce, abyste něco zaplatili', why: 'Podvodníci často chtějí „poplatek“, doplatek nebo úhradu. Je to záminka, jak získat vaše peníze nebo údaje z karty.' },
    { id: 'parcel', w: 1, cs: '( zasilk| balik| doruc| kuryr| posta | ceska posta| ppl | dpd | gls | zasilkovn| balikovn| dhl )',
      title: 'Tváří se jako doručení balíku', why: 'Falešné zprávy o balících jsou jedním z nejčastějších podvodů.' },
    { id: 'bank', w: 1, cs: '( bank| ucet | uctu | ucte | bezpecny ucet| financni urad| exekuc| polici| cez | eon | pre | operator)',
      title: 'Vydává se za banku, úřad nebo firmu', why: 'Podvodníci se rádi vydávají za důvěryhodné instituce. Ověřte si to sami na oficiálním čísle.' },
    { id: 'safeacc', w: 4, cs: '( bezpecny ucet| bezpecneho uctu| bezpecnem uctu| prevedte| preved )',
      title: 'Žádá převod peněz', why: 'Žádný skutečný bankéř ani policista vás nežádá o převod na „bezpečný účet“.' },
    { id: 'prize', w: 2, cs: '( vyhr| vyher| gratul| odmen| darek| zdarma| losovan| vybran(y|a) )',
      title: 'Slibuje výhru nebo dárek', why: 'Pokud jste se soutěže neúčastnili, nemůžete nic vyhrát.' },
    { id: 'family', w: 3, cs: '( mami | tati | babi| dedo | nove cislo| nove telefonni| rozbil| ztratil| posli mi| potrebuju penize| zaplat za me)',
      title: 'Vydává se za někoho z rodiny', why: 'Častý trik „Ahoj mami, mám nové číslo“. Zavolejte blízkému na jeho staré číslo.' },
    { id: 'money', w: 2, digits3: true, cs: '( penize| penez| posli| poslete| prevod| preved| pujc)',
      title: 'Žádá o peníze', why: 'Kdykoli vás zpráva žádá o peníze, ověřte si odesílatele jinou cestou – nejlépe telefonátem na známé číslo.' },
    { id: 'remote', w: 4, cs: '( anydesk| teamviewer| rustdesk| vzdalen| nainstalujte| stahnete aplikac)',
      title: 'Chce, abyste si něco nainstalovali', why: 'Aplikace pro vzdálený přístup dávají podvodníkovi kontrolu nad vaším zařízením.' },
    { id: 'invest', w: 2, cs: '( investic| krypto| bitcoin| vynos| zarucen| zbohatn| pasivni prijem)',
      title: 'Slibuje rychlý zisk', why: 'Zaručené a vysoké výnosy neexistují. Je to typický investiční podvod.' },
    { id: 'foreign', w: 1, raw: /\+(?!420)\d{2,3}[\s\d]{6,}/,
      title: 'Zahraniční telefonní číslo', why: 'Zpráva přišla nebo odkazuje na číslo mimo Česko (předvolba jiná než +420).' }
  ];
  RULES.forEach((r) => { if (r.cs) r.csRe = new RegExp(r.cs); });

  let extraCache = { src: null, map: {} };
  function extraRules() {
    const kw = window.DP.i18n && window.DP.i18n.extra('scam');
    if (kw === extraCache.src) return extraCache.map;
    const map = {};
    if (kw) Object.keys(kw).forEach((id) => {
      // Slova ve stejné úpravě jako text (malá písmena, bez diakritiky), každé na začátku slova.
      const words = kw[id].split('|').map((w) => stripMarks(w).trim()).filter(Boolean)
        .map((w) => w.replace(/[.*+?^${}()[\]\\]/g, '\\$&'));
      if (words.length) map[id] = new RegExp(' (' + words.join('|') + ')', 'u');
    });
    extraCache = { src: kw, map };
    return map;
  }

  function check(raw) {
    const text = String(raw || '').slice(0, 4000);
    const t = norm(text);
    const extra = extraRules();
    const flags = RULES.filter((r) => {
      try {
        if (r.raw) return r.raw.test(text);
        const hit = (r.csRe && r.csRe.test(t)) || (extra[r.id] && extra[r.id].test(t));
        if (!hit) return false;
        if (r.digits) return /\d/.test(text);
        if (r.digits3) return /\d{3,}/.test(text.replace(/\s/g, ''));
        return true;
      } catch (e) { return false; }
    });
    const score = flags.reduce((s, r) => s + r.w, 0);
    let level;
    if (score >= 5) level = 'high';
    else if (score >= 2) level = 'medium';
    else level = 'low';
    return { level, score, flags };
  }

  window.DP.scam = { check };
})();
