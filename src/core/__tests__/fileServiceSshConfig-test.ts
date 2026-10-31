import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { utils } from 'ssh2';
import { mergeConfigWithExternalRefer } from '../fileService';

describe('FileService SSH config fallback', () => {
  test('uses a public IdentityFile and IdentityAgent when privateKeyPath is missing', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-sftp-'));
    const sshConfigPath = path.join(tempDir, 'config');
    const publicKeyPath = path.join(tempDir, 'identity-without-extension');
    const keys = utils.generateKeyPairSync('ed25519');
    fs.writeFileSync(publicKeyPath, keys.public);
    fs.writeFileSync(
      sshConfigPath,
      [
        'Host ao2',
        '  HostName 192.0.2.10',
        '  User root',
        `  IdentityFile ${publicKeyPath}`,
        'Host *',
        '  IdentityAgent /run/user/1000/secure-ssh-agent.sock',
        '  IdentitiesOnly yes',
      ].join('\n')
    );

    try {
      const result = mergeConfigWithExternalRefer(
        {
          protocol: 'sftp',
          host: 'ao2',
          privateKeyPath: path.join(tempDir, 'missing-private-key'),
          sshConfigPath,
        } as any,
        tempDir
      );

      expect(result.host).toBe('192.0.2.10');
      expect(result.username).toBe('root');
      expect(result.privateKeyPath).toBeUndefined();
      expect(result.agent).toBe('/run/user/1000/secure-ssh-agent.sock');
      expect(result.agentIdentityPath).toBe(publicKeyPath);
      expect(result.identitiesOnly).toBe(true);
    } finally {
      fs.unlinkSync(publicKeyPath);
      fs.unlinkSync(sshConfigPath);
      fs.rmdirSync(tempDir);
    }
  });

  test('uses a private IdentityFile even when its filename ends in .pub', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-sftp-'));
    const sshConfigPath = path.join(tempDir, 'config');
    const privateKeyPath = path.join(tempDir, 'private-key.pub');
    const keys = utils.generateKeyPairSync('ed25519');
    fs.writeFileSync(privateKeyPath, keys.private);
    fs.writeFileSync(
      sshConfigPath,
      ['Host ao2', `  IdentityFile ${privateKeyPath}`].join('\n')
    );

    try {
      const result = mergeConfigWithExternalRefer(
        {
          protocol: 'sftp',
          host: 'ao2',
          sshConfigPath,
        } as any,
        tempDir
      );

      expect(result.privateKeyPath).toBe(privateKeyPath);
      expect(result.agentIdentityPath).toBeUndefined();
    } finally {
      fs.unlinkSync(privateKeyPath);
      fs.unlinkSync(sshConfigPath);
      fs.rmdirSync(tempDir);
    }
  });
});
