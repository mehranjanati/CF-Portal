import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export interface TerminalTools {
  runCommand(command: string): Promise<{ stdout: string; stderr: string }>;
}

export class TerminalTools implements TerminalTools {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
  }

  async runCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    // For security, we run commands inside the project directory.
    // Ensure the directory exists before attempting to cd into it.
    await fs.mkdir(this.basePath, { recursive: true });
    
    // Note: This is a basic implementation. A real implementation would use a more secure sandbox.
    const fullCommand = `cd "${this.basePath}" && ${command}`;
    
    try {
      const { stdout, stderr } = await execAsync(fullCommand);
      return { stdout, stderr };
    } catch (error: any) {
      const errMessage = error.stderr || error.message;
      throw new Error(errMessage);
    }
  }
}
