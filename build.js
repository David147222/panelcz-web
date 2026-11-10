// Sestaví statický web do složky dist/ – bez závislostí, stačí Node 18+.
// Obsah: content/stranky/*.json (česky), content/de/stranky/*.json (německy), content/en/stranky/*.json (anglicky),
// content/fotky.json (fotky), content/nastaveni.json (kontakty), src/jazyky.json (menu a patička v DE/EN).
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const S = read('content/nastaveni.json');
const STR = read('src/struktura.json');
const J = read('src/jazyky.json');
const FOTO = Object.fromEntries(read('content/fotky.json').fotky.map(f => [f.klic, f.foto]));
const VERZE = Date.now().toString(36);
const LANGS = ['cs', 'de', 'en'];

// Texty šablony (česky z nastavení, cizojazyčně z src/jazyky.json)
const CS = {
  podnazev: S.podnazev, adresa: S.adresa, provozovatel: S.provozovatel,
  kde: 'Kde nás najdete', kontakt: 'Kontaktujte nás', ubytovani: 'Ubytování', provoz: 'Provoz', email: 'E-mail',
  sledujte: 'Sledujte nás', provozovatel_h: 'Provozovatel',
  paticka: [['podminky', 'Obchodní a storno podmínky'], ['rad', 'Ubytovací a provozní řád'], ['gdpr', 'Ochrana osobních údajů'], ['cookies', 'Cookies'], ['faq', 'Časté dotazy'], ['poukazy', 'Dárkové poukazy']],
  cookie: 'Používáme jen nezbytné cookies. Rezervační formulář Previo a mapa mohou ukládat vlastní cookies.',
  vice: 'Více informací', rozumim: 'Rozumím', jazyk: 'Jazyk', menu: {}
};
const TX = { cs: CS, de: J.de, en: J.en };

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const url = (id, L = 'cs') => (L === 'cs' ? '' : '/' + L) + (id === 'uvod' ? '/' : `/${id}/`);
const lab = (t, L) => TX[L].menu[t] || t;

function nav(cur, L) {
  const top = STR.parent[cur] || cur;
  return '<ul>' + STR.menu.slice(1).map(m => {
    const on = m[0] === top || (m[2] || []).some(s => s[0] === cur);
    const sub = m[2] ? '<ul>' + m[2].map(s => `<li><a href="${url(s[0], L)}">${lab(s[1], L)}</a></li>`).join('') + '</ul>' : '';
    return `<li><a href="${url(m[0], L)}"${on ? ' class="on"' : ''}>${lab(m[1], L)}</a>${sub}</li>`;
  }).join('') + '</ul>';
}

function fotky(html) {
  return html.replace(/\{\{foto:([a-z0-9_]+)\}\}/g, (m, k) => {
    if (!FOTO[k]) throw new Error('Chybí fotka: ' + k);
    return FOTO[k];
  });
}

function page(id, p, L) {
  const t = TX[L];
  const title = id === 'uvod' ? `${S.nazev} – ${p.nadpis}` : `${p.nadpis} · ${S.nazev}`;
  const ogImg = S.domena + (FOTO.hero || '');
  // Upozornění nahoře: vypínač je české pole v administraci (prázdné = nikde); DE/EN znění je v src/jazyky.json (upozorneni).
  const notice = S.upozorneni ? `<div class="demo">${L === 'cs' ? S.upozorneni : (t.upozorneni || S.upozorneni)}</div>` : '';
  const alt = LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${S.domena}${url(id, l)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${S.domena}${url(id)}">`;
  const sw = `<div class="lang" aria-label="${t.jazyk}">` + LANGS.map(l => `<a href="${url(id, l)}" hreflang="${l}" lang="${l}"${l === L ? ' class="on" aria-current="true"' : ''}>${l.toUpperCase()}</a>`).join('') + '</div>';
  const tel = n => `<a href="tel:${n.replace(/\s/g, '')}">${n}</a>`;
  return `<!doctype html>
<html lang="${L}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(p.popis || '')}">
<link rel="canonical" href="${S.domena}${url(id, L)}">
${alt}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(p.popis || '')}">
<meta property="og:image" content="${ogImg}">
<meta property="og:type" content="website">
<meta property="og:locale" content="${{ cs: 'cs_CZ', de: 'de_DE', en: 'en_GB' }[L]}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Source+Sans+3:wght@400;600&display=swap">
<link rel="stylesheet" href="/style.css?v=${VERZE}">
</head>
<body>
${notice}<header><div class="in"><a class="logo" href="${url('uvod', L)}">Panel<small>${t.podnazev}</small></a><button class="burger" aria-label="Menu">☰ Menu</button><nav id="nav">${nav(id, L)}</nav>${sw}</div></header>
<main id="app">
${fotky(p.obsah)}
</main>
<footer><div class="in">
  <div><h3>${t.kde}</h3><p>${t.adresa}<br>GPS: ${S.gps}</p></div>
  <div><h3>${t.kontakt}</h3><p>${t.ubytovani}: ${tel(S.telefon_ubytovani)}<br>${t.provoz}: ${tel(S.telefon_provoz)}<br>${t.email}: <a href="mailto:${S.email}">${S.email}</a></p></div>
  <div><h3>${t.sledujte}</h3><p><a href="${S.facebook}" target="_blank" rel="noopener">Facebook</a> · <a href="${S.instagram}" target="_blank" rel="noopener">Instagram</a></p></div>
  <div><h3>${t.provozovatel_h}</h3><p>${t.provozovatel}</p></div>
</div><div class="in foot-links">${t.paticka.map(([i, n]) => `<a href="${url(i, L)}">${n}</a>`).join('')}</div><div class="in copy">© ${new Date().getFullYear()} Dajpr s.r.o.</div></footer>
<div class="cookie" id="ck" hidden><p>${t.cookie} <a href="${url('cookies', L)}">${t.vice}</a></p><button class="btn" id="ck-ok">${t.rozumim}</button></div>
<script src="/site.js?v=${VERZE}" defer></script>
</body>
</html>`;
}

// --- sestavení ---
fs.rmSync(DIST, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'public'), DIST, { recursive: true });
fs.copyFileSync(path.join(ROOT, 'src/style.css'), path.join(DIST, 'style.css'));
fs.copyFileSync(path.join(ROOT, 'src/site.js'), path.join(DIST, 'site.js'));
fs.mkdirSync(path.join(DIST, 'admin'), { recursive: true });
for (const f of ['index.html', 'config.yml', 'auth.php']) fs.copyFileSync(path.join(ROOT, 'admin', f), path.join(DIST, 'admin', f));

const ids = fs.readdirSync(path.join(ROOT, 'content/stranky')).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
const sitemap = [];
let n = 0;
for (const L of LANGS) {
  const dirC = L === 'cs' ? 'content/stranky' : `content/${L}/stranky`;
  for (const id of ids) {
    const f = path.join(ROOT, dirC, id + '.json');
    // chybí-li překlad, použije se česká stránka (web se nerozbije)
    const p = fs.existsSync(f) ? read(path.join(dirC, id + '.json')) : read(`content/stranky/${id}.json`);
    const dir = path.join(DIST, url(id, L));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), page(id, p, L));
    const alts = LANGS.map(l => `<xhtml:link rel="alternate" hreflang="${l}" href="${S.domena}${url(id, l)}"/>`).join('');
    sitemap.push(`<url><loc>${S.domena}${url(id, L)}</loc>${alts}</url>`);
    n++;
  }
}
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${sitemap.join('')}</urlset>\n`);
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${S.domena}/sitemap.xml\n`);
console.log(`Hotovo: ${n} stránek (${LANGS.join(', ')}) v dist/`);
