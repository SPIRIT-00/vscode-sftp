import * as fs from 'fs';
import * as fse from 'fs-extra';
import FileSystem, { FileStats } from '../../src/core/fs/fileSystem';
import localfs from '../../src/core/localFs';
import RemoteFileSystem from '../../src/core/fs/remoteFileSystem';

// @ts-ignore
export default class LocalRemoteFileSystem extends RemoteFileSystem {
  _createClient() {
    return {};
  }

  toFileStat(stat: fs.Stats): FileStats {
    return {
      type: FileSystem.getFileTypecharacter(stat),
      size: stat.size,
      mode: stat.mode & parseInt('777', 8), // tslint:disable-line:no-bitwise
      mtime: this.toLocalTime(stat.mtime.getTime()),
      atime: this.toLocalTime(stat.atime.getTime()),
    };
  }

  futimes(fd: number, atime: number, mtime: number): Promise<void> {
    return fse.futimes(
      fd,
      this.toRemoteTimeInSecnonds(atime),
      this.toRemoteTimeInSecnonds(mtime)
    );
  }

  put(input: fs.ReadStream, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      input.on('data', chunk => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      input.once('error', reject);
      input.once('end', () => {
        fs.writeFile(path, Buffer.concat(chunks), error => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    });
  }
}

[
  'toFileEntry',
  'readFile',
  'open',
  'close',
  'fstat',
  'get',
  'mkdir',
  'ensureDir',
  'list',
  'lstat',
  'readlink',
  'symlink',
  'unlink',
  'rmdir',
  'rename',
].forEach(method => {
  Object.defineProperty(LocalRemoteFileSystem.prototype, method, {
    enumerable: false,
    value(...args) {
      const fn = localfs[method];
      return fn.call(this, ...args);
    },
  });
});
