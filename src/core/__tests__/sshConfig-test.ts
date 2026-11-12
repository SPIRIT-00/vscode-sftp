import {
  computeSshConfig,
  detectIdentityFileType,
  firstIdentityFile,
  hasSshHostAlias,
  IdentityFileType,
  proxyJumpAlias,
  resolveIdentityAgent,
} from '../sshConfig';
import { utils } from 'ssh2';

describe('SSH config resolution', () => {
  test('combines a host alias with Host * defaults', () => {
    const computed = computeSshConfig(
      [
        'Host ao2',
        '  HostName 192.0.2.10',
        '  User root',
        '  IdentityFile ~/.ssh/id_ao2.pub',
        'Host *',
        '  IdentityAgent /run/user/1000/secure-ssh-agent.sock',
        '  IdentitiesOnly yes',
      ].join('\n'),
      'ao2'
    );

    expect(computed.hostname).toBe('192.0.2.10');
    expect(computed.user).toBe('root');
    expect(computed.identityagent).toBe(
      '/run/user/1000/secure-ssh-agent.sock'
    );
    expect(computed.identitiesonly).toBe('yes');
    expect(firstIdentityFile(computed.identityfile)).toBe(
      '~/.ssh/id_ao2.pub'
    );
  });

  test('resolves IdentityAgent special values', () => {
    const previousAgent = process.env.SSH_AUTH_SOCK;
    process.env.SSH_AUTH_SOCK = '/tmp/test-agent.sock';
    try {
      expect(resolveIdentityAgent('SSH_AUTH_SOCK')).toBe(
        '/tmp/test-agent.sock'
      );
      expect(resolveIdentityAgent('$SSH_AUTH_SOCK')).toBe(
        '/tmp/test-agent.sock'
      );
      expect(resolveIdentityAgent('none')).toBeUndefined();
    } finally {
      if (previousAgent === undefined) {
        delete process.env.SSH_AUTH_SOCK;
      } else {
        process.env.SSH_AUTH_SOCK = previousAgent;
      }
    }
  });

  test('detects public and private keys from content, not filenames', () => {
    const keys = utils.generateKeyPairSync('ed25519');

    expect(detectIdentityFileType(keys.public)).toBe(IdentityFileType.Public);
    expect(detectIdentityFileType(keys.private)).toBe(IdentityFileType.Private);
  });

  test('recognizes an encrypted private key before prompting for its passphrase', () => {
    const keys = utils.generateKeyPairSync('ed25519', {
      cipher: 'aes256-ctr',
      passphrase: 'test-passphrase',
    });

    expect(detectIdentityFileType(keys.private, true)).toBe(
      IdentityFileType.Private
    );
  });

  test('recognizes ProxyJump aliases and rejects unsupported forms', () => {
    const content = ['Host target', '  ProxyJump bastion', 'Host bastion'].join(
      '\n'
    );

    expect(proxyJumpAlias('bastion')).toBe('bastion');
    expect(proxyJumpAlias('none')).toBeUndefined();
    expect(hasSshHostAlias(content, 'bastion')).toBe(true);
    expect(hasSshHostAlias(content, 'missing')).toBe(false);
    expect(() => proxyJumpAlias('user@bastion:2200')).toThrow(
      'must be one SSH host alias'
    );
  });
});
