<?php
// Přihlášení do administrace přes GitHub (OAuth most pro Decap CMS).
// Přístupové údaje GitHub OAuth aplikace jsou v souboru oauth-config.php jen na serveru (není v repozitáři).
$cfg = __DIR__ . '/oauth-config.php';
if (!file_exists($cfg)) { http_response_code(500); exit('Chybí oauth-config.php'); }
require $cfg; // definuje $CLIENT_ID a $CLIENT_SECRET
session_start();
$self = 'https://' . $_SERVER['HTTP_HOST'] . strtok($_SERVER['REQUEST_URI'], '?');

if (!isset($_GET['code'])) {
  $_SESSION['oauth_state'] = bin2hex(random_bytes(16));
  $scope = preg_match('/^[a-z_,:]+$/', $_GET['scope'] ?? '') ? $_GET['scope'] : 'public_repo';
  header('Location: https://github.com/login/oauth/authorize?' . http_build_query([
    'client_id' => $CLIENT_ID, 'redirect_uri' => $self, 'scope' => $scope, 'state' => $_SESSION['oauth_state'],
  ]));
  exit;
}

$status = 'error'; $content = ['message' => 'Přihlášení se nezdařilo'];
if (!empty($_SESSION['oauth_state']) && hash_equals($_SESSION['oauth_state'], $_GET['state'] ?? '')) {
  $ch = curl_init('https://github.com/login/oauth/access_token');
  curl_setopt_array($ch, [
    CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Accept: application/json'],
    CURLOPT_POSTFIELDS => http_build_query([
      'client_id' => $CLIENT_ID, 'client_secret' => $CLIENT_SECRET, 'code' => $_GET['code'], 'redirect_uri' => $self,
    ]),
  ]);
  $res = json_decode(curl_exec($ch), true); curl_close($ch);
  if (!empty($res['access_token'])) { $status = 'success'; $content = ['token' => $res['access_token'], 'provider' => 'github']; }
}
unset($_SESSION['oauth_state']);
$msg = 'authorization:github:' . $status . ':' . json_encode($content);
$origin = 'https://' . $_SERVER['HTTP_HOST'];
?><!doctype html><html><body><script>
(function () {
  var origin = <?= json_encode($origin) ?>, msg = <?= json_encode($msg) ?>;
  window.addEventListener('message', function (e) {
    if (e.origin !== origin) return;
    window.opener.postMessage(msg, origin);
    window.close();
  });
  window.opener.postMessage('authorizing:github', origin);
})();
</script><p>Přihlašuji…</p></body></html>
