import fs from 'fs/promises';
import path from 'path';

export interface FileSystemTools {
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
  listDirectory(dirPath: string): Promise<string[]>;
  deleteFile(filePath: string): Promise<void>;
  moveFile(oldPath: string, newPath: string): Promise<void>;
}

export class FileSystemTools implements FileSystemTools {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
  }

  private safePath(targetPath: string): string {
    const resolvedPath = path.resolve(this.basePath, targetPath);
    if (!resolvedPath.startsWith(this.basePath)) {
      throw new Error(`Security Error: Attempted to access path outside of base directory: ${targetPath}`);
    }
    return resolvedPath;
  }

  async readFile(filePath: string): Promise<string> {
    const safe = this.safePath(filePath);
    return fs.readFile(safe, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const safe = this.safePath(filePath);
    await fs.mkdir(path.dirname(safe), { recursive: true });
    await fs.writeFile(safe, content, 'utf-8');
  }

  async listDirectory(dirPath: string): Promise<string[]> {
    const safe = this.safePath(dirPath);
    const entries = await fs.readdir(safe, { withFileTypes: true });
    return entries.map(entry => entry.name);
  }

  async deleteFile(filePath: string): Promise<void> {
    const safe = this.safePath(filePath);
    await fs.unlink(safe);
  }

  async moveFile(oldPath: string, newPath: string): Promise<void> {
    const safeOld = this.safePath(oldPath);
    const safeNew = this.safePath(newPath);
    await fs.mkdir(path.dirname(safeNew), { recursive: true });
    await fs.rename(safeOld, safeNew);
  }
}
