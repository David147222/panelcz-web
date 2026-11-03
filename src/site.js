// Panel Chmelnice – skripty webu (menu, galerie, cookies, Reservation+ z Previa)
(function () {
  // Mobilní menu
  var burger = document.querySelector('.burger');
  if (burger) burger.addEventListener('click', function () { document.body.classList.toggle('mo'); });

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

  // Reservation+ (Previo): najde všechna místa pro formulář a načte je
  // Jazyk formuláře podle jazyka stránky; cizincům ceny v eurech
  var lang = (document.documentElement.lang || 'cs').slice(0, 2);
  var cur = lang === 'cs' ? 'CZK' : 'EUR';
  var boxes = document.querySelectorAll('[id^="previo-booking-engine-"]');
  if (boxes.length) {
    window.bookingEngineConfig = window.bookingEngineConfig || [];
    boxes.forEach(function (el) {
      var id = el.id.replace('previo-booking-engine-', '');
      window.bookingEngineConfig.push({ id: id, customSelector: el.id, lang: lang, currency: cur });
      new MutationObserver(function () {
        if (el.children.length) el.closest('.rplus').classList.add('loaded');
      }).observe(el, { childList: true });
    });
    var s = document.createElement('script');
    s.src = 'https://booking.previo.app/loader/';
    document.head.appendChild(s);
  }
})();
