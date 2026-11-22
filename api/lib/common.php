<?php
// Funções comuns do envio do printable grátis (Just A Food Blog).
// Dados privados (configuração, lista de e-mails, controle de abuso) ficam FORA do public_html,
// na pasta ../justafoodblog-private, para nunca serem acessíveis pelo navegador nem apagados pelo deploy do Git.

declare(strict_types=1);

const SITE_URL  = 'https://www.justafoodblog.com';
const TOKEN_DAYS = 30;           // o link de download vale 30 dias
const RATE_MAX   = 5;            // no máximo 5 pedidos por hora por endereço de internet
const FILES = [
    'letter' => ['food-symptom-diary-us-letter.pdf', 'Just-A-Food-Blog-Food-Symptom-Diary-US-Letter.pdf'],
    'a4'     => ['food-symptom-diary-a4.pdf',        'Just-A-Food-Blog-Food-Symptom-Diary-A4.pdf'],
];

function private_dir(): string {
    $root = rtrim($_SERVER['DOCUMENT_ROOT'] ?? dirname(__DIR__, 2), '/');
    $dir  = dirname($root) . '/justafoodblog-private';
    if (!is_dir($dir)) { @mkdir($dir, 0750, true); }
    return $dir;
}

function load_config(): ?array {
    $file = private_dir() . '/config.php';
    if (!is_file($file)) { return null; }
    $cfg = require $file;
    return (is_array($cfg) && !empty($cfg['smtp_pass']) && $cfg['smtp_pass'] !== 'SUA-SENHA') ? $cfg : null;
}

function ip_hash(): string {
    return substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|jafb'), 0, 16);
}

function rate_limited(): bool {
    $file = private_dir() . '/ratelimit.json';
    $now  = time();
    $data = is_file($file) ? (json_decode((string) file_get_contents($file), true) ?: []) : [];
    foreach ($data as $k => $times) {                       // limpa registros com mais de 1 hora
        $data[$k] = array_values(array_filter($times, fn($t) => $t > $now - 3600));
        if (!$data[$k]) { unset($data[$k]); }
    }
    $id = ip_hash();
    $limited = count($data[$id] ?? []) >= RATE_MAX;
    if (!$limited) { $data[$id][] = $now; }
    file_put_contents($file, json_encode($data), LOCK_EX);
    return $limited;
}

function subscribers_file(): string {
    $file = private_dir() . '/subscribers.csv';
    if (!is_file($file)) {
        file_put_contents($file, "date_utc,email,token,source,consent,ip_hash\n", LOCK_EX);
    }
    return $file;
}

function add_subscriber(string $email, string $source): string {
    $token = bin2hex(random_bytes(16));
    $row   = [gmdate('Y-m-d H:i:s'), $email, $token, $source, 'yes', ip_hash()];
    $fh = fopen(subscribers_file(), 'a');
    flock($fh, LOCK_EX);
    fputcsv($fh, $row);
    flock($fh, LOCK_UN);
    fclose($fh);
    return $token;
}

function token_valid(string $token): bool {
    if (!preg_match('/^[a-f0-9]{32}$/', $token)) { return false; }
    $fh = @fopen(subscribers_file(), 'r');
    if (!$fh) { return false; }
    $ok = false;
    while (($r = fgetcsv($fh)) !== false) {
        if (($r[2] ?? '') === $token) {
            $ok = (strtotime(($r[0] ?? '') . ' UTC') ?: 0) > time() - TOKEN_DAYS * 86400;
            break;
        }
    }
    fclose($fh);
    return $ok;
}
