<?php
// MODELO do arquivo de configuração do envio do printable grátis.
// NÃO coloque a senha aqui (este arquivo vai para o GitHub, que é público).
//
// Na Hostinger, pelo Gerenciador de Arquivos:
// 1) Crie a pasta  justafoodblog-private  FORA do public_html (ao lado dela, na pasta acima).
// 2) Dentro dela, crie o arquivo  config.php  com o conteúdo abaixo e troque SUA-SENHA
//    pela senha da caixa hello@justafoodblog.com.
return [
    'smtp_host'  => 'smtp.hostinger.com',
    'smtp_port'  => 465,
    'smtp_user'  => 'hello@justafoodblog.com',
    'smtp_pass'  => 'SUA-SENHA',
    'from_email' => 'hello@justafoodblog.com',
    'from_name'  => 'Just A Food Blog',
];
