<?php
// Entrega o PDF do printable grátis só para quem recebeu o link por e-mail (token válido por 30 dias).
declare(strict_types=1);
require __DIR__ . '/lib/common.php';

header('X-Robots-Tag: noindex, nofollow');

$token = (string) ($_GET['t'] ?? '');
$f     = (string) ($_GET['f'] ?? 'letter');
$file  = FILES[$f] ?? null;

if (!$file || !token_valid($token)) {
    header('Location: ' . SITE_URL . '/free-printables/?error=expired#freebie-h', true, 303);
    exit;
}

$path = __DIR__ . '/files/' . $file[0];
if (!is_file($path)) { http_response_code(404); exit('File not found.'); }

header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="' . $file[1] . '"');
header('Content-Length: ' . filesize($path));
header('Cache-Control: private, no-store');
readfile($path);
