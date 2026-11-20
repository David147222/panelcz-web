# panelcz.cz – web Panelcz

Statický web bez frameworku. `node build.js` sestaví stránky do `dist/`.

- **Texty stránek:** `content/stranky/*.json` (pole `obsah` je HTML stránky)
- **Fotky:** `content/fotky.json` (kód fotky → soubor v `public/foto/`), v HTML se používá `{{foto:kod}}`
- **Kontakty a patička:** `content/nastaveni.json`
- **Vzhled:** `src/style.css`, **skripty:** `src/site.js` (menu, cookies, načítání Reservation+ z Previa)
- **Administrace:** `/admin/` (Decap CMS, přihlášení přes GitHub, `admin/auth.php`, klíče se při nahrání vloží z GitHub Secrets)
- **Kontrola před sloučením:** `node build.js && node kontrola.js` (stránky ve všech jazycích, odkazy, upozornění nahoře vede na Rezervaci, adresa a název). Na GitHubu běží sama u každé navrhované změny (`.github/workflows/kontrola.yml`).
- **Nahrání na Wedos:** GitHub Actions `.github/workflows/nahrat-na-wedos.yml`, údaje k FTP v Settings → Secrets: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_DIR`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`

Formuláře Reservation+ se vkládají jako `<div id="previo-booking-engine-ID_KONFIGURACE">`, skript je načte sám.

## Vyhledávače (SEO) a rychlost

- **Název stránky ve vyhledávání:** pole `nadpis`. Úvod = „Panelcz – nadpis“, ostatní „nadpis · Panelcz, Chmelnice u Vranovské přehrady“ (doplněk místa je v `src/seo.json` → `misto`, vynechá se, když nadpis už obsahuje „Vranov“).
- **Popis pod odkazem:** pole `popis`, ideálně 120–160 znaků.
- **Vizitka pro Google (schema.org):** `build.js` → `strukturovana()`. Úvod: `LodgingBusiness` (kontakty, adresa a GPS z `content/nastaveni.json`, ostatní z `src/seo.json`), podstránky: drobečková navigace, Časté dotazy: `FAQPage` z `<details><summary>`.
- **Popisky fotek (alt):** `content/fotky.json` → `alt`, `alt_de`, `alt_en`; doplní se do `<img alt="">` při sestavení.
- **Ověření Google Search Console / Seznam Webmaster:** pole `google_overeni`, `seznam_overeni` v `content/nastaveni.json` (v administraci Kontakty a nastavení).
- **Rychlost:** písma jsou v `public/fonts/` (žádné Google Fonts), velká úvodní fotka se načítá přednostně, ostatní fotky na pozadí až při posunu stránky (`data-bg` → `src/site.js`), dlaždice a galerie dostávají menší verzi z `dist/foto/m/` (vyrábí `build.js` přes ImageMagick).
- **Chyba 404:** `dist/404.html` (vyrábí `build.js`), v `.htaccess` `ErrorDocument 404 /404.html`.

## Obsazenost pro portály (e-chalupy.cz)

- **Adresa:** https://panelcz.cz/obsazenost.ics (kalendář ve formátu iCalendar, `.htaccess` ji posílá na `public/obsazenost.php`).
- **Co ukazuje:** obsazenost **celého areálu** z online rezervace Previo (Reservation+ `01a1a149-…`), stejně jako ji vidí hosté. Na e-chalupy je Panelcz nabízený jako pronájem celého objektu, proto je v kalendáři obsazený každý den, kdy celý areál volný není: rezervace, doba před otevřením a celé léto (v červenci a srpnu se celý areál nepronajímá, jen apartmány; David 20. 11. 2026: lidé z e-chalup si mysleli, že se celý objekt pronajímá i v létě). V Previu se nic nemění.
- **Jak často:** výsledek se drží 1 hodinu v `obsazenost-cache.ics` (veřejně nepřístupný). Když Previo neodpovídá, pošle se poslední uložená verze.
- **Kde se používá:** e-chalupy.cz, klientská sekce → Obsazenost → Import kalendáře (ICAL), načítá se zhruba po 4 hodinách.
