// Panelcz – skripty webu (menu, galerie, cookies, Reservation+ z Previa)
(function () {
  // Mobilní menu
  var burger = document.querySelector('.burger');
  if (burger) burger.addEventListener('click', function () { document.body.classList.toggle('mo'); });

  // Fotky na pozadí (dlaždice, galerie, výzvy) se načtou, až se k nim stránka přiblíží – build.js je dává do data-bg
  var bgs = document.querySelectorAll('[data-bg]');
  var ukazBg = function (el) { el.style.backgroundImage = "url('" + el.getAttribute('data-bg') + "')"; el.removeAttribute('data-bg'); };
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); ukazBg(e.target); } });
    }, { rootMargin: '600px 0px' });
    bgs.forEach(function (el) { io.observe(el); });
  } else bgs.forEach(ukazBg);

  // Zvětšení plánku / fotky
  window.lb = function (src, label) {
    var d = document.createElement('div');
    d.className = 'lb';
    d.onclick = function () { d.remove(); };
    if (src) { var i = document.createElement('img'); i.src = src; i.alt = ''; d.appendChild(i); }
    else { var p = document.createElement('div'); p.className = 'phb'; p.textContent = (label || '') + ({ de: ' – folgt', en: ' – coming soon' }[document.documentElement.lang] || ' – doplníme'); d.appendChild(p); }
    document.body.appendChild(d);
  };
  window.toast = function (t) {
    var d = document.createElement('div'); d.className = 'toast'; d.textContent = t;
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, 3500);
  };

  // Cookies – jen informační lišta (web nepoužívá analytické cookies)
  var ck = document.getElementById('ck');
  var seen = false;
  try { seen = localStorage.getItem('ck') === '1'; } catch (e) {}
  if (ck && !seen) {
    ck.hidden = false;
    document.getElementById('ck-ok').addEventListener('click', function () {
      try { localStorage.setItem('ck', '1'); } catch (e) {}
      ck.hidden = true;
    });
  }

  // Prolínání fotek ve "videu" na úvodní stránce
  setInterval(function () {
    var v = document.getElementById('vid'); if (!v) return;
    var a = v.querySelectorAll('.sl'); if (!a.length) return;
    var i = 0; for (var k = 0; k < a.length; k++) if (a[k].classList.contains('on')) i = k;
    a[i].classList.remove('on'); a[(i + 1) % a.length].classList.add('on');
  }, 3500);

  // Záložky rezervace (Celý areál × Apartmány v létě) u všech formulářů na ubytování.
  // Adresa nebo odkaz s #leto / #cely otevře danou záložku; odkaz na cokoli UVNITŘ záložky (např. #rplus-leto) ji taky otevře.
  document.querySelectorAll('.rtabs').forEach(function (bar) {
    var wrap = bar.parentElement; wrap.classList.add('rtabs-js');
    var tabs = bar.querySelectorAll('.rtab');
    var panel = function (id) {
      var el = id && document.getElementById(id); if (!el) return null;
      var p = el.classList.contains('rpanel') ? el : el.closest('.rpanel');
      return p && p.parentElement === wrap ? p : null;
    };
    var ukaz = function (id) {
      tabs.forEach(function (t) { var on = t.getAttribute('aria-controls') === id; t.classList.toggle('on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
      wrap.querySelectorAll(':scope>.rpanel').forEach(function (p) {
        p.classList.toggle('on', p.id === id);
        if (p.id === id && window.__rplusOtevri) window.__rplusOtevri(p);
      });
    };
    var jdiNa = function (id) {
      var p = panel(id); if (!p) return false;
      ukaz(p.id);
      (p.id === id ? bar : document.getElementById(id)).scrollIntoView({ block: 'start' });
      return true;
    };
    tabs.forEach(function (t) { t.addEventListener('click', function () { ukaz(t.getAttribute('aria-controls')); }); });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
      var id = a.getAttribute('href').slice(1);
      if (jdiNa(id)) { e.preventDefault(); if (history.replaceState) history.replaceState(null, '', '#' + id); }
    });
    var zAdresy = function () { jdiNa(location.hash.slice(1)); };
    zAdresy(); window.addEventListener('hashchange', zAdresy);
  });

  // Reservation+ (Previo): najde všechna místa pro formulář a načte je
  // Jazyk formuláře podle jazyka stránky; cizincům ceny v eurech
  var lang = (document.documentElement.lang || 'cs').slice(0, 2);
  var cur = lang === 'cs' ? 'CZK' : 'EUR';
  var boxes = document.querySelectorAll('[id^="previo-booking-engine-"]');
  // Formulář ve skryté záložce se načte až při jejím prvním otevření: Previo ve skrytém místě
  // nedoběhne a natáhne se do výšky (10. 11. 2026). Skript Previa při každém spuštění převezme
  // čekající nastavení z window.bookingEngineConfig, proto se pro odložený formulář spustí znovu,
  // ale nikdy dřív, než doběhne předchozí (jinak by druhé spuštění našlo prázdný seznam).
  var fronta = [], nacitam = false;
  var nacti = function (cfgs) {
    fronta = fronta.concat(cfgs);
    if (nacitam || !fronta.length) return;
    nacitam = true;
    window.bookingEngineConfig = fronta; fronta = [];
    var s = document.createElement('script');
    s.src = 'https://booking.previo.app/loader/';
    s.onload = s.onerror = function () { nacitam = false; nacti([]); };
    document.head.appendChild(s);
  };
  window.__rplusOtevri = function (panel) {
    if (panel && panel.__rplusCfg) { var c = panel.__rplusCfg; panel.__rplusCfg = null; nacti([c]); }
  };
  if (boxes.length) {
    var hned = [];
    boxes.forEach(function (el) {
      var id = el.id.replace('previo-booking-engine-', '');
      var cfg = { id: id, customSelector: el.id, lang: lang, currency: cur };
      // Volitelný výchozí termín (data-prijezd / data-odjezd, RRRR-MM-DD), např. začátek letní sezóny.
      // Použije se jen dokud je příjezd v budoucnu.
      var a = el.getAttribute('data-prijezd'), d = el.getAttribute('data-odjezd');
      if (a && d && new Date(a + 'T12:00:00') > new Date()) { cfg.arrival = a; cfg.departure = d; }
      new MutationObserver(function () {
        if (el.children.length) el.closest('.rplus').classList.add('loaded');
      }).observe(el, { childList: true });
      var p = el.closest('.rpanel');
      if (p && !p.classList.contains('on') && p.parentElement.classList.contains('rtabs-js')) p.__rplusCfg = cfg;
      else hned.push(cfg);
    });
    nacti(hned);
  }
})();
