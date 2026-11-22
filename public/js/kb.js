/*
 * DIGI parťák – KNIHOVNA OVĚŘENÝCH ODPOVĚDÍ
 * ------------------------------------------------------------------
 * Chatbot NEGENERUJE text. Odpovídá výhradně záznamy z tohoto souboru.
 * Když dotaz neodpovídá žádnému záznamu, poctivě řekne, že neví,
 * a nabídne lidskou pomoc (Senior telefon, rodina, banka, lékař).
 *
 * Úprava obsahu:
 *  - k:   klíčová slova bez diakritiky, malými písmeny. Stačí začátek slova
 *         („zasilk“ pokryje zásilka, zásilku, zásilkou…). Váha: ["slovo", 3].
 *  - a:   krátká odpověď (1–3 věty), vykání, bez žargonu.
 *  - steps: max. 5 kroků.
 *  - src: zdroj, ze kterého odpověď vychází (instituce + web).
 *  - Každou změnu nechte zkontrolovat odborníkem a aktualizujte REVIEWED.
 */
(function () {
  'use strict';

  const SRC = {
    policie: { n: 'Policie ČR', u: 'https://www.policie.cz' },
    cba: { n: 'Česká bankovní asociace', u: 'https://www.cbaonline.cz' },
    nukib: { n: 'NÚKIB – Národní úřad pro kybernetickou a informační bezpečnost', u: 'https://nukib.gov.cz' },
    cnb: { n: 'Česká národní banka', u: 'https://www.cnb.cz' },
    coi: { n: 'Česká obchodní inspekce', u: 'https://www.coi.gov.cz' },
    posta: { n: 'Česká pošta', u: 'https://www.ceskaposta.cz' },
    sukl: { n: 'SÚKL – eRecept', u: 'https://www.sukl.cz' },
    obcan: { n: 'Portál občana', u: 'https://obcan.portal.gov.cz' },
    zivot90: { n: 'Život 90 – Senior telefon', u: 'https://www.zivot90.cz' },
    elpida: { n: 'Elpida – Linka seniorů', u: 'https://www.elpida.cz' },
    google: { n: 'Nápověda Android (Google)', u: 'https://support.google.com/android' },
    apple: { n: 'Podpora Apple', u: 'https://support.apple.com/cs-cz' },
    whatsapp: { n: 'Nápověda WhatsApp', u: 'https://faq.whatsapp.com' },
    zachranka: { n: 'Integrovaný záchranný systém – tísňová čísla', u: 'https://www.hzscr.cz' }
  };

  /* Důležitá čísla – používá je obrazovka Pomoc i chatbot. */
  const PHONES = [
    { id: '112', name: 'Tísňová linka', desc: 'Jakékoli ohrožení života, zdraví nebo majetku. Funguje i bez kreditu.', tel: '112', kind: 'urgent' },
    { id: '155', name: 'Zdravotnická záchranná služba', desc: 'Náhlé zdravotní potíže, úraz, bezvědomí.', tel: '155', kind: 'urgent' },
    { id: '158', name: 'Policie ČR', desc: 'Podvod, krádež, výhrůžky, podezřelý člověk u dveří.', tel: '158', kind: 'urgent' },
    { id: '150', name: 'Hasiči', desc: 'Požár, únik plynu, technická pomoc.', tel: '150', kind: 'urgent' },
    { id: 'senior', name: 'Senior telefon (Život 90)', desc: 'Bezplatná linka pro seniory a jejich blízké. Nonstop.', tel: '800157157', display: '800 157 157', kind: 'support' },
    { id: 'elpida', name: 'Linka seniorů (Elpida)', desc: 'Bezplatný rozhovor, když je vám smutno nebo potřebujete poradit.', tel: '800200007', display: '800 200 007', kind: 'support' },
    { id: 'psych', name: 'Linka první psychické pomoci', desc: 'Když je toho na vás moc. Bezplatně, nonstop.', tel: '116123', display: '116 123', kind: 'support' }
  ];

  const KB = [
    /* ===================== BEZPEČÍ ===================== */
    {
      id: 'sms-balik', cat: 'bezpeci', urgentLevel: 0,
      title: 'Přišla mi SMS o balíku a mám doplatit poplatek',
      q: ['Přišla mi SMS, že mám zaplatit za doručení balíku', 'Pošta chce doplatit clo přes odkaz'],
      k: [['balik', 3], ['zasilk', 3], ['doruc', 2], ['posta', 2], ['postovn', 2], 'kuryr', 'ppl', 'dpd', 'gls', 'zasilkovn', 'balikovn', ['poplat', 2], ['doplat', 2], 'clo', 'cla', 'sms', 'odkaz'],
      a: 'Takové zprávy jsou velmi často podvod. Podvodníci chtějí, abyste na odkazu zadali údaje z platební karty.',
      steps: [
        'Na odkaz ve zprávě neklikejte a nic neplaťte.',
        'Pokud balík opravdu čekáte, ověřte ho sami – na oficiálním webu přepravce nebo telefonicky na čísle z jeho webu.',
        'Zprávu smažte. Můžete ji i nahlásit jako spam.',
        'Pokud jste už na odkaz klikli a zadali kartu, hned volejte svou banku.'
      ],
      warn: 'Doručovací firmy po vás nebudou chtít údaje z karty přes odkaz v SMS.',
      src: [SRC.posta, SRC.policie], rel: ['uz-jsem-zadal', 'jak-poznat-podvod']
    },
    {
      id: 'banka-vola', cat: 'bezpeci', urgentLevel: 2,
      title: 'Volá mi někdo z banky a chce převést peníze',
      q: ['Volali mi z banky, že mám převést peníze na bezpečný účet', 'Bezpečnostní oddělení banky po mně chce kód'],
      k: [['bank', 2], ['bezpecny ucet', 5], ['bezpecn', 1], ['ucet', 1], ['prev', 2], ['volal', 2], ['vola', 2], ['telefon', 1], ['kod', 1], ['pin', 2], 'bezpecnostni oddel', ['napaden', 2], 'hacker', 'urednik'],
      a: 'Zavěste. Banka vás nikdy nebude žádat, abyste převedli peníze na „bezpečný účet“, ani po vás nebude chtít PIN, heslo nebo kód z SMS.',
      steps: [
        'Hned hovor ukončete. Nemusíte být zdvořilí.',
        'Nic neinstalujte a nikomu nesdělujte žádné kódy.',
        'Zavolejte sami do své banky – na číslo ze zadní strany platební karty nebo z oficiálního webu banky.',
        'Pokud jste už peníze poslali nebo sdělili údaje, řekněte to bance hned a volejte Policii ČR na 158.'
      ],
      warn: 'Podvodníci umí napodobit i skutečné číslo banky nebo policie. Na displeji může být „správné“ číslo – přesto to může být podvod.',
      src: [SRC.cba, SRC.policie], rel: ['uz-jsem-zadal', 'falesny-policista', 'vzdalena-plocha'], phones: ['158']
    },
    {
      id: 'uz-jsem-zadal', cat: 'bezpeci', urgentLevel: 3,
      title: 'Už jsem klikl/a na odkaz nebo zadal/a údaje z karty',
      q: ['Zadala jsem číslo karty na podvodné stránce', 'Poslal jsem peníze podvodníkovi, co teď?'],
      k: [['zadal', 3], ['vyplnil', 3], ['klikl', 3], ['poslal', 2], ['nalet', 3], ['podved', 3], ['okrad', 3], ['ukradl', 3], ['zablok', 2], ['kart', 2], ['co ted', 2], 'stalo se', 'udaje', ['strhl', 2], ['zmizel', 2]],
      a: 'Nebojte se, dá se jednat. Čím dřív zavoláte do banky, tím větší je šance peníze zachránit.',
      steps: [
        'Hned zavolejte do své banky na číslo ze zadní strany karty nebo z oficiálního webu banky. Požádejte o zablokování karty.',
        'Pokud jste dali někomu přístup do telefonu nebo počítače, vypněte internet (Wi-Fi i data).',
        'Změňte heslo do internetového bankovnictví a e-mailu – ideálně s pomocí blízkého člověka.',
        'Podvod oznamte Policii ČR na čísle 158.',
        'Nestyďte se. Podvodníci jsou profesionálové a napálí i mladé a zkušené lidi.'
      ],
      src: [SRC.cba, SRC.policie], rel: ['banka-vola', 'sms-balik'], phones: ['158', 'senior'], urgent: true
    },
    {
      id: 'falesny-policista', cat: 'bezpeci', urgentLevel: 2,
      title: 'Volá mi „policista“ a chce, abych mu dal/a peníze',
      q: ['Volal mi policista, že mám vybrat peníze', 'Policie chce předat hotovost kurýrovi'],
      k: [['polic', 3], ['vysetrov', 2], ['vybrat', 2], ['hotovost', 3], ['predat', 2], ['kuryr', 1], 'detektiv', 'soud', 'exekuc', 'vnuk', 'vnuc'],
      a: 'Skutečná policie po vás nikdy nebude chtít peníze, hotovost ani převod na účet. Je to podvod.',
      steps: [
        'Zavěste a nikomu nic nepředávejte.',
        'Zavolejte sami na linku 158 a řekněte, co se stalo.',
        'Pokud někdo stojí u dveří, neotvírejte a volejte 158.'
      ],
      src: [SRC.policie], rel: ['banka-vola', 'vnoucatko'], phones: ['158']
    },
    {
      id: 'vnoucatko', cat: 'bezpeci', urgentLevel: 1,
      title: 'Píše mi „vnouče“ nebo „dcera“ z nového čísla a chce peníze',
      q: ['Ahoj mami, mám nové číslo, potřebuju zaplatit fakturu', 'Vnuk mi píše z cizího čísla a chce peníze'],
      k: [['nove cislo', 5], ['mami', 2], ['tati', 2], ['babi', 2], ['dedo', 2], ['vnuk', 2], ['vnuck', 2], ['dcer', 2], ['syn', 2], ['rozbil', 2], ['ztratil', 2], ['faktur', 2], ['pujc', 2], ['penez', 1], ['penize', 1], 'whatsapp'],
      a: 'Tohle je častý podvod. Než cokoli pošlete, ověřte si, že vám opravdu píše váš blízký.',
      steps: [
        'Neposílejte peníze ani kódy.',
        'Zavolejte svému blízkému na jeho STARÉ, známé číslo, nebo se zeptejte jiného člena rodiny.',
        'Můžete položit otázku, na kterou zná odpověď jen on (např. jméno vašeho psa).',
        'Pokud se ukáže, že to byl podvodník, číslo zablokujte.'
      ],
      src: [SRC.policie, SRC.nukib], rel: ['jak-poznat-podvod']
    },
    {
      id: 'vzdalena-plocha', cat: 'bezpeci', urgentLevel: 2,
      title: 'Někdo chce, abych si nainstaloval/a aplikaci (AnyDesk, TeamViewer)',
      q: ['Technik z banky chce, abych si stáhla AnyDesk', 'Mám si nainstalovat aplikaci kvůli opravě počítače'],
      k: [['anydesk', 5], ['teamviewer', 5], ['rustdesk', 5], ['vzdalen', 3], ['nainstal', 2], ['stahn', 2], ['stahl', 2], ['aplikac', 1], ['technik', 2], ['microsoft', 2], ['virus', 2], ['podpor', 1]],
      a: 'Nikdy neinstalujte aplikaci na pokyn člověka, který vám sám zavolal nebo napsal. Získal by tím přístup do vašeho telefonu i bankovnictví.',
      steps: [
        'Ukončete hovor nebo konverzaci.',
        'Nic neinstalujte. Pokud už jste nainstalovali, vypněte internet a aplikaci odinstalujte.',
        'Zavolejte do banky na oficiální číslo a řekněte, co se stalo.'
      ],
      warn: 'Banky, Microsoft ani operátoři vám sami nevolají kvůli „virům v počítači“.',
      src: [SRC.cba, SRC.nukib], rel: ['uz-jsem-zadal', 'banka-vola']
    },
    {
      id: 'investice', cat: 'bezpeci', urgentLevel: 1,
      title: 'Nabízí mi někdo investici, kryptoměny nebo rychlý zisk',
      q: ['Viděl jsem reklamu se známou osobností, že vydělám na kryptoměnách', 'Nabízí mi zaručený výnos'],
      k: [['investic', 3], ['investov', 3], ['krypto', 3], ['bitcoin', 3], ['vynos', 2], ['zisk', 2], ['zbohat', 3], ['vydel', 2], 'burz', 'akcie', 'obchodn', 'reklam', 'celebrit', 'zarucen'],
      a: 'Slib vysokého a „zaručeného“ zisku je typický znak podvodu. Často se u toho zneužívají fotky známých osobností.',
      steps: [
        'Nikomu neposílejte peníze ani doklady.',
        'Neinstalujte žádné aplikace, které vám „poradce“ doporučí.',
        'Na webu České národní banky si můžete ověřit, zda má firma povolení.',
        'O investicích se poraďte ve své bance osobně nebo s někým blízkým.'
      ],
      warn: 'DIGI parťák nedává investiční rady – pomůže vám jen poznat podvod.',
      src: [SRC.cnb, SRC.policie], rel: ['jak-poznat-podvod']
    },
    {
      id: 'vyhra', cat: 'bezpeci', urgentLevel: 1,
      title: 'Prý jsem něco vyhrál/a a mám zaplatit poplatek',
      q: ['Vyhrála jsem iPhone, mám zaplatit jen poštovné', 'Gratulujeme, vyhrál jste'],
      k: [['vyhr', 2], ['vyher', 2], ['gratul', 2], ['soutez', 2], ['odmen', 2], ['darek', 2], ['zdarma', 1], ['losovan', 2], ['loteri', 2], ['zaplat', 1], ['poplat', 1], ['postovn', 1], ['kart', 1]],
      a: 'Pokud jste se soutěže neúčastnili, nic jste nevyhráli. Skutečná výhra nikdy nevyžaduje poplatek ani údaje z karty.',
      steps: ['Neklikejte na odkaz a nic neplaťte.', 'Zprávu smažte.', 'Pokud jste zadali kartu, volejte banku.'],
      src: [SRC.coi, SRC.policie], rel: ['jak-poznat-podvod', 'uz-jsem-zadal']
    },
    {
      id: 'jak-poznat-podvod', cat: 'bezpeci', urgentLevel: 0,
      title: 'Jak poznám podvodnou zprávu nebo e-mail?',
      q: ['Jak poznat podvod', 'Je tahle zpráva podvod?', 'Přišel mi divný e-mail'],
      k: [['podvod', 3], ['podezr', 3], ['divn', 2], ['phishing', 4], ['spam', 2], ['email', 1], ['e mail', 1], ['zprav', 1], ['poznat', 1], ['pravy', 1], ['falesn', 2]],
      a: 'Podvodné zprávy mají obvykle několik společných znaků. Stačí si všimnout jednoho z nich a zbystřit.',
      steps: [
        'Spěch a strach: „ihned“, „do 24 hodin“, „účet bude zablokován“.',
        'Odkaz, na kterém máte něco vyplnit nebo zaplatit.',
        'Žádost o číslo karty, PIN, heslo nebo kód z SMS.',
        'Neznámý odesílatel, zahraniční číslo nebo divná adresa.',
        'Když si nejste jistí, vložte zprávu do nástroje „Je to podvod?“ nebo se zeptejte blízkého.'
      ],
      src: [SRC.nukib, SRC.policie], rel: ['sms-balik', 'banka-vola'], action: { label: 'Zkontrolovat zprávu', href: '#/podvod' }
    },
    {
      id: 'heslo', cat: 'bezpeci', urgentLevel: 0,
      title: 'Jak si vytvořit bezpečné heslo?',
      q: ['Jak vymyslet bezpečné heslo', 'Jak si pamatovat hesla'],
      k: [['heslo', 3], ['hesla', 3], ['hesel', 3], ['prihlas', 1], ['bezpecne heslo', 3], ['vymyslet', 2], ['dvoufaktor', 3], ['overeni', 1]],
      a: 'Nejlepší je dlouhé heslo složené z několika slov, které si snadno zapamatujete, ale nikdo jiný ho neuhodne.',
      steps: [
        'Spojte 3–4 slova, která spolu nesouvisí, např. „Kos-Rohlik-Zahrada-27“ (tohle ale nepoužívejte, je veřejné).',
        'Pro každý účet použijte jiné heslo – hlavně pro e-mail a banku.',
        'Hesla si můžete zapsat do sešitku, který zůstane doma. Nikdy je nefoťte a neposílejte.',
        'Kde to jde, zapněte dvoufázové ověření (kód v SMS nebo v aplikaci).'
      ],
      warn: 'Své heslo nikdy nikomu nesdělujte – ani bance, ani „technikovi“. Ani DIGI parťákovi.',
      src: [SRC.nukib], rel: ['jak-poznat-podvod']
    },
    {
      id: 'nakup-online', cat: 'bezpeci', urgentLevel: 0,
      title: 'Jak bezpečně nakupovat na internetu?',
      q: ['Jak poznat bezpečný e-shop', 'Chci nakoupit na internetu'],
      k: [['nakup', 3], ['nakoup', 3], ['eshop', 3], ['e shop', 3], ['obchod', 1], ['objedn', 2], ['bazar', 2], ['inzer', 2], ['prodej', 1], ['recenz', 2]],
      a: 'Nakupujte na známých e-shopech a u neznámých si nejdřív ověřte, kdo za nimi stojí.',
      steps: [
        'Adresu obchodu napište sami, neklikejte na odkazy z reklam a zpráv.',
        'Podívejte se na kontakt, IČO a adresu prodejce a na recenze od jiných lidí.',
        'Mějte se na pozoru, když je cena podezřele nízká.',
        'U neznámého prodejce volte platbu při převzetí.',
        'Na bazarech nikdy neposílejte kód z SMS ani nevyplňujte kartu přes odkaz od „kupce“.'
      ],
      src: [SRC.coi], rel: ['jak-poznat-podvod']
    },
    {
      id: 'laska-online', cat: 'bezpeci', urgentLevel: 1,
      title: 'Seznámil/a jsem se s někým na internetu a chce peníze',
      q: ['Můj známý z internetu potřebuje peníze na letenku', 'Píše mi voják ze zahraničí'],
      k: [['seznam', 2], ['seznamk', 3], ['laska', 2], ['zamilov', 3], ['vojak', 3], ['letenk', 3], ['zahranic', 1], ['facebook', 1], ['nikdy jsem ho nevid', 3]],
      a: 'Pokud vás o peníze žádá někdo, s kým jste se nikdy osobně nesetkali, je to s vysokou pravděpodobností podvod.',
      steps: ['Neposílejte peníze, dárky ani kódy.', 'Promluvte si o tom s někým blízkým.', 'Pokud jste už peníze poslali, volejte banku a Policii ČR (158).'],
      src: [SRC.policie], rel: ['uz-jsem-zadal']
    },

    /* ===================== TELEFON ===================== */
    {
      id: 'pismo', cat: 'telefon', urgentLevel: 0,
      title: 'Jak zvětšit písmo v telefonu?',
      q: ['Jak si zvětšit písmena v mobilu', 'Špatně vidím na telefon'],
      k: [['pism', 3], ['vetsi', 2], ['zvets', 3], ['velikost', 2], ['spatne vid', 3], ['nevid', 2], ['text', 1], ['displej', 1]],
      a: 'Písmo si zvětšíte v Nastavení telefonu. Názvy položek se mohou podle výrobce trochu lišit.',
      steps: [
        'Android: otevřete Nastavení → Displej (nebo Usnadnění) → Velikost písma.',
        'iPhone: otevřete Nastavení → Displej a jas → Velikost textu.',
        'Posuňte jezdec doprava, dokud se vám text dobře nečte.',
        'Písmo v DIGI parťákovi zvětšíte tlačítkem „Písmo“ nahoře.'
      ],
      src: [SRC.google, SRC.apple], rel: [], action: { label: 'Návod krok za krokem', href: '#/navody/pismo' }
    },
    {
      id: 'whatsapp-fotka', cat: 'internet', urgentLevel: 0,
      title: 'Jak poslat fotku přes WhatsApp?',
      q: ['Jak poslat fotku vnoučatům', 'Jak poslat obrázek přes WhatsApp'],
      k: [['fotk', 3], ['fotograf', 3], ['obrazek', 3], ['obrazk', 3], ['poslat', 1], ['posli', 1], ['whatsapp', 2], ['galeri', 2]],
      a: 'Fotku pošlete v několika krocích přímo z rozhovoru s daným člověkem.',
      steps: [
        'Otevřete WhatsApp a klepněte na jméno člověka.',
        'Dole klepněte na ikonu sponky nebo „+“.',
        'Vyberte „Galerie“ (Android) nebo „Fotky“ (iPhone).',
        'Klepněte na fotku a potom na zelenou šipku pro odeslání.'
      ],
      src: [SRC.whatsapp], rel: ['whatsapp-video'], action: { label: 'Návod krok za krokem', href: '#/navody/whatsapp-fotka' }
    },
    {
      id: 'whatsapp-video', cat: 'internet', urgentLevel: 0,
      title: 'Jak zavolat videohovorem přes WhatsApp?',
      q: ['Jak zavolat s obrazem', 'Chci vidět vnoučata přes telefon'],
      k: [['video', 3], ['videohovor', 4], ['s obrazem', 3], ['kamer', 2], ['videt', 2], ['zavolat', 1], ['whatsapp', 2]],
      a: 'Videohovor zahájíte jedním klepnutím v rozhovoru s daným člověkem.',
      steps: [
        'Otevřete WhatsApp a klepněte na jméno člověka.',
        'Vpravo nahoře klepněte na ikonu kamery.',
        'Počkejte, až to druhý člověk přijme.',
        'Hovor ukončíte červeným tlačítkem.'
      ],
      src: [SRC.whatsapp], rel: ['whatsapp-fotka'], action: { label: 'Návod krok za krokem', href: '#/navody/whatsapp-video' }
    },
    {
      id: 'wifi', cat: 'telefon', urgentLevel: 0,
      title: 'Jak se připojit k Wi-Fi?',
      q: ['Jak připojit telefon k internetu doma', 'Nejde mi internet'],
      k: [['wifi', 4], ['wi fi', 4], ['wifin', 4], ['internet', 1], ['pripoj', 2], ['nejde', 1], ['sit', 1]],
      a: 'K domácí Wi-Fi se připojíte v Nastavení. Budete potřebovat název sítě a heslo – bývají na štítku routeru.',
      steps: [
        'Otevřete Nastavení → Wi-Fi (na Androidu někdy Připojení → Wi-Fi).',
        'Zapněte Wi-Fi, pokud je vypnutá.',
        'Klepněte na název své sítě.',
        'Zadejte heslo ze štítku na routeru a potvrďte.'
      ],
      warn: 'Na veřejné Wi-Fi (kavárna, nádraží) raději nepoužívejte internetové bankovnictví.',
      src: [SRC.google, SRC.apple], rel: []
    },
    {
      id: 'aktualizace', cat: 'telefon', urgentLevel: 0,
      title: 'Mám aktualizovat telefon?',
      q: ['Telefon chce aktualizaci, mám ji udělat?', 'Co je aktualizace'],
      k: [['aktualiz', 4], ['update', 3], ['nova verze', 2], ['upgrade', 2]],
      a: 'Ano, aktualizace z Nastavení telefonu jsou důležité – opravují bezpečnostní chyby.',
      steps: [
        'Aktualizaci spouštějte jen z Nastavení telefonu nebo z obchodu Google Play / App Store.',
        'Před aktualizací telefon nabijte a připojte k Wi-Fi.',
        'Pokud vás k „aktualizaci“ vyzývá odkaz v SMS nebo e-mailu, je to podvod.'
      ],
      src: [SRC.nukib], rel: ['jak-poznat-podvod']
    },
    {
      id: 'screenshot', cat: 'telefon', urgentLevel: 0,
      title: 'Jak udělat snímek obrazovky (screenshot)?',
      q: ['Jak vyfotit obrazovku telefonu', 'Jak udělat screenshot SMS'],
      k: [['screenshot', 5], ['snimek obrazovk', 5], ['snimek displej', 5], ['vyfotit obrazovk', 5], ['vyfotit displej', 5], ['fotku obrazovk', 5], ['fotka obrazovk', 5], ['zachytit obrazovk', 5], ['obrazovk', 1], ['snimek', 2]],
      a: 'Snímek obrazovky je „fotka“ toho, co máte právě na displeji. Hodí se třeba na kontrolu podezřelé SMS v DIGI parťákovi.',
      steps: [
        'Android: stiskněte současně tlačítko zapnutí a tlačítko pro ztlumení hlasitosti (dolní) a hned je pusťte.',
        'iPhone bez tlačítka Plocha: stiskněte současně boční tlačítko a tlačítko pro zesílení hlasitosti (horní).',
        'iPhone s tlačítkem Plocha (kulaté dole): stiskněte současně tlačítko Plocha a boční (nebo horní) tlačítko.',
        'Obrazovka krátce blikne. Snímek najdete v Galerii (Android) nebo ve Fotkách (iPhone).'
      ],
      warn: 'Na některých telefonech s Androidem se kombinace tlačítek liší podle výrobce.',
      src: [SRC.google, SRC.apple], rel: ['jak-poznat-podvod'], action: { label: 'Návod krok za krokem', href: '#/navody' }
    },
    {
      id: 'plocha', cat: 'telefon', urgentLevel: 0,
      title: 'Jak si dát DIGI parťáka na plochu telefonu?',
      q: ['Jak si nainstalovat tuto aplikaci', 'Chci mít parťáka jako ikonu'],
      k: [['plochu', 3], ['plocha', 3], ['ikon', 2], ['nainstal', 1], ['partak', 2], ['digi', 2]],
      a: 'DIGI parťáka si můžete přidat na plochu jako běžnou aplikaci. Pak ho otevřete jedním klepnutím.',
      steps: [
        'Android (Chrome): klepněte vpravo nahoře na tři tečky → „Přidat na plochu“ nebo „Instalovat aplikaci“.',
        'iPhone (Safari): klepněte dole na ikonu Sdílet (čtvereček se šipkou) → „Přidat na plochu“.',
        'Potvrďte tlačítkem „Přidat“.'
      ],
      src: [SRC.google, SRC.apple], rel: [], action: { label: 'Návod krok za krokem', href: '#/navody/plocha' }
    },

    /* ===================== ČASTÉ OTÁZKY 60+ : SOCIÁLNÍ SÍTĚ A KOMUNIKACE ===================== */
    {
      id: 'facebook', cat: 'internet', urgentLevel: 0,
      title: 'Co je Facebook a jak ho začít používat?',
      q: ['Co je Facebook', 'Jak se přihlásit na Facebook', 'Jak si založit Facebook'],
      k: [['facebook', 4], ['fejsbuk', 4], ['fb', 2], ['messenger', 3], ['socialni sit', 3], ['zalozit', 1], ['prihlas', 1]],
      a: 'Facebook je sociální síť – místo na internetu, kde si lidé sdílejí fotky a novinky a posílají si zprávy (přes aplikaci Messenger). Používání je zdarma.',
      steps: [
        'Stáhněte si aplikaci Facebook z obchodu Google Play (Android) nebo App Store (iPhone), nebo napište do prohlížeče sami facebook.com.',
        'Nový účet: klepněte na „Vytvořit nový účet“ a vyplňte jméno, datum narození a svůj e-mail nebo telefon. Zvolte heslo.',
        'Přihlášení: zadejte e-mail nebo telefon a heslo a klepněte na „Přihlásit se“.',
        'V nastavení soukromí zvolte, že vaše příspěvky vidí jen „Přátelé“.',
        'Žádosti o přátelství přijímejte jen od lidí, které skutečně znáte.'
      ],
      warn: 'Na Facebooku se vyskytují falešné profily a reklamy na „zaručené výdělky“ se známými osobnostmi. Když vás někdo žádá o peníze, ověřte si to telefonátem.',
      src: [{ n: 'Nápověda Facebooku', u: 'https://www.facebook.com/help' }, SRC.nukib], rel: ['investice', 'laska-online', 'heslo']
    },
    {
      id: 'whatsapp-zacit', cat: 'internet', urgentLevel: 0,
      title: 'Co je WhatsApp a jak si ho nainstalovat?',
      q: ['Co je WhatsApp', 'Jak si stáhnout WhatsApp'],
      k: [['whatsapp', 3], ['watsap', 3], ['vocap', 3], ['co je whatsapp', 4], ['nainstal', 2], ['stahn', 2], ['zalozit', 1]],
      a: 'WhatsApp je aplikace na zprávy, fotky a hovory (i s obrazem) přes internet. Na Wi-Fi je zdarma i do zahraničí. Používá vaše telefonní číslo.',
      steps: [
        'Otevřete Obchod Google Play (Android) nebo App Store (iPhone) a vyhledejte „WhatsApp Messenger“.',
        'Zkontrolujte, že vývojář je „WhatsApp LLC“, a klepněte na Instalovat (Získat).',
        'Otevřete WhatsApp, odsouhlaste podmínky a zadejte své telefonní číslo.',
        'Přijde vám SMS s kódem – zadejte ho jen přímo do WhatsAppu.',
        'Napište své jméno. Vaše kontakty, které WhatsApp mají, se objeví samy.'
      ],
      warn: 'Ověřovací kód z WhatsAppu nikdy nikomu neposílejte – ani „kamarádovi“, který o něj píše. Tak podvodníci kradou účty.',
      src: [SRC.whatsapp], rel: ['whatsapp-fotka', 'whatsapp-video', 'vnoucatko']
    },
    {
      id: 'email', cat: 'internet', urgentLevel: 0,
      title: 'Jak si založit e-mail a poslat zprávu s přílohou?',
      q: ['Jak si založit e-mail', 'Jak poslat e-mail s fotkou'],
      k: [['email', 2], ['e mail', 2], ['mail', 2], ['poslat email', 4], ['poslat e mail', 4], ['napsat email', 4], ['napsat e mail', 4], ['posta seznam', 4], ['seznam', 2], ['gmail', 4], ['schranka', 1], ['priloh', 3], ['zalozit', 1], ['postu', 1]],
      a: 'E-mail je elektronická pošta. Nejpoužívanější v Česku jsou e-mail na Seznamu a Gmail od Googlu. Obojí je zdarma.',
      steps: [
        'Založení: na webu seznam.cz klepněte na „E-mail“ a „Zaregistrovat se“, nebo si založte účet Google (Gmail) – na Androidu ho obvykle už máte.',
        'Vymyslete si adresu (např. jana.novakova@seznam.cz) a bezpečné heslo. Obojí si zapište.',
        'Poslání: klepněte na „Napsat“, do pole „Komu“ zadejte adresu, napište předmět a text.',
        'Příloha (fotka): klepněte na ikonu sponky a vyberte fotku.',
        'Klepněte na „Odeslat“ (šipka).'
      ],
      warn: 'E-maily, které chtějí heslo, platbu nebo kliknutí na odkaz, bývají podvod. Když si nejste jistí, vložte je do „Je to podvod?“.',
      src: [{ n: 'Nápověda Seznam.cz', u: 'https://napoveda.seznam.cz' }, SRC.google], rel: ['heslo', 'zapomenute-heslo', 'jak-poznat-podvod']
    },
    {
      id: 'youtube', cat: 'internet', urgentLevel: 0,
      title: 'Co je YouTube a jak na něm hledat videa?',
      q: ['Co je YouTube', 'Jak si pustit písničku na YouTube'],
      k: [['youtube', 5], ['jutub', 5], ['video', 1], ['pisnick', 2], ['pisen', 2], ['film', 1], ['pustit', 1]],
      a: 'YouTube je web a aplikace s videi – písničky, pořady, recepty, návody. Je zdarma, jen se občas přehraje reklama.',
      steps: [
        'Otevřete aplikaci YouTube (bývá v telefonu předinstalovaná) nebo napište do prohlížeče youtube.com.',
        'Klepněte na lupu nahoře a napište, co hledáte (např. „Karel Gott“ nebo „bramboráky recept“).',
        'Klepněte na video. Reklamu můžete po pár sekundách přeskočit tlačítkem „Přeskočit“.',
        'Video zvětšíte na celou obrazovku otočením telefonu na šířku.'
      ],
      warn: 'Reklamy na rychlé zbohatnutí nebo zázračné léky jsou často podvod, i když v nich vystupují známé osobnosti.',
      src: [{ n: 'Nápověda YouTube', u: 'https://support.google.com/youtube' }], rel: ['investice']
    },
    /* ===================== ČASTÉ OTÁZKY 60+ : TELEFON ===================== */
    {
      id: 'aplikace-instalace', cat: 'telefon', urgentLevel: 0,
      title: 'Jak bezpečně nainstalovat aplikaci?',
      q: ['Jak si stáhnout aplikaci', 'Jak nainstalovat aplikaci do telefonu'],
      k: [['nainstal', 3], ['stahn', 2], ['stahl', 1], ['aplikac', 2], ['appk', 2], ['google play', 4], ['obchod play', 4], ['app store', 4], ['appstore', 4], ['odinstal', 3], ['smazat aplikac', 4]],
      a: 'Aplikace stahujte jen z oficiálního obchodu: Google Play na Androidu, App Store na iPhonu. Většina aplikací je zdarma.',
      steps: [
        'Otevřete Obchod Google Play (barevný trojúhelník) nebo App Store (modré „A“).',
        'Nahoře klepněte na hledání a napište název aplikace.',
        'Zkontrolujte jméno vývojáře (např. u bankovní aplikace vaše banka) a hodnocení.',
        'Klepněte na „Instalovat“ (Android) nebo „Získat“ (iPhone) a počkejte.',
        'Odinstalování: podržte prst na ikoně aplikace a zvolte „Odinstalovat“ / „Odstranit aplikaci“.'
      ],
      warn: 'Nikdy neinstalujte aplikaci podle pokynů neznámého volajícího nebo z odkazu v SMS.',
      src: [SRC.google, SRC.apple], rel: ['vzdalena-plocha', 'plocha']
    },
    {
      id: 'zapomenute-heslo', cat: 'telefon', urgentLevel: 0,
      title: 'Zapomněl/a jsem heslo – co teď?',
      q: ['Zapomněla jsem heslo k e-mailu', 'Nevím heslo'],
      k: [['zapomn', 3], ['nevim heslo', 5], ['neznam heslo', 5], ['obnovit heslo', 5], ['obnov', 1], ['heslo', 1], ['hesla', 1], ['nejde prihlasit', 3], ['nemuzu se prihlasit', 4]],
      a: 'Zapomenuté heslo jde skoro vždy obnovit. Služba vám pošle kód na telefon nebo do e-mailu a vy si nastavíte nové heslo.',
      steps: [
        'Na přihlašovací stránce klepněte na „Zapomenuté heslo?“.',
        'Zadejte svůj e-mail nebo telefon. Přijde vám SMS nebo e-mail s kódem či odkazem.',
        'Kód zadejte jen na té stránce, kde jste obnovu sami začali.',
        'Vymyslete nové heslo a zapište si ho do sešitu, který zůstane doma.',
        'U internetového bankovnictví volejte svou banku na číslo ze zadní strany karty.'
      ],
      warn: 'Když vám přijde kód k obnově hesla, o který jste nežádali, nikomu ho neposílejte – někdo se možná snaží dostat do vašeho účtu.',
      src: [SRC.google, SRC.apple, SRC.nukib], rel: ['heslo']
    },
    {
      id: 'baterie', cat: 'telefon', urgentLevel: 0,
      title: 'Telefon se rychle vybíjí – co s tím?',
      q: ['Baterie mi rychle dochází', 'Telefon se vybíjí'],
      k: [['bateri', 4], ['vybij', 4], ['nabij', 3], ['nabijec', 3], ['dochazi', 2], ['usporn', 3], ['nevydrz', 3]],
      a: 'Nejvíc energie spotřebuje jasný displej, navigace, videa a aplikace běžící na pozadí. Pár úprav výdrž výrazně prodlouží.',
      steps: [
        'Snižte jas displeje (stáhněte lištu shora a posuňte jezdec se sluníčkem).',
        'Zapněte úsporný režim: Android – Nastavení → Baterie → Úspora energie; iPhone – Nastavení → Baterie → Režim nízké spotřeby.',
        'Zavřete aplikace, které nepoužíváte, a vypněte polohu (GPS), když ji nepotřebujete.',
        'Nabíjejte originální nebo kvalitní nabíječkou. Nemusíte čekat, až se telefon úplně vybije.',
        'Pokud je telefon starý několik let a vybíjí se i tak rychle, může pomoct výměna baterie v servisu.'
      ],
      src: [SRC.google, SRC.apple], rel: ['pomaly-telefon']
    },
    {
      id: 'pamet', cat: 'telefon', urgentLevel: 0,
      title: 'Telefon hlásí plnou paměť – jak uvolnit místo?',
      q: ['Mám plnou paměť', 'Nedostatek místa v telefonu'],
      k: [['pamet', 4], ['uloziste', 4], ['malo mista', 5], ['nedostatek mist', 5], ['plna', 2], ['plny', 2], ['uvolnit', 3], ['misto', 1]],
      a: 'Místo v telefonu nejčastěji zabírají videa, fotky a soubory z WhatsAppu. Než je smažete, zálohujte si je.',
      steps: [
        'Podívejte se, co zabírá místo: Android – Nastavení → Úložiště (nebo Péče o zařízení); iPhone – Nastavení → Obecné → Úložiště iPhonu.',
        'Zálohujte fotky (Google Fotky nebo iCloud) a pak smažte velká videa.',
        'Ve WhatsAppu: Nastavení → Úložiště a data → Spravovat úložiště – smažte velké soubory a přeposlaná videa.',
        'Odinstalujte aplikace, které nepoužíváte.',
        'Na konci vysypte koš ve Fotkách („Nedávno smazané“).'
      ],
      src: [SRC.google, SRC.apple, SRC.whatsapp], rel: ['zaloha-fotek', 'aplikace-instalace']
    },
    {
      id: 'pomaly-telefon', cat: 'telefon', urgentLevel: 0,
      title: 'Telefon je pomalý nebo zamrzá',
      q: ['Telefon se seká', 'Mobil je pomalý'],
      k: [['pomal', 4], ['seka', 4], ['zamrz', 4], ['zasek', 4], ['nereaguj', 4], ['nejde', 1], ['restart', 3], ['vypnout a zapnout', 4]],
      a: 'Nejčastěji pomůže obyčejný restart. Telefon si tím „uklidí“ paměť.',
      steps: [
        'Restartujte telefon: podržte tlačítko zapnutí a zvolte „Restartovat“ (na iPhonu vypnout a znovu zapnout).',
        'Pokud telefon vůbec nereaguje, podržte tlačítko zapnutí déle (asi 10–15 sekund).',
        'Nainstalujte aktualizace systému a aplikací.',
        'Uvolněte místo v paměti – plná paměť telefon zpomaluje.',
        'Když nic nepomůže, poraďte se v prodejně nebo servisu vašeho operátora.'
      ],
      src: [SRC.google, SRC.apple], rel: ['pamet', 'aktualizace']
    },
    {
      id: 'hlasitost', cat: 'telefon', urgentLevel: 0,
      title: 'Neslyším zvonění – jak zesílit telefon?',
      q: ['Neslyším, když mi někdo volá', 'Jak zesílit vyzvánění'],
      k: [['neslys', 4], ['zesil', 4], ['hlasit', 4], ['zvoneni', 4], ['vyzvan', 4], ['tichy rezim', 4], ['ztlum', 2], ['nezvoni', 4], ['vibrac', 2], ['potichu', 3]],
      a: 'Hlasitost vyzvánění nastavíte tlačítky na boku telefonu nebo v Nastavení. Zkontrolujte také, že telefon není v tichém režimu.',
      steps: [
        'Stiskněte horní tlačítko hlasitosti na boku telefonu, když nehraje žádné video.',
        'Android: Nastavení → Zvuk a vibrace (Zvuky) → Hlasitost → posuňte „Vyzváněcí tón“ doprava.',
        'iPhone: Nastavení → Zvuky a haptika → posuňte jezdec „Vyzvánění a upozornění“. Na boku zkontrolujte přepínač tichého režimu (oranžová barva = ticho).',
        'Vypněte režim „Nerušit“ (ikona měsíce v horní liště).',
        'Zapněte i vibrace, ať zvonění ucítíte v kapse.'
      ],
      src: [SRC.google, SRC.apple], rel: ['pismo']
    },
    {
      id: 'blokovani', cat: 'telefon', urgentLevel: 0,
      title: 'Jak zablokovat otravné číslo?',
      q: ['Pořád mi volá neznámé číslo', 'Jak zablokovat číslo'],
      k: [['zablok', 3], ['blokov', 3], ['otravn', 4], ['obtez', 4], ['spam', 2], ['nezname cislo', 4], ['porad mi vola', 4], ['telemarket', 4], ['nabizi', 2]],
      a: 'Číslo, které vás obtěžuje, můžete v telefonu zablokovat. Pak vám z něj nikdo nedovolá ani nenapíše.',
      steps: [
        'Android: otevřete aplikaci Telefon → Nedávné, podržte prst na čísle a zvolte „Blokovat“ (případně „Nahlásit spam“).',
        'iPhone: otevřete Telefon → Nedávné, klepněte na „i“ vedle čísla a pak na „Zablokovat volajícího“.',
        'U SMS: otevřete zprávu, klepněte na číslo nahoře a zvolte Blokovat.',
        'Neznámá čísla nemusíte zvedat. Kdo vás potřebuje, nechá vzkaz nebo napíše.'
      ],
      warn: 'Pokud volající tvrdí, že je z banky nebo policie, zavěste a zavolejte sami na oficiální číslo.',
      src: [SRC.google, SRC.apple], rel: ['banka-vola', 'falesny-policista']
    },
    {
      id: 'kontakt', cat: 'telefon', urgentLevel: 0,
      title: 'Jak si uložit telefonní číslo do kontaktů?',
      q: ['Jak uložit číslo', 'Jak přidat kontakt'],
      k: [['ulozit cislo', 5], ['uloz', 2], ['kontakt', 3], ['adresar', 3], ['pridat cislo', 5], ['seznam cisel', 4]],
      a: 'Číslo uložíte jednoduše z aplikace Telefon nebo Kontakty. Pak u hovoru uvidíte jméno místo čísla.',
      steps: [
        'Otevřete aplikaci Telefon → Nedávné a klepněte na číslo, které chcete uložit.',
        'Zvolte „Vytvořit nový kontakt“ nebo „Přidat kontakt“ (na iPhonu „i“ → Vytvořit nový kontakt).',
        'Napište jméno a příjmení, případně přidejte fotku.',
        'Klepněte na „Uložit“ (Hotovo).',
        'Nové číslo můžete přidat i v aplikaci Kontakty tlačítkem „+“.'
      ],
      src: [SRC.google, SRC.apple], rel: ['blokovani', 'nouzove-info']
    },
    {
      id: 'nouzove-info', cat: 'pomoc', urgentLevel: 0,
      title: 'Jak si do telefonu nastavit zdravotní údaje a nouzový kontakt?',
      q: ['Nouzový kontakt v telefonu', 'Zdravotní ID'],
      k: [['nouzov', 4], ['zdravotni id', 5], ['zdravotni udaj', 5], ['ice', 3], ['krevni skupin', 4], ['alergi', 2], ['v pripade nouze', 5], ['sos', 2]],
      a: 'Do telefonu si můžete uložit zdravotní údaje a nouzový kontakt. Záchranáři je uvidí i na zamčeném telefonu.',
      steps: [
        'iPhone: otevřete aplikaci Zdraví → vaše fotka vpravo nahoře → Zdravotní ID → Upravit. Vyplňte údaje a zapněte „Zobrazit při zamknutí“.',
        'Android: Nastavení → Bezpečnost a nouzové situace (nebo Nouzové informace). Přesný název se liší podle výrobce.',
        'Přidejte nouzový kontakt – někoho blízkého.',
        'Uveďte důležité nemoci, alergie a léky, které berete.'
      ],
      src: [SRC.apple, SRC.google], rel: ['cisla', 'kontakt']
    },
    {
      id: 'ztraceny-telefon', cat: 'telefon', urgentLevel: 1,
      title: 'Ztratil/a jsem telefon – jak ho najít?',
      q: ['Ztratila jsem mobil', 'Ukradli mi telefon'],
      k: [['ztratil', 3], ['ztrat', 2], ['nemuzu najit', 4], ['nemohu najit', 4], ['najit telefon', 5], ['najit mobil', 5], ['ukradl', 3], ['kradez', 3]],
      a: 'Telefon můžete najít, zamknout nebo na dálku rozezvonit z počítače nebo z telefonu někoho blízkého.',
      steps: [
        'Android: na jiném zařízení otevřete stránku android.com/find a přihlaste se svým účtem Google.',
        'iPhone: otevřete stránku icloud.com/find a přihlaste se svým Apple ID (nebo použijte aplikaci Najít na jiném zařízení Apple).',
        'Telefon můžete rozezvonit, zobrazit na mapě nebo zamknout.',
        'Při krádeži volejte svého operátora (zablokování SIM), banku (pokud máte v telefonu bankovnictví) a Policii ČR na 158.'
      ],
      src: [SRC.google, SRC.apple], rel: ['uz-jsem-zadal']
    },
    {
      id: 'zaloha-fotek', cat: 'telefon', urgentLevel: 0,
      title: 'Jak si zálohovat fotky, abych o ně nepřišel/a?',
      q: ['Jak si uložit fotky', 'Záloha fotek'],
      k: [['zaloh', 4], ['zalohov', 4], ['neprisel o fotk', 5], ['google fotk', 5], ['icloud', 4], ['cloud', 3], ['fotk', 1]],
      a: 'Zálohované fotky se automaticky ukládají i mimo telefon. Když telefon ztratíte nebo rozbijete, fotky vám zůstanou.',
      steps: [
        'Android: otevřete aplikaci Google Fotky → vaše ikona vpravo nahoře → zapněte „Zálohování“.',
        'iPhone: Nastavení → vaše jméno nahoře → iCloud → Fotky → zapněte „Synchronizovat tento iPhone“.',
        'Zálohování probíhá nejlépe na Wi-Fi a při nabíjení.',
        'Zdarma je jen omezené místo. Když dojde, služba nabídne placené rozšíření – nemusíte ho kupovat, můžete smazat nepotřebné.'
      ],
      src: [SRC.google, SRC.apple], rel: ['pamet', 'whatsapp-fotka']
    },
    {
      id: 'mobilni-data', cat: 'telefon', urgentLevel: 0,
      title: 'Co jsou mobilní data a kdy je zapnout?',
      q: ['Co jsou data', 'Jak zapnout internet v mobilu venku'],
      k: [['mobilni data', 5], ['data', 2], ['internet venku', 5], ['bez wifi', 4], ['tarif', 2], ['roaming', 4], ['zahranici', 1]],
      a: 'Mobilní data jsou internet od vašeho operátora. Fungují i venku, kde není Wi-Fi. Kolik dat máte, záleží na tarifu.',
      steps: [
        'Zapnutí: stáhněte prstem lištu z horního okraje a klepněte na ikonu „Mobilní data“ (dvě šipky).',
        'Doma a u blízkých používejte raději Wi-Fi – nespotřebovává vaše data.',
        'V zahraničí mimo EU vypněte data nebo roaming, ať vám nepřijde vysoký účet. V EU platíte jako doma.',
        'Kolik dat vám zbývá, zjistíte v aplikaci svého operátora.'
      ],
      src: [SRC.google, SRC.apple], rel: ['wifi']
    },
    {
      id: 'qr-kod', cat: 'penize', urgentLevel: 0,
      title: 'Jak naskenovat QR kód?',
      q: ['Co je QR kód', 'Jak zaplatit QR kódem'],
      k: [['qr', 5], ['kr kod', 5], ['ctverecek', 3], ['naskenov', 4], ['skenov', 4]],
      a: 'QR kód je čtvereček z teček, který obsahuje odkaz nebo platební údaje. Přečtete ho fotoaparátem telefonu.',
      steps: [
        'Otevřete Fotoaparát a namiřte ho na QR kód (nic nefoťte).',
        'Objeví se odkaz – klepněte na něj.',
        'QR platba (např. na složence): otevřete aplikaci své banky a zvolte „Platba QR kódem“. Údaje se vyplní samy, zkontrolujte částku a příjemce.'
      ],
      warn: 'QR kódy v e-mailech, SMS nebo nalepené na parkovacích automatech mohou vést na podvodné stránky. Platby dělejte jen v aplikaci své banky.',
      src: [SRC.cba, SRC.nukib], rel: ['internetove-bankovnictvi', 'jak-poznat-podvod']
    },
    /* ===================== ČASTÉ OTÁZKY 60+ : PENÍZE A BANKA ===================== */
    {
      id: 'pin-karty', cat: 'penize', urgentLevel: 0,
      title: 'Jak si změnit PIN ke kartě?',
      q: ['Jak změnit PIN karty', 'Zapomněla jsem PIN ke kartě'],
      k: [['pin', 2], ['zmen', 2], ['kart', 1], ['zapomenuty pin', 5], ['zapomnel', 1], ['nevim pin', 5], ['pin kart', 3], ['pin ke kart', 4]],
      a: 'PIN ke kartě si změníte v aplikaci své banky, v internetovém bankovnictví, na pobočce nebo u některých bankomatů vaší banky.',
      steps: [
        'Otevřete aplikaci své banky a hledejte u karty „Změnit PIN“ nebo „Zobrazit PIN“.',
        'Bez aplikace zajděte na pobočku banky s občanským průkazem.',
        'Nový PIN volte tak, aby nebyl datum narození ani 1234.',
        'PIN si nepište ke kartě ani do telefonu.'
      ],
      warn: 'Banka po vás PIN nikdy nechce – ani telefonem, ani v SMS, ani e-mailem. Kdo o něj žádá, je podvodník.',
      src: [SRC.cba], rel: ['banka-vola', 'internetove-bankovnictvi']
    },
    {
      id: 'internetove-bankovnictvi', cat: 'penize', urgentLevel: 0,
      title: 'Jak začít s internetovým bankovnictvím bezpečně?',
      q: ['Jak si zřídit bankovnictví v mobilu', 'Je bezpečné platit přes telefon'],
      k: [['internetove bankov', 5], ['bankovnictvi', 4], ['bankovni aplikac', 5], ['aplikace banky', 5], ['mobilni bank', 5], ['platit pres telefon', 4], ['zaplatit slozenk', 4], ['slozenk', 3], ['prikaz', 2]],
      a: 'Internetové bankovnictví vám zřídí ve vaší bance – nejjistěji osobně na pobočce, kde vám rovnou pomohou s nastavením.',
      steps: [
        'Zajděte na pobočku a požádejte o internetové a mobilní bankovnictví. Řekněte, že s tím začínáte.',
        'Aplikaci banky si stáhněte jen z Google Play nebo App Store (vydavatel musí být vaše banka).',
        'Do bankovnictví se přihlašujte jen přes tuto aplikaci nebo adresu, kterou napíšete sami. Nikdy přes odkaz ze zprávy.',
        'Platbu složenky udělejte přes „Platba QR kódem“ nebo „Nová platba“. Před potvrzením zkontrolujte číslo účtu a částku.'
      ],
      warn: 'Přihlašovací údaje a potvrzovací kódy nikomu nesdělujte. Banka vás nikdy nevyzve k převodu na „bezpečný účet“.',
      src: [SRC.cba], rel: ['banka-vola', 'pin-karty', 'qr-kod']
    },
    {
      id: 'platba-telefonem', cat: 'penize', urgentLevel: 0,
      title: 'Jak platit telefonem místo kartou?',
      q: ['Jak platit mobilem v obchodě', 'Apple Pay Google Pay'],
      k: [['platit telefon', 5], ['platit mobil', 5], ['platba telefon', 5], ['platba mobil', 5], ['apple pay', 5], ['google pay', 5], ['google wallet', 5], ['penezenk', 3], ['prilozit telefon', 4]],
      a: 'Platební kartu si můžete nahrát do telefonu a platit přiložením telefonu k terminálu, stejně jako kartou.',
      steps: [
        'Otevřete aplikaci své banky a hledejte u karty „Přidat do Google Wallet“ nebo „Přidat do Apple Wallet“.',
        'Potvrďte přidání podle pokynů banky.',
        'Při placení odemkněte telefon a přiložte ho k terminálu.',
        'Telefon mějte zamčený kódem nebo otiskem prstu.'
      ],
      src: [SRC.cba, SRC.google, SRC.apple], rel: ['internetove-bankovnictvi']
    },
    /* ===================== ČASTÉ OTÁZKY 60+ : INTERNET ===================== */
    {
      id: 'hoax', cat: 'internet', urgentLevel: 0,
      title: 'Jak poznat hoax a falešnou zprávu?',
      q: ['Přišel mi řetězový e-mail', 'Je tahle zpráva pravdivá'],
      k: [['hoax', 5], ['fake', 3], ['dezinform', 5], ['retezov', 5], ['posli dal', 5], ['preposli', 3], ['pravdiv', 3], ['lez', 2], ['konspir', 4], ['falesna zprav', 5]],
      a: 'Hoax je poplašná nebo vymyšlená zpráva, která se šíří přeposíláním. Často straší, rozčiluje nebo slibuje zázraky.',
      steps: [
        'Zbystřete, když zpráva vyzývá „pošli dál všem“ nebo hodně straší a pobuřuje.',
        'Hledejte zdroj: kdo to napsal a kde to vyšlo? Seriózní zprávy mají autora a datum.',
        'Ověřte si to u důvěryhodného média (Česká televize, Český rozhlas) nebo na webech Manipulátoři.cz a Demagog.cz.',
        'Když si nejste jistí, zprávu nepřeposílejte.'
      ],
      src: [{ n: 'Manipulátoři.cz', u: 'https://manipulatori.cz' }, { n: 'Demagog.cz', u: 'https://demagog.cz' }], rel: ['jak-poznat-podvod']
    },
    {
      id: 'cookies', cat: 'internet', urgentLevel: 0,
      title: 'Co mám dělat s lištou „cookies“ na webu?',
      q: ['Co jsou cookies', 'Na webu vyskočilo souhlas s cookies'],
      k: [['cookie', 5], ['kuki', 5], ['souhlas', 2], ['vyskocil', 2], ['prijmout vse', 4], ['odmitnout', 2]],
      a: 'Cookies jsou malé soubory, kterými si web pamatuje, co děláte. Lišta se ptá, jestli smí sledovat vaše chování kvůli reklamě.',
      steps: [
        'Klidně zvolte „Odmítnout vše“ nebo „Pouze nezbytné“. Web bude fungovat dál.',
        'Pokud takové tlačítko nevidíte, klepněte na „Nastavení“ a nechte zapnuté jen „Nezbytné“.',
        'Lištu nemusíte řešit pokaždé – web si vaši volbu zapamatuje.'
      ],
      src: [{ n: 'Úřad pro ochranu osobních údajů', u: 'https://uoou.gov.cz' }], rel: ['vir-hlaska']
    },
    {
      id: 'vir-hlaska', cat: 'bezpeci', urgentLevel: 1,
      title: 'Na webu vyskočilo, že mám v telefonu virus',
      q: ['Telefon píše, že je zavirovaný', 'Vyskočilo okno s virem'],
      k: [['vir', 3], ['zavirov', 5], ['infikov', 4], ['napaden', 2], ['vyskoci', 3], ['okno', 1], ['hacknut', 4], ['vycistit', 3], ['antivir', 4]],
      a: 'Hlášky na webových stránkách typu „Váš telefon je zavirovaný!“ jsou téměř vždy podvod. Chtějí vás vystrašit, abyste něco nainstalovali nebo zaplatili.',
      steps: [
        'Na nic v okně neklikejte a nevolejte na číslo, které se zobrazí.',
        'Zavřete kartu nebo celý prohlížeč. Případně telefon restartujte.',
        'Nic neinstalujte a nic neplaťte.',
        'Pokud jste už něco nainstalovali nebo zadali kartu, volejte banku a požádejte o pomoc blízkého.'
      ],
      src: [SRC.nukib], rel: ['vzdalena-plocha', 'uz-jsem-zadal']
    },
    {
      id: 'mapy', cat: 'internet', urgentLevel: 0,
      title: 'Jak najít cestu a spojení v telefonu?',
      q: ['Jak si najít cestu', 'Jak zjistit, kdy jede autobus'],
      k: [['mapy', 4], ['mapa', 4], ['navigac', 4], ['najit cest', 4], ['najit adres', 4], ['cesta', 2], ['cestu', 2], ['spojeni', 4], ['jizdni rad', 5], ['autobus', 3], ['vlak', 3], ['tramvaj', 3], ['idos', 5], ['jizdenk', 4], ['jizdenku', 4]],
      a: 'Cestu i spojení najdete v aplikacích Mapy.com (dříve Mapy.cz) nebo Google Mapy. Jízdní řády jsou na webu IDOS.',
      steps: [
        'Otevřete aplikaci Mapy.com nebo Google Mapy a do hledání napište, kam chcete jít.',
        'Klepněte na „Trasa“ a zvolte, jestli jdete pěšky, jedete autem nebo hromadnou dopravou.',
        'Spojení autobusem a vlakem najdete na webu idos.cz – zadejte odkud, kam a kdy.',
        'Jízdenku na vlak si koupíte v aplikaci Můj vlak (České dráhy) nebo u pokladny. Na senior slevy se zeptejte na pokladně.'
      ],
      src: [{ n: 'IDOS – jízdní řády', u: 'https://idos.cz' }, { n: 'Mapy.com', u: 'https://mapy.com' }], rel: ['mobilni-data']
    },
    {
      id: 'objednat-lekar', cat: 'urady', urgentLevel: 0,
      title: 'Jak se objednat k lékaři přes internet?',
      q: ['Jak se objednat k doktorovi online', 'Objednání k lékaři'],
      k: [['objednat', 3], ['objednani', 3], ['k lekari', 4], ['k doktor', 4], ['ordinac', 3], ['termin', 2], ['sestricka', 2]],
      a: 'Mnoho ordinací nabízí objednání přes internet nebo e-mail. Každá ale používá jiný systém, proto se nejdřív zeptejte v ordinaci.',
      steps: [
        'Zeptejte se sestřičky, jestli se můžete objednávat online a na jaké adrese.',
        'Adresu nebo aplikaci si nechte napsat na papír a do prohlížeče ji pište sami.',
        'Vyberte termín a potvrďte ho. Obvykle vám přijde potvrzení e-mailem nebo SMS.',
        'Když vám online objednání nevyhovuje, telefon do ordinace je stále v pořádku.'
      ],
      warn: 'Na otázky ke zdraví a lékům vám odpoví lékař nebo lékárník.',
      src: [SRC.sukl], rel: ['erecept']
    },
    /* ===================== ÚŘADY A ZDRAVÍ (jen digitální stránka) ===================== */
    {
      id: 'erecept', cat: 'urady', urgentLevel: 0,
      title: 'Jak funguje eRecept?',
      q: ['Jak vyzvednout eRecept', 'Lékař mi poslal SMS s receptem'],
      k: [['erecept', 5], ['e recept', 5], ['recept', 4], ['lekarn', 3], ['vyzved', 2]],
      a: 'eRecept je elektronický recept. Lékař vám ho pošle v SMS nebo e-mailem, případně vytiskne.',
      steps: [
        'Počkejte na SMS nebo e-mail od lékaře s kódem receptu.',
        'V lékárně ukažte zprávu s kódem (nebo vytištěný papír).',
        'Lékárník kód načte a vydá vám lék.',
        'Kód můžete poslat i blízkému, který lék vyzvedne za vás.'
      ],
      warn: 'Na otázky k lékům, dávkování a zdraví odpovídá lékař nebo lékárník, ne DIGI parťák.',
      src: [SRC.sukl], rel: [], action: { label: 'Návod krok za krokem', href: '#/navody/erecept' }
    },
    {
      id: 'identita', cat: 'urady', urgentLevel: 0,
      title: 'Jak vyřídit věci s úřady přes internet?',
      q: ['Co je Portál občana', 'Co je bankovní identita'],
      k: [['urad', 3], ['portal obcan', 5], ['identit', 4], ['datov', 3], ['obcan', 2], ['bankovni identit', 5], ['elektronick', 1]],
      a: 'Mnoho věcí s úřady vyřídíte na Portálu občana. Přihlásíte se například bankovní identitou – stejně jako do internetového bankovnictví.',
      steps: [
        'Adresu Portálu občana napište do prohlížeče sami: obcan.portal.gov.cz.',
        'Zvolte přihlášení přes svou banku (bankovní identita) nebo jinou nabízenou možnost.',
        'Pokud si nejste jistí, požádejte o pomoc blízkého nebo pracovníka Czech POINTu na poště či úřadě.'
      ],
      warn: 'Odkazy na „úřad“ v SMS nebo e-mailu nepoužívejte – adresu vždy pište sami.',
      src: [SRC.obcan], rel: ['jak-poznat-podvod']
    },

    /* ===================== POMOC A PODPORA ===================== */
    {
      id: 'cisla', cat: 'pomoc', urgentLevel: 0,
      title: 'Jaká jsou důležitá telefonní čísla?',
      q: ['Číslo na záchranku', 'Na koho se obrátit'],
      k: [['cisl', 2], ['tisnov', 4], ['zachrank', 4], ['hasic', 4], ['112', 5], ['155', 5], ['158', 5], ['150', 5], ['linka', 2], ['kontakt', 1]],
      a: 'Tady jsou nejdůležitější čísla. Na každé můžete klepnout a rovnou zavolat.',
      steps: [],
      src: [SRC.zachranka, SRC.zivot90], rel: [], phones: ['112', '155', '158', '150', 'senior'], action: { label: 'Všechna čísla pomoci', href: '#/pomoc' }
    },
    {
      id: 'samota', cat: 'pomoc', urgentLevel: 1,
      title: 'Je mi smutno a cítím se sám/sama',
      q: ['Cítím se osamělá', 'Nemám si s kým promluvit'],
      k: [['smutn', 4], ['osamel', 5], ['sam ', 2], ['sama', 2], ['samot', 4], ['nikoho nemam', 5], ['promluv', 3], ['popovid', 3], ['opusten', 4], ['stesk', 3]],
      a: 'To je mi líto. Takové pocity jsou úplně v pořádku a nemusíte na ně být sami. Na těchto bezplatných linkách vás rádi vyslechnou.',
      steps: [],
      src: [SRC.zivot90, SRC.elpida], rel: [], phones: ['senior', 'elpida', 'psych']
    },
    {
      id: 'krize', cat: 'pomoc', urgentLevel: 3, urgent: true,
      title: 'Je mi opravdu zle a nevím si rady',
      q: ['Nechci už žít'],
      k: [['nechci zit', 9], ['nechci uz zit', 9], ['zabit se', 9], ['sebevrazd', 9], ['ublizit si', 9], ['skoncit se zivot', 9], ['nema to smysl', 6]],
      a: 'Je mi moc líto, že se takhle cítíte. Prosím, promluvte si s někým hned teď. Jste důležití.',
      steps: ['Zavolejte na Linku první psychické pomoci 116 123 – bezplatně a nonstop.', 'Pokud jste v ohrožení, volejte 112 nebo 155.', 'Můžete zavolat i někomu blízkému a požádat ho, aby přišel.'],
      src: [SRC.zachranka], rel: [], phones: ['psych', '112', '155']
    },
    {
      id: 'zdravi-nouze', cat: 'pomoc', urgentLevel: 3, urgent: true,
      title: 'Zdravotní potíže – volejte pomoc',
      q: ['Bolí mě na hrudi'],
      k: [['bolest na hrud', 9], ['boli me na hrud', 9], ['nemuzu dychat', 9], ['nemohu dychat', 9], ['upadl', 3], ['krvac', 3], ['nemuze vstat', 6], ['nemuzu vstat', 6], ['nemohu vstat', 6], ['infarkt', 9], ['mrtvic', 9], ['bezvedom', 9], ['omdlel', 8]],
      a: 'Tohle může být vážné. Prosím, hned volejte záchrannou službu 155 nebo tísňovou linku 112.',
      steps: ['Zavolejte 155 nebo 112.', 'Řekněte, kde jste a co se děje.', 'Pokud je to možné, odemkněte dveře a zavolejte souseda nebo blízkého.'],
      src: [SRC.zachranka], rel: [], phones: ['155', '112']
    },

    /* ===================== MIMO ROZSAH (zdvořilé odmítnutí) ===================== */
    {
      id: 'mimo-zdravi', cat: 'mimo', urgentLevel: 0,
      title: 'Otázky ke zdraví a lékům',
      q: ['Kolik prášků mám brát', 'Můžu kombinovat léky'],
      k: [['davkov', 5], ['kolik prask', 5], ['kolik tablet', 5], ['kolik leku', 5], ['muzu brat', 4], ['mohu brat', 4], ['kombinov', 3], ['lek na', 4], ['predepsa', 2], ['diagnoz', 4], ['vysadit', 4], ['vedlejsi ucin', 4], ['prask', 2], ['tablet', 1]],
      a: 'Na otázky ke zdraví a lékům vám bezpečně odpoví jen lékař nebo lékárník. Nechci vám dát nepřesnou radu.',
      steps: ['Zavolejte svému praktickému lékaři.', 'Zeptejte se v lékárně – lékárníci rádi poradí zdarma.', 'Při náhlých potížích volejte 155.'],
      src: [], rel: ['erecept'], phones: ['155']
    },
    {
      id: 'mimo-finance', cat: 'mimo', urgentLevel: 0,
      title: 'Finanční a právní rady',
      q: ['Do čeho mám investovat', 'Mám si vzít půjčku'],
      k: [['pujck', 4], ['uver', 4], ['hypotek', 4], ['duchod', 2], ['dedictv', 4], ['zavet', 4], ['pravnik', 4], ['smlouv', 2], ['zalob', 4], ['do ceho', 3]],
      a: 'Finanční a právní rady neposkytuji – mohl bych vám nechtěně uškodit. Obraťte se prosím na odborníka.',
      steps: ['O penězích se poraďte osobně ve své bance.', 'S právními otázkami pomáhají bezplatné poradny, např. přes Senior telefon.', 'Pokud vás někdo na smlouvu tlačí a spěchá, nic nepodepisujte.'],
      src: [SRC.zivot90], rel: ['investice'], phones: ['senior']
    },

    /* ===================== KONVERZACE ===================== */
    {
      id: 'pozdrav', cat: 'konverzace', urgentLevel: 0,
      title: 'Pozdrav',
      q: ['Dobrý den'],
      k: [['dobry den', 4], ['ahoj', 4], ['zdravim', 4], ['dobre rano', 4], ['dobry vecer', 4], ['nazdar', 4], ['cau', 3]],
      a: 'Dobrý den, rád vás vidím! Jsem DIGI parťák. Pomůžu vám s telefonem, internetem a bezpečím online. Na co se chcete zeptat?',
      steps: [], src: [], rel: ['jak-poznat-podvod', 'pismo', 'whatsapp-fotka']
    },
    {
      id: 'dekuji', cat: 'konverzace', urgentLevel: 0,
      title: 'Poděkování',
      q: ['Děkuji'],
      k: [['dekuj', 4], ['diky', 4], ['dik', 3], ['super', 2], ['pomohl', 3]],
      a: 'Rádo se stalo! Kdykoli budete chtít, jsem tu. Žádná otázka není hloupá.',
      steps: [], src: [], rel: []
    },
    {
      id: 'kdo-jsi', cat: 'konverzace', urgentLevel: 0,
      title: 'Kdo je DIGI parťák?',
      q: ['Kdo jsi', 'Jsi robot?', 'Co umíš'],
      k: [['kdo jsi', 5], ['co umis', 5], ['robot', 4], ['umela inteligen', 4], [' ai ', 3], ['clovek', 2], ['co jsi', 5]],
      a: 'Jsem DIGI parťák – digitální pomocník, ne člověk. Nejdřív odpovídám z knihovny ověřených rad. Když tam odpověď není, zkusím poradit pomocí umělé inteligence a vždy vás upozorním, že si to máte ověřit.',
      steps: ['Umím poradit s telefonem a aplikacemi.', 'Pomůžu poznat podvodné zprávy a hovory.', 'Ukážu vám, kam zavolat pro pomoc.'],
      src: [], rel: ['jak-poznat-podvod', 'pismo']
    }
  ];

  window.DP = window.DP || {};
  window.DP.KB = KB;
  window.DP.PHONES = PHONES;
  window.DP.KB_REVIEWED = 'Koncept 11/2026 – před spuštěním nechat zkontrolovat odborníkem';
  window.DP.CATS = {
    bezpeci: { label: 'Bezpečí online', icon: 'shield', tone: 'sky' },
    telefon: { label: 'Telefon a aplikace', icon: 'smartphone', tone: 'lavender' },
    internet: { label: 'Internet, zprávy a sítě', icon: 'users', tone: 'sky' },
    penize: { label: 'Banka a placení', icon: 'bank', tone: 'lime' },
    urady: { label: 'Úřady a lékař', icon: 'pill', tone: 'cream' },
    pomoc: { label: 'Pomoc a podpora', icon: 'heart', tone: 'lavender' }
  };
})();
