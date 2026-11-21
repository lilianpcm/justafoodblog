<?php
// Recebe o formulário do printable grátis, guarda o e-mail e envia o link de download
// pelo hello@justafoodblog.com (SMTP autenticado da Hostinger, como o Post SMTP fazia no WordPress).
declare(strict_types=1);
require __DIR__ . '/lib/common.php';
require __DIR__ . '/lib/PHPMailer/Exception.php';
require __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require __DIR__ . '/lib/PHPMailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;

header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$wantsJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

function finish(bool $ok, string $code): void {
    global $wantsJson;
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($ok ? 200 : 400);
        echo json_encode(['ok' => $ok, 'code' => $code]);
    } else {
        header('Location: ' . SITE_URL . ($ok ? '/free-printables/thanks/' : '/free-printables/?error=' . urlencode($code) . '#freebie-h'), true, 303);
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { finish(false, 'method'); }

// Robôs de spam preenchem o campo escondido "website"; pessoas não veem esse campo.
if (trim((string) ($_POST['website'] ?? '')) !== '') { finish(true, 'ok'); }

$email   = trim((string) ($_POST['email'] ?? ''));
$consent = ($_POST['consent'] ?? '') === 'yes';
$source  = preg_replace('/[^a-z0-9\/_-]/i', '', (string) ($_POST['source'] ?? '')) ?: 'site';

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) { finish(false, 'email'); }
if (!$consent) { finish(false, 'consent'); }
if (rate_limited()) { finish(false, 'limit'); }

$cfg = load_config();
if (!$cfg) { error_log('justafoodblog: config.php ausente ou sem senha'); finish(false, 'server'); }

$token  = add_subscriber($email, $source);
$letter = SITE_URL . '/api/download.php?t=' . $token . '&f=letter';
$a4     = SITE_URL . '/api/download.php?t=' . $token . '&f=a4';

$html = '<!doctype html><html><body style="margin:0;background:#F2F4F6;font-family:Arial,Helvetica,sans-serif;color:#213445">'
  . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">'
  . '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:0"><tr><td style="padding:32px">'
  . '<p style="margin:0 0 4px;font-size:13px;font-weight:bold;letter-spacing:2px">JUST A FOOD BLOG</p>'
  . '<h1 style="margin:0 0 16px;font-size:24px;line-height:30px">Your free printable is ready</h1>'
  . '<p style="margin:0 0 20px;font-size:17px;line-height:26px">Here is <strong>7-Day Food &amp; Symptom Diary + My Eat / Limit / Avoid List</strong>: track what you eat and how you feel for a week, then build your own eat, limit and avoid list. Choose your paper size:</p>'
  . '<p style="margin:0 0 14px">'
  . '<a href="' . $letter . '" style="display:inline-block;background:#A3352B;color:#ffffff;text-decoration:none;font-weight:bold;font-size:17px;padding:14px 24px;border-radius:0;margin:0 8px 10px 0">Download (US Letter)</a>'
  . '<a href="' . $a4 . '" style="display:inline-block;background:#A3352B;color:#ffffff;text-decoration:none;font-weight:bold;font-size:17px;padding:14px 24px;border-radius:0;margin:0 8px 10px 0">Download (A4)</a>'
  . '</p>'
  . '<p style="margin:0 0 16px;font-size:15px;line-height:23px">The links work for ' . TOKEN_DAYS . ' days. Want a complete food list for your diet? See our printables at <a href="' . SITE_URL . '/shop/" style="color:#213445">justafoodblog.com</a>.</p>'
  . '<p style="margin:0;font-size:13px;line-height:20px;color:#5B6878">General information, not medical advice. Talk to your doctor or a registered dietitian before changing your diet.<br>You received this email because you asked for this printable at justafoodblog.com. Reply to this email if you have any questions or no longer want to hear from us.</p>'
  . '</td></tr></table></td></tr></table></body></html>';

$text = "Your free printable is ready\n\n7-Day Food & Symptom Diary + My Eat / Limit / Avoid List\n\nDownload (US Letter): $letter\nDownload (A4): $a4\n\n"
  . "The links work for " . TOKEN_DAYS . " days.\nComplete food lists for your diet: " . SITE_URL . "/shop/\n\n"
  . "General information, not medical advice. Talk to your doctor or a registered dietitian before changing your diet.\n"
  . "You received this email because you asked for this printable at justafoodblog.com. Reply if you have questions or no longer want to hear from us.\n";

try {
    $m = new PHPMailer(true);
    $m->isSMTP();
    $m->Host       = $cfg['smtp_host'];
    $m->Port       = (int) $cfg['smtp_port'];
    $m->SMTPAuth   = true;
    $m->Username   = $cfg['smtp_user'];
    $m->Password   = $cfg['smtp_pass'];
    $m->SMTPSecure = ((int) $cfg['smtp_port'] === 465) ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
    $m->CharSet    = 'UTF-8';
    $m->setFrom($cfg['from_email'], $cfg['from_name']);
    $m->addReplyTo($cfg['from_email'], $cfg['from_name']);
    $m->addAddress($email);
    $m->Subject = 'Your free printable: 7-Day Food & Symptom Diary';
    $m->isHTML(true);
    $m->Body    = $html;
    $m->AltBody = $text;
    $m->send();
} catch (Throwable $e) {
    error_log('justafoodblog: falha no envio: ' . $e->getMessage());
    finish(false, 'send');
}

finish(true, 'ok');
