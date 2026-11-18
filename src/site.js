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

  // Svatby: kalkulačka orientační ceny a nezávazná poptávka (18. 11. 2026).
  // Ceny a adresy bere z data-* atributů v obsahu stránky (content/*/stranky/svatby.json), tady nejsou žádné částky.
  // Poptávka jde přes FormSubmit (formsubmit.co) na data-email; při chybě ukáže e-mail a telefon.
  document.querySelectorAll('.kalk').forEach(function (k) {
    var f = k.querySelector('.kf'), out = k.querySelector('.ks-out'), ks = k.querySelector('.ks');
    if (!f || !out) return;
    var L = (document.documentElement.lang || 'cs').slice(0, 2);
    var T = {
      cs: { bal: 'Balíček', od: 'od ', uklid: 'Úklid, předání objektu a ložní prádlo', popl: function (n, noci, c) { return 'Poplatek z pobytu (' + n + ' × ' + noci + ' noci × ' + c + ')'; },
        prip: 'Přípravný den', kiosek: 'Kiosek na terase', vCene: 'v ceně cateringu', post: function (n) { return 'Dětské postýlky (' + n + ' ks)'; }, celkem: 'Orientačně celkem', bar: 'Orientačně',
        kauce: function (c) { return 'Vratná kauce ' + c + ' převodem nejpozději 3 dny před příjezdem.'; },
        el: function (c) { return 'Elektřina podle skutečné spotřeby, ' + c + '/kWh, odečte se z kauce.'; },
        nas: 'Jídlo nacení Catering Grasel, poptávka na catering@penzion-grasel.cz. Vybavení a kiosek jsou v ceně cateringu.',
        jiny: 'Jídlo si zajistíte sami nebo u jiného dodavatele, bez poplatku.',
        uklidPo: function (c) { return 'Terasu, společenskou místnost a okolí po svatbě doúčtujeme podle odpracovaných hodin (' + c + ' za osobu a hodinu), nebo si je uklidíte sami.'; },
        obs: function (l, h) { return 'Obsluha kiosku: ' + l + ' × ' + h + ' h = ' + (l * h) + ' hodin obsluhy, cenu za hodinu vám pošleme.'; },
        obsR: function (l, h, c) { return 'Obsluha kiosku (' + l + ' × ' + h + ' h × ' + c + ')'; },
        fotky: function (c) { return 'Za fotky od fotografa vám po jejich dodání vrátíme ' + c + '.'; },
        maxSpi: 'Přespat může nejvýš 37 hostů.', vic: 'Doporučujeme 100 až 130 hostů, nejvýš 150.', max: 'Víc než 150 hostů se na terasu nevejde.',
        malo: 'Hostů celkem nemůže být méně než těch, kteří přespí.',
        ok: 'Děkujeme, poptávka odešla. Ozveme se vám co nejdřív.', posilam: 'Odesílám…', chybi: 'Vyplňte prosím jméno a platný e-mail.',
        chyba: function (e, t) { return 'Poptávku se nepodařilo odeslat. Napište nám prosím na ' + e + ' nebo zavolejte ' + t + '.'; } },
      de: { bal: 'Paket', od: 'ab ', uklid: 'Reinigung, Übergabe und Bettwäsche', popl: function (n, noci, c) { return 'Kurtaxe (' + n + ' × ' + noci + ' Nächte × ' + c + ')'; },
        prip: 'Vorbereitungstag', kiosek: 'Kiosk auf der Terrasse', vCene: 'im Catering inklusive', post: function (n) { return 'Babybetten (' + n + ' St.)'; }, celkem: 'Richtpreis gesamt', bar: 'Richtpreis',
        kauce: function (c) { return 'Rückzahlbare Kaution ' + c + ' per Überweisung spätestens 3 Tage vor Anreise.'; },
        el: function (c) { return 'Strom nach tatsächlichem Verbrauch, ' + c + '/kWh, wird von der Kaution abgezogen.'; },
        nas: 'Das Essen kalkuliert Catering Grasel, Anfragen an catering@penzion-grasel.cz. Ausstattung und Kiosk sind im Catering inklusive.',
        jiny: 'Das Essen besorgen Sie selbst oder bei einem anderen Anbieter, ohne Gebühr.',
        uklidPo: function (c) { return 'Terrasse, Gemeinschaftsraum und Umgebung nach der Hochzeit rechnen wir nach geleisteten Stunden ab (' + c + ' pro Person und Stunde), oder Sie räumen selbst auf.'; },
        obs: function (l, h) { return 'Kiosk-Bedienung: ' + l + ' × ' + h + ' h = ' + (l * h) + ' Stunden, den Stundenpreis senden wir Ihnen.'; },
        obsR: function (l, h, c) { return 'Kioskpersonal (' + l + ' × ' + h + ' Std. × ' + c + ')'; },
        fotky: function (c) { return 'Für die Fotos Ihres Fotografen erstatten wir Ihnen nach Lieferung ' + c + '.'; },
        maxSpi: 'Übernachten können höchstens 37 Gäste.', vic: 'Wir empfehlen 100 bis 130 Gäste, höchstens 150.', max: 'Mehr als 150 Gäste passen nicht auf die Terrasse.',
        malo: 'Die Gesamtzahl der Gäste kann nicht kleiner sein als die der Übernachtenden.',
        ok: 'Vielen Dank, die Anfrage wurde gesendet. Wir melden uns so bald wie möglich.', posilam: 'Wird gesendet…', chybi: 'Bitte geben Sie Ihren Namen und eine gültige E-Mail an.',
        chyba: function (e, t) { return 'Die Anfrage konnte nicht gesendet werden. Bitte schreiben Sie uns an ' + e + ' oder rufen Sie ' + t + ' an.'; } },
      en: { bal: 'Package', od: 'from ', uklid: 'Cleaning, handover and bed linen', popl: function (n, noci, c) { return 'Tourist tax (' + n + ' × ' + noci + ' nights × ' + c + ')'; },
        prip: 'Preparation day', kiosek: 'Terrace kiosk', vCene: 'included with catering', post: function (n) { return 'Cots (' + n + ')'; }, celkem: 'Indicative total', bar: 'Indicative',
        kauce: function (c) { return 'Refundable deposit of ' + c + ' by bank transfer no later than 3 days before arrival.'; },
        el: function (c) { return 'Electricity by actual consumption, ' + c + '/kWh, deducted from the deposit.'; },
        nas: 'Catering Grasel will price the food, enquiries to catering@penzion-grasel.cz. Equipment and the kiosk are included with the catering.',
        jiny: 'You arrange the food yourself or with another caterer, free of charge.',
        uklidPo: function (c) { return 'We charge cleaning of the terrace, common room and surroundings after the wedding by hours worked (' + c + ' per person per hour), or you clean up yourself.'; },
        obs: function (l, h) { return 'Kiosk staff: ' + l + ' × ' + h + ' h = ' + (l * h) + ' staff hours, we will send you the hourly rate.'; },
        obsR: function (l, h, c) { return 'Kiosk staff (' + l + ' × ' + h + ' h × ' + c + ')'; },
        fotky: function (c) { return 'For photos from your photographer we refund ' + c + ' once they are delivered.'; },
        maxSpi: 'At most 37 guests can stay overnight.', vic: 'We recommend 100 to 130 guests, 150 at most.', max: 'More than 150 guests do not fit on the terrace.',
        malo: 'The total number of guests cannot be lower than the number staying overnight.',
        ok: 'Thank you, your enquiry has been sent. We will get back to you as soon as possible.', posilam: 'Sending…', chybi: 'Please fill in your name and a valid e-mail.',
        chyba: function (e, t) { return 'The enquiry could not be sent. Please write to us at ' + e + ' or call ' + t + '.'; } }
    }[L === 'de' || L === 'en' ? L : 'cs'];
    var nb = ' ';
    var kc = function (n) {
      var neg = n < 0, s = String(Math.abs(Math.round(n))), g = L === 'en' ? ',' : nb;
      s = s.replace(/\B(?=(\d{3})+(?!\d))/g, g);
      return (neg ? '−' : '') + (L === 'en' ? 'CZK' + nb + s : s + nb + (L === 'cs' ? 'Kč' : 'CZK'));
    };
    var esc = function (t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; };
    var D = function (n) { return parseFloat(k.getAttribute('data-' + n)) || 0; };
    var hl = (k.getAttribute('data-hl') || '').split(',');
    var cislo = function (el) { var v = parseInt(el.value, 10); return isNaN(v) ? 0 : v; };
    var nazev = function (o) { return o.textContent.replace(/\s*\(.*\)\s*$/, ''); };
    var bar = document.createElement('a'); bar.className = 'ks-bar'; bar.href = '#kalk-souhrn';
    if (ks) { ks.id = 'kalk-souhrn'; f.appendChild(bar); }
    var stav = {};
    var mesice = function () {
      var o = f.balicek.options[f.balicek.selectedIndex], ok = (o.getAttribute('data-mesice') || '').split(','), m = f.mesic;
      for (var i = 0; i < m.options.length; i++) m.options[i].disabled = ok.indexOf(m.options[i].value) < 0;
      if (m.options[m.selectedIndex].disabled) for (var j = 0; j < m.options.length; j++) if (!m.options[j].disabled) { m.selectedIndex = j; break; }
    };
    var spocitej = function () {
      var o = f.balicek.options[f.balicek.selectedIndex], mes = f.mesic.value, od = o.getAttribute('data-od') === '1';
      var cena = parseFloat(o.getAttribute(hl.indexOf(mes) >= 0 ? 'data-cena-hl' : 'data-cena')) || 0;
      var spi = cislo(f.spi), hoste = cislo(f.hoste), noci = D('noci'), warn = [];
      if (spi > 37) { spi = 37; warn.push(T.maxSpi); }
      if (spi < 0) spi = 0;
      if (hoste > 150) warn.push(T.max); else if (hoste > 130) warn.push(T.vic);
      if (hoste && hoste < spi) warn.push(T.malo);
      var nas = f.querySelector('[name=catering]:checked').value === 'nas';
      f.kiosek.disabled = nas; if (nas) f.kiosek.checked = true; else if (stav.nas) f.kiosek.checked = false;
      var rows = [[T.bal + ' ' + nazev(o), (od ? T.od : '') + kc(cena)], [T.uklid, kc(D('uklid'))]];
      var sum = cena + D('uklid');
      var popl = spi * noci * D('poplatek');
      if (spi) { rows.push([T.popl(spi, noci, kc(D('poplatek'))), kc(popl)]); sum += popl; }
      var po = f.pripravny.options[f.pripravny.selectedIndex], pc = parseFloat(po.getAttribute('data-cena')) || 0;
      if (pc) { rows.push([T.prip + ': ' + po.textContent.replace(/\s*\(.*\)\s*$/, '').toLowerCase(), kc(pc)]); sum += pc; }
      if (nas) rows.push([T.kiosek, T.vCene]);
      else if (f.kiosek.checked) { var kk = parseFloat(f.kiosek.getAttribute('data-cena')) || 0; rows.push([T.kiosek, kc(kk)]); sum += kk; }
      var ol = Math.max(0, cislo(f.obs_lidi)), oh = Math.max(0, cislo(f.obs_hod)), osaz = D('obsluha');
      if (ol > 0 && oh > 0 && osaz) { rows.push([T.obsR(ol, oh, kc(osaz)), kc(ol * oh * osaz)]); sum += ol * oh * osaz; }
      var pn = Math.max(0, cislo(f.postylky)), pcen = parseFloat(f.postylky.getAttribute('data-cena')) || 0;
      if (pn) { rows.push([T.post(pn), kc(pn * pcen)]); sum += pn * pcen; }
      var celkem = (od ? T.od : '') + kc(sum);
      var notes = [nas ? T.nas : T.jiny, T.kauce(kc(D('kauce'))), T.el(kc(D('kwh'))), T.uklidPo(kc(D('uklid-hod')))];
      if (ol > 0 && oh > 0 && !osaz) notes.push(T.obs(ol, oh));
      if (f.fotky.checked) notes.push(T.fotky(kc(D('fotky'))));
      out.innerHTML = '<table>' + rows.map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('') +
        '<tr class="sum"><th>' + esc(T.celkem) + '</th><td>' + esc(celkem) + '</td></tr></table>' +
        warn.map(function (w) { return '<p class="warn">' + esc(w) + '</p>'; }).join('') +
        '<ul>' + notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
      bar.innerHTML = '<span>' + esc(T.bar) + '</span><b>' + esc(celkem) + '</b>';
      stav = { balicek: nazev(o), mesic: f.mesic.options[f.mesic.selectedIndex].textContent, spi: spi, hoste: hoste, nas: nas,
        prip: pc ? po.textContent : '-', kiosek: nas ? T.vCene : (f.kiosek.checked ? 'ano' : 'ne'), obs: ol > 0 && oh > 0 ? ol + ' × ' + oh + ' h' : '-',
        post: pn, fotky: f.fotky.checked ? 'ano' : 'ne', celkem: celkem };
    };
    f.addEventListener('submit', function (e) { e.preventDefault(); });
    f.addEventListener('input', spocitej);
    f.addEventListener('change', function (e) { if (e.target === f.balicek) mesice(); spocitej(); });
    mesice(); spocitej();

    var pf = k.parentElement.querySelector('.pf');
    if (!pf) return;
    var ps = pf.querySelector('.pf-stav'), btn = pf.querySelector('button[type=submit]');
    var email = k.getAttribute('data-email'), tel = k.getAttribute('data-tel');
    var hlasit = function (cls, html) { ps.className = 'pf-stav ' + cls; ps.innerHTML = html; };
    var chyba = function () {
      hlasit('chyba', esc(T.chyba('@@E', '@@T')).replace('@@E', '<a href="mailto:' + email + '">' + email + '</a>').replace('@@T', '<a href="tel:' + tel.replace(/\s/g, '') + '">' + tel + '</a>'));
      btn.disabled = false;
    };
    pf.addEventListener('submit', function (e) {
      e.preventDefault();
      var jm = pf.jmeno.value.trim(), em = pf.email.value.trim();
      if (!jm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { hlasit('chyba', esc(T.chybi)); return; }
      if (pf._honey.value) { hlasit('ok', esc(T.ok)); pf.reset(); return; }
      spocitej();
      var data = {
        _subject: 'Poptávka svatby z webu: ' + jm + (pf.termin.value.trim() ? ', ' + pf.termin.value.trim() : ''),
        _template: 'table', _honey: '', _replyto: em, _url: location.href,
        'Jméno': jm, 'E-mail': em, 'Telefon': pf.telefon.value.trim() || '-', 'Termín': pf.termin.value.trim() || '-', 'Zpráva': pf.zprava.value.trim() || '-',
        'Balíček': stav.balicek, 'Měsíc': stav.mesic, 'Hostů celkem': String(stav.hoste), 'Přespí': String(stav.spi),
        'Jídlo': stav.nas ? 'Catering od nás (Catering Grasel)' : 'Jiný dodavatel nebo vlastní jídlo',
        'Přípravný den': stav.prip, 'Kiosek': stav.kiosek, 'Obsluha kiosku': stav.obs, 'Dětské postýlky': String(stav.post),
        'Fotky za odměnu': stav.fotky, 'Orientační cena z kalkulačky': stav.celkem, 'Jazyk stránky': L
      };
      btn.disabled = true; hlasit('', esc(T.posilam));
      fetch('https://formsubmit.co/ajax/' + email, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && (j.success === true || j.success === 'true')) { hlasit('ok', esc(T.ok)); pf.reset(); btn.disabled = false; }
          else chyba();
        })
        .catch(chyba);
    });
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
