/*
 * DIGI parťák – „Je to podvod?“
 * Orientační kontrola zprávy podle typických znaků podvodu.
 * Běží jen v zařízení, text se nikam neodesílá.
 * Nikdy netvrdí, že je zpráva „bezpečná“ – jen hledá varovné znaky.
 */
(function () {
  'use strict';
  const norm = (s) => window.DP.bot.normalize(s);

  const RULES = [
    { id: 'link', w: 2, test: (t, raw) => /(https?:\/\/|www\.)|\b[a-z0-9-]+\.(cz|com|net|org|info|xyz|top|online|site|link|app|shop|eu|me|io|ru|cn|click|live|biz)\b/i.test(raw),
      title: 'Obsahuje odkaz', why: 'Podvodníci posílají odkazy na falešné stránky, kde chtějí údaje z karty nebo hesla.' },
    { id: 'short', w: 2, test: (t, raw) => /\b(bit\.ly|tinyurl|is\.gd|t\.ly|cutt\.ly|rb\.gy|shorturl|goo\.gl)\b/i.test(raw),
      title: 'Zkrácený odkaz', why: 'Zkrácený odkaz skrývá, kam vás ve skutečnosti zavede.' },
    { id: 'card', w: 3, test: (t) => /( platebni kart| cislo kart| udaje (z |o )?kart| cvv| cvc| pin | pin$| heslo| hesla| prihlasovaci| overovaci kod| sms kod| kod z sms| potvrzovaci kod)/.test(t),
      title: 'Chce údaje z karty, heslo nebo kód', why: 'Banka, pošta ani úřad po vás tyto údaje ve zprávě nikdy nechtějí.' },
    { id: 'urgent', w: 2, test: (t) => /( ihned| okamzit| neprodlen| do 24| do 48| posledni (vyzva|upozorneni|sance)| dnes do| vyprs| propadn| zablokov| pozastav| zrusen| deaktiv| omezen)/.test(t),
      title: 'Tlačí vás do spěchu', why: 'Spěch a strach jsou hlavní zbraně podvodníků. Skutečné instituce vám dají čas.' },
    { id: 'fee', w: 2, test: (t, raw) => /( poplat| doplat| clo | cla | dobirk| uhrad| zaplat)/.test(t) && /\d/.test(raw),
      title: 'Chce malou platbu', why: 'Drobný „poplatek“ je jen záminka, jak získat údaje z vaší karty.' },
    { id: 'parcel', w: 1, test: (t) => /( zasilk| balik| doruc| kuryr| posta | ceska posta| ppl | dpd | gls | zasilkovn| balikovn| dhl )/.test(t),
      title: 'Tváří se jako doručení balíku', why: 'Falešné zprávy o balících jsou jedním z nejčastějších podvodů.' },
    { id: 'bank', w: 1, test: (t) => /( bank| ucet | uctu | ucte | bezpecny ucet| financni urad| exekuc| polici| cez | eon | pre | operator)/.test(t),
      title: 'Vydává se za banku, úřad nebo firmu', why: 'Podvodníci se rádi vydávají za důvěryhodné instituce. Ověřte si to sami na oficiálním čísle.' },
    { id: 'safeacc', w: 4, test: (t) => /( bezpecny ucet| bezpecneho uctu| bezpecnem uctu| prevedte| preved )/.test(t),
      title: 'Žádá převod peněz', why: 'Žádný skutečný bankéř ani policista vás nežádá o převod na „bezpečný účet“.' },
    { id: 'prize', w: 2, test: (t) => /( vyhr| vyher| gratul| odmen| darek| zdarma| losovan| vybran(y|a) )/.test(t),
      title: 'Slibuje výhru nebo dárek', why: 'Pokud jste se soutěže neúčastnili, nemůžete nic vyhrát.' },
    { id: 'family', w: 3, test: (t) => /( mami | tati | babi| dedo | nove cislo| nove telefonni| rozbil| ztratil| posli mi| potrebuju penize| zaplat za me)/.test(t),
      title: 'Vydává se za někoho z rodiny', why: 'Častý trik „Ahoj mami, mám nové číslo“. Zavolejte blízkému na jeho staré číslo.' },
    { id: 'money', w: 2, test: (t, raw) => /( penize| penez| posli| poslete| prevod| preved| pujc)/.test(t) && /\d{3,}/.test(raw.replace(/\s/g, '')),
      title: 'Žádá o peníze', why: 'Kdykoli vás zpráva žádá o peníze, ověřte si odesílatele jinou cestou – nejlépe telefonátem na známé číslo.' },
    { id: 'remote', w: 4, test: (t) => /( anydesk| teamviewer| rustdesk| vzdalen| nainstalujte| stahnete aplikac)/.test(t),
      title: 'Chce, abyste si něco nainstalovali', why: 'Aplikace pro vzdálený přístup dávají podvodníkovi kontrolu nad vaším zařízením.' },
    { id: 'invest', w: 2, test: (t) => /( investic| krypto| bitcoin| vynos| zarucen| zbohatn| pasivni prijem)/.test(t),
      title: 'Slibuje rychlý zisk', why: 'Zaručené a vysoké výnosy neexistují. Je to typický investiční podvod.' },
    { id: 'foreign', w: 1, test: (t, raw) => /\+(?!420)\d{2,3}[\s\d]{6,}/.test(raw),
      title: 'Zahraniční telefonní číslo', why: 'Zpráva přišla nebo odkazuje na číslo mimo Česko (předvolba jiná než +420).' }
  ];

  function check(raw) {
    const text = String(raw || '').slice(0, 4000);
    const t = norm(text);
    const flags = RULES.filter((r) => { try { return r.test(t, text); } catch (e) { return false; } });
    const score = flags.reduce((s, r) => s + r.w, 0);
    let level;
    if (score >= 5) level = 'high';
    else if (score >= 2) level = 'medium';
    else level = 'low';
    return { level, score, flags };
  }

  window.DP.scam = { check };
})();
