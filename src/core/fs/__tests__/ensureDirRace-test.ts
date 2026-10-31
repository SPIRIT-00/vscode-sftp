import upath from '../../upath';
import { FileType } from '../fileSystem';
import FTPFileSystem from '../ftpFileSystem';
import SFTPFileSystem from '../sftpFileSystem';

function errorWithCode(message: string, code: number): any {
  return Object.assign(new Error(message), { code });
}

const directoryStat = {
  type: FileType.Directory,
  mode: 0o755,
  size: 0,
  mtime: 0,
  atime: 0,
};

describe('ensureDir concurrent creation', () => {
  test('SFTP accepts a directory created by a concurrent transfer', async () => {
    const fileSystem = new SFTPFileSystem(upath, { client: {} as any });
    const missingParent = errorWithCode('no such file', 2);
    const alreadyExists = errorWithCode('failure', 4);

    const mkdir = (jest.spyOn(fileSystem, 'mkdir') as any)
      .mockRejectedValueOnce(missingParent)
      .mockImplementationOnce(() => Promise.resolve())
      .mockRejectedValueOnce(alreadyExists);
    const lstat = (jest.spyOn(fileSystem, 'lstat') as any)
      .mockImplementation(() => Promise.resolve(directoryStat));

    await expect(fileSystem.ensureDir('/parent/child')).resolves.toBeUndefined();
    expect(mkdir.mock.calls.map(call => call[0])).toEqual([
      '/parent/child',
      '/parent',
      '/parent/child',
    ]);
    expect(lstat).toHaveBeenCalledWith('/parent/child');
  });

  test('FTP accepts a directory created by a concurrent transfer', async () => {
    const fileSystem = new FTPFileSystem(upath, { client: {} as any });
    const missing = errorWithCode('not found', 550);
    const alreadyExists = errorWithCode('file exists', 550);

    const mkdir = (jest.spyOn(fileSystem, 'mkdir') as any)
      .mockRejectedValueOnce(missing)
      .mockImplementationOnce(() => Promise.resolve())
      .mockRejectedValueOnce(alreadyExists);
    const lstat = (jest.spyOn(fileSystem, 'lstat') as any)
      .mockRejectedValueOnce(missing)
      .mockImplementationOnce(() => Promise.resolve(directoryStat));

    await expect(fileSystem.ensureDir('/parent/child')).resolves.toBeUndefined();
    expect(mkdir.mock.calls.map(call => call[0])).toEqual([
      '/parent/child',
      '/parent',
      '/parent/child',
    ]);
    expect(lstat).toHaveBeenLastCalledWith('/parent/child');
  });

  test('does not hide a failed mkdir when no directory appeared', async () => {
    const fileSystem = new SFTPFileSystem(upath, { client: {} as any });
    const missingParent = errorWithCode('no such file', 2);
    const mkdirFailure = errorWithCode('permission denied', 3);

    (jest.spyOn(fileSystem, 'mkdir') as any)
      .mockRejectedValueOnce(missingParent)
      .mockImplementationOnce(() => Promise.resolve())
      .mockRejectedValueOnce(mkdirFailure);
    jest.spyOn(fileSystem, 'lstat').mockRejectedValue(new Error('not found'));

    await expect(fileSystem.ensureDir('/parent/child')).rejects.toBe(
      mkdirFailure
    );
  });
});
