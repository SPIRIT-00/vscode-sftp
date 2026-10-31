import * as fs from 'fs';
import * as path from 'path';
import * as sshConfig from 'ssh-config';
import { utils } from 'ssh2';
import { replaceHomePath } from '../helper';

export interface ComputedSshConfig {
  [key: string]: any;
}

export enum IdentityFileType {
  Public,
  Private,
}

export function computeSshConfig(
  content: string,
  hostAlias: string
): ComputedSshConfig {
  const computed = sshConfig.parse(content).compute(hostAlias);

  return Object.keys(computed).reduce<ComputedSshConfig>((result, key) => {
    result[key.toLowerCase()] = computed[key];
    return result;
  }, {});
}

export function resolveSshPath(value: string, workspace: string): string {
  return path.resolve(workspace, replaceHomePath(value));
}

export function resolveIdentityAgent(value?: string): string | undefined {
  if (!value || value.toLowerCase() === 'none') {
    return undefined;
  }

  if (value === 'SSH_AUTH_SOCK') {
    return process.env.SSH_AUTH_SOCK;
  }

  const envMatch = value.match(/^\$(?:\{([^}]+)\}|([A-Za-z_][A-Za-z0-9_]*))$/);
  if (envMatch) {
    return process.env[envMatch[1] || envMatch[2]];
  }

  return replaceHomePath(value);
}

export function firstIdentityFile(value: any): string | undefined {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : undefined;
  }

  return typeof value === 'string' ? value : undefined;
}

function hasPrivateKeyHeader(content: Buffer | string): boolean {
  const text = content.toString();
  return (
    /-----BEGIN (?:OPENSSH |RSA |DSA |EC |ENCRYPTED )?PRIVATE KEY-----/.test(
      text
    ) ||
    /^PuTTY-User-Key-File-\d+:/m.test(text) ||
    /---- BEGIN SSH2 (?:ENCRYPTED )?PRIVATE KEY ----/.test(text)
  );
}

export function detectIdentityFileType(
  content: Buffer | string,
  passphrase?: string | boolean
): IdentityFileType {
  let parsed: any = utils.parseKey(
    content,
    typeof passphrase === 'string' ? passphrase : undefined
  );
  if (Array.isArray(parsed)) {
    parsed = parsed[0];
  }

  if (parsed instanceof Error) {
    // Encrypted private keys cannot be fully parsed before a passphrase prompt,
    // but their on-disk formats still identify them as private keys.
    if (hasPrivateKeyHeader(content)) {
      return IdentityFileType.Private;
    }
    throw new Error(`Cannot parse IdentityFile: ${parsed.message}`);
  }

  if (!parsed || typeof parsed.isPrivateKey !== 'function') {
    throw new Error('Cannot parse IdentityFile: unsupported key format');
  }

  return parsed.isPrivateKey()
    ? IdentityFileType.Private
    : IdentityFileType.Public;
}

export function readIdentityFileType(
  filepath: string,
  passphrase?: string | boolean
): IdentityFileType {
  let content: Buffer;
  try {
    content = fs.readFileSync(filepath);
  } catch (error) {
    throw new Error(`Cannot read IdentityFile ${filepath}: ${error.message}`);
  }

  try {
    return detectIdentityFileType(content, passphrase);
  } catch (error) {
    throw new Error(`${filepath}: ${error.message}`);
  }
}
