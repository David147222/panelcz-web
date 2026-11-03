// Sestaví statický web do složky dist/ – bez závislostí, stačí Node 18+.
// Obsah: content/stranky/*.json (texty), content/fotky.json (fotky), content/nastaveni.json (kontakty).
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const S = read('content/nastaveni.json');
const STR = read('src/struktura.json');
const FOTO = Object.fromEntries(read('content/fotky.json').fotky.map(f => [f.klic, f.foto]));
const VERZE = Date.now().toString(36);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const url = id => (id === 'uvod' ? '/' : `/${id}/`);

function nav(cur) {
  const top = STR.parent[cur] || cur;
  return '<ul>' + STR.menu.slice(1).map(m => {
    const on = m[0] === top || (m[2] || []).some(s => s[0] === cur);
    const sub = m[2] ? '<ul>' + m[2].map(s => `<li><a href="${url(s[0])}">${s[1]}</a></li>`).join('') + '</ul>' : '';
    return `<li><a href="${url(m[0])}"${on ? ' class="on"' : ''}>${m[1]}</a>${sub}</li>`;
  }).join('') + '</ul>';
}

function fotky(html) {
  return html.replace(/\{\{foto:([a-z0-9_]+)\}\}/g, (m, k) => {
    if (!FOTO[k]) throw new Error('Chybí fotka: ' + k);
    return FOTO[k];
  });
}

function page(id, p) {
  const title = id === 'uvod' ? `${S.nazev} – ${p.nadpis}` : `${p.nadpis} · ${S.nazev}`;
  const ogImg = S.domena + (FOTO.hero || '');
  const notice = S.upozorneni ? `<div class="demo">${S.upozorneni}</div>` : '';
  return `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(p.popis || '')}">
<link rel="canonical" href="${S.domena}${url(id)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(p.popis || '')}">
<meta property="og:image" content="${ogImg}">
<meta property="og:type" content="website">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Source+Sans+3:wght@400;600&display=swap">
<link rel="stylesheet" href="/style.css?v=${VERZE}">
</head>
<body>
${notice}<header><div class="in"><a class="logo" href="/">Panel<small>${S.podnazev}</small></a><button class="burger" aria-label="Menu">☰ Menu</button><nav id="nav">${nav(id)}</nav></div></header>
<main id="app">
${fotky(p.obsah)}
</main>
<footer><div class="in">
  <div><h3>Kde nás najdete</h3><p>${S.adresa}<br>GPS: ${S.gps}</p></div>
  <div><h3>Kontaktujte nás</h3><p>Ubytování: <a href="tel:${S.telefon_ubytovani.replace(/\s/g, '')}">${S.telefon_ubytovani}</a><br>Provoz: <a href="tel:${S.telefon_provoz.replace(/\s/g, '')}">${S.telefon_provoz}</a><br>E-mail: <a href="mailto:${S.email}">${S.email}</a></p></div>
  <div><h3>Sledujte nás</h3><p><a href="${S.facebook}" target="_blank" rel="noopener">Facebook</a> · <a href="${S.instagram}" target="_blank" rel="noopener">Instagram</a></p></div>
  <div><h3>Provozovatel</h3><p>${S.provozovatel}</p></div>
</div><div class="in foot-links"><a href="/podminky/">Obchodní a storno podmínky</a><a href="/rad/">Ubytovací a provozní řád</a><a href="/gdpr/">Ochrana osobních údajů</a><a href="/cookies/">Cookies</a><a href="/faq/">Časté dotazy</a><a href="/poukazy/">Dárkové poukazy</a></div><div class="in copy">© ${new Date().getFullYear()} Dajpr s.r.o.</div></footer>
<div class="cookie" id="ck" hidden><p>Používáme jen nezbytné cookies. Rezervační formulář Previo a mapa mohou ukládat vlastní cookies. <a href="/cookies/">Více informací</a></p><button class="btn" id="ck-ok">Rozumím</button></div>
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
for (const id of ids) {
  const p = read(`content/stranky/${id}.json`);
  const dir = id === 'uvod' ? DIST : path.join(DIST, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(id, p));
  sitemap.push(`<url><loc>${S.domena}${url(id)}</loc></url>`);
}
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemap.join('')}</urlset>\n`);
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${S.domena}/sitemap.xml\n`);
console.log(`Hotovo: ${ids.length} stránek v dist/`);
