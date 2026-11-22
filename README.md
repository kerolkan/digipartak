# DIGI parťák – PWA pro seniory

Webová aplikace, kterou si senior může přidat na plochu telefonu (PWA). Ověřené rady fungují i bez internetu.
Web je ve složce `public/` (čisté HTML/CSS/JS bez build kroku). AI funkce běží na serveru:
na Netlify jako Netlify Functions, jinde přes `server.mjs`. Obojí používá sdílený modul `lib/ai.mjs`.

## Nasazení na Netlify (doporučeno)

AI funkce (odpovědi mimo aplikaci a rozbor fotek) potřebují **Netlify Functions**.
Ty se při přetažení složky na web (Netlify Drop) **nenasadí**. Nasazujte přes Git nebo Netlify CLI:

```bash
npm install
npx netlify-cli deploy --build --prod
```

1. V Netlify: **Site configuration → Environment variables** → přidejte `ANTHROPIC_API_KEY`.
2. Nastavení je v `netlify.toml` (publikuje se jen `public/`, funkce jsou v `netlify/functions/`).
3. **Časový limit:** funkce na Netlify mají ve výchozím stavu limit 10 s (lze navýšit až na 26 s, podle tarifu přes
   nastavení nebo podporu). Rozbor fotky může trvat déle. Když se často zobrazuje „Rozbor se teď nepodařil“,
   limit navyšte, nebo použijte vlastní server (níže).
4. **Při každé změně obsahu zvyšte `VERSION` v `public/sw.js`.**

## Vlastní server (alternativa)

```bash
npm install
ANTHROPIC_API_KEY=sk-ant-... npm start
```

Otevřete http://localhost:3000. Na hostingu (Render, Railway, Fly.io, VPS) nastavte `ANTHROPIC_API_KEY`, `HOST=0.0.0.0` a `PORT`.
Bez API klíče aplikace funguje dál, jen AI funkce slušně oznámí, že nejsou dostupné.

## Struktura

| Soubor | Co obsahuje |
|---|---|
| `public/js/kb.js` | **Knihovna ověřených odpovědí** chatbota a důležitá telefonní čísla |
| `public/js/bot.js` | Vyhledávání v knihovně a ochrana citlivých údajů |
| `public/js/scam.js` | Pravidla pro „Je to podvod?“ (kontrola textu přímo v zařízení) |
| `public/js/guides.js` | Návody krok za krokem (včetně snímku obrazovky na Androidu a iPhonu) |
| `public/js/app.js` | Obrazovky, nastavení, čtení nahlas, diktování, nahrání fotky |
| `public/css/app.css` | Design systém |
| `public/sw.js`, `public/manifest.webmanifest` | PWA: offline režim a instalace |
| `lib/ai.mjs` | AI logika (Claude): pokyny pro model, ochrana údajů, limity |
| `netlify/functions/ask.mjs`, `scan.mjs` | Netlify Functions → `/api/ask`, `/api/scan` |
| `server.mjs` | Vlastní server: `public/` + `/api/ask`, `/api/scan` |

## Jak chatbot odpovídá

1. **Ověřená knihovna (`public/js/kb.js`)** – má přednost. Odpověď má zelený štítek „Ověřená rada“ a zdroje.
   Krizové situace (zdraví, sebepoškození, probíhající podvod) a odmítnutí rad k dávkování léků a investicím jsou vždy z knihovny.
2. **Informace mimo aplikaci (Claude, `claude-opus-5-5`)** – na cokoli, co v knihovně není (např. „Co je Facebook?“,
   „Jak se tam přihlásím?“). Odpověď má žlutý rámeček **„Informace mimo aplikaci – ověřte si ji“** a návod, jak si ji ověřit.
   Pod každou odpovědí z knihovny je tlačítko „Zeptat se mimo aplikaci“, kdyby knihovna nepochopila otázku.
   Navazující otázky fungují, protože se posílá i krátká historie rozhovoru (posledních 6 zpráv).

## Je to podvod? – text i fotka

- **Text:** kontrola probíhá jen v zařízení, nic se neodesílá.
- **Fotka / snímek obrazovky:** fotka se v telefonu zmenší (max. 1600 px), odstraní se z ní metadata (poloha, datum)
  a odešle se k rozboru (Claude, strukturovaný výstup). Výsledek AI se spojí s vlastními pravidly a platí přísnější z nich.
  Výsledek je vždy označen „Rozbor fotky pomocí umělé inteligence – orientační“. Aplikace nikdy neřekne, že je zpráva „bezpečná“.

## Pojistky u AI

- Čísla karet, rodná čísla, PINy a hesla se skryjí v prohlížeči i znovu na serveru. API klíč je jen na serveru.
- Server dotazy ani fotky neukládá a neloguje (jen typ chyby).
- Pokyny pro model (`lib/ai.mjs`): česky, vykání, krátce, žádné dávkování léků ani investiční rady, žádná vymyšlená čísla,
  nikdy netvrdí „bezpečné“, v nouzi odkáže na 112/155/158, ignoruje pokyny ukryté v otázce či na fotce.
- Limity na IP adresu: 20 otázek a 8 fotek za 10 minut. Otázka max. 500 znaků, fotka max. ~3,7 MB (aplikace posílá ~0,3 MB).
- Zapnutý server-side fallback (`fallbacks: "default"`): když model z bezpečnostních důvodů odmítne, API zkusí jiný model.

## Diktování

- Text se skládá podle pozice výsledku (opravuje zdvojování textu v Chrome na Androidu).
- Pauzy v řeči nevadí, diktování skončí po 3 s ticha nebo klepnutím.
- **Dotaz se sám neodešle.** Text zůstane v poli, senior ho zkontroluje a odešle.
- Prohlížeče bez diktování (např. Firefox) poradí použít mikrofon na klávesnici telefonu.
- Diktování zajišťuje prohlížeč (Google / Apple) a potřebuje internet.

**Ochrana osobních údajů:** otázky mimo knihovnu a fotky zpracovává Anthropic. Uveďte to v zásadách ochrany osobních
údajů (GDPR). Text je i v Nastavení aplikace a přímo u nahrávání fotky.

## ⚠️ Před zveřejněním

1. **Otestujte AI** na 30–50 typických otázkách a 10–20 skutečných podvodných i nepodvodných snímcích obrazovky. Podle výsledků upravte pokyny v `lib/ai.mjs`.
2. **Odborná kontrola obsahu.** Texty v `public/js/kb.js` a `public/js/guides.js` jsou kvalifikovaný koncept, ne ověřená fakta.
   Nechte je zkontrolovat (bezpečnost: např. Policie ČR/NÚKIB, banka; obsah pro seniory: např. Život 90).
   Potom upravte `KB_REVIEWED` v `public/js/kb.js`.
3. **Ověřte telefonní čísla** (Senior telefon 800 157 157, Linka seniorů 800 200 007, Linka první psychické pomoci 116 123).
4. Postupy v telefonech (názvy položek v Nastavení) se liší podle výrobce a verze systému. Otestujte je na reálných zařízeních.
5. Vyzkoušejte aplikaci se seniory (5–8 lidí stačí) a s čtečkou obrazovky (VoiceOver/TalkBack).
6. Fotografie v `public/img/` jsou vyřezané z brandové koláže. Pro produkci použijte originály ve vyšším rozlišení.

## Přístupnost

- Tělo textu má 19 px, tři velikosti písma (až 137 %) a vysoký kontrast.
- Dotykové plochy mají min. 56 px. Bez vodorovného posouvání ani při největším písmu.
- Čtení nahlas (cs-CZ), diktování (pokud ho prohlížeč umí) a respektování „omezit pohyb“.
- Sémantické HTML, odkaz „Přeskočit na obsah“, viditelné zaměření, `aria-live` v chatu, fokus nadpisu při změně stránky.
