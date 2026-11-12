# vscode-sftp fork

Форк [fibanez7/vscode-sftp](https://github.com/fibanez7/vscode-sftp) для личного пользования.

В этот форк добавлена поддержка alias в `host` и выбор приватного ключа из ssh агента по указанному в конфигурации публичному ключу, вместо перебора всех ключей внутри агента.

## Настройка

Для переносимой конфигурации достаточно указать путь к SSH-конфигу и алиас хоста, существующий в ssh config:

```json
{
	"name": "iteminfo",
	"context": "_items",
	"host": "<alias>",
	"protocol": "sftp",
	"sshConfigPath": "~/.ssh/config",
	"remotePath": "/var/lib/myproject/import/",
	"uploadOnSave": true,
	"useTempFile": true,
	"openSsh": true
}
```

```txt
Host *
	IdentityAgent /run/user/<uid>/ssh-agent.sock
	IdentitiesOnly yes

Host <alias>
	HostName <ip>
	IdentityFile ~/.ssh/key.pub
	User <remoteUser>
	Port <remotePort>
```

Для алиаса из `host` обрабатываются подходящие секции `Host`, включая общие параметры из `Host *`. Поддерживаются:
* `HostName`
* `User`
* `Port`
* `ConnectTimeout`
* `ServerAliveInterval`
* `ServerAliveCountMax`
* `IdentityAgent`
* `IdentitiesOnly`
* `IdentityFile`.
* `ProxyJump` с одним alias, объявленным в том же SSH-конфиге.

Для `ProxyJump bastion` расширение сначала подключается к alias `bastion`,
затем устанавливает SFTP-соединение с целевым хостом через него. Параметры
подключения и ключ для `bastion` берутся из его собственной секции `Host`.
Несколько jump-host, а также формы `user@host:port` пока не поддерживаются.

## Выбор способа аутентификации

1. Если в `sftp.json` указан существующий `privateKeyPath`, используется этот приватный ключ.
2. Если `privateKeyPath` не указан или файл не существует, используется первый эффективный `IdentityFile` из SSH-конфигурации, указанной в `sshConfigPath`.
3. Тип `IdentityFile` определяется по содержимому файла:
   - приватный ключ используется напрямую;
   - публичный ключ используется для выбора соответствующего приватного ключа в `IdentityAgent`.
4. При работе через агент расширение не перебирает все его ключи: агенту сразу передаётся запрос подписи выбранным публичным ключом.