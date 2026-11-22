/* DIGI parťák – návody krok za krokem. Jeden krok = jedna obrazovka. */
(function () {
  'use strict';
  const GUIDES = [
    {
      id: 'pismo', icon: 'text', tone: 'lavender', minutes: 2,
      title: 'Zvětšit písmo v telefonu',
      intro: 'Větší písmo se lépe čte a šetří oči. Nic se tím nepokazí – kdykoli to můžete vrátit.',
      steps: [
        { t: 'Otevřete Nastavení', p: 'Najděte na ploše ikonu ozubeného kolečka s nápisem „Nastavení“ a klepněte na ni.' },
        { t: 'Najděte položku displeje', p: 'Android: klepněte na „Displej“ (u některých telefonů „Usnadnění“). iPhone: klepněte na „Displej a jas“.', tip: 'Položky můžete hledat i lupou nahoře – napište „písmo“.' },
        { t: 'Klepněte na Velikost písma', p: 'Android: „Velikost písma“ nebo „Velikost a styl písma“. iPhone: „Velikost textu“.' },
        { t: 'Posuňte jezdec doprava', p: 'Čím víc doprava, tím větší písmo. Ukázkový text se hned mění, takže uvidíte výsledek.' },
        { t: 'Hotovo', p: 'Vraťte se tlačítkem Zpět nebo zavřete Nastavení. Písmo zůstane větší všude v telefonu.' }
      ],
      src: 'Nápověda Android (Google), Podpora Apple'
    },
    {
      id: 'whatsapp-fotka', icon: 'users', tone: 'lime', minutes: 2,
      title: 'Poslat fotku přes WhatsApp',
      intro: 'Udělejte radost rodině. Fotku pošlete přímo z rozhovoru s daným člověkem.',
      steps: [
        { t: 'Otevřete WhatsApp', p: 'Klepněte na zelenou ikonu s bílým telefonem v bublině.' },
        { t: 'Vyberte člověka', p: 'V seznamu rozhovorů klepněte na jméno toho, komu chcete fotku poslat.' },
        { t: 'Klepněte na sponku nebo +', p: 'Ikona je dole vedle políčka pro psaní. Na Androidu je to sponka, na iPhonu znaménko plus.' },
        { t: 'Vyberte fotku', p: 'Klepněte na „Galerie“ (Android) nebo „Knihovna fotek“ (iPhone) a potom na fotku, kterou chcete poslat.' },
        { t: 'Odešlete', p: 'Klepněte na kulaté zelené tlačítko se šipkou. Fotka je na cestě!', tip: 'Dvě modré fajfky znamenají, že si ji druhý člověk už prohlédl.' }
      ],
      src: 'Nápověda WhatsApp'
    },
    {
      id: 'whatsapp-video', icon: 'smartphone', tone: 'sky', minutes: 2,
      title: 'Videohovor přes WhatsApp',
      intro: 'Uvidíte se s blízkými, i když jsou daleko. Hovor přes Wi-Fi nic nestojí.',
      steps: [
        { t: 'Otevřete WhatsApp', p: 'Klepněte na zelenou ikonu WhatsApp.' },
        { t: 'Vyberte člověka', p: 'Klepněte na jméno toho, komu chcete zavolat.' },
        { t: 'Klepněte na kameru', p: 'Vpravo nahoře je ikona malé kamery. Klepněte na ni.', tip: 'Ikona sluchátka vedle je obyčejný hovor bez obrazu.' },
        { t: 'Počkejte na přijetí', p: 'Až druhý člověk hovor přijme, uvidíte se. Telefon držte před obličejem.' },
        { t: 'Ukončete hovor', p: 'Klepněte na červené tlačítko se sluchátkem.' }
      ],
      src: 'Nápověda WhatsApp'
    },
    {
      id: 'podvodna-sms', icon: 'shield', tone: 'sky', minutes: 3,
      title: 'Co dělat s podezřelou SMS',
      intro: 'Podvodné zprávy chodí každému. Důležité je vědět, jak se zachovat.',
      steps: [
        { t: 'Nespěchejte', p: 'Podvodníci chtějí, abyste jednali hned. Vy máte čas. Zhluboka se nadechněte.' },
        { t: 'Neklikejte na odkaz', p: 'Na odkaz ve zprávě neklepejte a na zprávu neodpovídejte.' },
        { t: 'Ověřte si to jinak', p: 'Pokud zpráva tvrdí, že je od banky, pošty nebo úřadu, zavolejte jim sami na číslo z jejich oficiálního webu nebo z karty.' },
        { t: 'Smažte zprávu', p: 'Podržte prst na zprávě a vyberte „Smazat“. Číslo můžete zablokovat.' },
        { t: 'Už jste klikli?', p: 'Nic se neděje, pokud jste nic nevyplnili. Pokud jste zadali kartu nebo heslo, hned volejte svou banku.', tip: 'Zprávu můžete zkontrolovat v DIGI parťákovi v sekci „Je to podvod?“.' }
      ],
      src: 'Policie ČR, NÚKIB'
    },
    {
      id: 'screenshot-android', icon: 'smartphone', tone: 'lime', minutes: 2,
      title: 'Snímek obrazovky na Androidu',
      intro: 'Snímek obrazovky (screenshot) je fotka toho, co máte právě na displeji. Hodí se třeba ke kontrole podezřelé zprávy.',
      steps: [
        { t: 'Otevřete, co chcete vyfotit', p: 'Například podezřelou SMS. Zprávu otevřete tak, aby byl vidět celý text i odesílatel.' },
        { t: 'Najděte dvě tlačítka', p: 'Na boku telefonu je tlačítko zapnutí a tlačítko hlasitosti. Budete potřebovat zapnutí a dolní část hlasitosti (ztlumení).' },
        { t: 'Stiskněte obě najednou', p: 'Stiskněte současně tlačítko zapnutí a ztlumení hlasitosti. Držte je jen chvilku (asi 1 sekundu) a pusťte.', tip: 'Když se místo toho objeví nabídka vypnutí, pustili jste tlačítka pozdě. Zkuste to znovu a rychleji.' },
        { t: 'Obrazovka blikne', p: 'Uslyšíte zvuk nebo uvidíte krátké bliknutí a dole malý náhled. Snímek je uložený.' },
        { t: 'Kde snímek najdete', p: 'Otevřete aplikaci Galerie nebo Fotky (Google). Snímek je mezi nejnovějšími fotkami, často ve složce „Snímky obrazovky“.' },
        { t: 'Nejde to?', p: 'U některých telefonů (např. Samsung) jde snímek udělat i takto: stáhněte prstem lištu z horního okraje dolů a klepněte na „Snímek obrazovky“. Postup se liší podle výrobce.', tip: 'Snímek můžete nahrát v DIGI parťákovi v sekci „Je to podvod?“.' }
      ],
      src: 'Nápověda Android (Google)'
    },
    {
      id: 'screenshot-iphone', icon: 'smartphone', tone: 'lavender', minutes: 2,
      title: 'Snímek obrazovky na iPhonu',
      intro: 'Snímek obrazovky (screenshot) je fotka toho, co máte právě na displeji. Postup záleží na tom, jestli má váš iPhone kulaté tlačítko Plocha dole pod displejem.',
      steps: [
        { t: 'Otevřete, co chcete vyfotit', p: 'Například podezřelou SMS. Zprávu otevřete tak, aby byl vidět celý text i odesílatel.' },
        { t: 'iPhone BEZ tlačítka Plocha', p: 'Novější iPhony (displej až k okraji): stiskněte současně boční tlačítko vpravo a tlačítko pro zesílení hlasitosti vlevo (horní). Hned je pusťte.' },
        { t: 'iPhone S tlačítkem Plocha', p: 'Starší iPhony a iPhone SE (kulaté tlačítko dole): stiskněte současně tlačítko Plocha a boční tlačítko vpravo (u nejstarších modelů tlačítko nahoře).' },
        { t: 'Obrazovka blikne', p: 'Obrazovka krátce zbělá a vlevo dole se objeví malý náhled. Nemusíte na něj klepat – snímek se uloží sám.', tip: 'Když se místo toho objeví posuvník „Vypnout“, drželi jste tlačítka moc dlouho. Klepněte na Zrušit a zkuste to rychleji.' },
        { t: 'Kde snímek najdete', p: 'Otevřete aplikaci Fotky. Snímek je mezi nejnovějšími fotkami a také v albu „Snímky obrazovky“.', tip: 'Snímek můžete nahrát v DIGI parťákovi v sekci „Je to podvod?“.' }
      ],
      src: 'Podpora Apple'
    },
    {
      id: 'banka-hovor', icon: 'phone', tone: 'cream', minutes: 2,
      title: 'Volá mi „banka“ – co teď?',
      intro: 'Nejčastější podvod na seniory. Stačí si zapamatovat jedno pravidlo: zavěsit a zavolat sám.',
      steps: [
        { t: 'Zavěste', p: 'Když vám někdo z „banky“ nebo „policie“ volá kvůli penězům, ukončete hovor. Nemusíte se omlouvat.' },
        { t: 'Nic nesdělujte', p: 'Nikomu neříkejte PIN, hesla ani kódy z SMS. Banka je po vás nikdy chtít nebude.' },
        { t: 'Zavolejte sami', p: 'Vezměte platební kartu a zavolejte na číslo, které je na její zadní straně.' },
        { t: 'Řekněte, co se stalo', p: 'Pracovník banky vám řekne, jestli je váš účet v pořádku.' }
      ],
      src: 'Česká bankovní asociace, Policie ČR'
    },
    {
      id: 'erecept', icon: 'pill', tone: 'lavender', minutes: 2,
      title: 'Vyzvednout eRecept',
      intro: 'Recept už nemusí být na papíře. Stačí kód, který vám pošle lékař.',
      steps: [
        { t: 'Počkejte na zprávu', p: 'Lékař vám pošle SMS nebo e-mail s kódem receptu. Může vám ho také vytisknout.' },
        { t: 'Zajděte do lékárny', p: 'Můžete jít do kterékoli lékárny.' },
        { t: 'Ukažte kód', p: 'Otevřete zprávu od lékaře a ukažte ji lékárníkovi, nebo mu kód nadiktujte.' },
        { t: 'Hotovo', p: 'Lékárník kód načte a vydá vám lék.', tip: 'Kód můžete přeposlat blízkému, který lék vyzvedne za vás.' }
      ],
      src: 'SÚKL'
    },
    {
      id: 'plocha', icon: 'download', tone: 'lime', minutes: 1,
      title: 'DIGI parťák na ploše telefonu',
      intro: 'Přidejte si parťáka na plochu jako aplikaci. Pak ho otevřete jedním klepnutím.',
      steps: [
        { t: 'Otevřete DIGI parťáka v prohlížeči', p: 'Android: v Chrome. iPhone: v Safari.' },
        { t: 'Otevřete nabídku', p: 'Android: klepněte vpravo nahoře na tři tečky. iPhone: klepněte dole na ikonu Sdílet (čtvereček se šipkou nahoru).' },
        { t: 'Přidat na plochu', p: 'Vyberte „Přidat na plochu“ nebo „Instalovat aplikaci“.' },
        { t: 'Potvrďte', p: 'Klepněte na „Přidat“. Na ploše se objeví ikona s usměvavou bublinou.' }
      ],
      src: 'Nápověda Android (Google), Podpora Apple'
    }
  ];
  window.DP = window.DP || {};
  window.DP.GUIDES = GUIDES;
})();
