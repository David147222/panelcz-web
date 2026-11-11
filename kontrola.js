// Kontrola sestaveného webu v dist/ (spusťte po `node build.js`): `node kontrola.js`.
// Na GitHubu běží u každé navrhované změny (.github/workflows/kontrola.yml). Hlídá:
// - všechny stránky ve všech jazycích, žádná nenahrazená značka {{...}},
// - odkazy a soubory v rámci webu (nic nevede na neexistující stránku nebo fotku),
// - upozornění nahoře: celý pruh vede na Rezervaci v jazyce stránky,
// - adresa v patičce podle content/nastaveni.json a nikde jiné číslo evidenční,
// - název jen Panelcz (žádné „Panel“, „PanelCZ“ apod.).
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const S = read('content/nastaveni.json');
const J = read('src/jazyky.json');
const LANGS = ['cs', 'de', 'en'];
const url = (id, L) => (L === 'cs' ? '' : '/' + L) + (id === 'uvod' ? '/' : `/${id}/`);
const text = h => String(h).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

const chyby = [];
const chyba = (kde, co) => chyby.push(`${kde}: ${co}`);

if (!fs.existsSync(DIST)) { console.error('Chybí dist/, nejdřív spusťte node build.js'); process.exit(1); }

const ids = fs.readdirSync(path.join(ROOT, 'content/stranky')).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
const evc = (S.adresa.match(/ev\.\s*č\.\s*(\d+)/) || [])[1];
let stranek = 0;

const existuje = u => {
  const p = decodeURI(u.split(/[?#]/)[0]);
  const f = path.join(DIST, p.endsWith('/') ? p + 'index.html' : p);
  return fs.existsSync(f) && fs.statSync(f).isFile();
};

for (const L of LANGS) {
  const adresa = L === 'cs' ? S.adresa : J[L].adresa;
  for (const id of ids) {
    const u = url(id, L);
    const f = path.join(DIST, u, 'index.html');
    if (!fs.existsSync(f)) { chyba(u, 'stránka chybí'); continue; }
    const html = fs.readFileSync(f, 'utf8');
    stranek++;

    if (/\{\{[^}]*\}\}/.test(html)) chyba(u, 'nenahrazená značka ' + html.match(/\{\{[^}]*\}\}/)[0]);

    // Odkazy a soubory v rámci webu
    const odkazy = new Set([...html.matchAll(/\b(?:href|src|data-bg)="(\/[^/"][^"]*|\/)"/g)].map(m => m[1]));
    for (const o of odkazy) if (!existuje(o)) chyba(u, 'odkaz vede nikam: ' + o);

    // Upozornění nahoře
    if (S.upozorneni) {
      const m = html.match(/<body>\s*<a class="demo" href="([^"]+)">([^<]*)<\/a>/);
      if (!m) chyba(u, 'upozornění nahoře chybí nebo není odkaz');
      else {
        if (m[1] !== url('rezervace', L)) chyba(u, `upozornění vede na ${m[1]}, má vést na ${url('rezervace', L)}`);
        const ma = L === 'cs' ? S.upozorneni : J[L].upozorneni;
        if (ma && m[2] !== ma) chyba(u, 'upozornění má jiné znění než v nastavení');
      }
    }

    // Adresa v patičce a žádné jiné číslo evidenční
    if (!html.includes(`<p>${adresa}<br>GPS:`)) chyba(u, 'v patičce není adresa z nastavení');
    const t = text(html);
    for (const m of t.matchAll(/\be(?:v)?\.\s*č\.\s*(\d+)/g)) if (evc && m[1] !== evc) chyba(u, `jiné číslo evidenční: „${m[0]}“`);
    if (/\bOslnovice\s+\d+\b/.test(t)) chyba(u, 'adresa bez „ev. č.“: ' + t.match(/\bOslnovice\s+\d+\b/)[0]);

    // Název jen Panelcz
    for (const m of t.matchAll(/\bPanel\b|\bPANEL\s*CZ\b|\bPanel\s*CZ\b|\bPanel\s+cz\b/g)) chyba(u, `název „${m[0]}“ místo „${S.nazev}“`);
  }
}

for (const f of ['404.html', 'sitemap.xml', 'robots.txt']) if (!fs.existsSync(path.join(DIST, f))) chyba('/' + f, 'soubor chybí');

if (chyby.length) {
  console.error(`Kontrola našla ${chyby.length} chyb:\n- ` + chyby.join('\n- '));
  process.exit(1);
}
console.log(`Kontrola v pořádku: ${stranek} stránek (${LANGS.join(', ')}), odkazy, upozornění nahoře, adresa a název.`);
