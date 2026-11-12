# Changelog

История изменений исходного проекта доступна в
[CHANGELOG форка fibanez7/vscode-sftp](https://github.com/fibanez7/vscode-sftp/blob/develop/CHANGELOG.md).

## Изменения этого форка

### 1.18.2-5

* Добавлена обработка SSH-алиаса в `host` из `sshConfigPath`, включая
  эффективные параметры подходящих секций `Host` и `Host *`:
  `HostName`, `User`, `Port`, `ConnectTimeout`, `ServerAliveInterval` и
  `ServerAliveCountMax`.
* `sshConfigPath` используется и без явно заданного `privateKeyPath`; по
  умолчанию читается `~/.ssh/config`.
* Если `privateKeyPath` отсутствует или указывает на несуществующий файл,
  аутентификация переключается на первый эффективный `IdentityFile` из SSH
  конфигурации. Существующий `privateKeyPath` сохраняет приоритет.
* Добавлена поддержка `IdentityAgent` и `IdentitiesOnly`. Тип файла из
  `IdentityFile` определяется по содержимому. Для
  публичного ключа из конфигурации SSH-агенту предлагается только
  соответствующая идентичность.
* Подсказка свойства `host` в `sftp.json` и документация сообщают о поддержке
  SSH-алиасов.
* Исправлена гонка при одновременном создании удаленного каталога в SFTP и
  FTP: ошибка повторного `mkdir` игнорируется только если `lstat` подтверждает,
  что каталог уже создан другой операцией.
* Обновлены зависимости и инструменты сборки: `joi`, `tmp`, `Jest`,
  `TypeScript`, `webpack` и `ts-loader`.