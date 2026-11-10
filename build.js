// Sestaví statický web do složky dist/ – bez závislostí, stačí Node 18+ (s ImageMagickem navíc zmenší fotky).
// Obsah: content/stranky/*.json (česky), content/de/stranky/*.json (německy), content/en/stranky/*.json (anglicky),
// content/fotky.json (fotky a jejich popisky), content/nastaveni.json (kontakty), src/jazyky.json (menu a patička v DE/EN),
// src/seo.json (údaje pro vyhledávače, které v nastavení nejsou).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const S = read('content/nastaveni.json');
const STR = read('src/struktura.json');
const J = read('src/jazyky.json');
const SEO = read('src/seo.json');
const FOTKY = read('content/fotky.json').fotky;
const FOTO = Object.fromEntries(FOTKY.map(f => [f.klic, f.foto]));
const FINFO = Object.fromEntries(FOTKY.map(f => [f.klic, f]));
const VERZE = Date.now().toString(36);
const LANGS = ['cs', 'de', 'en'];
const LOCALE = { cs: 'cs_CZ', de: 'de_DE', en: 'en_GB' };

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
const text = h => String(h).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

function nav(cur, L) {
  const top = STR.parent[cur] || cur;
  return '<ul>' + STR.menu.slice(1).map(m => {
    const on = m[0] === top || (m[2] || []).some(s => s[0] === cur);
    const sub = m[2] ? '<ul>' + m[2].map(s => `<li><a href="${url(s[0], L)}">${lab(s[1], L)}</a></li>`).join('') + '</ul>' : '';
    return `<li><a href="${url(m[0], L)}"${on ? ' class="on"' : ''}>${lab(m[1], L)}</a>${sub}</li>`;
  }).join('') + '</ul>';
}

// Popisek fotky (alt) pro Google a čtečky pro nevidomé: content/fotky.json → alt (česky), alt_de, alt_en.
// Chybí-li překlad, použije se český.
const altFotky = (k, L) => { const f = FINFO[k] || {}; return (L !== 'cs' && f['alt_' + L]) || f.alt || ''; };

function fotky(html, L) {
  // Prázdný popisek u <img> se doplní z content/fotky.json (vlastní popisek v textu stránky má přednost)
  html = html.replace(/<img\b[^>]*>/g, tag => {
    const k = (tag.match(/\bsrc="\{\{foto:([a-z0-9_]+)\}\}"/) || [])[1];
    const a = k && altFotky(k, L);
    return a ? tag.replace(/\balt=""/, `alt="${esc(a)}"`) : tag;
  });
  return html.replace(/\{\{foto:([a-z0-9_]+)\}\}/g, (m, k) => {
    if (!FOTO[k]) throw new Error('Chybí fotka: ' + k);
    return FOTO[k];
  });
}

// Rychlejší načítání fotek (texty stránek se nemění, upraví se jen výsledné HTML):
// - dlaždice, galerie a mozaiky dostanou menší verzi fotky z dist/foto/m/ (vyrobí se na konci sestavení),
// - <img> se načte až při posunu stránky k fotce (loading="lazy"),
// - fotky na pozadí kromě úvodní velké (hero) načte site.js až při posunu stránky (atribut data-bg),
// - úvodní velkou fotku prohlížeč stáhne přednostně (preload v hlavičce).
const STREDNI = new Set();
const stredni = u => (/^\/foto\/[^/]+\.(jpe?g|png|webp)$/i.test(u) ? (STREDNI.add(u), '/foto/m/' + u.slice(6)) : u);

function obrazky(html) {
  const bg = new Set();
  let hero = null;
  html = html.replace(/<img\b[^>]*>/g, tag => {
    tag = tag.replace(/\bsrc="([^"]+)"/, (m, u) => `src="${stredni(u)}"`);
    return /\bloading=/.test(tag) ? tag : tag.replace(/^<img/, '<img loading="lazy" decoding="async"');
  });
  html = html.replace(/<(\w+)\b([^>]*?)\sstyle="([^"]*)"([^>]*)>/g, (tag, el, a1, st, a2) => {
    const m = st.match(/background-image:\s*url\(['"]?([^'")]+)['"]?\);?/);
    if (!m) return tag;
    const cls = ((a1 + a2).match(/\bclass="([^"]*)"/) || [, ''])[1].split(/\s+/);
    if (cls.includes('hero')) { hero = hero || m[1]; return tag; }
    const u = cls.includes('cta') || cls.includes('sl') ? m[1] : stredni(m[1]);
    bg.add(u);
    const zbytek = st.replace(m[0], '').trim();
    return `<${el}${a1}${zbytek ? ` style="${zbytek}"` : ''} data-bg="${u}"${a2}>`;
  });
  return { html, hero, bg: [...bg] };
}

// Název položky v menu (pro drobečkovou navigaci ve vyhledávání)
function jmenoVMenu(id) {
  for (const m of STR.menu) for (const s of m[2] || []) if (s[0] === id) return s[1];
  const m = STR.menu.find(m => m[0] === id);
  return m ? m[1] : null;
}

// Strukturovaná data pro vyhledávače (schema.org): na úvodu vizitka ubytování, jinde drobečková navigace, u dotazů otázky a odpovědi
function strukturovana(id, p, L) {
  const D = S.domena;
  const domu = D + url('uvod', L);
  const g = [];
  if (id === 'uvod') {
    const adr = S.adresa.split(/<br\s*\/?>/i).map(text).filter(Boolean);
    const psc = (adr[1] || '').match(/^(\d{3}\s?\d{2})\s+(.+?)(?:\s*\(.*\))?$/);
    const gps = String(S.gps).match(/(-?[\d.]+)\s*([NS])?\s*[,;\s]\s*(-?[\d.]+)\s*([EW])?/i);
    const cas = c => (/^\d{1,2}:\d{2}$/.test(c || '') ? c + ':00' : c);
    g.push({ '@type': 'WebSite', '@id': D + '/#web', url: D + '/', name: S.nazev, inLanguage: L, publisher: { '@id': D + '/#panel' } });
    g.push({
      '@type': 'LodgingBusiness',
      '@id': D + '/#panel',
      name: S.nazev,
      url: domu,
      description: p.popis || undefined,
      image: SEO.fotky.filter(k => FOTO[k]).map(k => D + FOTO[k]),
      telephone: S.telefon_ubytovani || undefined,
      email: S.email || undefined,
      address: { '@type': 'PostalAddress', streetAddress: adr[0], postalCode: psc ? psc[1] : undefined, addressLocality: psc ? psc[2] : adr[1], addressCountry: 'CZ' },
      geo: gps ? { '@type': 'GeoCoordinates', latitude: +gps[1] * (/s/i.test(gps[2] || '') ? -1 : 1), longitude: +gps[3] * (/w/i.test(gps[4] || '') ? -1 : 1) } : undefined,
      checkinTime: cas(SEO.prijezd),
      checkoutTime: cas(SEO.odjezd),
      petsAllowed: SEO.psi,
      amenityFeature: SEO.vybaveni.map(v => ({ '@type': 'LocationFeatureSpecification', name: v[L] || v.cs, value: true })),
      sameAs: [S.instagram, S.facebook].filter(Boolean)
    });
  } else {
    const kroky = [[lab('Úvod', L), domu]];
    const par = STR.parent[id];
    const parM = par && par !== id && STR.menu.find(m => m[0] === par);
    if (parM) kroky.push([lab(parM[1], L), D + url(par, L)]);
    const jm = jmenoVMenu(id);
    kroky.push([jm ? lab(jm, L) : p.nadpis, D + url(id, L)]);
    g.push({ '@type': 'BreadcrumbList', itemListElement: kroky.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) });
  }
  if (id === 'faq') {
    const qa = [...p.obsah.matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)]
      .map(m => ({ '@type': 'Question', name: text(m[1]), acceptedAnswer: { '@type': 'Answer', text: text(m[2]) } }));
    if (qa.length) g.push({ '@type': 'FAQPage', inLanguage: L, mainEntity: qa });
  }
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': g }).replace(/</g, '\\u003c')}</script>`;
}

// Ověření webu v Google Search Console a Seznam Webmaster: kód z administrace (Kontakty a nastavení).
// Vložit jde samotný kód i celý řádek <meta ...>, který nástroj nabídne.
const kod = v => { const m = String(v || '').match(/content=["']([^"']+)["']/); return (m ? m[1] : String(v || '')).trim(); };
const OVERENI = [['google-site-verification', S.google_overeni], ['seznam-wmt', S.seznam_overeni]]
  .filter(([, v]) => kod(v)).map(([n, v]) => `<meta name="${n}" content="${esc(kod(v))}">`).join('\n');

// Písma jsou přímo na webu (public/fonts/), ne z Google Fonts: rychlejší a menu při načítání neposkočí
const PISMA = { cs: ['source-sans-3-latin', 'source-sans-3-latin-ext', 'bricolage-latin', 'bricolage-latin-ext'], de: ['source-sans-3-latin', 'bricolage-latin'], en: ['source-sans-3-latin', 'bricolage-latin'] };

function page(id, p, L, opt = {}) {
  const t = TX[L];
  const misto = SEO.misto[L];
  const title = id === 'uvod' ? `${S.nazev} – ${p.nadpis}` : `${p.nadpis} · ${S.nazev}${opt.noindex || !misto || /vranov/i.test(p.nadpis) ? '' : ', ' + misto}`;
  const self = S.domena + url(id, L);
  const { html: obsah, hero, bg } = obrazky(fotky(p.obsah, L));
  // Fotka při sdílení odkazu: první fotka stránky (většinou ta velká nahoře), jinak úvodní
  const ogKod = (p.obsah.match(/\{\{foto:[a-z0-9_]+\}\}/g) || []).map(s => s.slice(7, -2)).find(k => /\.(jpe?g|png|webp)$/i.test(FOTO[k] || '')) || 'hero';
  const ogAlt = altFotky(ogKod, L);
  // Upozornění nahoře: vypínač je české pole v administraci (prázdné = nikde); DE/EN znění je v src/jazyky.json (upozorneni).
  const notice = S.upozorneni ? `<div class="demo">${L === 'cs' ? S.upozorneni : (t.upozorneni || S.upozorneni)}</div>` : '';
  const odkaz = l => url(opt.noindex ? 'uvod' : id, l);
  const alt = LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${S.domena}${url(id, l)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${S.domena}${url(id)}">`;
  const sw = `<div class="lang" aria-label="${t.jazyk}">` + LANGS.map(l => `<a href="${odkaz(l)}" hreflang="${l}" lang="${l}"${l === L ? ' class="on" aria-current="true"' : ''}>${l.toUpperCase()}</a>`).join('') + '</div>';
  const tel = n => `<a href="tel:${n.replace(/\s/g, '')}">${n}</a>`;
  const hlava = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(p.popis || '')}">`,
    opt.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${self}">\n${alt}`,
    OVERENI,
    `<meta property="og:site_name" content="${esc(S.nazev)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(p.popis || '')}">`,
    opt.noindex ? '' : `<meta property="og:url" content="${self}">`,
    `<meta property="og:image" content="${S.domena}${FOTO[ogKod] || ''}">`,
    ogAlt ? `<meta property="og:image:alt" content="${esc(ogAlt)}">` : '',
    '<meta property="og:type" content="website">',
    `<meta property="og:locale" content="${LOCALE[L]}">`,
    ...LANGS.filter(l => l !== L).map(l => `<meta property="og:locale:alternate" content="${LOCALE[l]}">`),
    '<meta name="twitter:card" content="summary_large_image">',
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    ...PISMA[L].map(f => `<link rel="preload" href="/fonts/${f}.woff2" as="font" type="font/woff2" crossorigin>`),
    hero ? `<link rel="preload" href="${hero}" as="image" fetchpriority="high">` : '',
    `<link rel="stylesheet" href="/style.css?v=${VERZE}">`,
    bg.length ? `<noscript><style>${bg.map(u => `[data-bg="${u}"]{background-image:url('${u}')}`).join('')}</style></noscript>` : '',
    opt.noindex ? '' : strukturovana(id, p, L)
  ].filter(Boolean).join('\n');
  return `<!doctype html>
<html lang="${L}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${hlava}
</head>
<body>
${notice}<header><div class="in"><a class="logo" href="${url('uvod', L)}">${S.nazev}<small>${t.podnazev}</small></a><button class="burger" aria-label="Menu">☰ Menu</button><nav id="nav">${nav(id, L)}</nav>${sw}</div></header>
<main id="app">
${obsah}
</main>
<footer><div class="in">
  <div><h3>${t.kde}</h3><p>${t.adresa}<br>GPS: ${S.gps}</p></div>
  <div><h3>${t.kontakt}</h3><p>${t.ubytovani}: ${tel(S.telefon_ubytovani)}<br>${t.provoz}: ${tel(S.telefon_provoz)}<br>${t.email}: <a href="mailto:${S.email}">${S.email}</a></p></div>
  <div><h3>${t.sledujte}</h3><p>${[['Facebook', S.facebook], ['Instagram', S.instagram]].filter(([, h]) => h).map(([n, h]) => `<a href="${h}" target="_blank" rel="noopener">${n}</a>`).join(' · ')}</p></div>
  <div><h3>${t.provozovatel_h}</h3><p>${t.provozovatel}</p></div>
</div><div class="in foot-links">${t.paticka.map(([i, n]) => `<a href="${url(i, L)}">${n}</a>`).join('')}</div><div class="in copy">© ${new Date().getFullYear()} Dajpr s.r.o.</div></footer>
<div class="cookie" id="ck" hidden><p>${t.cookie} <a href="${url('cookies', L)}">${t.vice}</a></p><button class="btn" id="ck-ok">${t.rozumim}</button></div>
<script src="/site.js?v=${VERZE}" defer></script>
</body>
</html>`;
}

// Stránka pro neexistující adresy (chyba 404): vyhledávače ji neindexují, hostovi nabídne cestu dál
const NENALEZENO = {
  nadpis: 'Stránka nenalezena',
  popis: '',
  obsah: `<div class="hero sm" style="background-image:url('{{foto:dvur2}}')"><div class="in"><span class="ey" style="color:#ffd3a8">Chyba 404</span><h1>Tahle stránka tu není</h1><p>Adresa se možná změnila nebo obsahuje překlep. Pokračujte některým z odkazů níže.</p></div></div>`
    + `<section><div class="in" style="max-width:860px"><div class="free">`
    + `<a href="/"><b>Úvod</b>Hlavní stránka webu</a><a href="/cely-objekt/"><b>Ubytování</b>Celý objekt a apartmány</a><a href="/rezervace/"><b>Rezervace</b>Volné termíny a ceny</a><a href="/kontakt/"><b>Kontakt</b>Telefon, e-mail a adresa</a>`
    + `</div><p style="margin-top:24px"><span lang="de">Seite nicht gefunden: <a href="/de/">zur Startseite</a></span> · <span lang="en">Page not found: <a href="/en/">go to the home page</a></span></p></div></section>`
};

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
    const alts = LANGS.map(l => `<xhtml:link rel="alternate" hreflang="${l}" href="${S.domena}${url(id, l)}"/>`).join('') + `<xhtml:link rel="alternate" hreflang="x-default" href="${S.domena}${url(id)}"/>`;
    sitemap.push(`<url><loc>${S.domena}${url(id, L)}</loc>${alts}</url>`);
    n++;
  }
}
fs.writeFileSync(path.join(DIST, '404.html'), page('404', NENALEZENO, 'cs', { noindex: true }));
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${sitemap.join('')}</urlset>\n`);
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${S.domena}/sitemap.xml\n`);

// Menší verze fotek (dist/foto/m/, nejvýš 800 px): s ImageMagickem zmenšené, bez něj jen zkopírované (web funguje i tak)
let im = true;
try { execFileSync('convert', ['-version'], { stdio: 'ignore' }); } catch (e) { im = false; }
fs.mkdirSync(path.join(DIST, 'foto/m'), { recursive: true });
for (const u of STREDNI) {
  const src = path.join(ROOT, 'public', u);
  const dst = path.join(DIST, 'foto/m', path.basename(u));
  if (!fs.existsSync(src)) throw new Error('Chybí soubor fotky: ' + u);
  if (im) execFileSync('convert', [src, '-auto-orient', '-resize', '800x800>', '-strip', '-interlace', 'Plane', '-quality', '72', dst]);
  else fs.copyFileSync(src, dst);
}
console.log(`Hotovo: ${n} stránek (${LANGS.join(', ')}) v dist/, ${STREDNI.size} menších fotek${im ? '' : ' (bez ImageMagicku jen zkopírované)'}`);
