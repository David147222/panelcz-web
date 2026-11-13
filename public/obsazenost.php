<?php
// Obsazenost Panelcz ve formátu iCalendar (ICS) pro e-chalupy.cz a další portály.
// Adresa: https://panelcz.cz/obsazenost.ics (přesměrování v .htaccess).
//
// Údaje se berou z online rezervace Previo (Reservation+), stejně jako je vidí hosté na webu:
//   - celý areál (září–červen),
//   - apartmány 1–4 v létě.
// Den je v kalendáři obsazený, jen když není volný ani celý areál, ani žádný z letních apartmánů.
// V Previu se nic nemění, skript jen čte veřejnou obsazenost.
//
// Výsledek se ukládá na 1 hodinu. Když Previo zrovna neodpovídá, pošle se poslední uložená verze,
// aby portál kvůli výpadku neuvolnil obsazené termíny.

const PREVIO_CELEK = '01a1a149-c8ab-73eb-9112-7178a56e721d';
const PREVIO_LETO = '01a1a14a-eab3-719a-a68a-e6f5f340dd50';
const DNI_DOPREDU = 550;          // jak daleko dopředu kalendář posílat (cca 18 měsíců)
const PLATNOST_CACHE = 3600;      // sekundy
const CACHE = __DIR__ . '/obsazenost-cache.ics';

function posli($ics) {
  header('Content-Type: text/calendar; charset=utf-8');
  header('Content-Disposition: inline; filename="panelcz-obsazenost.ics"');
  header('Cache-Control: max-age=900');
  echo $ics;
  exit;
}

function http($url, $post = null, $cookie = '') {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_USERAGENT => 'Panelcz obsazenost (https://panelcz.cz/)',
    CURLOPT_HTTPHEADER => array_filter([
      $cookie ? 'Cookie: ' . $cookie : null,
      $post !== null ? 'X-Requested-With: XMLHttpRequest' : null,
      $post !== null ? 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8' : null,
    ]),
  ]);
  if ($post !== null) {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
  }
  $res = curl_exec($ch);
  if ($res === false) throw new Exception('Previo neodpovídá: ' . curl_error($ch));
  $kod = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $hlav = substr($res, 0, curl_getinfo($ch, CURLINFO_HEADER_SIZE));
  $telo = substr($res, curl_getinfo($ch, CURLINFO_HEADER_SIZE));
  curl_close($ch);
  return [$kod, $hlav, $telo];
}

// Otevře online rezervaci (jako host) a vrátí parametry relace a cookie.
function relace($id) {
  $url = 'https://booking.previo.app/?id=' . $id;
  $cookie = '';
  for ($i = 0; $i < 5; $i++) {
    [$kod, $hlav] = http($url, null, $cookie);
    if (preg_match_all('/^Set-Cookie:\s*([^;\r\n]+)/mi', $hlav, $m)) $cookie = implode('; ', $m[1]);
    if (!preg_match('/^Location:\s*(\S+)/mi', $hlav, $m)) break;
    $url = (strpos($m[1], 'http') === 0) ? $m[1] : 'https://booking.previo.app' . $m[1];
  }
  $q = [];
  parse_str((string) parse_url($url, PHP_URL_QUERY), $q);
  if (empty($q['hotId'])) throw new Exception('Previo nevrátilo relaci');
  return [$q, $cookie];
}

// Vrátí [datum => true/false] (true = aspoň jedna jednotka v té konfiguraci volná) pro DNI_DOPREDU dní.
// Previo vrací obsazenost po 16 dnech; dotazy jdou po několika najednou, aby to netrvalo minutu.
function volno($id, $od) {
  [$q, $cookie] = relace($id);
  $data = [];
  for ($i = 0; $i < DNI_DOPREDU; $i += 16) $data[] = (clone $od)->modify("+$i days")->format('Y-m-d');
  $vysledek = [];
  foreach (array_chunk($data, 10) as $davka) {
    $mh = curl_multi_init();
    $spojeni = [];
    foreach ($davka as $den) {
      $p = $q + ['isMobile' => 'false', 'drawOccupancyBy' => 'object', 'date' => $den];
      $ch = curl_init('https://booking.previo.app/occupancy/index/on-term-update/');
      curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($p),
        CURLOPT_USERAGENT => 'Panelcz obsazenost (https://panelcz.cz/)',
        CURLOPT_HTTPHEADER => ['Cookie: ' . $cookie, 'X-Requested-With: XMLHttpRequest', 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8'],
      ]);
      curl_multi_add_handle($mh, $ch);
      $spojeni[] = $ch;
    }
    do { $stav = curl_multi_exec($mh, $bezi); if ($bezi) curl_multi_select($mh, 1.0); } while ($bezi && $stav === CURLM_OK);
    foreach ($spojeni as $ch) {
      $kod = curl_getinfo($ch, CURLINFO_HTTP_CODE);
      $j = json_decode((string) curl_multi_getcontent($ch), true);
      curl_multi_remove_handle($mh, $ch);
      curl_close($ch);
      if ($kod !== 200 || !isset($j['html'])) throw new Exception('Previo vrátilo chybu ' . $kod);
      // Každá buňka: <a class="avail _yes|_no ..."> <div class="tooltip-contents"> <div class="date"> čt, 1. 7. 2027 </div> ...
      preg_match_all('/<a class="avail ([^"]*)"[^>]*>\s*<div class="tooltip-contents">\s*<div class="date">[^<]*?(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/u', $j['html'], $m, PREG_SET_ORDER);
      if (!$m) throw new Exception('Previo vrátilo prázdnou obsazenost');
      foreach ($m as $b) {
        $d = sprintf('%04d-%02d-%02d', $b[4], $b[3], $b[2]);
        $jeVolno = (bool) preg_match('/(^|\s)_yes(\s|$)/', $b[1]);
        $vysledek[$d] = ($vysledek[$d] ?? false) || $jeVolno;
      }
    }
    curl_multi_close($mh);
  }
  // Kontrola, že nechybí žádný den (jinak by se mezera v kalendáři tvářila jako volno)
  for ($i = 0; $i < DNI_DOPREDU; $i++) {
    $d = (clone $od)->modify("+$i days")->format('Y-m-d');
    if (!isset($vysledek[$d])) throw new Exception("Previo nevrátilo den $d");
  }
  return $vysledek;
}

function sestav() {
  $tz = new DateTimeZone('Europe/Prague');
  $dnes = new DateTime('today', $tz);
  $celek = volno(PREVIO_CELEK, $dnes);
  $leto = volno(PREVIO_LETO, $dnes);
  $dny = array_unique(array_merge(array_keys($celek), array_keys($leto)));
  sort($dny);
  if (count($dny) < 300) throw new Exception('Previo vrátilo málo dní');

  // Souvislé úseky obsazených nocí → události (DTEND je den odjezdu, tedy den po poslední noci)
  $udalosti = [];
  $start = null; $predchozi = null;
  foreach ($dny as $d) {
    $obsazeno = empty($celek[$d]) && empty($leto[$d]);
    $navazuje = $predchozi !== null && (new DateTime($predchozi))->modify('+1 day')->format('Y-m-d') === $d;
    if ($obsazeno && $start !== null && !$navazuje) { $udalosti[] = [$start, $predchozi]; $start = null; }
    if ($obsazeno && $start === null) $start = $d;
    if (!$obsazeno && $start !== null) { $udalosti[] = [$start, $predchozi]; $start = null; }
    $predchozi = $d;
  }
  if ($start !== null) $udalosti[] = [$start, $predchozi];

  $ted = gmdate('Ymd\THis\Z');
  $r = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Panelcz//Obsazenost//CS", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Panelcz – obsazenost"];
  foreach ($udalosti as [$od, $do]) {
    $odjezd = (new DateTime($do))->modify('+1 day')->format('Ymd');
    $prijezd = str_replace('-', '', $od);
    $r[] = "BEGIN:VEVENT";
    $r[] = "UID:panelcz-$prijezd-$odjezd@panelcz.cz";
    $r[] = "DTSTAMP:$ted";
    $r[] = "DTSTART;VALUE=DATE:$prijezd";
    $r[] = "DTEND;VALUE=DATE:$odjezd";
    $r[] = "SUMMARY:Obsazeno";
    $r[] = "TRANSP:OPAQUE";
    $r[] = "END:VEVENT";
  }
  $r[] = "END:VCALENDAR";
  return implode("\r\n", $r) . "\r\n";
}

if (is_file(CACHE) && time() - filemtime(CACHE) < PLATNOST_CACHE) posli(file_get_contents(CACHE));
try {
  $ics = sestav();
  @file_put_contents(CACHE, $ics, LOCK_EX);
  posli($ics);
} catch (Exception $e) {
  error_log('obsazenost.php: ' . $e->getMessage());
  if (is_file(CACHE)) posli(file_get_contents(CACHE));
  http_response_code(503);
  header('Retry-After: 3600');
  echo 'Obsazenost je dočasně nedostupná.';
}
