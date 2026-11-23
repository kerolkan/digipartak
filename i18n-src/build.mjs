/*
 * Sestaví public/i18n/<jazyk>.js ze zdrojových souborů v této složce.
 *   <jazyk>.ui.txt       – „číslo<TAB>překlad“, čísla odpovídají ui-keys.cs.json
 *   <jazyk>.content.txt  – ověřená témata (## id), návody (## G id), čísla (P), kategorie (C),
 *                          nouzové fráze (U) a klíčová slova podvodů (K)
 * Spuštění:  node i18n-src/build.mjs
 * Kontroluje: počet textů, proměnné {x}, existenci id a počty kroků oproti češtině.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(here, '..', 'public');
const LANGS = ['en', 'uk', 'de', 'sk', 'pl'];

// Česká předloha (načteme kb.js a guides.js v izolovaném prostředí)
const ctx = { window: {} }; vm.createContext(ctx);
for (const f of ['icons', 'kb', 'guides']) vm.runInContext(fs.readFileSync(path.join(pub, 'js', f + '.js'), 'utf8'), ctx);
const CS = ctx.window.DP;
const keys = JSON.parse(fs.readFileSync(path.join(here, 'ui-keys.cs.json'), 'utf8'));
const vars = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(',');

let problems = 0;
const warn = (lang, msg) => { problems++; console.log(`  ⚠ ${lang}: ${msg}`); };

for (const lang of LANGS) {
  const uiFile = path.join(here, lang + '.ui.txt');
  const cFile = path.join(here, lang + '.content.txt');
  if (!fs.existsSync(uiFile) || !fs.existsSync(cFile)) { console.log(`– ${lang}: chybí zdroj, přeskakuji`); continue; }
  const out = { ui: {}, kb: {}, guides: {}, phones: {}, cats: {}, urgent: {}, scam: {} };

  // UI
  for (const line of fs.readFileSync(uiFile, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const m = line.match(/^(\d+)\t(.*)$/);
    if (!m) { warn(lang, 'špatný řádek UI: ' + line.slice(0, 60)); continue; }
    const key = keys[+m[1]];
    if (key === undefined) { warn(lang, 'neznámé číslo ' + m[1]); continue; }
    let val = m[2];
    if (key.startsWith(' ') && !val.startsWith(' ')) val = ' ' + val;
    if (key.endsWith(' ') && !val.endsWith(' ')) val = val + ' ';
    if (vars(key) !== vars(val)) warn(lang, `proměnné nesedí u #${m[1]}: „${key}“`);
    out.ui[key] = val;
  }
  const missing = keys.filter((k) => !(k in out.ui));
  if (missing.length) warn(lang, `chybí ${missing.length} textů UI, např. „${missing[0]}“`);

  // Obsah
  let cur = null;
  for (const raw of fs.readFileSync(cFile, 'utf8').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line) continue;
    let m;
    if ((m = line.match(/^## G (\S+)$/))) { cur = { type: 'g', id: m[1], d: ['', '', []] }; out.guides[m[1]] = cur.d; continue; }
    if ((m = line.match(/^## (\S+)$/))) { cur = { type: 'k', id: m[1], d: ['', '', [], ''] }; out.kb[m[1]] = cur.d; continue; }
    if ((m = line.match(/^P (\S+) \| (.*?) \| (.*)$/))) { out.phones[m[1]] = [m[2], m[3]]; continue; }
    if ((m = line.match(/^C (\S+) \| (.*)$/))) { out.cats[m[1]] = m[2]; continue; }
    if ((m = line.match(/^U (\S+) \| (.*)$/))) { out.urgent[m[1]] = m[2].split(';').map((s) => s.trim()).filter(Boolean); continue; }
    if ((m = line.match(/^K (\S+) \| (.*)$/))) { out.scam[m[1]] = m[2].trim(); continue; }
    if (!cur) { warn(lang, 'řádek mimo blok: ' + line.slice(0, 60)); continue; }
    if (cur.type === 'k') {
      if ((m = line.match(/^T (.*)$/))) cur.d[0] = m[1];
      else if ((m = line.match(/^A (.*)$/))) cur.d[1] = m[1];
      else if ((m = line.match(/^\d+ (.*)$/))) cur.d[2].push(m[1]);
      else if ((m = line.match(/^W (.*)$/))) cur.d[3] = m[1];
      else warn(lang, `neznámý řádek v ${cur.id}: ${line.slice(0, 60)}`);
    } else {
      if ((m = line.match(/^T (.*)$/))) cur.d[0] = m[1];
      else if ((m = line.match(/^I (.*)$/))) cur.d[1] = m[1];
      else if ((m = line.match(/^S (.*)$/))) cur.d[2].push(m[1].split(' || ').map((s) => s.trim()));
      else warn(lang, `neznámý řádek v návodu ${cur.id}: ${line.slice(0, 60)}`);
    }
  }
  // Kontroly proti češtině
  for (const e of CS.KB) {
    const t = out.kb[e.id];
    if (!t) { warn(lang, 'chybí téma ' + e.id); continue; }
    if (!t[0] || !t[1]) warn(lang, 'prázdný titulek/odpověď ' + e.id);
    if (t[2].length !== e.steps.length) warn(lang, `${e.id}: ${t[2].length} kroků, česky ${e.steps.length}`);
    if (!!t[3] !== !!e.warn) warn(lang, `${e.id}: varování nesedí`);
  }
  Object.keys(out.kb).forEach((id) => { if (!CS.KB.some((e) => e.id === id)) warn(lang, 'téma navíc ' + id); });
  for (const g of CS.GUIDES) {
    const t = out.guides[g.id];
    if (!t) { warn(lang, 'chybí návod ' + g.id); continue; }
    if (t[2].length !== g.steps.length) warn(lang, `návod ${g.id}: ${t[2].length} kroků, česky ${g.steps.length}`);
    t[2].forEach((s, i) => { if (!!s[2] !== !!(g.steps[i] && g.steps[i].tip)) warn(lang, `návod ${g.id} krok ${i + 1}: tip nesedí`); });
  }
  CS.PHONES.forEach((p) => { if (!out.phones[p.id]) warn(lang, 'chybí číslo ' + p.id); });
  Object.keys(CS.CATS).forEach((k) => { if (!out.cats[k]) warn(lang, 'chybí kategorie ' + k); });

  const js = `/* DIGI parťák – překlad: ${lang}. VYGENEROVÁNO z i18n-src/${lang}.*.txt (node i18n-src/build.mjs) – needitujte ručně. */\n` +
    `(window.DP = window.DP || {}).L10N = window.DP.L10N || {};\nwindow.DP.L10N[${JSON.stringify(lang)}] = ${JSON.stringify(out)};\n`;
  fs.mkdirSync(path.join(pub, 'i18n'), { recursive: true });
  fs.writeFileSync(path.join(pub, 'i18n', lang + '.js'), js);
  console.log(`✓ ${lang}: ${Object.keys(out.ui).length} textů UI, ${Object.keys(out.kb).length} témat, ${Object.keys(out.guides).length} návodů, ${(js.length / 1024).toFixed(0)} kB`);
}
if (problems) { console.log(`\n${problems} problémů`); process.exitCode = 1; } else console.log('\nVše v pořádku.');
