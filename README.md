# panelcz.cz – web Panel Chmelnice

Statický web bez frameworku. `node build.js` sestaví stránky do `dist/`.

- **Texty stránek:** `content/stranky/*.json` (pole `obsah` je HTML stránky)
- **Fotky:** `content/fotky.json` (kód fotky → soubor v `public/foto/`), v HTML se používá `{{foto:kod}}`
- **Kontakty a patička:** `content/nastaveni.json`
- **Vzhled:** `src/style.css`, **skripty:** `src/site.js` (menu, cookies, načítání Reservation+ z Previa)
- **Administrace:** `/admin/` (Decap CMS, přihlášení přes GitHub, `admin/auth.php`, klíče se při nahrání vloží z GitHub Secrets)
- **Nahrání na Wedos:** GitHub Actions `.github/workflows/nahrat-na-wedos.yml`, údaje k FTP v Settings → Secrets: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_DIR`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`

Formuláře Reservation+ se vkládají jako `<div id="previo-booking-engine-ID_KONFIGURACE">`, skript je načte sám.
