import { TerminalTools } from './terminal';
import path from 'path';
import fs from 'fs/promises';

async function runTest() {
  console.log('🚀 Starting test: TerminalTools');

  const testDir = path.join(process.cwd(), 'test-terminal-dir');
  const terminal = new TerminalTools(testDir);

  // Cleanup previous test dir
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (e) {}

  try {
    // 1. Test runCommand
    console.log('   Step 1: Testing runCommand...');
    const { stdout, stderr } = await terminal.runCommand('echo "hello world"');
    console.log(`   Stdout: "${stdout}"`);
    console.log(`   Stderr: "${stderr}"`);
    if (stdout.trim() !== 'hello world') throw new Error(`Expected "hello world", got "${stdout.trim()}"`);
    if (stderr !== '') throw new Error(`Expected empty stderr, got "${stderr}"`);
    console.log('   ✅ runCommand passed!');

    // 2. Test command with arguments
    console.log('   Step 2: Testing runCommand with arguments...');
    const { stdout: stdout2 } = await terminal.runCommand(`echo hello ${process.env.USER}`);
    console.log(`   Stdout: "${stdout2}"`);
    if (!stdout2.includes(process.env.USER || '')) throw new Error(`Expected output to include user "${process.env.USER}"`);
    console.log('   ✅ runCommand with arguments passed!');

    // 3. Test error command
    console.log('   Step 3: Testing error command...');
    try {
      await terminal.runCommand('non_existent_command_xyz');
      throw new Error('Should have thrown error for non-existent command');
    } catch (err: any) {
      if (!err.message.includes('not found')) throw err;
      console.log('   ✅ error command detection passed!');
    }

    console.log('🎉 All TerminalTools tests passed successfully!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

runTest();
